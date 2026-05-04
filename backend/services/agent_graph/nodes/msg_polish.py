"""
nodes/msg_polish.py
────────────────────────────────────────────────────────────────────
Mesaj Revize Botu (sys_agent_msg_001) — kullanıcıya gösterilmeden
önce final_reply'ın üslubunu/formatını profesyonelleştirir.

Sadece şu durumlarda çalışır:
  • state["needs_polish"] == True (supervisor karar verdi)
  • final_reply boş değil
  • final_reply yapılandırılmış JSON ile başlamıyor (error_solution,
    zli_report_query gibi şemaları bozmamak için)
  • sys_agent_msg_001 ajanı DB'de mevcut ve prompt'u dolu

Aksi halde state'i değiştirmeden geçer (no-op).

Mevcut `services.ai_service.AIService.revise_message` static
metodu kullanılır; revize başarısızsa orijinal cevap korunur.

Çıktı:
    {
      "final_reply":      str,                     # revize edilmiş veya orijinal
      "nodes_executed":   ["msg_polish"],
      "node_timings":     {"msg_polish": ms},
    }
"""

from __future__ import annotations

import time

from fastapi.concurrency import run_in_threadpool

from core.logger import get_logger
from core.db_bridge import get_ai_agent
from ..state import AgentState

try:
    from langgraph.config import get_stream_writer
except ImportError:  # pragma: no cover
    get_stream_writer = None  # type: ignore

logger = get_logger("agent_graph.msg_polish")


def _try_get_writer():
    if get_stream_writer is None:
        return None
    try:
        return get_stream_writer()
    except Exception:
        return None


def _looks_like_json_payload(text: str) -> bool:
    """error_solution / zli_report_query gibi yapılandırılmış JSON mu?"""
    t = (text or "").lstrip()
    return t.startswith("{") or t.startswith("```json")


async def msg_polish_node(state: AgentState) -> dict:
    t0 = time.time()
    final_reply = state.get("final_reply") or ""

    # No-op koşulları
    if not final_reply.strip():
        return {
            "nodes_executed": ["msg_polish"],
            "node_timings": {"msg_polish": 0},
        }

    if _looks_like_json_payload(final_reply):
        logger.info("[msg_polish] JSON payload → atlandı")
        return {
            "nodes_executed": ["msg_polish"],
            "node_timings": {"msg_polish": int((time.time() - t0) * 1000)},
        }

    # Ajan kontrolü
    try:
        msg_bot = await run_in_threadpool(get_ai_agent, "sys_agent_msg_001")
    except Exception as e:
        logger.warning("[msg_polish] msg_bot çekilemedi: %s", e)
        msg_bot = None

    if not msg_bot or not (msg_bot.get("prompt") or "").strip():
        logger.info("[msg_polish] msg_bot pasif → atlandı")
        return {
            "nodes_executed": ["msg_polish"],
            "node_timings": {"msg_polish": int((time.time() - t0) * 1000)},
        }

    # Revize
    try:
        from services.ai_service import AIService
        revised = await AIService.revise_message(final_reply)
        elapsed_ms = int((time.time() - t0) * 1000)

        if revised and revised.strip() and revised.strip() != final_reply.strip():
            logger.info(
                "[msg_polish] revize edildi (%d → %d karakter, %d ms)",
                len(final_reply), len(revised), elapsed_ms,
            )
            # Streaming context'te frontend baloncuğunu yeni metinle değiştir
            writer = _try_get_writer()
            if writer:
                try:
                    writer({"type": "replace", "text": revised.strip()})
                except Exception as e:
                    logger.warning("[msg_polish] writer hatası: %s", e)
            return {
                "final_reply": revised.strip(),
                "nodes_executed": ["msg_polish"],
                "node_timings": {"msg_polish": elapsed_ms},
            }

        logger.info("[msg_polish] revize değişiklik üretmedi (%d ms)", elapsed_ms)
        return {
            "nodes_executed": ["msg_polish"],
            "node_timings": {"msg_polish": elapsed_ms},
        }

    except Exception as e:
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.warning("[msg_polish] revize hatası, orijinal korunuyor: %s", e)
        return {
            "nodes_executed": ["msg_polish"],
            "node_timings": {"msg_polish": elapsed_ms},
            "node_errors": {"msg_polish": str(e)},
        }
