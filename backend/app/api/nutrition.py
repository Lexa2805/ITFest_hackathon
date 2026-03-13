from fastapi import APIRouter, Depends, Header, HTTPException, status
from app.api.fridge import get_current_user_id

from app.schemas.nutrition import (
    NutritionGoalCreate,
    NutritionGoalResponse,
    RecipeResponse,
    DailyLogResponse,
    ShoppingListResponse
)
from app.services import nutrition_service, recipe_service, shopping_service

router = APIRouter(prefix="/nutrition", tags=["nutrition"])


async def get_token(authorization: str | None = Header(default=None)) -> str:
    """Helper to extract the raw token so we can forward it to internal HTTP clients."""
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header.")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization header.")
    return token


# ==========================================
# Nutrition Goals
# ==========================================

@router.post("/goals", response_model=NutritionGoalResponse, summary="Set or update user nutrition goals")
async def set_goals(body: NutritionGoalCreate, user_id: str = Depends(get_current_user_id)):
    return await nutrition_service.set_or_update_goal(user_id, body)


@router.get("/goals", response_model=NutritionGoalResponse, summary="Get current user nutrition goals")
async def fetch_goals(user_id: str = Depends(get_current_user_id)):
    return await nutrition_service.get_goal(user_id)


# ==========================================
# Recipe Suggestions
# ==========================================

@router.post("/recipes/suggest", response_model=list[RecipeResponse], summary="Suggest recipes based on fridge and goals")
async def suggest_recipes(
    user_id: str = Depends(get_current_user_id),
    token: str = Depends(get_token)
):
    """
    Combines fridge inventory with user goals to suggest 3-5 recipes via OpenRouter AI.
    """
    return await recipe_service.suggest_recipes(user_id, token)


@router.get("/recipes", response_model=list[RecipeResponse], summary="List previously generated recipes")
async def list_recipes(user_id: str = Depends(get_current_user_id)):
    return await recipe_service.get_user_recipes(user_id)


@router.post("/recipes/{id}/log", response_model=DailyLogResponse, summary="Log a recipe as a meal today")
async def log_recipe(id: str, user_id: str = Depends(get_current_user_id)):
    recipe = await recipe_service.get_recipe(user_id, id)
    return await nutrition_service.log_recipe_meal(user_id, recipe)


# ==========================================
# Macro & Calorie Tracking
# ==========================================

@router.get("/log/today", response_model=DailyLogResponse, summary="Get today's logged meals and totals")
async def get_today_log(user_id: str = Depends(get_current_user_id)):
    return await nutrition_service.get_today_log_with_goals(user_id)


@router.get("/log/history", response_model=list[DailyLogResponse], summary="Get the last 7 days of logs")
async def get_history(user_id: str = Depends(get_current_user_id)):
    return await nutrition_service.get_history_logs(user_id)


# ==========================================
# Shopping List
# ==========================================

@router.post("/shopping-list/generate", response_model=ShoppingListResponse, summary="Generate shopping list for missing ingredients")
async def generate_shopping_list(
    user_id: str = Depends(get_current_user_id),
    token: str = Depends(get_token)
):
    return await shopping_service.generate_shopping_list(user_id, token)


@router.get("/shopping-list/latest", response_model=ShoppingListResponse, summary="Get the latest generated shopping list")
async def get_latest_shopping_list(user_id: str = Depends(get_current_user_id)):
    return await shopping_service.get_latest_shopping_list(user_id)


@router.post("/shopping-list/{id}/forward", summary="Forward the shopping list to the Autonomous Shopping System")
async def forward_shopping_list(id: str, user_id: str = Depends(get_current_user_id)):
    return await shopping_service.forward_shopping_list(user_id, id)
