"""
agent_graph/runner.py
────────────────────────────────────────────────────────────────────
Graph'ı çalıştırır ve LangGraph stream event'lerini frontend SSE
protokolüne çevirir.

SSE event şeması (frontend ChatPanel + ThinkingProcessPanel parse eder):

    {"type": "progress",
     "node": "rag_search",
     "phase": "completed",
     "elapsed_ms": 245,
     "intent": "general"}                # supervisor sonrası set olur

    {"type": "chunk",   "text": "..."}   # token-level draft yazımı
    {"type": "replace", "text": "..."}   # msg_polish sonrası tam değiştirme

    {"type": "sources",  "items": [...], "score": 0.87}
    {"type": "ui_action","action": {...}}

    {"type": "done",
     "intent": "...",
     "nodes_executed": [...],
     "node_timings": {...},
     "rag_used": bool,
     "rag_sources": [...],
     "ui_action": {...} | None,
     "prompt_tokens": int,
     "completion_tokens": int,
     "duration_ms": int}

    {"type": "error", "text": "..."}

Public:
    stream_run(state, *, checkpointer=None, thread_id=None)
        AsyncIterator[str]   — `data: <json>\\n\\n` formatında satırlar.

LG.4'te `/api/chat/graph-stream` endpoint'i bu generator'ı doğrudan
StreamingResponse olarak yayar.
"""

from __future__ import annotations

import asyncio
import json
import time
import uuid
from datetime import datetime
from typing import AsyncIterator

from fastapi.concurrency import run_in_threadpool

from core.logger import get_logger
from .graph import build_graph
from .state import AgentState

logger = get_logger("agent_graph.runner")


# Klasik ai_service.py ile aynı tarife — log birim maliyetleri (USD)
_COST_PER_PROMPT_TOKEN = 0.000005
_COST_PER_COMPLETION_TOKEN = 0.000015


def _persist_run(
    initial_state: dict,
    aggregated: dict,
    duration_ms: int,
    error_text: str | None = None,
) -> None:
    """
    Sync helper — runner sonunda threadpool'da çağrılır.
    Klasik akıştaki davranışla bire bir uyumlu olacak şekilde:
      • api_loglari tablosuna log_entry yazar (cost dahil)
      • mesajlar tablosuna user+assistant turunu kaydeder
    Her iki yazımda da tek tek try/except — biri patlasa diğeri çalışsın.
    """
    from core.db_bridge import add_log_to_db

    user_message = initial_state.get("user_message") or ""
    session_id = initial_state.get("session_id") or "default_chat"
    ip = initial_state.get("ip") or "127.0.0.1"
    mac = initial_state.get("mac") or "00:00:00:00"
    file_name = initial_state.get("file_name") or ""
    final_reply = aggregated.get("final_reply") or ""

    total_tokens_map = aggregated.get("total_tokens") or {}
    p_tok = sum(int((v or {}).get("p", 0) or 0) for v in total_tokens_map.values())
    c_tok = sum(int((v or {}).get("c", 0) or 0) for v in total_tokens_map.values())
    total_tok = p_tok + c_tok
    cost = (p_tok * _COST_PER_PROMPT_TOKEN) + (c_tok * _COST_PER_COMPLETION_TOKEN)

    model = aggregated.get("model_used") or ""
    provider = aggregated.get("provider_used") or ""

    # 1) API log
    log_entry = {
        "id":               f"log_{uuid.uuid4().hex[:8]}",
        "timestamp":        datetime.utcnow().isoformat() + "Z",
        "provider":         provider,
        "model":            model,
        "promptTokens":     p_tok,
        "completionTokens": c_tok,
        "totalTokens":      total_tok,
        "duration":         duration_ms,
        "status":           "error" if error_text else "success",
        "cost":             cost if not error_text else 0,
        "projectId":        "chat_ui",
        "sessionId":        session_id,
        "role":             "user",
        "error":            error_text,
        "request":          user_message,
        "response":         final_reply if not error_text else f"❌ {error_text}",
        "ip":               ip,
        "mac":              mac,
        "rag_used":         bool(aggregated.get("rag_context")),
        "rag_file":         file_name,
    }
    try:
        add_log_to_db(log_entry)
    except Exception as e:
        logger.warning("[runner] add_log_to_db hatası: %s", e)

    # 2) Sohbet hafızası (yalnızca başarılı tur)
    if error_text or not final_reply.strip():
        return
    try:
        from services.ai_service import _save_to_history
        _save_to_history(
            session_id,
            user_message,
            final_reply,
            model or None,
            aggregated.get("rag_sources") or None,
        )
    except Exception as e:
        logger.warning("[runner] _save_to_history hatası: %s", e)


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _sum_tokens(total_tokens: dict | None, key: str) -> int:
    if not total_tokens:
        return 0
    s = 0
    for v in total_tokens.values():
        try:
            s += int((v or {}).get(key, 0) or 0)
        except (TypeError, ValueError):
            pass
    return s


