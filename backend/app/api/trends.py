"""Trends API router — historical metric data for sparkline charts."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.fridge import get_current_user_id
from app.schemas.trends import TrendResponse
from app.services import trend_service

router = APIRouter(prefix="/trends", tags=["trends"])


@router.get("/{metric}", response_model=TrendResponse, summary="Get trend data for a metric")
async def get_trend(
    metric: str,
    window: int = Query(default=7, description="Window in days (7 or 30)"),
    user_id: str = Depends(get_current_user_id),
) -> TrendResponse:
    try:
        data_points = await trend_service.get_trend_data(user_id, metric, window)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return TrendResponse(metric=metric, window_days=window, data_points=data_points)
