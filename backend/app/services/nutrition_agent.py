"""Claude-powered meal-plan generation service."""

from __future__ import annotations

import json
import os
import re
from datetime import date, datetime, timezone
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.schemas.nutrition_agent import MealPlanMeal, MealPlanResponse
from app.services.supabase_client import supabase

MEAL_PLANS_TABLE = "meal_plans"
FRIDGE_TABLE = "fridge_items"
MODEL = "claude-sonnet-4-20250514"


async def generate_daily_meal_plan(
    *,
    user_id: str,
    daily_kcal_target: int,
    macro_targets: dict[str, int],
) -> MealPlanResponse:
    """Build a daily meal plan using only fridge ingredients and persist it."""
    ingredients = await _load_fridge_ingredients(user_id)
    if not ingredients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fridge ingredients found for this user.",
        )

    plan_json = await _call_claude_for_plan(
        ingredients=ingredients,
        daily_kcal_target=daily_kcal_target,
        macro_targets=macro_targets,
    )

    normalized = _normalize_plan_json(plan_json)

    payload = {
        "user_id": user_id,
        "date": date.today().isoformat(),
        "plan_json": normalized,
        "total_kcal": normalized["total_kcal"],
        "total_protein": normalized["total_protein_g"],
        "total_fat": normalized["total_fat_g"],
        "total_carbs": normalized["total_carbs_g"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    supabase.table(MEAL_PLANS_TABLE).insert(payload).execute()

    return MealPlanResponse(**normalized)


async def get_latest_plan(user_id: str) -> MealPlanResponse | None:
    """Fetch the most recently generated meal plan for today."""
    today = date.today().isoformat()
    result = (
        supabase.table(MEAL_PLANS_TABLE)
        .select("plan_json")
        .eq("user_id", user_id)
        .eq("date", today)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    return MealPlanResponse(**result.data[0]["plan_json"])


async def _load_fridge_ingredients(user_id: str) -> list[dict[str, Any]]:
    """Load current fridge ingredients and normalize naming across schema versions."""
    result = (
        supabase.table(FRIDGE_TABLE)
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    rows = result.data or []
    normalized: list[dict[str, Any]] = []
    for row in rows:
        ingredient_name = row.get("ingredient_name") or row.get("name")
        if not ingredient_name:
            continue
        normalized.append(
            {
                "name": ingredient_name,
                "quantity": row.get("quantity") or 0,
                "unit": row.get("unit") or "g",
            }
        )
    return normalized


async def _call_claude_for_plan(
    *,
    ingredients: list[dict[str, Any]],
    daily_kcal_target: int,
    macro_targets: dict[str, int],
) -> dict[str, Any]:
    """Call Anthropic Messages API and parse JSON plan output."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ANTHROPIC_API_KEY is missing.",
        )

    system_prompt = (
        "You are a nutrition assistant. Generate a full-day meal plan that uses ONLY "
        "the provided fridge ingredients. Return JSON only."
    )

    user_prompt = {
        "fridge_ingredients": ingredients,
        "targets": {
            "daily_kcal_target": daily_kcal_target,
            "protein_g": macro_targets["protein_g"],
            "fat_g": macro_targets["fat_g"],
            "carbs_g": macro_targets["carbs_g"],
        },
        "required_structure": {
            "breakfast": [
                {
                    "meal_name": "string",
                    "ingredients": [{"name": "string", "grams": 0}],
                    "kcal": 0,
                    "protein_g": 0,
                    "fat_g": 0,
                    "carbs_g": 0,
                }
            ],
            "lunch": [],
            "dinner": [],
            "snacks": [],
            "total_kcal": 0,
            "total_protein_g": 0,
            "total_fat_g": 0,
            "total_carbs_g": 0,
        },
        "constraints": [
            "Use ONLY fridge ingredients",
            "Include exact grams for every ingredient",
            "Aim to match calorie and macro targets as closely as possible",
        ],
    }

    payload = {
        "model": MODEL,
        "max_tokens": 2000,
        "temperature": 0.2,
        "system": system_prompt,
        "messages": [{"role": "user", "content": json.dumps(user_prompt)}],
    }

    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)

    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Claude API error: {response.text}",
        )

    body = response.json()
    content_blocks = body.get("content") or []
    text_output = ""
    for block in content_blocks:
        if block.get("type") == "text":
            text_output += block.get("text", "")

    if not text_output:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Claude API returned empty content.",
        )

    cleaned = re.sub(r"```(?:json)?", "", text_output).replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Fallback: parse the first object in the response if extra text slipped in.
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not match:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Claude response was not valid JSON.",
            )
        return json.loads(match.group())


def _normalize_plan_json(plan: dict[str, Any]) -> dict[str, Any]:
    """Validate and normalize plan structure before returning/saving."""
    meals_by_section: dict[str, list[dict[str, Any]]] = {}
    for section in ["breakfast", "lunch", "dinner", "snacks"]:
        raw_section = plan.get(section) or []
        normalized_section: list[dict[str, Any]] = []
        for meal in raw_section:
            meal_model = MealPlanMeal(**meal)
            normalized_section.append(meal_model.model_dump(mode="json"))
        meals_by_section[section] = normalized_section

    total_kcal = int(plan.get("total_kcal") or 0)
    total_protein_g = int(plan.get("total_protein_g") or 0)
    total_fat_g = int(plan.get("total_fat_g") or 0)
    total_carbs_g = int(plan.get("total_carbs_g") or 0)

    return {
        "breakfast": meals_by_section["breakfast"],
        "lunch": meals_by_section["lunch"],
        "dinner": meals_by_section["dinner"],
        "snacks": meals_by_section["snacks"],
        "total_kcal": total_kcal,
        "total_protein_g": total_protein_g,
        "total_fat_g": total_fat_g,
        "total_carbs_g": total_carbs_g,
    }
