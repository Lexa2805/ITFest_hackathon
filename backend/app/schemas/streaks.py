"""Pydantic models for the /streaks endpoints."""

from datetime import date as dt_date
from typing import Optional

from pydantic import BaseModel


class StreakInfo(BaseModel):
    """Streak data for a single activity type."""
    activity_type: str
    current_streak: int
    last_active_date: Optional[dt_date] = None


class StreakResponse(BaseModel):
    """API response containing all streak counts."""
    checkin: StreakInfo
    meal_logged: StreakInfo
    calorie_goal: StreakInfo
