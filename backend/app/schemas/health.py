"""Schemas for Apple Health export upload and physical state scoring."""

from __future__ import annotations

from pydantic import BaseModel, Field


class HealthMetricSummary(BaseModel):
    """Generic summary shape for one biometric metric."""

    sample_count: int = 0
    total: float = 0.0
    average: float = 0.0
    unit: str


class ParsedHealthMetrics(BaseModel):
    """Normalized metrics parsed from Apple Health export.xml."""

    heart_rate: HealthMetricSummary = Field(
        default_factory=lambda: HealthMetricSummary(unit="bpm")
    )
    step_count: HealthMetricSummary = Field(
        default_factory=lambda: HealthMetricSummary(unit="count")
    )
    sleep_analysis: HealthMetricSummary = Field(
        default_factory=lambda: HealthMetricSummary(unit="hours")
    )
    active_energy_burned: HealthMetricSummary = Field(
        default_factory=lambda: HealthMetricSummary(unit="kcal")
    )
    hrv_sdnn: HealthMetricSummary = Field(
        default_factory=lambda: HealthMetricSummary(unit="ms")
    )


class PhysicalStateResult(BaseModel):
    """Output of the physical-state scoring model."""

    score: int = Field(ge=0, le=100)
    status: str
    factors: dict[str, float]


class AgentTriggerResult(BaseModel):
    """Result from posting parsed/scored data to downstream agents."""

    endpoint: str
    success: bool
    status_code: int | None = None
    detail: str | None = None


class HealthExportUploadResponse(BaseModel):
    """Final API response for POST /upload-health-export."""

    parsed_metrics: ParsedHealthMetrics
    physical_state: PhysicalStateResult
    downstream_calls: list[AgentTriggerResult]
