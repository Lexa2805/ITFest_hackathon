"""Pydantic models for the /recipes/expiry-based and /fridge/expiry-alerts endpoints."""

from datetime import date as dt_date
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel


class RecipeIngredient(BaseModel):
    """An ingredient in an expiry-based recipe."""
    name: str
    quantity: float
    unit: str


class ExpiryRecipe(BaseModel):
    """A recipe generated to use expiring fridge items."""
    name: str
    ingredients: List[RecipeIngredient]
    instructions: List[str]
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    prep_time_minutes: int
    expiry_priority: bool = True


class ExpiryRecipeResponse(BaseModel):
    """API response for expiry-based recipes."""
    recipes: List[ExpiryRecipe]
    expiring_items_used: List[str]
    message: Optional[str] = None


class ExpiryAlertItem(BaseModel):
    """A fridge item that is expiring soon or already expired."""
    item_id: UUID
    name: str
    expiry_date: dt_date
    status: Literal["expiring_urgent", "expired"]
    days_until_expiry: int
    suggested_recipe: Optional[str] = None
