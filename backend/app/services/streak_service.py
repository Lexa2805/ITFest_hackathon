"""
Streak service — computes consecutive-day streaks for check-ins,
meals logged, and calorie goal adherence.

All calendar-day logic uses the user's local timezone (from X-Timezone header),
NOT UTC, to avoid streaks breaking at midnight UTC for non-UTC users.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from datetime import timezone as tz
from typing import List
from zoneinfo import ZoneInfo

from app.schemas.streaks import StreakInfo, StreakResponse
from app.services.supabase_client import get_supabase

logger = logging.getLogger(__name__)

STREAKS_TABLE = "user_streaks"


def _user_local_today(timezone_str: str) -> date:
    """Compute the user's local date from their IANA timezone string."""
    try:
        user_tz = ZoneInfo(timezone_str)
    except (KeyError, Exception):
        user_tz = tz.utc
    return datetime.now(user_tz).date()


def _compute_streak(dates: List[date], user_today: date) -> int:
    """Count consecutive calendar days ending on user_today or user_today - 1.

    ``dates`` must be a sorted list of distinct date objects.
    Returns 0 if the most recent date is more than 1 day before user_today.
    """
    if not dates:
        return 0

    most_recent = dates[-1]
    # Streak is only valid if the last active date is today or yesterday
    if (user_today - most_recent).days > 1:
        return 0

    streak = 1
    for i in range(len(dates) - 1, 0, -1):
        if (dates[i] - dates[i - 1]).days == 1:
            streak += 1
        else:
            break

    return streak


async def get_streaks(user_id: str, timezone: str) -> StreakResponse:
    """Compute current streak counts for checkins, meals, and goal adherence.

    Uses the user's local timezone for calendar day boundaries.
    Persists results to user_streaks table.
    """
    user_today = _user_local_today(timezone)

    checkin_dates = await _get_checkin_dates(user_id)
    meal_dates = await _get_meal_logged_dates(user_id)
    calorie_dates = await _get_calorie_goal_dates(user_id)

    checkin_streak = _compute_streak(checkin_dates, user_today)
    meal_streak = _compute_streak(meal_dates, user_today)
    calorie_streak = _compute_streak(calorie_dates, user_today)

    checkin_info = StreakInfo(
        activity_type="checkin",
        current_streak=checkin_streak,
        last_active_date=checkin_dates[-1] if checkin_dates else None,
    )
    meal_info = StreakInfo(
        activity_type="meal_logged",
        current_streak=meal_streak,
        last_active_date=meal_dates[-1] if meal_dates else None,
    )
    calorie_info = StreakInfo(
        activity_type="calorie_goal",
        current_streak=calorie_streak,
        last_active_date=calorie_dates[-1] if calorie_dates else None,
    )

    # Persist streaks to DB
    for info in (checkin_info, meal_info, calorie_info):
        await _persist_streak(user_id, info)

    return StreakResponse(
        checkin=checkin_info,
        meal_logged=meal_info,
        calorie_goal=calorie_info,
    )


async def _get_checkin_dates(user_id: str) -> List[date]:
    """Get sorted distinct dates where the user submitted a daily check-in."""
    supabase = await get_supabase()
    try:
        result = await (
            supabase.table("daily_checkins")
            .select("date")
            .eq("user_id", user_id)
            .order("date", desc=False)
            .execute()
        )
        return [
            date.fromisoformat(row["date"]) if isinstance(row["date"], str) else row["date"]
            for row in (result.data or [])
        ]
    except Exception as exc:
        logger.warning("Failed to fetch checkin dates: %s", exc)
        return []


async def _get_meal_logged_dates(user_id: str) -> List[date]:
    """Get sorted distinct dates where the user logged at least one meal."""
    supabase = await get_supabase()
    try:
        result = await (
            supabase.table("meal_logs")
            .select("date")
            .eq("user_id", user_id)
            .order("date", desc=False)
            .execute()
        )
        # meal_logs can have multiple rows per day — deduplicate
        seen: set[date] = set()
        dates: List[date] = []
        for row in result.data or []:
            d = date.fromisoformat(row["date"]) if isinstance(row["date"], str) else row["date"]
            if d not in seen:
                seen.add(d)
                dates.append(d)
        return dates
    except Exception as exc:
        logger.warning("Failed to fetch meal_logged dates: %s", exc)
        return []


async def _get_calorie_goal_dates(user_id: str) -> List[date]:
    """Get sorted distinct dates where the user met their daily calorie goal.

    A day counts if consumed calories >= daily_kcal_target.
    Checks daily_logs first, then falls back to aggregating meal_logs.
    """
    supabase = await get_supabase()
    # Fetch the user's calorie target
    target = None
    try:
        prof = await (
            supabase.table("profiles")
            .select("daily_kcal_target")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if prof.data:
            target = prof.data.get("daily_kcal_target")
    except Exception as exc:
        logger.warning("Failed to fetch profile for calorie goal: %s", exc)

    if target is None:
        return []

    # Try daily_logs
    dates = await _calorie_goal_from_daily_logs(user_id, target)
    if dates:
        return dates

    # Fallback: aggregate meal_logs
    return await _calorie_goal_from_meal_logs(user_id, target)


async def _calorie_goal_from_daily_logs(user_id: str, target: int) -> List[date]:
    """Check daily_logs for days where total_calories >= target."""
    supabase = await get_supabase()
    try:
        result = await (
            supabase.table("daily_logs")
            .select("date, total_calories")
            .eq("user_id", user_id)
            .gte("total_calories", target)
            .order("date", desc=False)
            .execute()
        )
        return [
            date.fromisoformat(row["date"]) if isinstance(row["date"], str) else row["date"]
            for row in (result.data or [])
        ]
    except Exception as exc:
        logger.warning("Failed to fetch daily_logs for calorie goal: %s", exc)
        return []


async def _calorie_goal_from_meal_logs(user_id: str, target: int) -> List[date]:
    """Aggregate meal_logs per day and return dates where sum >= target."""
    supabase = await get_supabase()
    try:
        result = await (
            supabase.table("meal_logs")
            .select("date, kcal")
            .eq("user_id", user_id)
            .order("date", desc=False)
            .execute()
        )
    except Exception as exc:
        logger.warning("Failed to fetch meal_logs for calorie goal: %s", exc)
        return []

    daily_totals: dict[str, int] = {}
    for row in result.data or []:
        d = row["date"]
        daily_totals[d] = daily_totals.get(d, 0) + (row.get("kcal") or 0)

    return [
        date.fromisoformat(d) if isinstance(d, str) else d
        for d, total in sorted(daily_totals.items())
        if total >= target
    ]


async def _persist_streak(user_id: str, info: StreakInfo) -> None:
    """Upsert streak data to user_streaks table."""
    supabase = await get_supabase()
    row = {
        "user_id": user_id,
        "activity_type": info.activity_type,
        "current_streak": info.current_streak,
        "last_active_date": info.last_active_date.isoformat() if info.last_active_date else None,
        "updated_at": datetime.now(tz.utc).isoformat(),
    }
    try:
        await supabase.table(STREAKS_TABLE).upsert(
            row, on_conflict="user_id,activity_type"
        ).execute()
    except Exception as exc:
        logger.warning("Failed to persist streak for %s: %s", info.activity_type, exc)
