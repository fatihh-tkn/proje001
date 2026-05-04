"""
nodes/chat_reply.py
────────────────────────────────────────────────────────────────────
Genel cevap üretici. Mevcut "chatbot" agent'ının LangGraph karşılığı.

Mevcut DB'deki AIAgent (agent_kind='chatbot') kaydının prompt + model
+ temperature ayarlarını kullanır.

Çıktı:
    {
      "chat_draft":        str,    # cevabın tam metni
      "final_reply":       str,    # aggregator yoksa direkt bu kullanılır
      "total_tokens":      {"chat_reply": {p, c}},
      "nodes_executed":    ["chat_reply"],
      "node_timings":      {"chat_reply": ms},
    }

NOT: Streaming işi runner.py'de halledilecek (LG.3'te). Bu node şimdilik
non-streaming `call_llm` kullanıyor — token-level pump LG.3'te eklenir.
"""

from __future__ import annotations

import time

from core.logger import get_logger
from core.db_bridge import get_ai_agent
from ..state import AgentState
from ..llm_adapter import call_llm, build_messages

logger = get_logger("agent_graph.chat_reply")


_DEFAULT_SYSTEM = (
    "Sen şirket içi yapay zeka asistanısın. Kullanıcının sorusuna açık, kısa ve "
    "doğru cevap ver. Türkçe yaz. Bilgi tabanı bağlamı (RAG) varsa onu temel al."
)


def _build_system_prompt(state: AgentState, agent_config: dict | None) -> str:
    """
    DB'deki chatbot ajan prompt'u + RAG context + (varsa) kullanıcı kısıtlamaları.
    """
    parts: list[str] = []

    if agent_config and agent_config.get("prompt"):
        parts.append(agent_config["prompt"])
    else:
        parts.append(_DEFAULT_SYSTEM)

    if agent_config and agent_config.get("negative_prompt"):
        parts.append(f"\n[KESİNLİKLE YAPMAMAN GEREKENLER]\n{agent_config['negative_prompt']}")

    rag_ctx = state.get("rag_context")
    if rag_ctx:
        parts.append(f"\n[BİLGİ TABANI BAĞLAMI]\n{rag_ctx}")

    return "\n\n".join(parts)


async def chat_reply_node(state: AgentState) -> dict:
    t0 = time.time()
    try:
        agent_config = get_ai_agent("chatbot")
    except Exception as e:
        logger.warning("[chat_reply] DB'den agent çekilemedi: %s — varsayılanla devam", e)
        agent_config = None

    system = _build_system_prompt(state, agent_config)
    history = state.get("history") or []
    user_msg = state.get("user_message") or state.get("original_message") or ""

    messages = build_messages(system=system, history=history, user=user_msg)

    try:
        result = await call_llm(
            agent_config,
            messages,
            temperature=(agent_config or {}).get("temperature", 0.7),
        )
        text = (result.get("text") or "").strip()
        elapsed_ms = int((time.time() - t0) * 1000)

        logger.info("[chat_reply] %d karakter, %d/%d token, %d ms",
                    len(text),
                    result.get("prompt_tokens", 0),
                    result.get("completion_tokens", 0),
                    elapsed_ms)

        return {
            "chat_draft": text,
            "final_reply": text,
            "nodes_executed": ["chat_reply"],
            "node_timings": {"chat_reply": elapsed_ms},
            "total_tokens": {"chat_reply": {
                "p": result.get("prompt_tokens", 0),
                "c": result.get("completion_tokens", 0),
            }},
            "needs_polish": False,  # LG.2'de msg_polish entegre olunca conditional
        }
    except Exception as e:
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.error("[chat_reply] hata: %s", e, exc_info=True)
        return {
            "chat_draft": "",
            "final_reply": f"❌ Cevap üretilemedi: {e}",
            "nodes_executed": ["chat_reply"],
            "node_timings": {"chat_reply": elapsed_ms},
            "node_errors": {"chat_reply": str(e)},
        }
