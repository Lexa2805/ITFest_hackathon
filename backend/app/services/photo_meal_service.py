"""
Photo meal service — sends a meal photo to OpenRouter (GPT 5.1 vision) and
returns estimated macros, then optionally logs the confirmed meal.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import re
from datetime import date

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException, status

from app.schemas.photo_meal import (
    DetectedFoodItem,
    PhotoMealConfirmRequest,
    PhotoMealEstimate,
)
from app.services.supabase_client import get_supabase

load_dotenv()

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY: str = os.environ["OPENROUTER_API_KEY"]
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
VISION_MODEL = "openai/gpt-5.1"

MEAL_LOGS_TABLE = "meal_logs"

SYSTEM_PROMPT = """You are a nutrition estimation assistant.
The user will provide a photo of a meal. Your job is to identify every
distinct food item on the plate and estimate its nutritional content.

Return ONLY a valid JSON object with exactly these keys:
  - "food_items" (array) — each element must have:
      - "name" (string) — food item name in English
      - "estimated_calories" (integer) — estimated kcal
      - "estimated_protein_g" (integer) — estimated protein in grams
      - "estimated_carbs_g" (integer) — estimated carbs in grams
      - "estimated_fat_g" (integer) — estimated fat in grams
      - "estimated_grams" (number) — estimated weight in grams
  - "confidence" (string) — one of: "high", "medium", "low"

If you cannot identify any food in the image, return:
  {"food_items": [], "confidence": "low"}

Do NOT wrap the JSON in markdown code fences. Return raw JSON only."""


async def analyze_meal_photo(image_bytes: bytes) -> PhotoMealEstimate:
    """
    Convert image bytes to base64, send to GPT 5.1 vision via OpenRouter,
    and return a structured macro estimate.

    Raises HTTPException if no food is detected or the model output is
    unparseable.
    """
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image_b64}",
                    },
                },
                {
                    "type": "text",
                    "text": "Identify all food items in this meal and estimate their nutritional content.",
                },
            ],
        },
    ]

    payload = {
        "model": VISION_MODEL,
        "messages": messages,
        "max_tokens": 2048,
        "temperature": 0.2,
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://personal-health-os.app",
        "X-Title": "Personal Health OS",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(
                OPENROUTER_BASE_URL, json=payload, headers=headers
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.error(
                "OpenRouter API error: %s – %s",
                exc.response.status_code,
                exc.response.text,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Vision model request failed: {exc.response.status_code}",
            ) from exc
        except httpx.RequestError as exc:
            logger.error("OpenRouter request error: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not reach the vision model.",
            ) from exc

    body = resp.json()
    raw_text: str = body["choices"][0]["message"]["content"]

    return _parse_meal_estimate(raw_text)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _parse_meal_estimate(text: str) -> PhotoMealEstimate:
    """
    Parse the GPT vision response into a PhotoMealEstimate.

    Handles markdown code fences and validates the structure.
    """
    # Strip markdown code fences if present (same pattern as vision_service.py)
    cleaned = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`")

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # Last-resort: try to find a JSON object inside the text
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group())
            except json.JSONDecodeError:
                logger.warning("Could not parse meal vision output: %s", text[:500])
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Vision model returned unparseable output.",
                )
        else:
            logger.warning("No JSON object in meal vision output: %s", text[:500])
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Vision model returned unparseable output.",
            )

    if not isinstance(data, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Vision model did not return a JSON object.",
        )

    food_items_raw = data.get("food_items", [])
    confidence = data.get("confidence", "low")

    if not food_items_raw:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No food detected in the image. Try retaking the photo with better lighting and a clearer view of the meal.",
        )

    # Parse individual food items
    food_items: list[DetectedFoodItem] = []
    for entry in food_items_raw:
        try:
            food_items.append(DetectedFoodItem(**entry))
        except Exception:
            logger.warning("Skipping malformed food item entry: %s", entry)
            continue

    if not food_items:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No food detected in the image. Try retaking the photo with better lighting and a clearer view of the meal.",
        )

    # Compute totals from individual items (Property 5: macro sum invariant)
    total_calories = sum(item.estimated_calories for item in food_items)
    total_protein_g = sum(item.estimated_protein_g for item in food_items)
    total_carbs_g = sum(item.estimated_carbs_g for item in food_items)
    total_fat_g = sum(item.estimated_fat_g for item in food_items)

    return PhotoMealEstimate(
        food_items=food_items,
        total_calories=total_calories,
        total_protein_g=total_protein_g,
        total_carbs_g=total_carbs_g,
        total_fat_g=total_fat_g,
        confidence=confidence,
    )


async def confirm_and_log_meal(
    user_id: str,
    request: PhotoMealConfirmRequest,
) -> dict:
    """
    Save a confirmed (possibly adjusted) meal to the meal_logs table.

    Uses the same column names as meal_logger_service.py.
    """
    ingredients_json = [
        item.model_dump(mode="json") for item in request.food_items
    ]

    payload = {
        "user_id": user_id,
        "date": date.today().isoformat(),
        "meal_name": request.meal_name,
        "ingredients_json": ingredients_json,
        "kcal": request.total_calories,
        "protein": request.total_protein_g,
        "fat": request.total_fat_g,
        "carbs": request.total_carbs_g,
        "time_of_day": request.time_of_day,
    }

    supabase = await get_supabase()
    result = await supabase.table(MEAL_LOGS_TABLE).insert(payload).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save meal log.",
        )

    return result.data[0]
