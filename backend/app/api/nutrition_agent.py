"""Endpoints for calorie calculation, fridge inventory, meal planning, and meal logging."""

from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.fridge import get_current_user_id
from app.schemas.nutrition_agent import (
    CalorieCalculationRequest,
    CalorieCalculationResponse,
    DailySummaryResponse,
    FridgeIngredientCreateRequest,
    FridgeIngredientResponse,
    MealLogRequest,
    MealLogResponse,
    MealPlanGenerateRequest,
    MealPlanResponse,
)
from app.services import calorie_calculator, meal_logger_service, nutrition_agent, nutrition_fridge_service

router = APIRouter(tags=["nutrition-agent"])


@router.post(
    "/calculate-calories",
    response_model=CalorieCalculationResponse,
    summary="Calculate BMR/TDEE/macros and save targets to profile",
)
async def calculate_calories(
    body: CalorieCalculationRequest,
    user_id: str = Depends(get_current_user_id),
) -> CalorieCalculationResponse:
    """Calculate calorie and macro targets for the authenticated user."""
    results = await calorie_calculator.calculate_daily_targets(
        weight=body.weight,
        height=body.height,
        age=body.age,
        gender=body.gender,
        activity_level=body.activity_level,
        goal=body.goal,
    )
    await calorie_calculator.save_targets_to_profile(user_id=user_id, results=results)
    return results


@router.post("/fridge", response_model=FridgeIngredientResponse, status_code=status.HTTP_201_CREATED)
async def add_fridge_ingredient(
    body: FridgeIngredientCreateRequest,
    user_id: str = Depends(get_current_user_id),
) -> FridgeIngredientResponse:
    """Add a fridge ingredient for the authenticated user."""
    return await nutrition_fridge_service.add_ingredient(user_id=user_id, body=body)


@router.get("/fridge/{user_id}", response_model=list[FridgeIngredientResponse])
async def get_user_fridge(user_id: UUID, current_user_id: str = Depends(get_current_user_id)) -> list[FridgeIngredientResponse]:
    """Get all fridge ingredients for the specified user."""
    if str(user_id) != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own fridge.")
    return await nutrition_fridge_service.get_ingredients(user_id=current_user_id)


@router.delete("/fridge/{user_id}/{ingredient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_fridge_ingredient(
    user_id: UUID,
    ingredient_id: UUID,
    current_user_id: str = Depends(get_current_user_id),
) -> None:
    """Remove one ingredient from the user's fridge."""
    if str(user_id) != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only modify your own fridge.")
    await nutrition_fridge_service.delete_ingredient(user_id=current_user_id, ingredient_id=ingredient_id)


@router.post("/nutrition-agent/meal-plan", response_model=MealPlanResponse)
async def generate_meal_plan(
    body: MealPlanGenerateRequest,
    user_id: str = Depends(get_current_user_id),
) -> MealPlanResponse:
    """Generate and store a one-day meal plan from fridge ingredients and macro targets."""
    return await nutrition_agent.generate_daily_meal_plan(
        user_id=user_id,
        daily_kcal_target=body.daily_kcal_target,
        macro_targets=body.macro_targets.model_dump(),
    )


@router.get("/nutrition-agent/meal-plan/latest", response_model=MealPlanResponse)
async def get_latest_meal_plan(user_id: str = Depends(get_current_user_id)) -> MealPlanResponse:
    """Fetch today's latest generated meal plan."""
    latest = await nutrition_agent.get_latest_plan(user_id)
    if latest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No meal plan generated for today.")
    return latest


@router.post("/nutrition-agent/log-meal", response_model=MealLogResponse, status_code=status.HTTP_201_CREATED)
async def log_meal(
    body: MealLogRequest,
    user_id: str = Depends(get_current_user_id),
) -> MealLogResponse:
    """Log one consumed meal for daily tracking."""
    return await meal_logger_service.log_meal(user_id=user_id, body=body)


@router.get("/nutrition-agent/daily-summary/{user_id}/{summary_date}", response_model=DailySummaryResponse)
async def get_daily_summary(
    user_id: UUID,
    summary_date: date,
    current_user_id: str = Depends(get_current_user_id),
) -> DailySummaryResponse:
    """Return all meals and macro comparison for one day."""
    if str(user_id) != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own summary.")
    return await meal_logger_service.get_daily_summary(current_user_id, summary_date)
