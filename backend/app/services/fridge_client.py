import os
import httpx
from fastapi import HTTPException, status

FRIDGE_SERVICE_URL = os.getenv("FRIDGE_SERVICE_URL", "http://localhost:8000")

async def fetch_fridge_inventory(token: str) -> list[dict]:
    """
    Fetch current fridge inventory from the Fridge System.
    Handles unavailability gracefully — if the Fridge System is unreachable,
    return a clear error message.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{FRIDGE_SERVICE_URL.rstrip('/')}/fridge/inventory",
                headers={"Authorization": f"Bearer {token}"},
                timeout=5.0
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Fridge System returned an error: {e.response.status_code}"
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Fridge System is unreachable. Please check if the service is running."
        )
