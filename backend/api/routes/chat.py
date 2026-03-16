from fastapi import APIRouter

from schemas.chat_schema import ChatMessage, ChatResponse
from services.ai_service import ai_service

router = APIRouter()


@router.post("/", response_model=ChatResponse)
async def send_message(payload: ChatMessage):
    """
    Kullanıcıdan gelen mesajı alır ve AI servisinden yanıt döner.
    file_name varsa yalnızca o dosyanın ChromaDB kayıtlarına bakılır.
    """
    reply_text, rag_used, rag_sources = await ai_service.get_reply(
        user_message=payload.message,
        file_name=payload.file_name,
        collection_name=payload.collection_name,
    )
    return ChatResponse(reply=reply_text, success=True, rag_used=rag_used, rag_sources=rag_sources)
