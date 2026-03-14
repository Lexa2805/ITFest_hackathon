"""
Expiry-based recipe service — identifies expiring fridge items and generates
prioritised recipes via GPT 5.1, with a local fallback when OpenRouter fails.
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import date, timedelta
from uuid import UUID

import httpx
from dotenv import load_dotenv

from app.schemas.expiry_recipes import (
    ExpiryAlertItem,
    ExpiryRecipe,
    ExpiryRecipeResponse,
    RecipeIngredient,
)
from app.services.supabase_client import get_supabase

load_dotenv()

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY: str = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "openai/gpt-5.1"

FRIDGE_TABLE = "fridge_items"
PROFILES_TABLE = "profiles"

SYSTEM_PROMPT = """You are an expert nutritionist and chef specialising in reducing food waste.
The user will provide:
1. A list of fridge items that are EXPIRING SOON (within 3 days).
2. Their full fridge inventory.
3. Their daily nutrition goals.

Your task is to suggest 2 to 4 recipes that PRIORITISE using the expiring items first.
The recipes should align with the user's nutrition goals.

Return ONLY a valid JSON array of recipes. Each recipe object must have exactly these keys:
- "name" (string)
- "ingredients" (array of objects with "name" (string), "quantity" (number), "unit" (string))
- "instructions" (array of strings, step-by-step)
- "calories" (integer)
- "protein_g" (integer)
- "carbs_g" (integer)
- "fat_g" (integer)
- "prep_time_minutes" (integer)

