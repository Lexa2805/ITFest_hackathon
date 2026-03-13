import json
import logging
import os
import re
import datetime
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.services.supabase_client import supabase
from app.services.fridge_client import fetch_fridge_inventory
from app.services.nutrition_service import get_goal
from app.schemas.nutrition import RecipeResponse

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = os.environ.get("OPENROUTER_MODEL", "openai/gpt-5.1")
RECIPES_TABLE = "recipes"

SYSTEM_PROMPT = """You are an expert nutritionist and chef.
The user will provide their current Fridge Inventory and their Daily Nutrition Goals.
Your task is to suggest 3 to 5 recipes that maximize the use of the user's existing fridge inventory.
The recipes should align with their nutrition goals (calories, protein, carbs, fat).

Return ONLY a valid JSON array of recipes. Each recipe object must have exactly these keys:
- "name" (string)
- "ingredients" (array of objects with "name" (string), "quantity" (number), "unit" (string))
- "instructions" (array of strings, steps to cook)
- "calories" (integer)
- "protein_g" (integer)
- "carbs_g" (integer)
- "fat_g" (integer)
- "prep_time_minutes" (integer)

Do NOT wrap the JSON in markdown code fences. Return raw JSON only."""


def _safe_data(result) -> object:
    if result is None:
        return None
    return getattr(result, "data", None)


def _normalize_inventory(raw_inventory: Any) -> list[dict]:
    if isinstance(raw_inventory, dict):
        data = raw_inventory.get("data")
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)]
        return []
    if isinstance(raw_inventory, list):
        return [item for item in raw_inventory if isinstance(item, dict)]
    return []


def _fallback_recipes_from_inventory(inventory: list[dict]) -> list[dict]:
    names: list[str] = []
    for item in inventory:
        name = item.get("name")
        if isinstance(name, str) and name.strip():
            names.append(name.strip())

    unique_names = list(dict.fromkeys(names))
    if len(unique_names) < 3:
        unique_names.extend(["egg", "rice", "onion", "tomato", "spinach"])
        unique_names = list(dict.fromkeys(unique_names))

    base_sets = [
        ("Fridge Stir-Fry Bowl", unique_names[:4], 520, 28, 58, 18, 25),
        ("Pantry Protein Scramble", unique_names[1:5], 430, 32, 24, 20, 15),
        ("Quick Veggie Rice Skillet", unique_names[2:6], 480, 18, 64, 14, 22),
    ]

    recipes: list[dict] = []
    for title, ingredient_names, calories, protein, carbs, fat, prep_minutes in base_sets:
        ingredients = [
            {"name": ingredient, "quantity": 1, "unit": "serving"}
            for ingredient in ingredient_names
        ]
        instructions = [
            "Prep and chop ingredients.",
            "Cook aromatics and protein first, then add vegetables.",
            "Season to taste and cook until done.",
            "Serve warm."
        ]
        recipes.append({
            "name": title,
            "ingredients": ingredients,
            "instructions": instructions,
            "calories": calories,
            "protein_g": protein,
            "carbs_g": carbs,
            "fat_g": fat,
            "prep_time_minutes": prep_minutes,
        })

    return recipes

async def suggest_recipes(user_id: str, token: str) -> list[RecipeResponse]:
    # 1. Fetch fridge inventory
    inventory = _normalize_inventory(await fetch_fridge_inventory(token))
    
    # 2. Fetch goals
    try:
        goals = await get_goal(user_id)
        goals_info = goals.model_dump_json()
    except HTTPException:
        # If goals not set, we can still generate recipes
        goals_info = "No specific goals set. Provide balanced healthy recipes."

    inventory_info = json.dumps(inventory)
    
    user_prompt = f"Fridge Inventory:\n{inventory_info}\n\nNutrition Goals:\n{goals_info}"
    
    # 3. Call OpenRouter
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]
    
    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0.3
    }
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    recipes_data: list[dict]
    use_fallback = False

    if not OPENROUTER_API_KEY:
        logger.warning("OPENROUTER_API_KEY is missing. Using fallback recipe generation.")
        use_fallback = True
    else:
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                resp = await client.post(OPENROUTER_BASE_URL, json=payload, headers=headers)
                resp.raise_for_status()
                body = resp.json()
                if "choices" not in body or not body["choices"]:
                    logger.error("OpenRouter returned response without choices.")
                    use_fallback = True
                else:
                    raw_text = body["choices"][0]["message"]["content"]
                    cleaned = re.sub(r"```(?:json)?\s*", "", raw_text).strip().rstrip("`")
                    try:
                        parsed = json.loads(cleaned)
                    except json.JSONDecodeError:
                        match = re.search(r"\[.*]", cleaned, re.DOTALL)
                        if match:
                            parsed = json.loads(match.group())
                        else:
                            logger.error("OpenRouter returned unparseable recipe output.")
                            use_fallback = True
                            parsed = []

                    if not use_fallback and isinstance(parsed, list):
                        recipes_data = parsed
                    else:
                        use_fallback = True
            except (httpx.HTTPError, json.JSONDecodeError, KeyError) as exc:
                error_detail = ""
                if isinstance(exc, httpx.HTTPStatusError):
                    try:
                        error_detail = exc.response.text
                    except Exception:
                        error_detail = ""
                logger.error("OpenRouter API error: %s | details=%s", exc, error_detail)
                use_fallback = True

    if use_fallback:
        recipes_data = _fallback_recipes_from_inventory(inventory)
        
    # 5. Save to DB
    saved_recipes = []
    generated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    for recipe in recipes_data:
        payload_db = {
            "user_id": user_id,
            "name": recipe.get("name", "Unknown Recipe"),
            "ingredients": recipe.get("ingredients", []),
            "instructions": recipe.get("instructions", []),
            "calories": recipe.get("calories", 0),
            "protein_g": recipe.get("protein_g", 0),
            "carbs_g": recipe.get("carbs_g", 0),
            "fat_g": recipe.get("fat_g", 0),
            "prep_time_minutes": recipe.get("prep_time_minutes", 0),
            "generated_at": generated_at
        }
        res = supabase.table(RECIPES_TABLE).insert(payload_db).execute()
        inserted_data = _safe_data(res)
        if inserted_data:
            saved_recipes.append(RecipeResponse(**inserted_data[0]))
            
    return saved_recipes

async def get_user_recipes(user_id: str) -> list[RecipeResponse]:
    result = supabase.table(RECIPES_TABLE).select("*").eq("user_id", user_id).order("generated_at", desc=True).execute()
    return [RecipeResponse(**row) for row in (_safe_data(result) or [])]

async def get_recipe(user_id: str, recipe_id: str) -> dict:
    result = supabase.table(RECIPES_TABLE).select("*").eq("user_id", user_id).eq("id", recipe_id).maybe_single().execute()
    recipe_data = _safe_data(result)
    if not recipe_data:
        raise HTTPException(status_code=404, detail="Recipe not found.")
    return recipe_data
