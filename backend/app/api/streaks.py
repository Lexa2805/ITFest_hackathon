"""Streaks API router — consecutive-day streak tracking."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header

from app.api.fridge import get_current_user_id
from app.schemas.streaks import StreakResponse
from app.services import streak_service

router = APIRouter(prefix="/streaks", tags=["streaks"])


@router.get("", response_model=StreakResponse, summary="Get current streak counts")
async def get_streaks(
    user_id: str = Depends(get_current_user_id),
    x_timezone: str = Header(default="UTC", alias="X-Timezone"),
) -> StreakResponse:
    return await streak_service.get_streaks(user_id, x_timezone)
