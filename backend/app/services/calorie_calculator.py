"""Calorie and macro target calculator with profile persistence helpers."""

from __future__ import annotations

from fastapi import HTTPException, status

from app.schemas.nutrition_agent import CalorieCalculationResponse
from app.services.supabase_client import supabase

_ACTIVITY_MULTIPLIERS: dict[str, float] = {
    "sedentary": 1.2,
    "lightly active": 1.375,
    "moderately active": 1.55,
    "very active": 1.725,
}


def calculate_bmr(weight: float, height: float, age: int, gender: str) -> float:
    """Compute BMR with Mifflin-St Jeor formula."""
    if gender == "male":
        return (10 * weight) + (6.25 * height) - (5 * age) + 5
    return (10 * weight) + (6.25 * height) - (5 * age) - 161


def calculate_tdee(bmr: float, activity_level: str) -> float:
    """Compute TDEE using activity multipliers."""
    multiplier = _ACTIVITY_MULTIPLIERS.get(activity_level)
    if multiplier is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported activity level: {activity_level}",
        )
    return bmr * multiplier


def adjust_calories_for_goal(tdee: float, goal: str) -> int:
    """Adjust daily calories based on the user's goal."""
    adjustments = {
        "lose weight": -500,
        "maintain": 0,
        "build muscle": 300,
        "improve endurance": 200,
    }
    if goal not in adjustments:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported goal: {goal}",
        )
    return max(1200, round(tdee + adjustments[goal]))


def calculate_macros(weight: float, goal: str, daily_kcal_target: int) -> tuple[int, int, int]:
    """Compute daily protein/fat/carbs targets in grams."""
    if goal == "build muscle":
        protein_g = round(weight * 1.6)
    elif goal == "improve endurance":
        protein_g = round(weight * 2.0)
    else:
        protein_g = round(weight * 1.2)

    fat_g = round((daily_kcal_target * 0.25) / 9)
    used_kcal = (protein_g * 4) + (fat_g * 9)
    carbs_g = max(0, round((daily_kcal_target - used_kcal) / 4))
    return protein_g, fat_g, carbs_g


async def calculate_daily_targets(
    *,
    weight: float,
    height: float,
    age: int,
    gender: str,
    activity_level: str,
    goal: str,
) -> CalorieCalculationResponse:
    """Run complete calorie + macro calculation pipeline."""
    bmr = calculate_bmr(weight=weight, height=height, age=age, gender=gender)
    tdee = calculate_tdee(bmr=bmr, activity_level=activity_level)
    daily_kcal_target = adjust_calories_for_goal(tdee=tdee, goal=goal)
    protein_g, fat_g, carbs_g = calculate_macros(
        weight=weight,
        goal=goal,
        daily_kcal_target=daily_kcal_target,
    )

    return CalorieCalculationResponse(
        bmr=round(bmr, 2),
        tdee=round(tdee, 2),
        daily_kcal_target=daily_kcal_target,
        protein_g=protein_g,
        fat_g=fat_g,
        carbs_g=carbs_g,
    )


async def save_targets_to_profile(user_id: str, results: CalorieCalculationResponse) -> dict:
    """Persist the calculated targets on the user's profile row."""
    payload = {
        "user_id": user_id,
        "daily_kcal_target": results.daily_kcal_target,
        "protein_target_g": results.protein_g,
        "fat_target_g": results.fat_g,
        "carbs_target_g": results.carbs_g,
    }
    response = supabase.table("profiles").upsert(payload, on_conflict="user_id").execute()
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save calorie targets to profile.",
        )
    return response.data[0]
