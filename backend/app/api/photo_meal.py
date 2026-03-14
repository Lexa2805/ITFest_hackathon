"""Photo meal logging API router — AI-powered meal photo analysis and confirmation."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.fridge import get_current_user_id
from app.schemas.photo_meal import PhotoMealConfirmRequest, PhotoMealEstimate
from app.services import photo_meal_service

router = APIRouter(prefix="/meals", tags=["photo-meal"])


@router.post(
    "/photo-log",
    response_model=PhotoMealEstimate,
    summary="Submit a meal photo for AI macro estimation",
)
async def analyze_photo(
    file: UploadFile = File(..., description="Meal photo (JPEG/PNG)"),
    user_id: str = Depends(get_current_user_id),
) -> PhotoMealEstimate:
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image must be smaller than 10 MB.",
        )
    return await photo_meal_service.analyze_meal_photo(contents)


@router.post(
    "/photo-log/confirm",
    status_code=status.HTTP_201_CREATED,
    summary="Confirm and save an estimated meal",
)
async def confirm_meal(
    body: PhotoMealConfirmRequest,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    return await photo_meal_service.confirm_and_log_meal(user_id, body)
