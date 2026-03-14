"""Meal log persistence and daily summary aggregation service."""

from __future__ import annotations

import logging
from datetime import date

from fastapi import HTTPException, status
from postgrest.exceptions import APIError

from app.schemas.nutrition_agent import DailyMacroSummary, DailySummaryResponse, MealLogRequest, MealLogResponse
from app.services.supabase_client import get_supabase

logger = logging.getLogger(__name__)

LOGS_TABLE = "meal_logs"
PROFILES_TABLE = "profiles"


async def log_meal(user_id: str, body: MealLogRequest) -> MealLogResponse:
    """Save one eaten meal to the meal_logs table."""
    supabase = await get_supabase()
    payload = {
        "user_id": user_id,
        "date": body.date.isoformat(),
        "meal_name": body.meal_name,
        "ingredients_json": [ingredient.model_dump(mode="json") for ingredient in body.ingredients],
        "kcal": body.kcal,
        "protein": body.protein,
        "fat": body.fat,
        "carbs": body.carbs,
        "time_of_day": body.time_of_day,
    }
    result = await supabase.table(LOGS_TABLE).insert(payload).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save meal log.",
        )
    return MealLogResponse(**result.data[0])


async def get_daily_summary(user_id: str, summary_date: date) -> DailySummaryResponse:
    """Aggregate logged meals and compare totals against profile targets."""
    supabase = await get_supabase()
    try:
        logs_result = await (
            supabase.table(LOGS_TABLE)
            .select("*")
            .eq("user_id", user_id)
            .eq("date", summary_date.isoformat())
            .order("created_at")
            .execute()
        )
        meals = [MealLogResponse(**row) for row in (logs_result.data or [])]
    except APIError as exc:
        logger.warning("meal_logs query returned no content, treating as empty: %s", exc)
        meals = []

    total_kcal = sum(meal.kcal for meal in meals)
    total_protein = sum(meal.protein for meal in meals)
    total_fat = sum(meal.fat for meal in meals)
    total_carbs = sum(meal.carbs for meal in meals)

    try:
        profile_result = await (
            supabase.table(PROFILES_TABLE)
            .select("daily_kcal_target, protein_target_g, fat_target_g, carbs_target_g")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        profile = profile_result.data[0] if profile_result.data else {}
    except APIError as exc:
        logger.warning("profiles query failed, using defaults: %s", exc)
        profile = {}

    kcal_target = int(profile.get("daily_kcal_target") or 0)
    protein_target = int(profile.get("protein_target_g") or 0)
    fat_target = int(profile.get("fat_target_g") or 0)
    carbs_target = int(profile.get("carbs_target_g") or 0)

    remaining_kcal = kcal_target - total_kcal
    status_label = _calculate_status(total_kcal=total_kcal, kcal_target=kcal_target)

    return DailySummaryResponse(
        date=summary_date,
        meals=meals,
        kcal=DailyMacroSummary(consumed=total_kcal, target=kcal_target),
        protein=DailyMacroSummary(consumed=total_protein, target=protein_target),
        fat=DailyMacroSummary(consumed=total_fat, target=fat_target),
        carbs=DailyMacroSummary(consumed=total_carbs, target=carbs_target),
        remaining_kcal=remaining_kcal,
        status=status_label,
    )


def _calculate_status(total_kcal: int, kcal_target: int) -> str:
    """Classify progress into On track / Under eating / Over eating."""
    if kcal_target <= 0:
        return "On track"

    lower_bound = int(kcal_target * 0.9)
    upper_bound = int(kcal_target * 1.1)
    if total_kcal < lower_bound:
        return "Under eating"
    if total_kcal > upper_bound:
        return "Over eating"
    return "On track"