Do NOT wrap the JSON in markdown code fences. Return raw JSON only."""



# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def get_expiry_recipes(user_id: str) -> ExpiryRecipeResponse:
    """Find items expiring within 3 days and generate recipes via GPT 5.1."""

    supabase = await get_supabase()
    today = date.today()
    threshold = today + timedelta(days=3)

    # 1. Fetch all fridge items for the user
    result = await (
        supabase.table(FRIDGE_TABLE)
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    all_items: list[dict] = result.data or []

    # 2. Filter items expiring within 3 days
    expiring_items: list[dict] = []
    for item in all_items:
        exp = item.get("expiry_date")
        if not exp:
            continue
        exp_date = date.fromisoformat(exp) if isinstance(exp, str) else exp
        if exp_date <= threshold:
            expiring_items.append(item)

    # 3. No expiring items → return early
    if not expiring_items:
        return ExpiryRecipeResponse(
            recipes=[],
            expiring_items_used=[],
            message="All items are fresh",
        )

    expiring_names = [item["name"] for item in expiring_items]

    # 4. Fetch user nutrition goals
    goals_text = await _fetch_nutrition_goals(user_id)

    # 5. Build prompt and call GPT 5.1
    inventory_text = json.dumps(
        [
            {
                "name": i.get("name"),
                "quantity": i.get("quantity"),
                "unit": i.get("unit"),
                "category": i.get("category"),
                "expiry_date": i.get("expiry_date"),
            }
            for i in all_items
        ]
    )
    expiring_text = json.dumps(
        [
            {"name": i.get("name"), "expiry_date": i.get("expiry_date")}
            for i in expiring_items
        ]
    )

    user_prompt = (
        f"EXPIRING ITEMS (use these first):\n{expiring_text}\n\n"
        f"Full Fridge Inventory:\n{inventory_text}\n\n"
        f"Nutrition Goals:\n{goals_text}"
    )

    use_fallback = False
    recipes_data: list[dict] = []

    if not OPENROUTER_API_KEY:
        logger.warning("OPENROUTER_API_KEY is missing. Using fallback recipe generation.")
        use_fallback = True
    else:
        recipes_data, use_fallback = await _call_gpt_for_recipes(user_prompt)

    if use_fallback:
        recipes_data = _fallback_recipes_from_expiring(expiring_names)

    # 6. Parse into ExpiryRecipe objects
    recipes = _parse_recipes(recipes_data)

    return ExpiryRecipeResponse(
        recipes=recipes,
        expiring_items_used=expiring_names,
    )


async def get_expiry_alerts(user_id: str) -> list[ExpiryAlertItem]:
    """Return items expiring within 1 day (urgent) or already expired."""

    supabase = await get_supabase()
    today = date.today()

    result = await (
        supabase.table(FRIDGE_TABLE)
        .select("id, name, expiry_date")
        .eq("user_id", user_id)
        .not_("expiry_date", "is", "null")
        .execute()
    )
    rows: list[dict] = result.data or []

    alerts: list[ExpiryAlertItem] = []
    for row in rows:
        exp = row.get("expiry_date")
        if not exp:
            continue
        exp_date = date.fromisoformat(exp) if isinstance(exp, str) else exp
        days_until = (exp_date - today).days

        if days_until < 0:
            status = "expired"
        elif days_until <= 1:
            status = "expiring_urgent"
        else:
            continue  # not urgent

        alerts.append(
            ExpiryAlertItem(
                item_id=UUID(row["id"]) if isinstance(row["id"], str) else row["id"],
                name=row["name"],
                expiry_date=exp_date,
                status=status,
                days_until_expiry=days_until,
            )
        )

    return alerts


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _fetch_nutrition_goals(user_id: str) -> str:
    """Fetch user nutrition goals from the profiles table."""
    supabase = await get_supabase()
    result = await (
        supabase.table(PROFILES_TABLE)
        .select("daily_kcal_target, protein_target_g, fat_target_g, carbs_target_g")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if result.data:
        return json.dumps(result.data)
    return "No specific goals set. Provide balanced healthy recipes."


async def _call_gpt_for_recipes(user_prompt: str) -> tuple[list[dict], bool]:
    """Call GPT 5.1 via OpenRouter. Returns (recipes_data, use_fallback)."""

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://personal-health-os.app",
        "X-Title": "Personal Health OS",
    }

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.3,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(
                OPENROUTER_BASE_URL, json=payload, headers=headers
            )
            resp.raise_for_status()
            body = resp.json()

            if "choices" not in body or not body["choices"]:
                logger.error("OpenRouter returned response without choices.")
                return [], True

            raw_text: str = body["choices"][0]["message"]["content"]

            # Strip markdown code fences if present
            cleaned = re.sub(r"```(?:json)?\s*", "", raw_text).strip().rstrip("`")

            try:
                parsed = json.loads(cleaned)
            except json.JSONDecodeError:
                match = re.search(r"\[.*]", cleaned, re.DOTALL)
                if match:
                    try:
                        parsed = json.loads(match.group())
                    except json.JSONDecodeError:
                        logger.error("OpenRouter returned unparseable recipe output.")
                        return [], True
                else:
                    logger.error("No JSON array in OpenRouter recipe output.")
                    return [], True

            if isinstance(parsed, list):
                return parsed, False

            return [], True

        except (httpx.HTTPError, json.JSONDecodeError, KeyError) as exc:
            error_detail = ""
            if isinstance(exc, httpx.HTTPStatusError):
                try:
                    error_detail = exc.response.text
                except Exception:
                    error_detail = ""
            logger.error(
                "OpenRouter API error: %s | details=%s", exc, error_detail
            )
            return [], True


def _fallback_recipes_from_expiring(expiring_names: list[str]) -> list[dict]:
    """Generate template recipes from expiring ingredient names."""

    unique_names = list(dict.fromkeys(expiring_names))
    # Pad with common staples if we have very few expiring items
    if len(unique_names) < 3:
        unique_names.extend(["egg", "rice", "onion", "tomato", "spinach"])
        unique_names = list(dict.fromkeys(unique_names))

    base_sets = [
        ("Use-It-Up Stir-Fry", unique_names[:4], 480, 24, 52, 16, 20),
        ("Expiry Saver Scramble", unique_names[1:5], 400, 28, 22, 18, 15),
        ("Quick Rescue Skillet", unique_names[2:6], 450, 20, 58, 14, 25),
    ]

    recipes: list[dict] = []
    for title, ingredient_names, calories, protein, carbs, fat, prep in base_sets:
        ingredients = [
            {"name": name, "quantity": 1, "unit": "serving"}
            for name in ingredient_names
        ]
        instructions = [
            "Wash and prep all ingredients.",
            "Heat oil in a pan over medium-high heat.",
            "Cook protein and harder vegetables first, then add softer items.",
            "Season to taste and serve warm.",
        ]
        recipes.append(
            {
                "name": title,
                "ingredients": ingredients,
                "instructions": instructions,
                "calories": calories,
                "protein_g": protein,
                "carbs_g": carbs,
                "fat_g": fat,
                "prep_time_minutes": prep,
            }
        )

    return recipes


def _parse_recipes(recipes_data: list[dict]) -> list[ExpiryRecipe]:
    """Parse raw recipe dicts into ExpiryRecipe objects with expiry_priority=True."""

    recipes: list[ExpiryRecipe] = []
    for raw in recipes_data:
        try:
            ingredients = [
                RecipeIngredient(
                    name=ing.get("name", ""),
                    quantity=float(ing.get("quantity", 0)),
                    unit=ing.get("unit", ""),
                )
                for ing in raw.get("ingredients", [])
            ]
            recipes.append(
                ExpiryRecipe(
                    name=raw.get("name", "Unknown Recipe"),
                    ingredients=ingredients,
                    instructions=raw.get("instructions", []),
                    calories=int(raw.get("calories", 0)),
                    protein_g=int(raw.get("protein_g", 0)),
                    carbs_g=int(raw.get("carbs_g", 0)),
                    fat_g=int(raw.get("fat_g", 0)),
                    prep_time_minutes=int(raw.get("prep_time_minutes", 0)),
                    expiry_priority=True,
                )
            )
        except Exception:
            logger.warning("Skipping malformed recipe entry: %s", raw)
            continue

    return recipes