"""Schemas for calorie calculation and nutrition-agent workflows."""

from __future__ import annotations

from datetime import date as dt_date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


ActivityLevel = Literal[
    "sedentary",
    "lightly active",
    "moderately active",
    "very active",
]
GoalType = Literal[
    "lose weight",
    "maintain",
    "build muscle",
    "improve endurance",
]
GenderType = Literal["male", "female"]
MealTimeOfDay = Literal["breakfast", "lunch", "dinner", "snack"]


class CalorieCalculationRequest(BaseModel):
    """Input payload for POST /calculate-calories."""

    weight: float = Field(..., gt=0, description="Body weight in kilograms")
    height: float = Field(..., gt=0, description="Height in centimeters")
    age: int = Field(..., ge=1, le=120)
    gender: GenderType
    activity_level: ActivityLevel
    goal: GoalType


class CalorieCalculationResponse(BaseModel):
    """Calculated calories and macros for daily targets."""

    bmr: float
    tdee: float
    daily_kcal_target: int
    protein_g: int
    fat_g: int
    carbs_g: int


class FridgeIngredientCreateRequest(BaseModel):
    """Input payload for adding an ingredient to fridge inventory."""

    name: str = Field(..., min_length=1, max_length=200)
    quantity: float = Field(..., gt=0)
    unit: str = Field(..., min_length=1, max_length=50)


class FridgeIngredientResponse(BaseModel):
    """Single fridge ingredient row returned by the nutrition endpoints."""

    id: UUID
    user_id: UUID
    ingredient_name: str
    quantity: float
    unit: str
    created_at: datetime | None = None


class MacroTargets(BaseModel):
    """Macro target values in grams for one day."""

    protein_g: int = Field(..., ge=0)
    fat_g: int = Field(..., ge=0)
    carbs_g: int = Field(..., ge=0)


class MealPlanGenerateRequest(BaseModel):
    """Input payload for AI meal plan generation."""

    daily_kcal_target: int = Field(..., gt=0)
    macro_targets: MacroTargets


class MealIngredient(BaseModel):
    """Ingredient for one generated/logged meal."""

    name: str
    grams: float = Field(..., ge=0)


class MealPlanMeal(BaseModel):
    """One meal entry inside the generated daily plan."""

    meal_name: str
    ingredients: list[MealIngredient]
    kcal: int
    protein_g: int
    fat_g: int
    carbs_g: int


class MealPlanResponse(BaseModel):
    """Structured output for generated meal plan."""

    breakfast: list[MealPlanMeal]
    lunch: list[MealPlanMeal]
    dinner: list[MealPlanMeal]
    snacks: list[MealPlanMeal]
    total_kcal: int
    total_protein_g: int
    total_fat_g: int
    total_carbs_g: int


class MealLogRequest(BaseModel):
    """Input payload for logging one eaten meal."""

    meal_name: str = Field(..., min_length=1, max_length=200)
    ingredients: list[MealIngredient] = Field(default_factory=list)
    kcal: int = Field(..., ge=0)
    protein: int = Field(..., ge=0)
    fat: int = Field(..., ge=0)
    carbs: int = Field(..., ge=0)
    time_of_day: MealTimeOfDay
    date: dt_date


class MealLogResponse(BaseModel):
    """Row response for a saved meal log."""

    id: UUID
    user_id: UUID
    date: dt_date
    meal_name: str
    ingredients_json: list[dict]
    kcal: int
    protein: int
    fat: int
    carbs: int
    time_of_day: MealTimeOfDay
    created_at: datetime | None = None


class DailyMacroSummary(BaseModel):
    """Aggregated totals and targets for one day."""

    consumed: int
    target: int


class DailySummaryResponse(BaseModel):
    """Daily nutrition summary with status and remaining calories."""

    date: dt_date
    meals: list[MealLogResponse]
    kcal: DailyMacroSummary
    protein: DailyMacroSummary
    fat: DailyMacroSummary
    carbs: DailyMacroSummary
    remaining_kcal: int
    status: Literal["On track", "Under eating", "Over eating"]
