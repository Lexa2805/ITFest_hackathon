"""Pydantic models for the /chat endpoints."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ChatMessageRequest(BaseModel):
    """Request body for sending a chat message."""
    session_id: Optional[str] = None  # None = start new session
    message: str


class ChatMessageResponse(BaseModel):
    """Non-streaming fallback / persisted message record."""
    session_id: str
    role: str  # 'assistant'
    content: str
    created_at: datetime
