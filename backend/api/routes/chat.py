from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from schemas.chat_schema import ChatMessage, ChatResponse
from services.ai_service import AIService

router = APIRouter()


@router.post("/", response_model=ChatResponse)
async def send_message(request: Request, payload: ChatMessage):
    """
    Kullanıcıdan gelen mesajı alır ve AI servisinden yanıt döner.
    file_name varsa yalnızca o dosyanın ChromaDB kayıtlarına bakılır.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"

    reply_text, rag_used, rag_sources, ui_action = await AIService.get_reply(
        user_message=payload.message,
        file_name=payload.file_name,
        collection_name=payload.collection_name,
        session_id=payload.session_id,
        ip=payload.ip or client_ip,
        mac=payload.mac or "00:00:00:00"
    )
    return ChatResponse(
        reply=reply_text, 
        success=True, 
        rag_used=rag_used, 
        rag_sources=rag_sources,
        ui_action=ui_action
    )


@router.post("/stream")
async def send_message_stream(request: Request, payload: ChatMessage):
    """
    SSE (Server-Sent Events) formatında token-by-token yanıt akışı.
    Frontend'de ReadableStream ile okunur.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"

    return StreamingResponse(
        AIService.get_reply_stream(
            user_message=payload.message,
            file_name=payload.file_name,
            collection_name=payload.collection_name,
            session_id=payload.session_id,
            ip=payload.ip or client_ip,
            mac=payload.mac or "00:00:00:00",
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

