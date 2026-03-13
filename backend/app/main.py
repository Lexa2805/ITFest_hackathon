"""
Personal Health OS – FastAPI entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router

app = FastAPI(
    title="Personal Health OS",
    version="0.1.0",
    description="Backend API for the Personal Health OS mobile application.",
)

# ---------------------------------------------------------------------------
# CORS – allow all origins during development
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth_router)


# ---------------------------------------------------------------------------
# Health-check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}
