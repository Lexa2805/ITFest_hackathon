"""Pydantic models for the /meals/photo-log endpoints."""

from typing import List, Literal, Optional

from pydantic import BaseModel


class DetectedFoodItem(BaseModel):
    """A single food item detected in a meal photo."""
    name: str
    estimated_calories: int
    estimated_protein_g: int
    estimated_carbs_g: int
    estimated_fat_g: int
    estimated_grams: float


class PhotoMealEstimate(BaseModel):
    """AI-estimated macros from a meal photo."""
    food_items: List[DetectedFoodItem]
    total_calories: int
    total_protein_g: int
    total_carbs_g: int
    total_fat_g: int
    confidence: str  # 'high', 'medium', 'low'


class PhotoMealConfirmRequest(BaseModel):
    """User-confirmed (possibly adjusted) meal data."""
    meal_name: str
    food_items: List[DetectedFoodItem]
    total_calories: int
    total_protein_g: int
    total_carbs_g: int
    total_fat_g: int
    time_of_day: Literal["breakfast", "lunch", "dinner", "snack"]
    photo_reference: Optional[str] = None
