"""
agent_graph/graph.py
────────────────────────────────────────────────────────────────────
LangGraph StateGraph — multi-specialist + parallel branches.

Topoloji (LG.2):

    START
      │
      ▼
   supervisor          (intent + plan üretir)
      │
      ▼  (Send API ile state.plan'a göre paralel dağıtım)
   ┌──────────┬──────────────┬──────────────┬──────────────┐
   │rag_search│ error_solver │  zli_finder  │ n8n_trigger  │
   └────┬─────┴──────┬───────┴──────┬───────┴──────┬───────┘
        │            │              │              │
        └────────────┴──────┬───────┴──────────────┘
                            ▼
                       aggregator        (specialist çıktılarını birleştirir)
                            │
                            ▼  (needs_polish?)
                       msg_polish        (opsiyonel — sys_agent_msg_001)
                            │
                            ▼
                           END

Send API: supervisor'dan çıkan conditional edge `state["plan"]`'ı okur,
plan'daki her node için bir `Send(node_name, state)` üretir. LangGraph
bunları paralel çalıştırır ve hepsi tamamlanınca aggregator tetiklenir
(super-step modeli — fan-in otomatik).

LG.3'te `astream(stream_mode=["updates","messages"])` ile token-level
SSE pump eklenecek.
"""

from __future__ import annotations

from langgraph.graph import StateGraph, START, END
from langgraph.types import Send

from .state import AgentState
from .nodes import (
    supervisor_node,
    rag_search_node,
    error_solver_node,
    zli_finder_node,
    n8n_trigger_node,
    aggregator_node,
    msg_polish_node,
)


# Plan içindeki node adı → graph node adı eşleştirmesi
# (whitelist; supervisor yanlış bir isim üretirse Send'e dahil edilmez)
_VALID_SPECIALISTS = {
    "rag_search",
    "error_solver",
    "zli_finder",
    "n8n_trigger",
}


def _dispatch_specialists(state: AgentState):
    """
    Supervisor'dan sonra çağrılan conditional dispatcher.
    state["plan"]'ı okur, her geçerli specialist için bir Send üretir.
    Plan boşsa veya geçersizse aggregator'a düşer (genel sohbet).
    """
    plan = state.get("plan") or []
    sends: list[Send] = []
    for entry in plan:
        node = (entry or {}).get("node")
        if node in _VALID_SPECIALISTS:
            sends.append(Send(node, state))
    if not sends:
        # Specialist yoksa direkt aggregator'a (genel sohbet)
        return "aggregator"
    return sends


def _route_after_aggregator(state: AgentState) -> str:
    """needs_polish flag'ine göre msg_polish veya END."""
    return "msg_polish" if state.get("needs_polish") else END


def build_graph(checkpointer=None):
    """
    StateGraph kurar, node'ları + edge'leri tanımlar, compile eder.

    Args:
        checkpointer: Opsiyonel checkpoint backend (PostgresSaver vb.).
                      None → in-memory (her run bağımsız).

    Returns:
        Compiled graph (Runnable). `.ainvoke(state)` veya `.astream(...)`.
    """
    graph = StateGraph(AgentState)

    # Node kayıtları
    graph.add_node("supervisor",   supervisor_node)
    graph.add_node("rag_search",   rag_search_node)
    graph.add_node("error_solver", error_solver_node)
    graph.add_node("zli_finder",   zli_finder_node)
    graph.add_node("n8n_trigger",  n8n_trigger_node)
    graph.add_node("aggregator",   aggregator_node)
    graph.add_node("msg_polish",   msg_polish_node)

    # START → supervisor
    graph.add_edge(START, "supervisor")

    # supervisor → (paralel) specialist'ler
    # add_conditional_edges Send listesi de kabul eder; path_map vermek
    # graph görselleştirmesini düzenli tutar.
    graph.add_conditional_edges(
        "supervisor",
        _dispatch_specialists,
        path_map=[
            "rag_search",
            "error_solver",
            "zli_finder",
            "n8n_trigger",
            "aggregator",   # fallback (plan boşsa)
        ],
    )

    # Tüm specialist'ler → aggregator (fan-in; LangGraph hepsini bekler)
    graph.add_edge("rag_search",   "aggregator")
    graph.add_edge("error_solver", "aggregator")
    graph.add_edge("zli_finder",   "aggregator")
    graph.add_edge("n8n_trigger",  "aggregator")

    # aggregator → (needs_polish?) msg_polish | END
    graph.add_conditional_edges(
        "aggregator",
        _route_after_aggregator,
        path_map=["msg_polish", END],
    )

    # msg_polish → END
    graph.add_edge("msg_polish", END)

    return graph.compile(checkpointer=checkpointer)
