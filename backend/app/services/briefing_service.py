"""
Briefing service — aggregates user data and calls GPT 5.1 via OpenRouter
to generate a personalized daily narrative briefing.

Falls back to rule-based generation when the AI is unavailable.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import date, datetime, timezone as tz
from zoneinfo import ZoneInfo

import httpx
from dotenv import load_dotenv

from app.schemas.briefing import BriefingDataPayload, BriefingResponse
from app.services.supabase_client import get_supabase

load_dotenv()

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY: str = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
BRIEFING_MODEL = "openai/gpt-5.1"
GPT_TIMEOUT = 15.0

BRIEFINGS_TABLE = "daily_briefings"

SYSTEM_PROMPT = """You are a concise, friendly health coach for the Personal Health OS app.
The user will provide their latest health metrics, nutrition data, and fridge inventory.
Your job is to produce a single personalized narrative paragraph (3-5 sentences) that:
- Highlights key health observations (sleep quality, activity level, heart rate trends)
- Notes nutrition progress toward daily targets
- Mentions any fridge items expiring soon and suggests using them
- Gives one actionable tip for the day
- If any data category is missing, skip it gracefully — never mention missing data negatively

Keep the tone warm, motivating, and practical. Do NOT use bullet points or headers.
Return ONLY the narrative paragraph text — no JSON, no markdown."""


def _user_local_date(timezone_str: str) -> date:
    """Compute the user's local date from their IANA timezone string."""
    try:
        user_tz = ZoneInfo(timezone_str)
    except (KeyError, Exception):
        user_tz = tz.utc
    return datetime.now(user_tz).date()


async def get_or_generate_briefing(user_id: str, timezone: str) -> BriefingResponse:
    """Return today's cached briefing or generate a new one."""
    supabase = await get_supabase()
    user_today = _user_local_date(timezone)

    # Check cache
    try:
        cached = await (
            supabase.table(BRIEFINGS_TABLE)
            .select("*")
            .eq("user_id", user_id)
            .eq("date", user_today.isoformat())
            .limit(1)
            .execute()
        )
    except Exception as exc:
        logger.warning("Failed to fetch cached briefing: %s", exc)
        cached = None
    if cached is not None and cached.data:
        row_data = cached.data[0]
        return BriefingResponse(
            narrative=row_data["narrative"],
            source=row_data["source"],
            generated_at=row_data["created_at"],
            date=row_data["date"],
        )

    # Aggregate data
    payload = await _aggregate_user_data(user_id, user_today)

    # Try GPT, fall back to rule-based
    source = "gpt"
    try:
        narrative = await _call_gpt_for_briefing(payload)
    except Exception as exc:
        logger.warning("GPT briefing failed, using fallback: %s", exc)
        narrative = _generate_fallback_briefing(payload)
        source = "fallback"

    # Cache to DB
    now = datetime.now(tz.utc)
    row = {
        "user_id": user_id,
        "date": user_today.isoformat(),
        "narrative": narrative,
        "data_snapshot": payload.model_dump(mode="json"),
        "source": source,
        "created_at": now.isoformat(),
    }
    try:
        await supabase.table(BRIEFINGS_TABLE).insert(row).execute()
    except Exception as exc:
        logger.warning("Failed to cache briefing: %s", exc)

    return BriefingResponse(
        narrative=narrative,
        source=source,
        generated_at=now,
        date=user_today,
    )


