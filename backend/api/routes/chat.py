import time

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.concurrency import run_in_threadpool

from schemas.chat_schema import ChatMessage, ChatResponse
from pydantic import BaseModel
from services.ai_service import AIService
from services.session_service import register_or_touch, SessionLimitError
from core.logger import get_logger
from core.db_bridge import is_agent_graph_enabled

class RevisePromptRequest(BaseModel):
    message: str


class FollowupRequest(BaseModel):
    user_message: str
    bot_reply: str
    max_count: int = 2

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
    Klasik (non-stream) JSON yanıt — bot/script entegrasyonları için.
    Flag açıkken LangGraph akışı tek atımda tüketilir; kapalıyken klasik
    AIService.get_reply çağrılır.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    _try_register_session(payload, client_ip)

    if is_agent_graph_enabled():
        # Graph'ı non-streaming şekilde çağır — checkpointer kullan; tüm
        # event'leri toplayıp tek ChatResponse döndür.
        from services.agent_graph import build_graph
        state = _build_initial_state(payload, client_ip)
        checkpointer = getattr(request.app.state, "checkpointer", None)
        config = {"configurable": {"thread_id": payload.session_id or "default"}} if checkpointer else None
        try:
            graph = build_graph(checkpointer=checkpointer)
            final_state = await graph.ainvoke(state, config=config)
            return ChatResponse(
                reply=final_state.get("final_reply", ""),
                success=True,
                rag_used=bool(final_state.get("rag_context")),
                rag_sources=final_state.get("rag_sources") or [],
                ui_action=final_state.get("ui_action"),
            )
        except Exception as e:
            logger.error("Graph chat hatası [session=%s]: %s", payload.session_id, e, exc_info=True)
            raise HTTPException(status_code=500, detail="Mesaj işlenirken sunucu hatası oluştu.")

    # Acil rollback yolu — flag kapalı
    try:
        reply_text, rag_used, rag_sources, ui_action = await AIService.get_reply(
            user_message=payload.message,
            file_name=payload.file_name,
            collection_name=payload.collection_name,
            session_id=payload.session_id,
            ip=payload.ip or client_ip,
            mac=payload.pc_id or payload.mac or "00:00:00:00",
            user_id=payload.user_id,
            command=payload.command,
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


def _build_initial_state(payload: ChatMessage, client_ip: str) -> dict:
    """ChatMessage payload'ı LangGraph AgentState dict'ine çevirir."""
    # Sohbet hafızası — chatbot ajanının chat_history_length değerine göre
    # son N turu yükle. Ajan değeri yoksa system setting MAX_HISTORY_TURNS.
    history: list[dict] = []
    try:
        from services.ai_service import _get_history
        from core.db_bridge import get_assigned_agent
        max_turns: int | None = None
        try:
            # History aggregator'ın LLM'ine besleniyor → onun ajanından oku
            agg_agent = get_assigned_agent("aggregator") or {}
            ml = agg_agent.get("chat_history_length")
            if ml and int(ml) > 0:
                max_turns = int(ml)
        except Exception:
            pass
        raw = _get_history(payload.session_id, max_turns=max_turns) or []
        # _get_history → [{role, text}] formatı; AgentState [{role, content}] bekler
        for m in raw:
            role = m.get("role")
            if role in ("user", "assistant"):
                history.append({"role": role, "content": m.get("text") or m.get("content", "")})
    except Exception as e:
        logger.warning("[graph-stream] history yüklenemedi: %s", e)

    # Çoklu dosya: schema'dan al, yoksa tekil file_name'i listeye sar
    file_names = list(payload.file_names or [])
    if not file_names and payload.file_name:
        file_names = [payload.file_name]

    return {
        "user_message":     payload.message,
        "original_message": payload.message,
        "user_id":          payload.user_id,
        "session_id":       payload.session_id,
        "command":          payload.command,
        "file_name":        payload.file_name,
        "file_names":       file_names,
        "collection_name":  payload.collection_name,
        "ip":               payload.ip or client_ip,
        "mac":              payload.pc_id or payload.mac or "00:00:00:00",
        "history":          history,
        "started_at":       time.time() * 1000,
    }


async def _graph_stream_response(request: Request, payload: ChatMessage):
    """Ortak graph-stream akışı — `/stream` (flag açıkken) ve `/graph-stream`
    endpoint'leri tarafından kullanılır."""
    from services.agent_graph import stream_run

    client_ip = request.client.host if request.client else "127.0.0.1"
    state = _build_initial_state(payload, client_ip)

    # Lifespan'da hazırlanan checkpointer'ı kullan; yoksa in-memory.
    checkpointer = getattr(request.app.state, "checkpointer", None)

    return StreamingResponse(
        stream_run(state, checkpointer=checkpointer, thread_id=payload.session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/stream")
async def send_message_stream(request: Request, payload: ChatMessage):
    """
    SSE (Server-Sent Events) formatında token-by-token yanıt akışı.
    Frontend'de ReadableStream ile okunur.

    Feature flag: `agent_graph_enabled` system setting true ise LangGraph
    pipeline'ına yönlendirir. Aksi halde mevcut AIService akışı.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    _try_register_session(payload, client_ip)

    if is_agent_graph_enabled():
        logger.info("[stream] LangGraph yolu (flag=on, session=%s)", payload.session_id)
        return await _graph_stream_response(request, payload)

    return StreamingResponse(
        AIService.get_reply_stream(
            user_message=payload.message,
            file_name=payload.file_name,
            collection_name=payload.collection_name,
            session_id=payload.session_id,
            ip=payload.ip or client_ip,
            mac=payload.pc_id or payload.mac or "00:00:00:00",
            user_id=payload.user_id,
            command=payload.command,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/graph-stream")
async def send_message_graph_stream(request: Request, payload: ChatMessage):
    """
    LangGraph multi-agent pipeline'ı (supervisor → specialist'ler →
    aggregator → msg_polish) doğrudan çalıştırır. Feature flag'den
    bağımsız çalışır — A/B test ve dogfooding için.

    Event türleri (SSE `data:` JSON): progress, chunk, replace, sources,
    ui_action, n8n_action, node_error, done, error.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    _try_register_session(payload, client_ip)
    return await _graph_stream_response(request, payload)

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

@router.post("/followups")
async def followups_endpoint(payload: FollowupRequest):
    """
    Kullanıcının son mesajına ve bot cevabına bakarak takip sorusu önerileri
    üretir. Chatbot ajanında can_ask_follow_up false ise boş liste döner.
    """
    try:
        questions = await AIService.suggest_followups(
            user_message=payload.user_message,
            bot_reply=payload.bot_reply,
            max_count=max(1, min(payload.max_count, 4)),
        )
        return {"success": True, "questions": questions}
    except Exception as e:
        logger.error("Takip sorusu üretim hatası: %s", e, exc_info=True)
        return {"success": False, "questions": []}


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
