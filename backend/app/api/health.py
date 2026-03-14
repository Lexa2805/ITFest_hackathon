"""Health export API routes for uploading Apple Health ZIP exports."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.fridge import get_current_user_id
from app.schemas.health import HealthExportUploadResponse
from app.services.agent_trigger_service import trigger_downstream_agents
from app.services.health_export_parser import parse_health_export_zip
from app.services.physical_state_service import calculate_physical_state
from app.services import health_service

router = APIRouter(tags=["health-export"])


@router.post(
    "/upload-health-export",
    response_model=HealthExportUploadResponse,
    summary="Upload and parse Apple Health export.zip",
)
@router.post(
    "/api/upload-health-export",
    response_model=HealthExportUploadResponse,
    include_in_schema=False,
)
async def upload_health_export(
    file: UploadFile = File(..., description="Apple Health export ZIP file"),
    user_id: str = Depends(get_current_user_id),
) -> HealthExportUploadResponse:
    """
    Accept `export.zip`, parse `export.xml`, compute biometric summaries,
    generate a physical-state score, save to database, and trigger downstream agents.
    """
    filename = (file.filename or "").lower()
    if not filename.endswith(".zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a .zip file exported from Apple Health.",
        )

    zip_bytes = await file.read()
    if not zip_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    max_size_mb = 50
    if len(zip_bytes) > max_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum allowed size is {max_size_mb}MB.",
        )

    parsed_metrics, raw_series = parse_health_export_zip(zip_bytes)

    physical_state = calculate_physical_state(
        heart_rates=raw_series["heart_rates"],
        step_values=raw_series["steps"],
        sleep_hours=raw_series["sleep_hours"],
        hrv_values=raw_series["hrv"],
    )

    # Save to database
    await health_service.save_health_data(user_id, parsed_metrics, physical_state)

    downstream_results = await trigger_downstream_agents(
        parsed_metrics=parsed_metrics,
        physical_state=physical_state,
    )

    return HealthExportUploadResponse(
        parsed_metrics=parsed_metrics,
        physical_state=physical_state,
        downstream_calls=downstream_results,
    )


@router.get(
    "/health-data",
    response_model=HealthExportUploadResponse,
    summary="Get the latest health export data for the current user",
)
@router.get(
    "/api/health-data",
    response_model=HealthExportUploadResponse,
    include_in_schema=False,
)
async def get_health_data(
    user_id: str = Depends(get_current_user_id),
) -> HealthExportUploadResponse:
    """
    Retrieve the most recent health export data for the authenticated user.
    """
    data = await health_service.get_health_data(user_id)
    
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No health data found. Please upload a health export first.",
        )
    
    return HealthExportUploadResponse(
        parsed_metrics=data["parsed_metrics"],
        physical_state=data["physical_state"],
        downstream_calls=[],  # Historical data doesn't include downstream calls
    )
