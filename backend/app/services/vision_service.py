"""
Vision service — sends an image to OpenRouter (vision model) and returns
a structured list of detected ingredients.
"""

from __future__ import annotations

import json
import logging
import os
import re

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException, status

from app.schemas.fridge import ScannedIngredient

load_dotenv()

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY: str = os.environ["OPENROUTER_API_KEY"]
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
VISION_MODEL = "openai/gpt-5.1"

SYSTEM_PROMPT = """You are a food-ingredient recognition assistant.
The user will provide a photo of food items (e.g. a fridge, a grocery bag,
a kitchen counter). Your job is to identify every distinct food ingredient
visible in the image.

Return ONLY a valid JSON array. Each element must be an object with exactly
these four keys:
  - "name" (string)           — ingredient name in English
  - "estimated_quantity" (number) — best guess at how many/much
  - "unit" (string)           — e.g. "pcs", "kg", "liters", "grams", "bottles"
  - "category" (string)       — one of: dairy, meat, seafood, vegetable,
                                 fruit, grain, beverage, condiment, snack, other

Do NOT wrap the JSON in markdown code fences. Return raw JSON only."""


async def scan_image(image_b64: str) -> tuple[list[ScannedIngredient], str | None]:
    """
    Send a base64-encoded image to the vision model via OpenRouter.

    Returns
    -------
    tuple
        (list of parsed ScannedIngredient, raw model text or None)
    """
    # Build the multimodal message
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
                    "text": "Identify all food ingredients in this image.",
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
        "X-Title": "Personal Health OS - Fridge Scanner",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(
                OPENROUTER_BASE_URL, json=payload, headers=headers
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.error("OpenRouter API error: %s – %s", exc.response.status_code, exc.response.text)
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

    # Parse the JSON array from the model output
    ingredients = _parse_ingredients(raw_text)
    return ingredients, raw_text


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_ingredients(text: str) -> list[ScannedIngredient]:
    """
    Attempt to extract a JSON array from the model's response text.

    Handles cases where the model wraps JSON in markdown code fences.
    """
    # Strip markdown code fences if present
    cleaned = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`")

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # Last-resort: try to find a JSON array inside the text
        match = re.search(r"\[.*]", cleaned, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group())
            except json.JSONDecodeError:
                logger.warning("Could not parse vision model output: %s", text[:500])
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Vision model returned unparseable output.",
                )
        else:
            logger.warning("No JSON array in vision model output: %s", text[:500])
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Vision model returned unparseable output.",
            )

    if not isinstance(data, list):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Vision model did not return a JSON array.",
        )

    ingredients: list[ScannedIngredient] = []
    for entry in data:
        try:
            ingredients.append(ScannedIngredient(**entry))
        except Exception:
            logger.warning("Skipping malformed ingredient entry: %s", entry)
            continue

    return ingredients
