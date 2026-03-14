"""Parse Apple Health export ZIP files and extract key biometric metrics."""

from __future__ import annotations

import datetime as dt
import io
from collections import defaultdict
from statistics import mean
from zipfile import ZipFile

from fastapi import HTTPException, status
from xml.etree import ElementTree as ET

from app.schemas.health import HealthMetricSummary, ParsedHealthMetrics


HEART_RATE_TYPE = "HKQuantityTypeIdentifierHeartRate"
STEP_COUNT_TYPE = "HKQuantityTypeIdentifierStepCount"
SLEEP_ANALYSIS_TYPE = "HKCategoryTypeIdentifierSleepAnalysis"
ACTIVE_ENERGY_TYPE = "HKQuantityTypeIdentifierActiveEnergyBurned"
HRV_TYPE = "HKQuantityTypeIdentifierHeartRateVariabilitySDNN"

XML_DATE_FORMAT = "%Y-%m-%d %H:%M:%S %z"


def _parse_xml_datetime(raw_value: str | None) -> dt.datetime | None:
    if not raw_value:
        return None
    try:
        return dt.datetime.strptime(raw_value, XML_DATE_FORMAT)
    except ValueError:
        return None


def _to_float(raw_value: str | None) -> float | None:
    if raw_value is None:
        return None
    try:
        return float(raw_value)
    except ValueError:
        return None


def _build_summary(values: list[float], unit: str, *, total_override: float | None = None) -> HealthMetricSummary:
    if not values:
        return HealthMetricSummary(sample_count=0, total=0.0, average=0.0, unit=unit)

    total_value = total_override if total_override is not None else float(sum(values))
    avg_value = float(mean(values))
    return HealthMetricSummary(
        sample_count=len(values),
        total=round(total_value, 2),
        average=round(avg_value, 2),
        unit=unit,
    )


def parse_health_export_zip(zip_bytes: bytes) -> tuple[ParsedHealthMetrics, dict[str, list[float]]]:
    """
    Parse an Apple Health export ZIP and return normalized summaries.
    
    Aggregates data by day to provide meaningful daily averages:
    - Steps: Sum per day, then average across days
    - Calories: Sum per day, then average across days
    - Heart Rate: All samples averaged
    - Sleep: Hours per night
    - HRV: All samples averaged

    Also returns raw value arrays used by scoring logic.
    """
    try:
        with ZipFile(io.BytesIO(zip_bytes), "r") as archive:
            xml_name = next(
                (name for name in archive.namelist() if name.lower().endswith("export.xml")),
                None,
            )
            if not xml_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ZIP file does not contain export.xml.",
                )
            xml_bytes = archive.read(xml_name)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ZIP file: {exc}",
        )

    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not parse export.xml: {exc}",
        )

    heart_rates: list[float] = []
    hrv_values: list[float] = []
    
    # Aggregate by day for meaningful daily totals
    steps_per_day: dict[str, float] = defaultdict(float)
    calories_per_day: dict[str, float] = defaultdict(float)
    sleep_hours_per_day: dict[str, float] = defaultdict(float)

    # Iterate all Record nodes once for efficiency.
    for record in root.iter("Record"):
        record_type = record.attrib.get("type")
        value = _to_float(record.attrib.get("value"))

        if record_type == HEART_RATE_TYPE and value is not None:
            heart_rates.append(value)
            continue

        if record_type == STEP_COUNT_TYPE and value is not None:
            # Aggregate steps by day
            start_date = _parse_xml_datetime(record.attrib.get("startDate"))
            if start_date:
                day_key = start_date.date().isoformat()
                steps_per_day[day_key] += value
            continue

        if record_type == ACTIVE_ENERGY_TYPE and value is not None:
            # Aggregate calories by day
            start_date = _parse_xml_datetime(record.attrib.get("startDate"))
            if start_date:
                day_key = start_date.date().isoformat()
                calories_per_day[day_key] += value
            continue

        if record_type == HRV_TYPE and value is not None:
            hrv_values.append(value)
            continue

        if record_type == SLEEP_ANALYSIS_TYPE:
            # Include only asleep states; ignore in-bed awake intervals.
            sleep_value = record.attrib.get("value", "")
            if "Asleep" not in sleep_value:
                continue

            start_date = _parse_xml_datetime(record.attrib.get("startDate"))
            end_date = _parse_xml_datetime(record.attrib.get("endDate"))
            if not start_date or not end_date or end_date <= start_date:
                continue

            duration_hours = (end_date - start_date).total_seconds() / 3600.0
            day_key = end_date.date().isoformat()
            sleep_hours_per_day[day_key] += duration_hours

    # Convert daily aggregations to lists
    daily_steps = list(steps_per_day.values())
    daily_calories = list(calories_per_day.values())
    sleep_nightly_hours = list(sleep_hours_per_day.values())

    # Calculate totals for display
    total_steps = sum(daily_steps) if daily_steps else 0.0
    total_calories = sum(daily_calories) if daily_calories else 0.0

    parsed = ParsedHealthMetrics(
        heart_rate=_build_summary(heart_rates, "bpm", total_override=float(sum(heart_rates)) if heart_rates else 0.0),
        step_count=_build_summary(daily_steps, "count", total_override=total_steps),
        sleep_analysis=_build_summary(sleep_nightly_hours, "hours"),
        active_energy_burned=_build_summary(daily_calories, "kcal", total_override=total_calories),
        hrv_sdnn=_build_summary(hrv_values, "ms", total_override=float(sum(hrv_values)) if hrv_values else 0.0),
    )

    return parsed, {
        "heart_rates": heart_rates,
        "steps": daily_steps,  # Now daily totals instead of individual records
        "sleep_hours": sleep_nightly_hours,
        "active_energy": daily_calories,  # Now daily totals instead of individual records
        "hrv": hrv_values,
    }
