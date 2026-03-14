"""
Fridge CRUD service — all DB operations go through here.

Uses the shared Supabase service-role client.  Every query is scoped
to the authenticated ``user_id`` so one user never touches another's data.
"""

from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import HTTPException, status

from app.schemas.fridge import (
    FridgeItemCreate,
    FridgeItemOut,
    FridgeItemUpdate,
    InventoryItem,
)
from app.services.supabase_client import get_supabase

TABLE = "fridge_items"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _row_to_item(row: dict) -> FridgeItemOut:
    """Convert a raw Supabase row dict into a ``FridgeItemOut``."""
    return FridgeItemOut(**row)


def _row_to_inventory(row: dict) -> InventoryItem:
    """Convert a raw Supabase row dict into an ``InventoryItem``."""
    expiry = row.get("expiry_date")
    expiring_soon = False
    if expiry:
        expiry_date = date.fromisoformat(expiry) if isinstance(expiry, str) else expiry
        expiring_soon = (expiry_date - date.today()).days <= 3
    else:
        expiry_date = None

    return InventoryItem(
        name=row["name"],
        quantity=float(row["quantity"]),
        unit=row["unit"],
        category=row["category"],
        expiry_date=expiry_date,
        expiring_soon=expiring_soon,
    )


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

async def add_item(user_id: str, item: FridgeItemCreate) -> FridgeItemOut:
    """Insert a single fridge item."""
    supabase = await get_supabase()
    payload = {
        "user_id": user_id,
        **item.model_dump(mode="json"),
    }
    result = await (
        supabase.table(TABLE)
        .insert(payload)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to insert fridge item.",
        )
    return _row_to_item(result.data[0])


async def get_items(user_id: str) -> list[FridgeItemOut]:
    """Return every fridge item for a user, newest first."""
    supabase = await get_supabase()
    result = await (
        supabase.table(TABLE)
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [_row_to_item(row) for row in (result.data or [])]


async def get_item(user_id: str, item_id: UUID) -> FridgeItemOut:
    """Fetch a single fridge item (404 if not found or not owned)."""
    supabase = await get_supabase()
    result = await (
        supabase.table(TABLE)
        .select("*")
        .eq("id", str(item_id))
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fridge item {item_id} not found.",
        )
    return _row_to_item(result.data)


async def update_item(
    user_id: str, item_id: UUID, data: FridgeItemUpdate
) -> FridgeItemOut:
    """Update mutable fields on a fridge item."""
    changes = data.model_dump(exclude_none=True, mode="json")
    if not changes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No fields to update.",
        )
    supabase = await get_supabase()
    result = await (
        supabase.table(TABLE)
        .update(changes)
        .eq("id", str(item_id))
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fridge item {item_id} not found.",
        )
    return _row_to_item(result.data[0])


async def delete_item(user_id: str, item_id: UUID) -> None:
    """Remove a fridge item."""
    supabase = await get_supabase()
    result = await (
        supabase.table(TABLE)
        .delete()
        .eq("id", str(item_id))
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fridge item {item_id} not found.",
        )


async def bulk_add_items(
    user_id: str, items: list[FridgeItemCreate]
) -> list[FridgeItemOut]:
    """Insert multiple fridge items at once (after scan confirmation)."""
    supabase = await get_supabase()
    payloads = [
        {"user_id": user_id, **item.model_dump(mode="json")}
        for item in items
    ]
    result = await (
        supabase.table(TABLE)
        .insert(payloads)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to bulk-insert fridge items.",
        )
    return [_row_to_item(row) for row in result.data]


async def get_inventory(user_id: str) -> list[InventoryItem]:
    """Return a clean, structured list for the Nutrition Agent."""
    supabase = await get_supabase()
    result = await (
        supabase.table(TABLE)
        .select("name, quantity, unit, category, expiry_date")
        .eq("user_id", user_id)
        .order("category")
        .order("name")
        .execute()
    )
    return [_row_to_inventory(row) for row in (result.data or [])]
