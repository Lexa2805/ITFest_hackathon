"""Physical state scoring logic for parsed Apple Health metrics."""

from __future__ import annotations

from statistics import mean

from app.schemas.health import PhysicalStateResult


def _score_sleep(avg_sleep_hours: float) -> float:
    if avg_sleep_hours >= 8.0:
        return 100.0
    if avg_sleep_hours >= 7.0:
        return 85.0
    if avg_sleep_hours >= 6.0:
        return 65.0
    if avg_sleep_hours >= 5.0:
        return 45.0
    return 25.0


def _score_steps(avg_steps: float) -> float:
    if avg_steps >= 10000:
        return 100.0
    if avg_steps >= 8000:
        return 85.0
    if avg_steps >= 6000:
        return 70.0
    if avg_steps >= 4000:
        return 50.0
    return 30.0


def _score_heart_rate_zone(avg_hr: float) -> float:
    # Heuristic resting/effort readiness ranges.
    if 50 <= avg_hr <= 75:
        return 95.0
    if 76 <= avg_hr <= 90:
        return 75.0
    if 40 <= avg_hr < 50:
        return 70.0
    if 91 <= avg_hr <= 105:
        return 55.0
    return 40.0


def _score_hrv_trend(hrv_values: list[float]) -> float:
    if not hrv_values:
        return 50.0
    if len(hrv_values) < 4:
        return 70.0 if mean(hrv_values) >= 35 else 50.0

    midpoint = len(hrv_values) // 2
    first_half = hrv_values[:midpoint]
    second_half = hrv_values[midpoint:]
    first_avg = mean(first_half) if first_half else 0.0
    second_avg = mean(second_half) if second_half else 0.0

    # Positive trend is generally a recovery/readiness signal.
    trend_delta = second_avg - first_avg
    baseline = mean(hrv_values)

    if baseline >= 50 and trend_delta >= 0:
        return 95.0
    if baseline >= 35 and trend_delta >= -3:
        return 80.0
    if baseline >= 25 and trend_delta >= -8:
        return 65.0
    return 45.0


def _status_label(score: int) -> str:
    if score >= 80:
        return "Well rested"
    if score >= 60:
        return "Moderately recovered"
    if score >= 45:
        return "Fatigued"
    return "Overtraining"


def calculate_physical_state(
    *,
    heart_rates: list[float],
    step_values: list[float],
    sleep_hours: list[float],
    hrv_values: list[float],
) -> PhysicalStateResult:
    """Combine biomeasure factors into a single 0-100 physical readiness score."""
    avg_hr = mean(heart_rates) if heart_rates else 0.0
    avg_steps = mean(step_values) if step_values else 0.0
    avg_sleep = mean(sleep_hours) if sleep_hours else 0.0

    heart_rate_score = _score_heart_rate_zone(avg_hr) if heart_rates else 50.0
    sleep_score = _score_sleep(avg_sleep) if sleep_hours else 40.0
    steps_score = _score_steps(avg_steps) if step_values else 40.0
    hrv_score = _score_hrv_trend(hrv_values)

    # Weighted blend prioritizing recovery markers (sleep + HRV).
    weighted_score = (
        heart_rate_score * 0.25
        + sleep_score * 0.35
        + steps_score * 0.20
        + hrv_score * 0.20
    )
    final_score = max(0, min(100, int(round(weighted_score))))

    return PhysicalStateResult(
        score=final_score,
        status=_status_label(final_score),
        factors={
            "heart_rate": round(heart_rate_score, 2),
            "sleep": round(sleep_score, 2),
            "steps": round(steps_score, 2),
            "hrv": round(hrv_score, 2),
        },
    )
