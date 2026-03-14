import datetime
from typing import Optional

from fastapi import HTTPException, status

from app.services.supabase_client import get_supabase
from app.schemas.nutrition import NutritionGoalCreate, NutritionGoalResponse, DailyLogResponse

GOALS_TABLE = "user_nutrition_goals"
LOGS_TABLE = "daily_logs"


def _safe_data(result) -> object:
    if result is None:
        return None
    return getattr(result, "data", None)


async def set_or_update_goal(user_id: str, goal: NutritionGoalCreate) -> NutritionGoalResponse:
    supabase = await get_supabase()
    # Check if a goal already exists
    result = await supabase.table(GOALS_TABLE).select("id").eq("user_id", user_id).maybe_single().execute()
    payload = {"user_id": user_id, **goal.model_dump(mode="json")}
    existing_goal = _safe_data(result)
    
    if existing_goal:
        # Update existing goal
        # Provide updated_at
        payload["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        updated = await supabase.table(GOALS_TABLE).update(payload).eq("user_id", user_id).execute()
        updated_data = _safe_data(updated)
        if not updated_data:
            raise HTTPException(status_code=500, detail="Failed to update goal.")
        return NutritionGoalResponse(**updated_data[0])
    
    # Insert new goal
    inserted = await supabase.table(GOALS_TABLE).insert(payload).execute()
    inserted_data = _safe_data(inserted)
    if not inserted_data:
        raise HTTPException(status_code=500, detail="Failed to set goal.")
    return NutritionGoalResponse(**inserted_data[0])


async def get_goal(user_id: str) -> NutritionGoalResponse:
    supabase = await get_supabase()
    result = await supabase.table(GOALS_TABLE).select("*").eq("user_id", user_id).maybe_single().execute()
    goal_data = _safe_data(result)
    if not goal_data:
        raise HTTPException(status_code=404, detail="Nutrition goals not set.")
    return NutritionGoalResponse(**goal_data)


async def _get_today_log(user_id: str) -> dict:
    supabase = await get_supabase()
    today_str = datetime.date.today().isoformat()
    result = await supabase.table(LOGS_TABLE).select("*").eq("user_id", user_id).eq("date", today_str).maybe_single().execute()
    log_data = _safe_data(result)
    if log_data:
        return log_data
    
    # Create empty log if not exists
    new_log = {
        "user_id": user_id,
        "date": today_str,
        "meals": [],
        "total_calories": 0,
        "total_protein_g": 0,
        "total_carbs_g": 0,
        "total_fat_g": 0,
    }
    inserted = await supabase.table(LOGS_TABLE).insert(new_log).execute()
    inserted_data = _safe_data(inserted)
    if not inserted_data:
        raise HTTPException(status_code=500, detail="Failed to initialize daily log.")
    return inserted_data[0]


async def log_recipe_meal(user_id: str, recipe: dict) -> DailyLogResponse:
    log_data = await _get_today_log(user_id)
    meals = log_data["meals"]
    
    new_meal = {
        "recipe_id": str(recipe["id"]),
        "name": recipe["name"],
        "calories": recipe["calories"],
        "protein_g": recipe["protein_g"],
        "carbs_g": recipe["carbs_g"],
        "fat_g": recipe["fat_g"],
        "logged_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    meals.append(new_meal)
    
    total_calories = log_data["total_calories"] + recipe["calories"]
    total_protein_g = log_data["total_protein_g"] + recipe["protein_g"]
    total_carbs_g = log_data["total_carbs_g"] + recipe["carbs_g"]
    total_fat_g = log_data["total_fat_g"] + recipe["fat_g"]
    
    supabase = await get_supabase()
    updated = await supabase.table(LOGS_TABLE).update({
        "meals": meals,
        "total_calories": total_calories,
        "total_protein_g": total_protein_g,
        "total_carbs_g": total_carbs_g,
        "total_fat_g": total_fat_g
    }).eq("id", log_data["id"]).execute()
    
    return await get_today_log_with_goals(user_id)


async def get_today_log_with_goals(user_id: str) -> DailyLogResponse:
    log_data = await _get_today_log(user_id)
    try:
        goal = await get_goal(user_id)
    except HTTPException:
        goal = None
        
    return _build_log_response(log_data, goal)


async def get_history_logs(user_id: str) -> list[DailyLogResponse]:
    supabase = await get_supabase()
    # Returns last 7 days
    result = await supabase.table(LOGS_TABLE).select("*").eq("user_id", user_id).order("date", desc=True).limit(7).execute()
    logs = _safe_data(result) or []
    
    try:
        goal = await get_goal(user_id)
    except HTTPException:
        goal = None
        
    return [_build_log_response(log, goal) for log in logs]


def _build_log_response(log_data: dict, goal: Optional[NutritionGoalResponse]) -> DailyLogResponse:
    response_data = {**log_data}
    if goal:
        response_data["goal_calories"] = goal.daily_calories
        response_data["goal_protein_g"] = goal.protein_g
        response_data["goal_carbs_g"] = goal.carbs_g
        response_data["goal_fat_g"] = goal.fat_g
        response_data["remaining_calories"] = goal.daily_calories - log_data["total_calories"]
        response_data["remaining_protein_g"] = goal.protein_g - log_data["total_protein_g"]
        response_data["remaining_carbs_g"] = goal.carbs_g - log_data["total_carbs_g"]
        response_data["remaining_fat_g"] = goal.fat_g - log_data["total_fat_g"]
    
    return DailyLogResponse(**response_data)
