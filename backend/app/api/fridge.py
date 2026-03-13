"""
Fridge API router — CRUD, AI vision scanning, and inventory.

Every endpoint requires a valid Supabase JWT in the Authorization header.
"""

from __future__ import annotations

import base64
from uuid import UUID

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile, status

from app.schemas.fridge import (
    APIResponse,
    BulkAddRequest,
    FridgeItemCreate,
    FridgeItemOut,
    FridgeItemUpdate,
    InventoryItem,
    ScanRequest,
    ScanResponse,
)
from app.services import fridge_service, vision_service
from app.services.supabase_client import supabase

router = APIRouter(prefix="/fridge", tags=["fridge"])


# ---------------------------------------------------------------------------
# Auth dependency — extract user_id from Supabase JWT
# ---------------------------------------------------------------------------

async def get_current_user_id(
    authorization: str | None = Header(default=None),
) -> str:
    """
    Validate the ``Authorization: Bearer <token>`` header using Supabase's
    ``auth.get_user()`` and return the user's UUID string.

    We accept the header via a direct parameter so FastAPI includes it in
    the OpenAPI schema.  The raw header name is ``authorization``.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header. Expected 'Bearer <token>'.",
        )

    try:
        user_resp = supabase.auth.get_user(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
        )

    if not user_resp or not user_resp.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not resolve user from token.",
        )

    return str(user_resp.user.id)


# ---------------------------------------------------------------------------
# Manual ingredient management
# ---------------------------------------------------------------------------

@router.post(
    "/items",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a fridge item manually",
)
async def add_item(
    body: FridgeItemCreate,
    user_id: str = Depends(get_current_user_id),
) -> APIResponse:
    item = await fridge_service.add_item(user_id, body)
    return APIResponse(data=item.model_dump(mode="json"), message="Item added.")


@router.get(
    "/items",
    response_model=APIResponse,
    summary="List all fridge items for the current user",
)
async def list_items(
    user_id: str = Depends(get_current_user_id),
) -> APIResponse:
    items = await fridge_service.get_items(user_id)
    return APIResponse(
        data=[i.model_dump(mode="json") for i in items],
        message=f"{len(items)} item(s) found.",
    )


@router.put(
    "/items/{item_id}",
    response_model=APIResponse,
    summary="Update a fridge item",
)
async def update_item(
    item_id: UUID,
    body: FridgeItemUpdate,
    user_id: str = Depends(get_current_user_id),
) -> APIResponse:
    item = await fridge_service.update_item(user_id, item_id, body)
    return APIResponse(data=item.model_dump(mode="json"), message="Item updated.")


@router.delete(
    "/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a fridge item",
)
async def delete_item(
    item_id: UUID,
    user_id: str = Depends(get_current_user_id),
) -> None:
    await fridge_service.delete_item(user_id, item_id)


# ---------------------------------------------------------------------------
# AI Vision scanning
# ---------------------------------------------------------------------------

@router.post(
    "/scan",
    response_model=APIResponse,
    summary="Scan an image for ingredients (base64 JSON body)",
)
async def scan_image_base64(
    body: ScanRequest,
    user_id: str = Depends(get_current_user_id),
) -> APIResponse:
    """Send a base64-encoded image to the vision model and return detected ingredients."""
    ingredients, raw = await vision_service.scan_image(body.image_base64)
    scan_resp = ScanResponse(ingredients=ingredients, raw_model_output=raw)
    return APIResponse(
        data=scan_resp.model_dump(mode="json"),
        message=f"{len(ingredients)} ingredient(s) detected. Confirm before saving.",
    )


@router.post(
    "/scan/upload",
    response_model=APIResponse,
    summary="Scan an image for ingredients (multipart file upload)",
)
async def scan_image_upload(
    file: UploadFile = File(..., description="Image file (JPEG/PNG)"),
    user_id: str = Depends(get_current_user_id),
) -> APIResponse:
    """Accept a multipart image upload, convert to base64, and send to the vision model."""
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image must be smaller than 10 MB.",
        )
    image_b64 = base64.b64encode(contents).decode("utf-8")
    ingredients, raw = await vision_service.scan_image(image_b64)
    scan_resp = ScanResponse(ingredients=ingredients, raw_model_output=raw)
    return APIResponse(
        data=scan_resp.model_dump(mode="json"),
        message=f"{len(ingredients)} ingredient(s) detected. Confirm before saving.",
    )


@router.post(
    "/items/bulk",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bulk-add confirmed scanned ingredients",
)
async def bulk_add_items(
    body: BulkAddRequest,
    user_id: str = Depends(get_current_user_id),
) -> APIResponse:
    items = await fridge_service.bulk_add_items(user_id, body.items)
    return APIResponse(
        data=[i.model_dump(mode="json") for i in items],
        message=f"{len(items)} item(s) added.",
    )


# ---------------------------------------------------------------------------
# Nutrition Agent integration
# ---------------------------------------------------------------------------

@router.get(
    "/inventory",
    response_model=APIResponse,
    summary="Structured inventory list for the Nutrition Agent",
)
async def get_inventory(
    user_id: str = Depends(get_current_user_id),
) -> APIResponse:
    inventory = await fridge_service.get_inventory(user_id)
    return APIResponse(
        data=[i.model_dump(mode="json") for i in inventory],
        message=f"{len(inventory)} item(s) in inventory.",
    )
