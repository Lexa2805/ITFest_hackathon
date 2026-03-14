"""Downstream agent trigger helpers for post-scoring integrations."""

from __future__ import annotations

import os

import httpx

from app.schemas.health import AgentTriggerResult, ParsedHealthMetrics, PhysicalStateResult


AGENT_SERVICE_BASE_URL = os.getenv("AGENT_SERVICE_BASE_URL", "http://localhost:8000").rstrip("/")


async def trigger_downstream_agents(
    *,
    parsed_metrics: ParsedHealthMetrics,
    physical_state: PhysicalStateResult,
) -> list[AgentTriggerResult]:
    """Send parsed/scored payloads to fitness and mood agent endpoints."""
    calls: list[tuple[str, dict]] = [
        (
            "/fitness-agent",
            {
                "physical_state_score": physical_state.score,
                "physical_state_status": physical_state.status,
                "activity": {
                    "step_count_total": parsed_metrics.step_count.total,
                    "active_energy_kcal": parsed_metrics.active_energy_burned.total,
                    "heart_rate_average": parsed_metrics.heart_rate.average,
                },
            },
        ),
        (
            "/mood-agent",
            {
                "hrv": {
                    "average_ms": parsed_metrics.hrv_sdnn.average,
                    "sample_count": parsed_metrics.hrv_sdnn.sample_count,
                },
                "sleep": {
                    "total_hours": parsed_metrics.sleep_analysis.total,
                    "average_hours": parsed_metrics.sleep_analysis.average,
                },
                "heart_rate": {
                    "average_bpm": parsed_metrics.heart_rate.average,
                    "sample_count": parsed_metrics.heart_rate.sample_count,
                },
            },
        ),
    ]

    results: list[AgentTriggerResult] = []

    async with httpx.AsyncClient(timeout=8.0) as client:
        for endpoint, payload in calls:
            url = f"{AGENT_SERVICE_BASE_URL}{endpoint}"
            try:
                response = await client.post(url, json=payload)
                is_success = 200 <= response.status_code < 300
                results.append(
                    AgentTriggerResult(
                        endpoint=endpoint,
                        success=is_success,
                        status_code=response.status_code,
                        detail=None if is_success else response.text[:300],
                    )
                )
            except Exception as exc:
                results.append(
                    AgentTriggerResult(
                        endpoint=endpoint,
                        success=False,
                        status_code=None,
                        detail=str(exc),
                    )
                )

    return results
