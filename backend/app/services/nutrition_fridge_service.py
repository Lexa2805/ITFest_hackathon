"""Nutrition-agent fridge inventory service."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status

from app.schemas.nutrition_agent import FridgeIngredientCreateRequest, FridgeIngredientResponse
from app.services.supabase_client import supabase

TABLE = "fridge_items"


def _normalize_item(row: dict[str, Any]) -> FridgeIngredientResponse:
    """Normalize legacy/new fridge row shapes into one response model."""
    return FridgeIngredientResponse(
        id=row["id"],
        user_id=row["user_id"],
        ingredient_name=row.get("ingredient_name") or row.get("name") or "",
        quantity=float(row.get("quantity") or 0),
        unit=row.get("unit") or "g",
        created_at=row.get("created_at"),
    )


async def add_ingredient(user_id: str, body: FridgeIngredientCreateRequest) -> FridgeIngredientResponse:
    """Add one ingredient row for a user.

    We attempt the requested schema first (`ingredient_name`) then fallback to legacy (`name`).
    """
    payload_primary = {
        "user_id": user_id,
        "ingredient_name": body.name,
        "quantity": body.quantity,
        "unit": body.unit,
    }
    try:
        result = supabase.table(TABLE).insert(payload_primary).execute()
    except Exception:
        payload_legacy = {
            "user_id": user_id,
            "name": body.name,
            "quantity": body.quantity,
            "unit": body.unit,
            "category": "other",
        }
        result = supabase.table(TABLE).insert(payload_legacy).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add ingredient.",
        )
    return _normalize_item(result.data[0])


async def get_ingredients(user_id: str) -> list[FridgeIngredientResponse]:
    """List all ingredients owned by a user."""
    result = (
        supabase.table(TABLE)
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [_normalize_item(row) for row in (result.data or [])]


async def delete_ingredient(user_id: str, ingredient_id: UUID) -> None:
    """Delete an ingredient by id scoped to user id."""
    result = (
        supabase.table(TABLE)
        .delete()
        .eq("id", str(ingredient_id))
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingredient not found.",
        )
