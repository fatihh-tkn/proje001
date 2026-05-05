"""
nodes/n8n_trigger.py
────────────────────────────────────────────────────────────────────
n8n workflow tetikleme uzmanı. `sys_agent_action_001` ajanına karar
verdirip, `allowed_workflows` listesinde varsa workflow'u çalıştırır.

Mevcut `services.ai_service._try_route_and_trigger` fonksiyonunu
yeniden kullanır.

Çıktı:
    {
      "n8n_action":     {workflow, status, detail} | None,
      "ui_action":      {OPEN_TAB veya benzeri},  # opsiyonel
      "nodes_executed": ["n8n_trigger"],
      "node_timings":   {"n8n_trigger": ms},
    }

NOT: Bu node aksiyon TETİKLEYİCİ. Kullanıcı sohbet metni de istiyorsa
aggregator paralel olarak rag_search çıktısıyla sohbet cevabını üretir.
"""

from __future__ import annotations

import time

from core.logger import get_logger
from ..state import AgentState, get_agent_config

logger = get_logger("agent_graph.n8n_trigger")


async def n8n_trigger_node(state: AgentState) -> dict:
    t0 = time.time()
    user_msg = state.get("user_message") or state.get("original_message") or ""

    if not user_msg.strip():
        return {
            "n8n_action": None,
            "nodes_executed": ["n8n_trigger"],
            "node_timings": {"n8n_trigger": 0},
        }

    try:
        from services.ai_service import _try_route_and_trigger
        action_agent = get_agent_config(state, "n8n_trigger")
        action = await _try_route_and_trigger(user_msg, action_agent=action_agent)
        elapsed_ms = int((time.time() - t0) * 1000)

        if action:
            logger.info(
                "[n8n_trigger] workflow=%s status=%s, %d ms",
                action.get("workflow"), action.get("status"), elapsed_ms,
            )
            return {
                "n8n_action": action,
                "nodes_executed": ["n8n_trigger"],
                "node_timings": {"n8n_trigger": elapsed_ms},
            }
        else:
            logger.info("[n8n_trigger] aksiyon yok, %d ms", elapsed_ms)
            return {
                "n8n_action": None,
                "nodes_executed": ["n8n_trigger"],
                "node_timings": {"n8n_trigger": elapsed_ms},
            }

    except Exception as e:
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.error("[n8n_trigger] hata: %s", e, exc_info=True)
        return {
            "n8n_action": None,
            "nodes_executed": ["n8n_trigger"],
            "node_timings": {"n8n_trigger": elapsed_ms},
            "node_errors": {"n8n_trigger": str(e)},
        }
