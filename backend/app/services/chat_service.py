"""
Chat service — manages conversational sessions with GPT 5.1 via OpenRouter.

Streams tokens back as SSE-formatted strings. Persists conversation history
to the chat_sessions / chat_messages tables in Supabase.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import date, datetime, timezone as tz
from typing import AsyncGenerator
from zoneinfo import ZoneInfo

import httpx
from dotenv import load_dotenv

from app.services.supabase_client import get_supabase

load_dotenv()

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY: str = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
CHAT_MODEL = "openai/gpt-5.1"
CHAT_TIMEOUT = 60.0

SESSIONS_TABLE = "chat_sessions"
MESSAGES_TABLE = "chat_messages"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def send_message_stream(
    user_id: str,
    session_id: str | None,
    user_message: str,
    timezone: str,
) -> AsyncGenerator[str, None]:
    """Stream GPT 5.1 response tokens as SSE-formatted strings."""

    # 1. Create or validate session
    if session_id is None:
        session_id = await _create_session(user_id)

    # 2. Load conversation history
    history = await _load_history(session_id)

    # 3. Build system context
    system_context = await _build_system_context(user_id, timezone)

    # 4. Construct messages array
    messages: list[dict] = [{"role": "system", "content": system_context}]
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_message})

    # 5. Persist user message BEFORE streaming
    await _persist_message(session_id, "user", user_message)

    # 6. Stream from OpenRouter
    full_response = ""
    try:
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://personal-health-os.app",
            "X-Title": "Personal Health OS",
        }

        payload = {
            "model": CHAT_MODEL,
            "messages": messages,
            "max_tokens": 2048,
            "temperature": 0.3,
            "stream": True,
        }

        async with httpx.AsyncClient(timeout=CHAT_TIMEOUT) as client:
            async with client.stream(
                "POST", OPENROUTER_BASE_URL, json=payload, headers=headers
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    if line == "data: [DONE]":
                        break
                    try:
                        chunk = json.loads(line[6:])
                        token = chunk["choices"][0]["delta"].get("content", "")
                        if token:
                            full_response += token
                            yield f"data: {json.dumps({'token': token, 'session_id': session_id})}\n\n"
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue

        # 7. Persist full assistant response
        if full_response:
            await _persist_message(session_id, "assistant", full_response)

    except Exception as exc:
        logger.error("Chat streaming error: %s", exc)
        yield (
            f"data: {json.dumps({'error': 'The nutrition agent is temporarily unavailable. Please try again.', 'session_id': session_id})}\n\n"
        )

    # 8. Final DONE signal
    yield "data: [DONE]\n\n"


# ---------------------------------------------------------------------------
# System context builder
# ---------------------------------------------------------------------------


async def _build_system_context(user_id: str, timezone: str) -> str:
    """Assemble fridge inventory, nutrition goals, today's meals, and health
    data into a system prompt string."""

    supabase = await get_supabase()

    try:
        user_tz = ZoneInfo(timezone)
    except (KeyError, Exception):
        user_tz = tz.utc
    user_today = datetime.now(user_tz).date()
    today_str = user_today.isoformat()

    sections: list[str] = []

    # --- Base instructions ---
    sections.append(
        "You are a helpful, friendly nutrition assistant for the Personal Health OS app. "
        "You can answer questions about the user's meals, fridge inventory, nutrition goals, "
        "and health data. Give practical, actionable advice. Be concise but warm."
    )

    # --- Fridge inventory ---
    try:
        fi_result = await (
            supabase.table("fridge_items")
            .select("name, quantity, unit, expiry_date")
            .eq("user_id", user_id)
            .execute()
        )
        if fi_result.data:
            items_text = ", ".join(
                f"{item['name']} ({item['quantity']} {item['unit']}"
                + (f", expires {item['expiry_date']}" if item.get("expiry_date") else "")
                + ")"
                for item in fi_result.data
            )
            sections.append(f"FRIDGE INVENTORY: {items_text}")
    except Exception as exc:
        logger.warning("Failed to fetch fridge_items for chat context: %s", exc)

    # --- Nutrition goals ---
    try:
        prof_result = await (
            supabase.table("profiles")
            .select("daily_kcal_target, protein_target_g, fat_target_g, carbs_target_g")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if prof_result.data:
            p = prof_result.data
            sections.append(
                f"NUTRITION GOALS: {p.get('daily_kcal_target', 'N/A')} kcal/day, "
                f"{p.get('protein_target_g', 'N/A')}g protein, "
                f"{p.get('fat_target_g', 'N/A')}g fat, "
                f"{p.get('carbs_target_g', 'N/A')}g carbs"
            )
    except Exception as exc:
        logger.warning("Failed to fetch profiles for chat context: %s", exc)

    # --- Today's consumption (daily_logs) ---
    try:
        dl_result = await (
            supabase.table("daily_logs")
            .select("total_calories, total_protein_g, total_carbs_g, total_fat_g")
            .eq("user_id", user_id)
            .eq("date", today_str)
            .maybe_single()
            .execute()
        )
        if dl_result.data:
            d = dl_result.data
            sections.append(
                f"TODAY'S CONSUMPTION: {d.get('total_calories', 0)} kcal, "
                f"{d.get('total_protein_g', 0)}g protein, "
                f"{d.get('total_carbs_g', 0)}g carbs, "
                f"{d.get('total_fat_g', 0)}g fat"
            )
    except Exception as exc:
        logger.warning("Failed to fetch daily_logs for chat context: %s", exc)

    # --- Today's individual meals ---
    try:
        ml_result = await (
            supabase.table("meal_logs")
            .select("meal_name, kcal, time_of_day")
            .eq("user_id", user_id)
            .eq("date", today_str)
            .execute()
        )
        if ml_result.data:
            meals_text = ", ".join(
                f"{m['meal_name']} ({m['kcal']} kcal, {m['time_of_day']})"
                for m in ml_result.data
            )
            sections.append(f"TODAY'S MEALS: {meals_text}")
    except Exception as exc:
        logger.warning("Failed to fetch meal_logs for chat context: %s", exc)

    # --- Latest health data ---
    try:
        he_result = await (
            supabase.table("health_exports")
            .select("parsed_metrics, physical_state")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if he_result.data:
            pm = he_result.data.get("parsed_metrics") or {}
            ps = he_result.data.get("physical_state") or {}
            health_parts: list[str] = []
            if pm.get("sleep_hours") is not None:
                health_parts.append(f"sleep: {pm['sleep_hours']}h")
            if pm.get("steps") is not None:
                health_parts.append(f"steps: {pm['steps']}")
            if pm.get("avg_heart_rate") is not None:
                health_parts.append(f"heart rate: {pm['avg_heart_rate']} bpm")
            if pm.get("hrv") is not None:
                health_parts.append(f"HRV: {pm['hrv']} ms")
            if ps.get("score") is not None:
                health_parts.append(f"readiness score: {ps['score']}/100")
            if health_parts:
                sections.append(f"HEALTH DATA: {', '.join(health_parts)}")
    except Exception as exc:
        logger.warning("Failed to fetch health_exports for chat context: %s", exc)

    sections.append(f"TODAY'S DATE: {today_str}")

    return "\n\n".join(sections)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _create_session(user_id: str) -> str:
    """Create a new chat session row and return its UUID string."""
    supabase = await get_supabase()
    now = datetime.now(tz.utc).isoformat()
    result = await (
        supabase.table(SESSIONS_TABLE)
        .insert({"user_id": user_id, "created_at": now, "updated_at": now})
        .execute()
    )
    if not result.data:
        raise RuntimeError("Failed to create chat session")
    return str(result.data[0]["id"])


async def _load_history(session_id: str) -> list[dict]:
    """Load conversation history for a session, ordered chronologically."""
    supabase = await get_supabase()
    result = await (
        supabase.table(MESSAGES_TABLE)
        .select("role, content")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    )
    return result.data or []


async def _persist_message(session_id: str, role: str, content: str) -> None:
    """Save a single message to the chat_messages table."""
    supabase = await get_supabase()
    try:
        await supabase.table(MESSAGES_TABLE).insert(
            {
                "session_id": session_id,
                "role": role,
                "content": content,
            }
        ).execute()
    except Exception as exc:
        logger.error("Failed to persist chat message: %s", exc)
