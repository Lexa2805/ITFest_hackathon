"""Briefing API router — daily AI-generated briefing."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header

from app.api.fridge import get_current_user_id
from app.schemas.briefing import BriefingResponse
from app.services import briefing_service

router = APIRouter(prefix="/briefing", tags=["briefing"])


@router.get("/today", response_model=BriefingResponse, summary="Get today's AI briefing")
async def get_today_briefing(
    user_id: str = Depends(get_current_user_id),
    x_timezone: str = Header(default="UTC", alias="X-Timezone"),
) -> BriefingResponse:
    return await briefing_service.get_or_generate_briefing(user_id, x_timezone)
