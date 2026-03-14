"""Pydantic models for the /briefing endpoints."""

from datetime import date as dt_date, datetime
from typing import List, Optional

from pydantic import BaseModel


class BriefingDataPayload(BaseModel):
    """Aggregated data sent to GPT 5.1 for briefing generation."""
    sleep_hours: Optional[float] = None
    avg_heart_rate: Optional[float] = None
    steps: Optional[int] = None
    hrv: Optional[float] = None
    physical_state_score: Optional[int] = None
    daily_kcal_target: Optional[int] = None
    consumed_kcal_today: Optional[int] = None
    consumed_protein_today: Optional[int] = None
    consumed_carbs_today: Optional[int] = None
    consumed_fat_today: Optional[int] = None
    fridge_items: List[dict] = []
    expiring_items: List[dict] = []


class BriefingResponse(BaseModel):
    """API response for daily briefing."""
    narrative: str
    source: str  # 'gpt' or 'fallback'
    generated_at: datetime
    date: dt_date
