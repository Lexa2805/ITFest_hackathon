"""Profile API routes for profile CRUD and manual daily health check-ins."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.fridge import get_current_user_id
from app.schemas.profile import (
    ManualHealthDataRequest,
    ManualHealthDataResponse,
    ProfileResponse,
    ProfileUpsertRequest,
)
from app.services import manual_checkin_service, profile_service

router = APIRouter(tags=["profile"])


@router.post(
    "/profile",
    response_model=ProfileResponse,
    summary="Create or update user profile",
)
async def upsert_profile(
    body: ProfileUpsertRequest,
    user_id: str = Depends(get_current_user_id),
) -> ProfileResponse:
    """Create or update the authenticated user's profile."""
    try:
        saved_profile = await profile_service.upsert_profile(user_id, body)
        return ProfileResponse(**saved_profile)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save profile: {exc}",
        )


@router.get(
    "/profile/{user_id}",
    response_model=ProfileResponse,
    summary="Get profile by user id",
)
async def get_profile(
    user_id: str,
    current_user_id: str = Depends(get_current_user_id),
) -> ProfileResponse:
    """Get profile for a user; only the authenticated user can fetch their own profile."""
    if user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own profile.",
        )

    profile = await profile_service.get_profile(user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found.",
        )

    return ProfileResponse(**profile)


@router.post(
    "/manual-health-data",
    response_model=ManualHealthDataResponse,
    summary="Submit manual daily health check-in",
)
async def submit_manual_health_data(
    body: ManualHealthDataRequest,
    user_id: str = Depends(get_current_user_id),
) -> ManualHealthDataResponse:
    """Save manual check-in, compute physical score, and forward data to AI agents."""
    try:
        saved = await manual_checkin_service.save_manual_checkin(user_id, body)

        downstream_calls = await manual_checkin_service.forward_manual_checkin_to_agents(
            body,
            physical_state_score=saved["physical_state_score"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit manual health data: {exc}",
        )

    return ManualHealthDataResponse(
        id=saved["id"],
        user_id=saved["user_id"],
        date=saved["date"],
        heart_rate=saved["heart_rate"],
        sleep_hours=saved["sleep_hours"],
        steps=saved["steps"],
        calories=saved.get("calories"),
        mood=saved["mood"],
        stress_level=saved["stress_level"],
        physical_state_score=saved["physical_state_score"],
        created_at=saved.get("created_at"),
        downstream_calls=downstream_calls,
    )
