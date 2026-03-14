"""Expiry recipes & alerts API router."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends

from app.api.fridge import get_current_user_id
from app.schemas.expiry_recipes import ExpiryAlertItem, ExpiryRecipeResponse
from app.services import expiry_recipe_service

router = APIRouter(tags=["expiry-recipes"])


@router.get(
    "/recipes/expiry-based",
    response_model=ExpiryRecipeResponse,
    summary="Get recipes prioritising expiring fridge items",
)
async def get_expiry_recipes(
    user_id: str = Depends(get_current_user_id),
) -> ExpiryRecipeResponse:
    return await expiry_recipe_service.get_expiry_recipes(user_id)


@router.get(
    "/fridge/expiry-alerts",
    response_model=List[ExpiryAlertItem],
    summary="Get urgent expiry alerts for fridge items",
)
async def get_expiry_alerts(
    user_id: str = Depends(get_current_user_id),
) -> List[ExpiryAlertItem]:
    return await expiry_recipe_service.get_expiry_alerts(user_id)
