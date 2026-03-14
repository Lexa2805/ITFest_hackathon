"""Schemas for user profile and manual daily health check-ins."""

from __future__ import annotations

from datetime import date as dt_date, datetime
from typing import Literal

from pydantic import BaseModel, Field


ActivityLevel = Literal[
    "sedentary",
    "lightly active",
    "moderately active",
    "very active",
]
HealthGoal = Literal[
    "lose weight",
    "maintain",
    "build muscle",
    "improve endurance",
]
Gender = Literal["male", "female", "non-binary", "prefer not to say", "other"]


class ProfileUpsertRequest(BaseModel):
    """Payload for creating or updating a user's profile."""

    name: str | None = None
    email: str | None = None
    weight: float | None = Field(default=None, ge=0)
    height: float | None = Field(default=None, ge=0)
    age: int | None = Field(default=None, ge=0, le=120)
    gender: Gender | None = None
    activity_level: ActivityLevel | None = None
    goal: HealthGoal | None = None
    has_apple_watch: bool = True


class ProfileResponse(BaseModel):
    """Stored profile object returned by the API."""

    user_id: str
    name: str | None = None
    email: str | None = None
    weight: float | None = None
    height: float | None = None
    age: int | None = None
    gender: str | None = None
    activity_level: str | None = None
    goal: str | None = None
    has_apple_watch: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ManualHealthDataRequest(BaseModel):
    """Daily user-entered health data when Apple Watch data is unavailable."""

    date: dt_date | None = None
    heart_rate: float = Field(ge=0)
    sleep_hours: float = Field(ge=0)
    steps: int = Field(ge=0)
    calories: float | None = Field(default=None, ge=0)
    mood: int = Field(ge=1, le=5)
    stress_level: int = Field(ge=1, le=5)


class DownstreamCallResult(BaseModel):
    """Result of forwarding payloads to internal agents."""

    endpoint: str
    success: bool
    status_code: int | None = None
    detail: str | None = None


class ManualHealthDataResponse(BaseModel):
    """API response for manual check-in submission."""

    id: str
    user_id: str
    date: dt_date
    heart_rate: float
    sleep_hours: float
    steps: int
    calories: float | None = None
    mood: int
    stress_level: int
    physical_state_score: int
    created_at: datetime | None = None
    downstream_calls: list[DownstreamCallResult] = []