async def _aggregate_user_data(user_id: str, user_today: date) -> BriefingDataPayload:
    """Pull health, nutrition, fridge data from Supabase."""
    supabase = await get_supabase()
    today_str = user_today.isoformat()

    # --- health_exports (single row per user) ---
    sleep_hours = None
    avg_heart_rate = None
    steps = None
    hrv = None
    physical_state_score = None

    try:
        he_result = await (
            supabase.table("health_exports")
            .select("parsed_metrics, physical_state")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if he_result.data:
            pm = he_result.data[0].get("parsed_metrics") or {}
            ps = he_result.data[0].get("physical_state") or {}
            sleep_hours = pm.get("sleep_hours")
            avg_heart_rate = pm.get("avg_heart_rate")
            steps = pm.get("steps")
            hrv = pm.get("hrv")
            physical_state_score = ps.get("score")
    except Exception as exc:
        logger.warning("Failed to fetch health_exports: %s", exc)

    # --- daily_checkins (today's row, may override health_exports) ---
    try:
        dc_result = await (
            supabase.table("daily_checkins")
            .select("heart_rate, sleep_hours, steps, physical_state_score")
            .eq("user_id", user_id)
            .eq("date", today_str)
            .limit(1)
            .execute()
        )
        if dc_result.data:
            dc = dc_result.data[0]
            if dc.get("sleep_hours") is not None:
                sleep_hours = dc["sleep_hours"]
            if dc.get("heart_rate") is not None:
                avg_heart_rate = dc["heart_rate"]
            if dc.get("steps") is not None:
                steps = dc["steps"]
            if dc.get("physical_state_score") is not None:
                physical_state_score = dc["physical_state_score"]
    except Exception as exc:
        logger.warning("Failed to fetch daily_checkins: %s", exc)

    # --- profiles (nutrition targets) ---
    daily_kcal_target = None
    try:
        prof_result = await (
            supabase.table("profiles")
            .select("daily_kcal_target, protein_target_g, fat_target_g, carbs_target_g")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if prof_result.data:
            daily_kcal_target = prof_result.data[0].get("daily_kcal_target")
    except Exception as exc:
        logger.warning("Failed to fetch profiles: %s", exc)

    # --- daily_logs (today's aggregate) ---
    consumed_kcal_today = None
    consumed_protein_today = None
    consumed_carbs_today = None
    consumed_fat_today = None

    try:
        dl_result = await (
            supabase.table("daily_logs")
            .select("total_calories, total_protein_g, total_carbs_g, total_fat_g")
            .eq("user_id", user_id)
            .eq("date", today_str)
            .limit(1)
            .execute()
        )
        if dl_result.data:
            consumed_kcal_today = dl_result.data[0].get("total_calories")
            consumed_protein_today = dl_result.data[0].get("total_protein_g")
            consumed_carbs_today = dl_result.data[0].get("total_carbs_g")
            consumed_fat_today = dl_result.data[0].get("total_fat_g")
    except Exception as exc:
        logger.warning("Failed to fetch daily_logs: %s", exc)

    # --- meal_logs (today's per-meal entries, supplement daily_logs if absent) ---
    if consumed_kcal_today is None:
        try:
            ml_result = await (
                supabase.table("meal_logs")
                .select("kcal, protein, fat, carbs")
                .eq("user_id", user_id)
                .eq("date", today_str)
                .execute()
            )
            if ml_result.data:
                consumed_kcal_today = sum(m.get("kcal", 0) for m in ml_result.data)
                consumed_protein_today = sum(m.get("protein", 0) for m in ml_result.data)
                consumed_carbs_today = sum(m.get("carbs", 0) for m in ml_result.data)
                consumed_fat_today = sum(m.get("fat", 0) for m in ml_result.data)
        except Exception as exc:
            logger.warning("Failed to fetch meal_logs: %s", exc)

    # --- fridge_items ---
    fridge_items: list[dict] = []
    expiring_items: list[dict] = []

    try:
        fi_result = await (
            supabase.table("fridge_items")
            .select("name, quantity, unit, category, expiry_date")
            .eq("user_id", user_id)
            .execute()
        )
        for item in (fi_result.data or []):
            fridge_items.append(item)
            expiry = item.get("expiry_date")
            if expiry:
                try:
                    exp_date = date.fromisoformat(expiry) if isinstance(expiry, str) else expiry
                    if (exp_date - user_today).days <= 2:
                        expiring_items.append(item)
                except (ValueError, TypeError):
                    pass
    except Exception as exc:
        logger.warning("Failed to fetch fridge_items: %s", exc)

    return BriefingDataPayload(
        sleep_hours=sleep_hours,
        avg_heart_rate=avg_heart_rate,
        steps=steps,
        hrv=hrv,
        physical_state_score=physical_state_score,
        daily_kcal_target=daily_kcal_target,
        consumed_kcal_today=consumed_kcal_today,
        consumed_protein_today=consumed_protein_today,
        consumed_carbs_today=consumed_carbs_today,
        consumed_fat_today=consumed_fat_today,
        fridge_items=fridge_items,
        expiring_items=expiring_items,
    )


async def _call_gpt_for_briefing(payload: BriefingDataPayload) -> str:
    """Send aggregated data to GPT 5.1 via OpenRouter. 15s timeout."""
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    user_message = json.dumps(payload.model_dump(mode="json"), indent=2)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    request_payload = {
        "model": BRIEFING_MODEL,
        "messages": messages,
        "max_tokens": 512,
        "temperature": 0.4,
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://personal-health-os.app",
        "X-Title": "Personal Health OS",
    }

    async with httpx.AsyncClient(timeout=GPT_TIMEOUT) as client:
        resp = await client.post(
            OPENROUTER_BASE_URL, json=request_payload, headers=headers
        )
        resp.raise_for_status()

    body = resp.json()
    narrative: str = body["choices"][0]["message"]["content"].strip()
    if not narrative:
        raise ValueError("GPT returned empty narrative")
    return narrative


def _generate_fallback_briefing(payload: BriefingDataPayload) -> str:
    """Rule-based fallback that always returns a non-empty string."""
    parts: list[str] = []

    # Health section
    if payload.sleep_hours is not None:
        if payload.sleep_hours >= 7:
            parts.append(f"Great rest last night with {payload.sleep_hours:.1f} hours of sleep.")
        else:
            parts.append(
                f"You logged {payload.sleep_hours:.1f} hours of sleep — try to aim for 7+ hours tonight."
            )

    if payload.steps is not None:
        if payload.steps >= 8000:
            parts.append(f"Solid activity with {payload.steps:,} steps so far.")
        else:
            parts.append(f"You're at {payload.steps:,} steps — a short walk could boost your energy.")

    if payload.physical_state_score is not None:
        parts.append(f"Your readiness score is {payload.physical_state_score}/100.")

    # Nutrition section
    if payload.consumed_kcal_today is not None and payload.daily_kcal_target is not None:
        remaining = payload.daily_kcal_target - payload.consumed_kcal_today
        if remaining > 0:
            parts.append(
                f"You've consumed {payload.consumed_kcal_today} kcal out of your "
                f"{payload.daily_kcal_target} kcal target — {remaining} kcal remaining."
            )
        else:
            parts.append(
                f"You've reached your {payload.daily_kcal_target} kcal target for today."
            )
    elif payload.daily_kcal_target is not None:
        parts.append(f"Your daily target is {payload.daily_kcal_target} kcal — no meals logged yet.")

    # Fridge / expiry section
    if payload.expiring_items:
        names = [item.get("name", "item") for item in payload.expiring_items[:3]]
        parts.append(
            f"Heads up: {', '.join(names)} {'is' if len(names) == 1 else 'are'} expiring soon — "
            "consider using them today."
        )

    # Default when absolutely nothing is available
    if not parts:
        parts.append(
            "Welcome back! Start your day by logging a meal or uploading your health data "
            "to get personalized insights."
        )

    return " ".join(parts)