async def stream_run(
    state: AgentState,
    *,
    checkpointer=None,
    thread_id: str | None = None,
) -> AsyncIterator[str]:
    """
    Graph'ı async stream ile çalıştırır. Her çıkan event'i SSE satırına
    çevirir. Caller tarafı `StreamingResponse(stream_run(...), media_type=
    "text/event-stream")` olarak kullanır.

    Hata/cancellation durumunda son satır olarak 'error' event'i yayar.
    """
    started_at = time.time()
    state.setdefault("started_at", started_at * 1000)

    # Erken çıkış: hiç model kayıtlı değilse graph'ı çalıştırmaya gerek yok.
    # Aksi halde kullanıcı "Süreç · 14.5 sn" + boş cevap görüyor (RAG çalışıyor
    # ama LLM çağrıları sessizce patlıyor).
    try:
        from core.db_bridge import get_user_models
        if not get_user_models(include_secret=False):
            yield _sse({
                "type": "error",
                "text": "❌ Kayıtlı yapay zeka modeli yok. "
                        "Ayarlar → Yapay Zeka Modelleri kısmından bir model ekleyin.",
            })
            return
    except Exception as _e:
        logger.warning("[runner] model precheck hatası: %s", _e)

    config: dict = {}
    if checkpointer is not None:
        config["configurable"] = {
            "thread_id": thread_id or state.get("session_id") or "default"
        }

    graph = build_graph(checkpointer=checkpointer)

    aggregated: dict = {}
    intent_emitted: bool = False
    chunk_emitted: bool = False  # En az bir LLM chunk üretildi mi?

    try:
        async for stream_mode, payload in graph.astream(
            state,
            config=config or None,
            stream_mode=["updates", "custom"],
        ):
            # ── Custom event'ler: node içinden writer({...}) ile gelir ──
            if stream_mode == "custom":
                if isinstance(payload, dict) and "type" in payload:
                    # En az bir LLM chunk geldi mi izle — sonda kullanıcıya
                    # boş baloncuk göstermemek için.
                    # 'chunk' (token streaming) VE 'replace' (pass-through JSON,
                    # ör. error_solver/zli_finder kart çıktıları) ikisi de
                    # "cevap üretildi" sayılır — yoksa runner sonda hatalı
                    # şekilde "API anahtarı geçersiz" mesajı yolluyor.
                    _ptype = payload.get("type")
                    if _ptype in ("chunk", "replace") and (payload.get("text") or "").strip():
                        chunk_emitted = True
                    yield _sse(payload)
                continue

            # ── Updates: her node tamamlandığında state delta'sı ─────────
            if stream_mode != "updates":
                continue

            # payload = {node_name: state_update_dict}
            for node_name, update in (payload or {}).items():
                if not isinstance(update, dict):
                    continue
                aggregated.update({k: v for k, v in update.items()
                                   if k not in ("nodes_executed", "node_timings",
                                                "node_errors", "total_tokens")})
                # Telemetri akümülatörlerini özel merge et (reducer'ı taklit)
                for k in ("nodes_executed",):
                    if update.get(k):
                        aggregated.setdefault(k, []).extend(update[k])
                for k in ("node_timings", "node_errors", "total_tokens"):
                    if update.get(k):
                        aggregated.setdefault(k, {}).update(update[k])

                # Progress event
                elapsed_ms = (update.get("node_timings") or {}).get(node_name)
                evt: dict = {
                    "type": "progress",
                    "node": node_name,
                    "phase": "completed",
                }
                if elapsed_ms is not None:
                    evt["elapsed_ms"] = int(elapsed_ms)
                # Supervisor tamamlandığında intent + plan'ı bildir
                if node_name == "supervisor" and not intent_emitted:
                    evt["intent"] = update.get("intent")
                    evt["plan"] = [p.get("node") for p in (update.get("plan") or [])]
                    evt["reasoning"] = update.get("plan_reasoning", "")
                    intent_emitted = True
                yield _sse(evt)

                # rag_search çıktısı varsa kaynakları yayınla
                if node_name == "rag_search":
                    sources = update.get("rag_sources") or []
                    if sources:
                        yield _sse({
                            "type": "sources",
                            "items": sources,
                            "score": float(update.get("rag_score") or 0.0),
                        })
                    if update.get("ui_action"):
                        yield _sse({"type": "ui_action",
                                    "action": update["ui_action"]})

                # n8n_trigger sonucu
                if node_name == "n8n_trigger" and update.get("n8n_action"):
                    yield _sse({"type": "n8n_action",
                                "action": update["n8n_action"]})

                # Hata varsa anında bildir (graph yine de devam eder)
                if update.get("node_errors"):
                    for err_node, err_msg in update["node_errors"].items():
                        yield _sse({"type": "node_error",
                                    "node": err_node,
                                    "text": err_msg})

        # ── Bitiş: log + history yaz, sonra 'done' event ────────────────
        duration_ms = int((time.time() - started_at) * 1000)
        total_tokens = aggregated.get("total_tokens") or {}

        try:
            await run_in_threadpool(_persist_run, dict(state), aggregated, duration_ms, None)
        except Exception as e:
            logger.warning("[runner] persist_run hatası: %s", e)

        # FALLBACK: writer null veya custom event başka bir nedenle düşmediyse
        # aggregated.final_reply'dan synthetic replace yolla (pass-through
        # JSON kartları için kritik — kullanıcı boş "API key" hata mesajı
        # görmesin).
        if not chunk_emitted:
            _final = (aggregated.get("final_reply") or "").strip()
            if _final:
                yield _sse({"type": "replace", "text": _final})
                chunk_emitted = True
                logger.info(
                    "[runner] writer event kaçtı; final_reply'dan synthetic replace yayınlandı (%d karakter)",
                    len(_final),
                )

        # Hiç cevap üretilmediyse done yerine error — kullanıcıya
        # cevap "boş baloncuk + RAG kartları" şeklinde görmesin.
        if not chunk_emitted:
            node_errors = aggregated.get("node_errors") or {}
            if node_errors:
                # En anlamlı node hatasını öne çıkar (genelde aggregator/specialist)
                err_msg = next(iter(node_errors.values()))
                err_text = (
                    f"❌ Yapay zeka cevabı üretilemedi: {err_msg}\n\n"
                    "Çözüm: Ayarlar → Yapay Zeka Modelleri → API anahtarınızı doğrulayın."
                )
            else:
                err_text = (
                    "❌ Yapay zeka cevabı üretilemedi. "
                    "API anahtarınızın geçerli ve yeterli krediye sahip olduğundan emin olun "
                    "(Ayarlar → Yapay Zeka Modelleri)."
                )
            yield _sse({"type": "error", "text": err_text})
            return

        yield _sse({
            "type": "done",
            "intent": aggregated.get("intent"),
            "nodes_executed": aggregated.get("nodes_executed") or [],
            "node_timings": aggregated.get("node_timings") or {},
            "rag_used": bool(aggregated.get("rag_context")),
            "rag_sources": aggregated.get("rag_sources") or [],
            "ui_action": aggregated.get("ui_action"),
            "model": aggregated.get("model_used") or None,
            "provider": aggregated.get("provider_used") or None,
            "prompt_tokens": _sum_tokens(total_tokens, "p"),
            "completion_tokens": _sum_tokens(total_tokens, "c"),
            "duration_ms": duration_ms,
        })

    except asyncio.CancelledError:
        logger.info("[runner] iptal edildi (CancelledError)")
        # İptal edilse bile o ana kadarki kısmi cevabı log'a düş
        try:
            duration_ms = int((time.time() - started_at) * 1000)
            await run_in_threadpool(
                _persist_run, dict(state), aggregated, duration_ms, "İptal edildi"
            )
        except Exception:
            pass
        yield _sse({"type": "error", "text": "⏹ İşlem iptal edildi."})
        raise
    except Exception as e:
        logger.error("[runner] stream hatası: %s", e, exc_info=True)
        try:
            duration_ms = int((time.time() - started_at) * 1000)
            await run_in_threadpool(
                _persist_run, dict(state), aggregated, duration_ms, str(e)
            )
        except Exception:
            pass
        yield _sse({"type": "error", "text": f"❌ Sistemsel hata: {e}"})
