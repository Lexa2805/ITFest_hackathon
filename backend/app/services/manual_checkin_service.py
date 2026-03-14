"""Service logic for manual daily check-ins and downstream agent forwarding."""

from __future__ import annotations

import os
from datetime import date, datetime, timezone
from uuid import uuid4

import httpx

from app.schemas.profile import DownstreamCallResult, ManualHealthDataRequest
from app.services.physical_state_service import calculate_physical_state
from app.services.supabase_client import supabase


AGENT_SERVICE_BASE_URL = os.getenv("AGENT_SERVICE_BASE_URL", "http://localhost:8000").rstrip("/")
PRIMARY_CHECKINS_TABLE = "daily_checkins"
LEGACY_CHECKINS_TABLE = "daily_logs"


def _looks_like_missing_table_error(exc: Exception, table_name: str) -> bool:
    text = str(exc)
    return (
        "PGRST205" in text
        and "Could not find the table" in text
        and table_name in text
    )


def _build_manual_saved_payload(
    user_id: str,
    checkin_date: date,
    payload: ManualHealthDataRequest,
    physical_state_score: int,
    *,
    source_row: dict | None = None,
) -> dict:
    return {
        "id": (source_row or {}).get("id") or str(uuid4()),
        "user_id": user_id,
        "date": checkin_date.isoformat(),
        "heart_rate": payload.heart_rate,
        "sleep_hours": payload.sleep_hours,
        "steps": payload.steps,
        "calories": payload.calories,
        "mood": payload.mood,
        "stress_level": payload.stress_level,
        "physical_state_score": physical_state_score,
        "created_at": (source_row or {}).get("created_at") or datetime.now(timezone.utc).isoformat(),
    }


def _save_manual_checkin_legacy_daily_logs(
    user_id: str,
    payload: ManualHealthDataRequest,
    checkin_date: date,
    physical_state_score: int,
) -> dict:
    # Legacy compatibility mode for projects that still have daily_logs but not daily_checkins.
    row = {
        "user_id": user_id,
        "date": checkin_date.isoformat(),
        "meals": [
            {
                "type": "manual_health_checkin",
                "heart_rate": payload.heart_rate,
                "sleep_hours": payload.sleep_hours,
                "steps": payload.steps,
                "calories": payload.calories,
                "mood": payload.mood,
                "stress_level": payload.stress_level,
                "physical_state_score": physical_state_score,
                "logged_at": datetime.now(timezone.utc).isoformat(),
            }
        ],
        "total_calories": int(payload.calories or 0),
        "total_protein_g": 0,
        "total_carbs_g": 0,
        "total_fat_g": 0,
    }

    saved_row: dict | None = None

    try:
        result = (
            supabase.table(LEGACY_CHECKINS_TABLE)
            .upsert(row, on_conflict="user_id,date")
            .execute()
        )
        if result.data:
            saved_row = result.data[0]
    except Exception:
        # If legacy table has no compound unique key, fallback to insert/select flow.
        inserted = supabase.table(LEGACY_CHECKINS_TABLE).insert(row).execute()
        if inserted.data:
            saved_row = inserted.data[0]

    if not saved_row:
        fallback = (
            supabase.table(LEGACY_CHECKINS_TABLE)
            .select("*")
            .eq("user_id", user_id)
            .eq("date", checkin_date.isoformat())
            .limit(1)
            .execute()
        )
        if fallback.data:
            saved_row = fallback.data[0]

    return _build_manual_saved_payload(
        user_id=user_id,
        checkin_date=checkin_date,
        payload=payload,
        physical_state_score=physical_state_score,
        source_row=saved_row,
    )


async def save_manual_checkin(user_id: str, payload: ManualHealthDataRequest) -> dict:
    """Store one daily check-in and compute physical state score using health-system logic."""
    checkin_date = payload.date or date.today()
    physical_state = calculate_physical_state(
        heart_rates=[payload.heart_rate],
        step_values=[float(payload.steps)],
        sleep_hours=[payload.sleep_hours],
        hrv_values=[],
    )

    row = {
        "user_id": user_id,
        "date": checkin_date.isoformat(),
        "heart_rate": payload.heart_rate,
        "sleep_hours": payload.sleep_hours,
        "steps": payload.steps,
        "calories": payload.calories,
        "mood": payload.mood,
        "stress_level": payload.stress_level,
        "physical_state_score": physical_state.score,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        result = (
            supabase.table(PRIMARY_CHECKINS_TABLE)
            .upsert(row, on_conflict="user_id,date")
            .execute()
        )

        if result.data:
            saved = result.data[0]
        else:
            fallback = (
                supabase.table(PRIMARY_CHECKINS_TABLE)
                .select("*")
                .eq("user_id", user_id)
                .eq("date", checkin_date.isoformat())
                .limit(1)
                .execute()
            )
            if not fallback.data:
                raise Exception("Failed to save manual check-in")
            saved = fallback.data[0]
    except Exception as exc:
        if _looks_like_missing_table_error(exc, PRIMARY_CHECKINS_TABLE):
            saved = _save_manual_checkin_legacy_daily_logs(
                user_id=user_id,
                payload=payload,
                checkin_date=checkin_date,
                physical_state_score=physical_state.score,
            )
        else:
            raise

    saved["physical_state_score"] = physical_state.score
    return saved


async def forward_manual_checkin_to_agents(
    payload: ManualHealthDataRequest,
    physical_state_score: int,
) -> list[DownstreamCallResult]:
    """Forward manual check-in data to fitness, mood, and nutrition agents."""
    calls: list[tuple[str, dict]] = [
        (
            "/fitness-agent",
            {
                "activity": {
                    "steps": payload.steps,
                    "calories": payload.calories,
                },
                "physical_state_score": physical_state_score,
            },
        ),
        (
            "/mood-agent",
            {
                "mood": payload.mood,
                "stress_level": payload.stress_level,
                "sleep_hours": payload.sleep_hours,
                "heart_rate": payload.heart_rate,
            },
        ),
        (
            "/nutrition-agent",
            {
                "calories": payload.calories,
                "activity": {
                    "steps": payload.steps,
                    "heart_rate": payload.heart_rate,
                },
            },
        ),
    ]

    results: list[DownstreamCallResult] = []
    async with httpx.AsyncClient(timeout=8.0) as client:
        for endpoint, body in calls:
            try:
                response = await client.post(f"{AGENT_SERVICE_BASE_URL}{endpoint}", json=body)
                is_success = 200 <= response.status_code < 300
                results.append(
                    DownstreamCallResult(
                        endpoint=endpoint,
                        success=is_success,
                        status_code=response.status_code,
                        detail=None if is_success else response.text[:300],
                    )
                )
            except Exception as exc:
                results.append(
                    DownstreamCallResult(
                        endpoint=endpoint,
                        success=False,
                        status_code=None,
                        detail=str(exc),
                    )
                )

    return results
