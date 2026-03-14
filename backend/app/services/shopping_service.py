import json
import logging
import os
import re
import datetime

import httpx
from fastapi import HTTPException, status

from app.services.supabase_client import get_supabase
from app.services.fridge_client import fetch_fridge_inventory
from app.schemas.nutrition import ShoppingListResponse

logger = logging.getLogger(__name__)


def _safe_data(result) -> object:
    if result is None:
        return None
    return getattr(result, "data", None)


OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = os.environ.get("OPENROUTER_MODEL", "openai/gpt-5.1")
SHOPPING_LIST_TABLE = "shopping_lists"
RECIPES_TABLE = "recipes"

SYSTEM_PROMPT = """You are a smart kitchen assistant.
The user will provide their current Fridge Inventory and a list of Ingredients Needed for their planned recipes.
Your task is to compare the two lists and identify what the user is missing or has insufficient quantities of.

Return ONLY a valid JSON array of the MISSING ingredients to form a shopping list. Each object must have exactly these keys:
- "name" (string)
- "quantity_needed" (number, estimated amount to buy)
- "unit" (string)
- "category" (string)

Do NOT wrap the JSON in markdown code fences. Return raw JSON only."""


async def generate_shopping_list(user_id: str, token: str, force_regenerate: bool = False) -> ShoppingListResponse:
    supabase = await get_supabase()
    # Check if we have a shopping list generated today
    if not force_regenerate:
        today = datetime.date.today().isoformat()
        result = await supabase.table(SHOPPING_LIST_TABLE).select("*").eq("user_id", user_id).gte("generated_at", f"{today}T00:00:00").order("generated_at", desc=True).limit(1).execute()
        existing_list = _safe_data(result)
        
        if existing_list and len(existing_list) > 0:
            logger.info(f"Returning cached shopping list for user {user_id} from today")
            return ShoppingListResponse(**existing_list[0])
    
    # 1. Fetch fridge inventory
    try:
        inventory = await fetch_fridge_inventory(token)
    except HTTPException:
        inventory = []
    
    # 2. Fetch recent recipes used or planned.
    result = await supabase.table(RECIPES_TABLE).select("ingredients").eq("user_id", user_id).order("generated_at", desc=True).limit(5).execute()
    recipes = result.data or []
    needed_ingredients = []
    for r in recipes:
        needed_ingredients.extend(r.get("ingredients", []))

    if not needed_ingredients:
        raise HTTPException(status_code=400, detail="No recent recipes found to generate a shopping list.")

    inventory_info = json.dumps(inventory)
    needed_info = json.dumps(needed_ingredients)
    
    user_prompt = f"Fridge Inventory:\n{inventory_info}\n\nIngredients Needed for Recipes:\n{needed_info}"
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]
    
    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0.2
    }
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(OPENROUTER_BASE_URL, json=payload, headers=headers)
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            logger.error(f"OpenRouter API error: {exc}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to generate shopping list via AI."
            )
            
    body = resp.json()
    if "choices" not in body or not body["choices"]:
        raise HTTPException(status_code=500, detail="AI returned invalid response format.")
        
    raw_text = body["choices"][0]["message"]["content"]
    
    # Parse JSON
    cleaned = re.sub(r"```(?:json)?\s*", "", raw_text).strip().rstrip("`")
    try:
        shopping_data = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\[.*]", cleaned, re.DOTALL)
        if match:
            try:
                shopping_data = json.loads(match.group())
            except json.JSONDecodeError:
                raise HTTPException(status_code=500, detail="AI returned unparseable output.")
        else:
            raise HTTPException(status_code=500, detail="AI returned unparseable output.")
    
    if not isinstance(shopping_data, list):
        raise HTTPException(status_code=500, detail="AI did not return a list.")
        
    # Save to DB
    payload_db = {
        "user_id": user_id,
        "items": shopping_data,
        "status": "pending",
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    res = await supabase.table(SHOPPING_LIST_TABLE).insert(payload_db).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to save shopping list.")
        
    return ShoppingListResponse(**res.data[0])


async def get_latest_shopping_list(user_id: str) -> ShoppingListResponse:
    supabase = await get_supabase()
    result = await supabase.table(SHOPPING_LIST_TABLE).select("*").eq("user_id", user_id).order("generated_at", desc=True).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="No shopping lists found.")
    return ShoppingListResponse(**result.data[0])


async def forward_shopping_list(user_id: str, list_id: str) -> dict:
    supabase = await get_supabase()
    # "POST /shopping/proposal — that system will be built later, so mock the call gracefully if unavailable"
    result = await supabase.table(SHOPPING_LIST_TABLE).select("*").eq("id", list_id).eq("user_id", user_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Shopping list not found.")
        
    shopping_list = result.data[0]
    
    # Mocking the call to the future Autonomous Shopping System
    shopping_service_url = os.getenv("SHOPPING_SERVICE_URL", "http://localhost:8001")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{shopping_service_url.rstrip('/')}/shopping/proposal",
                json=shopping_list,
                timeout=2.0
            )
            resp.raise_for_status()
            
            # If successful, mark as ordered
            await supabase.table(SHOPPING_LIST_TABLE).update({"status": "ordered"}).eq("id", list_id).execute()
            return {"detail": "Shopping list forwarded successfully."}
            
    except httpx.RequestError:
        # Graceful fallback when unavailable
        return {"detail": "Autonomous Shopping System is unavailable. Mocked successful forward.", "mocked": True}
    except httpx.HTTPStatusError as e:
        return {"detail": f"Autonomous Shopping System returned an error: {e.response.status_code}. Mocked successful forward.", "mocked": True}
