"""Service helpers for user profile CRUD in Supabase."""

from __future__ import annotations

from datetime import datetime, timezone

from app.schemas.profile import ProfileUpsertRequest
from app.services.supabase_client import get_supabase


async def upsert_profile(user_id: str, profile: ProfileUpsertRequest) -> dict:
    """Create or update profile data for a user with upsert semantics."""
    supabase = await get_supabase()
    payload = {
        "user_id": user_id,
        "name": profile.name,
        "email": profile.email,
        "weight": profile.weight,
        "height": profile.height,
        "age": profile.age,
        "gender": profile.gender,
        "activity_level": profile.activity_level,
        "goal": profile.goal,
        "has_apple_watch": profile.has_apple_watch,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await supabase.table("profiles").upsert(payload, on_conflict="user_id").execute()
    if result.data:
        return result.data[0]

    fallback = await (
        supabase.table("profiles")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if fallback.data:
        return fallback.data[0]

    raise Exception("Failed to create or update profile")


async def get_profile(user_id: str) -> dict | None:
    """Fetch profile for a user; return None if no profile exists."""
    supabase = await get_supabase()
    result = await supabase.table("profiles").select("*").eq("user_id", user_id).limit(1).execute()
    if not result.data:
        return None
    return result.data[0]
