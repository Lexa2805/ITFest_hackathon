"""
Trend service — queries historical health and nutrition data from Supabase
for sparkline chart rendering on the mobile home screen.

Health metrics (sleep_hours, steps, heart_rate) come from daily_checkins.
Nutrition metrics (calories, protein, carbs, fat) come from daily_logs
with meal_logs as a fallback aggregation source.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import List

from app.schemas.trends import TrendDataPoint
from app.services.supabase_client import get_supabase

logger = logging.getLogger(__name__)

# Mapping from metric name to (table, column) for health metrics in daily_checkins
_HEALTH_METRICS: dict[str, str] = {
    "sleep_hours": "sleep_hours",
    "steps": "steps",
    "heart_rate": "heart_rate",
}

# Mapping from metric name to column in daily_logs
_NUTRITION_DAILY_LOG_COLS: dict[str, str] = {
    "calories": "total_calories",
    "protein": "total_protein_g",
    "carbs": "total_carbs_g",
    "fat": "total_fat_g",
}

# Mapping from metric name to column in meal_logs (fallback aggregation)
_NUTRITION_MEAL_LOG_COLS: dict[str, str] = {
    "calories": "kcal",
    "protein": "protein",
    "carbs": "carbs",
    "fat": "fat",
}

VALID_WINDOWS = {7, 30}


async def get_trend_data(
    user_id: str, metric: str, window_days: int = 7
) -> List[TrendDataPoint]:
    """Return date/value pairs for the given metric over the window.

    Only dates with actual records are returned — no interpolation.
    Raises ValueError for unknown metrics or invalid windows.
    """
    if window_days not in VALID_WINDOWS:
        raise ValueError(f"window_days must be one of {VALID_WINDOWS}, got {window_days}")

    start_date = (date.today() - timedelta(days=window_days)).isoformat()

    if metric in _HEALTH_METRICS:
        return await _query_health_metric(user_id, metric, start_date)

    if metric in _NUTRITION_DAILY_LOG_COLS:
        return await _query_nutrition_metric(user_id, metric, start_date)

    raise ValueError(
        f"Unknown metric '{metric}'. "
        f"Valid metrics: {sorted(list(_HEALTH_METRICS) + list(_NUTRITION_DAILY_LOG_COLS))}"
    )


async def _query_health_metric(
    user_id: str, metric: str, start_date: str
) -> List[TrendDataPoint]:
    """Query daily_checkins for a health metric."""
    supabase = await get_supabase()
    column = _HEALTH_METRICS[metric]

    try:
        result = await (
            supabase.table("daily_checkins")
            .select(f"date, {column}")
            .eq("user_id", user_id)
            .gte("date", start_date)
            .order("date", desc=False)
            .execute()
        )
    except Exception as exc:
        logger.warning("Failed to query daily_checkins for %s: %s", metric, exc)
        return []

    points: List[TrendDataPoint] = []
    for row in result.data or []:
        value = row.get(column)
        if value is not None:
            points.append(TrendDataPoint(date=row["date"], value=float(value)))
    return points


async def _query_nutrition_metric(
    user_id: str, metric: str, start_date: str
) -> List[TrendDataPoint]:
    """Query daily_logs for a nutrition metric, falling back to meal_logs aggregation."""
    supabase = await get_supabase()
    dl_col = _NUTRITION_DAILY_LOG_COLS[metric]

    # Try daily_logs first (one row per user per day)
    try:
        result = await (
            supabase.table("daily_logs")
            .select(f"date, {dl_col}")
            .eq("user_id", user_id)
            .gte("date", start_date)
            .order("date", desc=False)
            .execute()
        )
        if result.data:
            points: List[TrendDataPoint] = []
            for row in result.data:
                value = row.get(dl_col)
                if value is not None:
                    points.append(TrendDataPoint(date=row["date"], value=float(value)))
            if points:
                return points
    except Exception as exc:
        logger.warning("Failed to query daily_logs for %s: %s", metric, exc)

    # Fallback: aggregate from meal_logs
    return await _aggregate_meal_logs(user_id, metric, start_date)


async def _aggregate_meal_logs(
    user_id: str, metric: str, start_date: str
) -> List[TrendDataPoint]:
    """Aggregate per-meal entries from meal_logs into daily totals."""
    supabase = await get_supabase()
    ml_col = _NUTRITION_MEAL_LOG_COLS[metric]

    try:
        result = await (
            supabase.table("meal_logs")
            .select(f"date, {ml_col}")
            .eq("user_id", user_id)
            .gte("date", start_date)
            .order("date", desc=False)
            .execute()
        )
    except Exception as exc:
        logger.warning("Failed to query meal_logs for %s: %s", metric, exc)
        return []

    # Group by date and sum
    daily_totals: dict[str, float] = {}
    for row in result.data or []:
        d = row["date"]
        value = row.get(ml_col)
        if value is not None:
            daily_totals[d] = daily_totals.get(d, 0.0) + float(value)

    return [
        TrendDataPoint(date=d, value=v)
        for d, v in sorted(daily_totals.items())
    ]
