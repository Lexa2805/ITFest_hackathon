"""
Personal Health OS – FastAPI entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.briefing import router as briefing_router
from app.api.chat import router as chat_router
from app.api.expiry_recipes import router as expiry_recipes_router
from app.api.fridge import router as fridge_router
from app.api.health import router as health_router
from app.api.nutrition_agent import router as nutrition_agent_router
from app.api.nutrition import router as nutrition_router
from app.api.photo_meal import router as photo_meal_router
from app.api.profile import router as profile_router
from app.api.streaks import router as streaks_router
from app.api.trends import router as trends_router

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
app.include_router(briefing_router)
app.include_router(chat_router)
app.include_router(expiry_recipes_router)
app.include_router(fridge_router)
app.include_router(health_router)
app.include_router(nutrition_agent_router)
app.include_router(nutrition_router)
app.include_router(photo_meal_router)
app.include_router(profile_router)
app.include_router(streaks_router)
app.include_router(trends_router)


# ---------------------------------------------------------------------------
# Health-check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}
