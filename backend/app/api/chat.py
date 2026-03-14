"""Chat API router — conversational nutrition agent with SSE streaming."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header
from fastapi.responses import StreamingResponse

from app.api.fridge import get_current_user_id
from app.schemas.chat import ChatMessageRequest
from app.services import chat_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/message", summary="Stream a response from the nutrition agent")
async def send_chat_message(
    body: ChatMessageRequest,
    user_id: str = Depends(get_current_user_id),
    x_timezone: str = Header(default="UTC", alias="X-Timezone"),
) -> StreamingResponse:
    generator = chat_service.send_message_stream(
        user_id=user_id,
        session_id=body.session_id,
        user_message=body.message,
        timezone=x_timezone,
    )
    return StreamingResponse(generator, media_type="text/event-stream")
