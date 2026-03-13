"""Pydantic v2 models for the /fridge endpoints."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, computed_field


# ---------------------------------------------------------------------------
# Request bodies
# ---------------------------------------------------------------------------

class FridgeItemCreate(BaseModel):
    """Body for POST /fridge/items."""
    name: str = Field(..., min_length=1, max_length=200, examples=["Milk"])
    quantity: float = Field(1.0, gt=0, examples=[2.0])
    unit: str = Field("pcs", max_length=50, examples=["liters"])
    expiry_date: date | None = Field(None, examples=["2026-03-20"])
    category: str = Field("other", max_length=100, examples=["dairy"])


class FridgeItemUpdate(BaseModel):
    """Body for PUT /fridge/items/{id}. All fields optional."""
    name: str | None = Field(None, min_length=1, max_length=200)
    quantity: float | None = Field(None, gt=0)
    unit: str | None = Field(None, max_length=50)
    expiry_date: date | None = None
    category: str | None = Field(None, max_length=100)


class ScanRequest(BaseModel):
    """Body for POST /fridge/scan — accepts a base64-encoded image."""
    image_base64: str = Field(..., description="Base64-encoded image (JPEG/PNG)")


class BulkAddRequest(BaseModel):
    """Body for POST /fridge/items/bulk — save confirmed scanned items."""
    items: list[FridgeItemCreate]


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class FridgeItemOut(BaseModel):
    """Single fridge item returned from the API."""
    id: UUID
    user_id: UUID
    name: str
    quantity: float
    unit: str
    expiry_date: date | None
    category: str
    created_at: datetime
    updated_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def expiring_soon(self) -> bool:
        """True when the item expires within 3 days."""
        if self.expiry_date is None:
            return False
        delta = (self.expiry_date - date.today()).days
        return delta <= 3


class ScannedIngredient(BaseModel):
    """One ingredient detected by the vision model."""
    name: str
    estimated_quantity: float
    unit: str
    category: str


class ScanResponse(BaseModel):
    """Response from POST /fridge/scan."""
    ingredients: list[ScannedIngredient]
    raw_model_output: str | None = Field(
        None, description="Raw text from the model for debugging"
    )


class InventoryItem(BaseModel):
    """Clean item for the Nutrition Agent."""
    name: str
    quantity: float
    unit: str
    category: str
    expiry_date: date | None
    expiring_soon: bool


class APIResponse(BaseModel):
    """Generic wrapper for all API responses."""
    success: bool = True
    data: Any = None
    message: str = "ok"
