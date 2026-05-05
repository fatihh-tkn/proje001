"""
agent_graph/state.py
────────────────────────────────────────────────────────────────────
Graph içinde dolaşan state şeması. Her node bu state'in bir alt
kümesini günceller; LangGraph reducer'lar ile merge eder.
"""

from __future__ import annotations

import operator
from typing import Any, Annotated, TypedDict


# ── Reducer'lar — list/dict alanlarını birikimli güncellemek için ───────────

def merge_dicts(left: dict | None, right: dict | None) -> dict:
    """İki dict'i merge eder (right overrides). LangGraph reducer."""
    if not left:
        return right or {}
    if not right:
        return left
    return {**left, **right}


def append_list(left: list | None, right: list | None) -> list:
    """İki listeyi birleştirir (sıralı). LangGraph reducer."""
    return [*(left or []), *(right or [])]


def last_non_empty(left: str | None, right: str | None) -> str:
    """
    Paralel branch'lerden gelen string güncellemelerinde anlamlı (boş olmayan)
    olanı korur. Her iki taraf da doluysa son geleni (right) kullanır.
    chat_draft için: boş döndüren specialist, dolu draft yazan specialist'in
    çıktısını silmesin.
    """
    if right and right.strip():
        return right
    return left or ""


def get_agent_config(state: "AgentState | dict", role: str) -> dict | None:
    """
    State'e supervisor tarafından doldurulmuş `agent_configs` cache'inden
    rolün ajan konfigürasyonunu döner. Cache'de yoksa None — çağıran
    taraf isterse `core.db_bridge.get_assigned_agent(role)`'e fallback yapar.
    """
    cache = (state or {}).get("agent_configs") or {}
    return cache.get(role)


# ── State şeması ────────────────────────────────────────────────────────────

class AgentState(TypedDict, total=False):
    """
    Graph state. `total=False` → tüm alanlar opsiyonel; her node sadece
    güncellediği alanı dict olarak döner, framework merge eder.

    NOT: list/dict alanları reducer'la annotated; node bunlara dict/list
    döndürdüğünde framework eski değerle merge ediyor (üzerine yazmıyor).
    """

    # ── INPUT ────────────────────────────────────────────────────────────
    user_message: str                          # mevcut tur (revize edilmiş olabilir)
    original_message: str                      # supervisor revize etse de orijinal
    user_id: str | None
    session_id: str
    command: str | None                        # 'error_solve' | 'zli_report_query' | ...
    file_name: str | None                      # belirli dosya QA modu
    file_names: list[str]                      # çoklu dosya bağlamı (drag-drop)
    collection_name: str | None                # ChromaDB koleksiyon scope'u
    ip: str | None                             # log için
    mac: str | None                            # log için (pc_id de buraya düşer)
    history: list[dict]                        # [{role, content}] son N mesaj

    # ── PROVENANCE / TELEMETRY (log_entry için aggregator set eder) ──────
    model_used: str
    provider_used: str

    # ── AJAN KONFİGÜRASYONLARI (request-scoped cache) ────────────────────
    # supervisor başında bir kez DB'den yüklenir, paralel specialist'ler
    # state üzerinden okur — node başına tekrar DB sorgusu önlenir.
    agent_configs: dict[str, dict]             # {role: agent_config}

    # ── PLAN (Supervisor çıktısı) ────────────────────────────────────────
    intent: str                                # 'general' | 'hata_cozumu' | 'rapor_arama' | 'n8n' | 'dosya_qa'
    plan: list[dict]                           # [{node, mode, optional, input?}]
    plan_reasoning: str

    # ── SPECIALIST OUTPUTS ───────────────────────────────────────────────
    rag_context: str
    rag_sources: list[dict]
    rag_score: float

    error_solution: dict | None                # {type, id, title, steps, ...}
    zli_matches: list[dict]
    n8n_action: dict | None                    # {workflow, status, detail}

    # Paralel specialist'lerden (error_solver/zli_finder) gelen draft'ların
    # boş güncellemeyle silinmemesi için reducer'lı.
    chat_draft: Annotated[str, last_non_empty]

    # ── FINAL ────────────────────────────────────────────────────────────
    final_reply: str
    ui_action: dict | None
    needs_polish: bool
    cost_capped: bool                          # supervisor'da cost cap aşıldıysa True

    # ── TELEMETRY (Düşünme Süreci paneli için) ───────────────────────────
    nodes_executed: Annotated[list[str], append_list]
    node_timings: Annotated[dict[str, int], merge_dicts]   # ms
    node_errors: Annotated[dict[str, str], merge_dicts]
    total_tokens: Annotated[dict[str, dict], merge_dicts]  # {node: {p:n, c:m}}
    started_at: float                          # epoch ms (run_init'te set)
