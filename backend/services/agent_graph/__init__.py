"""
agent_graph
─────────────────────────────────────────────────────────────────
LangGraph tabanlı multi-agent orkestrasyon motoru.

Kavramsal mimari:
  user_message
        ↓
  ┌──────────┐
  │supervisor│  intent + plan üretir
  └─────┬────┘
        ├─ rag_search  ──┐
        ├─ zli_finder   ─┤  paralel branch'ler
        ├─ error_solver ─┤  (Send API ile)
        └─ n8n_trigger  ─┘
                         ↓
                  ┌────────────┐
                  │ aggregator │  outputs → final_reply
                  └─────┬──────┘
                        ↓
                  msg_polish (opsiyonel)
                        ↓
                       END

Public:
  build_graph()   — compile edilmiş StateGraph döner
  AgentState     — graph state'inin tipi (state.py)
"""

from .graph import build_graph
from .state import AgentState
from .runner import stream_run

__all__ = ['build_graph', 'AgentState', 'stream_run']
