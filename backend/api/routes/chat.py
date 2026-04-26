from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse

from schemas.chat_schema import ChatMessage, ChatResponse
from pydantic import BaseModel
from services.ai_service import AIService
from services.session_service import register_or_touch, SessionLimitError
from core.logger import get_logger

class RevisePromptRequest(BaseModel):
    message: str

logger = get_logger("routes.chat")
router = APIRouter()


def _try_register_session(payload: ChatMessage, client_ip: str) -> None:
    """pc_id + tab_id varsa oturum kaydeder/günceller; limit aşılırsa 429 fırlatır."""
    pc_id = payload.pc_id or payload.mac
    tab_id = payload.tab_id
    if not pc_id or not tab_id:
        return
    try:
        register_or_touch(
            pc_id=pc_id,
            tab_id=tab_id,
            user_id=payload.user_id,
            ip=payload.ip or client_ip,
        )
    except SessionLimitError as exc:
        raise HTTPException(status_code=429, detail=str(exc))


@router.post("/", response_model=ChatResponse)
async def send_message(request: Request, payload: ChatMessage):
    """
    Kullanıcıdan gelen mesajı alır ve AI servisinden yanıt döner.
    file_name varsa yalnızca o dosyanın ChromaDB kayıtlarına bakılır.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    _try_register_session(payload, client_ip)

    try:
        reply_text, rag_used, rag_sources, ui_action = await AIService.get_reply(
            user_message=payload.message,
            file_name=payload.file_name,
            collection_name=payload.collection_name,
            session_id=payload.session_id,
            ip=payload.ip or client_ip,
            mac=payload.pc_id or payload.mac or "00:00:00:00",
            user_id=payload.user_id,
        )
        return ChatResponse(
            reply=reply_text,
            success=True,
            rag_used=rag_used,
            rag_sources=rag_sources,
            ui_action=ui_action,
        )
    except Exception as e:
        logger.error("Sohbet mesajı işlenemedi [session=%s]: %s", payload.session_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Mesaj işlenirken sunucu hatası oluştu.")


@router.post("/stream")
async def send_message_stream(request: Request, payload: ChatMessage):
    """
    SSE (Server-Sent Events) formatında token-by-token yanıt akışı.
    Frontend'de ReadableStream ile okunur.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    _try_register_session(payload, client_ip)

    return StreamingResponse(
        AIService.get_reply_stream(
            user_message=payload.message,
            file_name=payload.file_name,
            collection_name=payload.collection_name,
            session_id=payload.session_id,
            ip=payload.ip or client_ip,
            mac=payload.pc_id or payload.mac or "00:00:00:00",
            user_id=payload.user_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

@router.post("/revise-prompt")
async def revise_prompt_endpoint(payload: RevisePromptRequest):
    """
    İstem Revize Botu'nu çağırır. 
    Kullanıcının yazdığı cümleyi, veritabanındaki ajan ayarlarına göre düzeltip geri yollar.
    """
    try:
        revised = await AIService.revise_prompt(payload.message)
        return {"success": True, "revised_prompt": revised}
    except ValueError as e:
        return {"success": False, "error": str(e)}
    except Exception as e:
        logger.error("Prompt revize hatası: %s", e, exc_info=True)
        return {"success": False, "error": "Prompt revize edilirken sunucu hatası oluştu."}

@router.post("/revise-message")
async def revise_message_endpoint(payload: RevisePromptRequest):
    """
    Mesaj Revize Botu'nu çağırır.
    Yapay zekanın ürettiği taslak yanıtı, daha iyi bir üslup ve kaliteyle kullanıcının göreceği nihai şekle sokar.
    """
    try:
        revised = await AIService.revise_message(payload.message)
        return {"success": True, "revised_message": revised}
    except ValueError as e:
        return {"success": False, "error": str(e)}
    except Exception as e:
        logger.error("Mesaj revize hatası: %s", e, exc_info=True)
        return {"success": False, "error": "Mesaj revize edilirken sunucu hatası oluştu."}

@router.post("/route-action")
async def route_action_endpoint(payload: RevisePromptRequest):
    """
    İşlem Botu'nu çağırır.
    Kullanıcı mesajını analiz ederek n8n, ui_navigate veya none aksiyonu döndürür.
    """
    try:
        result = await AIService.route_action(payload.message)
        return {"success": True, "action_result": result}
    except ValueError as e:
        return {"success": False, "error": str(e)}
    except Exception as e:
        logger.error("Aksiyon yönlendirme hatası: %s", e, exc_info=True)
        return {"success": False, "error": "Aksiyon yönlendirme sırasında sunucu hatası oluştu."}
