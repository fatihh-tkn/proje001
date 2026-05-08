"""
agent_graph/state.py
────────────────────────────────────────────────────────────────────
Graph içinde dolaşan state şeması. Her node bu state'in bir alt
kümesini günceller; LangGraph reducer'lar ile merge eder.
"""

from __future__ import annotations

import operator
from typing import Any, Annotated, TypedDict

from core.logger import get_logger as _get_logger
_log = _get_logger("agent_graph.state")


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


def get_agent_config(state: "AgentState | dict", role: str) -> dict | None:
    """
    State'e supervisor tarafından doldurulmuş `agent_configs` cache'inden
    rolün ajan konfigürasyonunu döner.

    Cache'de yoksa DB'den doğrudan çeker (node'ların kendi fallback
    mantığını kopyalamak yerine buraya merkezlendi).

    model_override varsa ve ajan kilitli değilse config'e enjekte edilir;
    böylece tüm node'lar otomatik olarak seçilen modeli kullanır.
    """
    cache = (state or {}).get("agent_configs") or {}
    config = cache.get(role)

    # Cache miss → DB'den doğrudan çek
    if config is None:
        try:
            from core.db_bridge import get_assigned_agent as _get_assigned
            config = _get_assigned(role)
        except Exception:
            pass

    model_override = (state or {}).get("model_override")
    if model_override and config is not None:
        if not config.get("model_locked", False):
            _log.info(
                "[get_agent_config] role=%s → model override uygulandı: '%s' → '%s'",
                role, config.get("model"), model_override,
            )
            config = {**config, "model": model_override}
        else:
            _log.info(
                "[get_agent_config] role=%s → model kilitli, override yok (model='%s')",
                role, config.get("model"),
            )
    elif model_override and config is None:
        _log.warning("[get_agent_config] role=%s → config None, override '%s' uygulanamadı", role, model_override)
    return config


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
    command: str | None                        # 'error_solve' | 'clarification_continue' | ...
    file_name: str | None                      # belirli dosya QA modu
    file_names: list[str]                      # çoklu dosya bağlamı (drag-drop)
    collection_name: str | None                # ChromaDB koleksiyon scope'u
    ip: str | None                             # log için
    mac: str | None                            # log için (pc_id de buraya düşer)
    history: list[dict]                        # [{role, content}] son N mesaj
    # ── CLARIFICATION (çok turlu hata teşhisi) ───────────────────────
    qa_history: list[dict] | None              # [{question, answer, is_other}] önceki Q&A
    screenshot_base64: str | None              # opsiyonel ekran görüntüsü (base64)
    round_number: int | None                   # submit edilen turun numarası (1-indexed)
    force_solve: bool                          # "Yeterli, çöz" → ask_more atla

    # ── PROVENANCE / TELEMETRY (log_entry için aggregator set eder) ──────
    model_used: str
    provider_used: str

    # ── AJAN KONFİGÜRASYONLARI (request-scoped cache) ────────────────────
    # supervisor başında bir kez DB'den yüklenir, paralel specialist'ler
    # state üzerinden okur — node başına tekrar DB sorgusu önlenir.
    agent_configs: dict[str, dict]             # {role: agent_config}
    # ChatBar'dan gönderilen model adı (kilitli olmayan ajanlar bu modeli kullanır)
    model_override: str | None

    # ── PLAN (Supervisor çıktısı) ────────────────────────────────────────
    intent: str                                # 'general' | 'hata_cozumu' | 'rapor_arama' | 'n8n' | 'dosya_qa'
    plan: list[dict]                           # [{node, mode, optional, input?}]
    plan_reasoning: str

    # ── SPECIALIST OUTPUTS ───────────────────────────────────────────────
    rag_context: str
    rag_sources: list[dict]
    rag_score: float

    error_solution: dict | None                # {type, id, title, steps, ...}
    error_draft: str                           # error_solver çıktısı (ham JSON)
    zli_matches: list[dict]
    zli_draft: str                             # zli_finder çıktısı (ham JSON)
    n8n_action: dict | None                    # {workflow, status, detail}

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
