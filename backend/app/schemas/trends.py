"""Pydantic models for the /trends endpoints."""

from datetime import date as dt_date
from typing import List

from pydantic import BaseModel


class TrendDataPoint(BaseModel):
    """A single date/value pair for a trend metric."""
    date: dt_date
    value: float


class TrendResponse(BaseModel):
    """API response for trend data."""
    metric: str
    window_days: int
    data_points: List[TrendDataPoint]
