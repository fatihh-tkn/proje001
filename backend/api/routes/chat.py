from fastapi import APIRouter

from schemas.chat_schema import ChatMessage, ChatResponse
from services.ai_service import ai_service

router = APIRouter()


@router.post("/", response_model=ChatResponse)
async def send_message(payload: ChatMessage):
    """
    Kullanıcıdan gelen mesajı alır ve AI servisinden yanıt döner.
    """
    reply_text = await ai_service.get_reply(payload.message)
    return ChatResponse(reply=reply_text, success=True)
