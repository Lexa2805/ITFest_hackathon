from datetime import date as dt_date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ---------------------------------------------------------------------------
# Nutrition Goals
# ---------------------------------------------------------------------------
class NutritionGoalCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    daily_calories: int = Field(..., description="Target daily calories")
    protein_g: int = Field(..., description="Target daily protein in grams")
    carbs_g: int = Field(..., description="Target daily carbs in grams")
    fat_g: int = Field(..., description="Target daily fat in grams")
    goal_type: str = Field(..., description="E.g., cut, bulk, maintain")


class NutritionGoalResponse(NutritionGoalCreate):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Recipes
# ---------------------------------------------------------------------------
class RecipeIngredient(BaseModel):
    name: str
    quantity: float
    unit: str


class RecipeBase(BaseModel):
    name: str
    ingredients: List[RecipeIngredient]
    instructions: List[str]
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    prep_time_minutes: int


class RecipeResponse(RecipeBase):
    id: UUID
    user_id: UUID
    generated_at: datetime


# ---------------------------------------------------------------------------
# Daily Logs
# ---------------------------------------------------------------------------
class DailyLogMeal(BaseModel):
    recipe_id: UUID
    name: str
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    logged_at: datetime


class DailyLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    date: dt_date
    meals: List[DailyLogMeal]
    total_calories: int
    total_protein_g: int
    total_carbs_g: int
    total_fat_g: int
    
    # These will be calculated dynamically by the service
    goal_calories: Optional[int] = None
    goal_protein_g: Optional[int] = None
    goal_carbs_g: Optional[int] = None
    goal_fat_g: Optional[int] = None
    remaining_calories: Optional[int] = None
    remaining_protein_g: Optional[int] = None
    remaining_carbs_g: Optional[int] = None
    remaining_fat_g: Optional[int] = None


# ---------------------------------------------------------------------------
# Shopping Lists
# ---------------------------------------------------------------------------
class ShoppingListItem(BaseModel):
    name: str
    quantity_needed: float
    unit: str
    category: str


class ShoppingListResponse(BaseModel):
    id: UUID
    user_id: UUID
    items: List[ShoppingListItem]
    status: str
    generated_at: datetime
