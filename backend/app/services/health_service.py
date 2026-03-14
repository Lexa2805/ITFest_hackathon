"""Service for managing health export data in Supabase."""

from __future__ import annotations

from datetime import datetime, timezone

from app.schemas.health import ParsedHealthMetrics, PhysicalStateResult
from app.services.supabase_client import supabase


async def save_health_data(
    user_id: str,
    parsed_metrics: ParsedHealthMetrics,
    physical_state: PhysicalStateResult,
) -> dict:
    """
    Save or update health export data for a user.
    Uses upsert to update if record exists, insert if not.
    """
    data = {
        "user_id": user_id,
        "parsed_metrics": parsed_metrics.model_dump(mode="json"),
        "physical_state": physical_state.model_dump(mode="json"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = (
        supabase.table("health_exports")
        .upsert(data, on_conflict="user_id")
        .execute()
    )

    if not result.data:
        raise Exception("Failed to save health data")

    return result.data[0]


async def get_health_data(user_id: str) -> dict | None:
    """
    Retrieve the latest health export data for a user.
    Returns None if no data exists.
    """
    result = (
        supabase.table("health_exports")
        .select("*")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .limit(1)
        .execute()
    )

    if not result.data:
        return None

    return result.data[0]
