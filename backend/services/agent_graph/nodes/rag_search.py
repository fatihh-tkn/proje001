"""
nodes/rag_search.py
────────────────────────────────────────────────────────────────────
Bilgi tabanı (vektör + FTS hybrid) araması. Kullanıcı dosya bağlamı
verdiyse o dosyaya göre, vermediyse genel havuzda arar.

Mevcut `services.ai_service._build_semantic_context` fonksiyonunu
yeniden kullanır (sync → threadpool).

Çıktı:
    {
      "rag_context":  str,
      "rag_sources":  list[dict],
      "rag_score":    float,
      "ui_action":    dict | None,
      "nodes_executed": ["rag_search"],
      "node_timings":   {"rag_search": ms},
    }
"""

from __future__ import annotations

import asyncio
import time

from fastapi.concurrency import run_in_threadpool

from core.logger import get_logger
from ..state import AgentState, get_agent_config

logger = get_logger("agent_graph.rag_search")


def _max_score(sources: list[dict]) -> float:
    if not sources:
        return 0.0
    try:
        return max(float(s.get("score") or 0.0) for s in sources)
    except (TypeError, ValueError):
        return 0.0


def _merge_search_results(results: list[tuple[str, list[dict], dict | None]]) -> tuple[str, list[dict], dict | None]:
    """
    Çoklu dosyadan dönen (context, sources, ui_action) tuple'larını birleştirir.
    Aynı chroma_id'li chunk'lar duplicate olmasın diye dedupe eder.
    İlk gelen ui_action önceliklidir (kullanıcının ilk attığı dosya).
    """
    parts: list[str] = []
    sources: list[dict] = []
    seen_chroma: set[str] = set()
    ui_action: dict | None = None

    for ctx_text, src_list, ua in results:
        if ctx_text:
            parts.append(ctx_text)
        for s in (src_list or []):
            cid = s.get("chroma_id") or ""
            if cid and cid in seen_chroma:
                continue
            if cid:
                seen_chroma.add(cid)
            sources.append(s)
        if ua and not ui_action:
            ui_action = ua

    return "\n\n---\n\n".join(parts), sources, ui_action


async def rag_search_node(state: AgentState) -> dict:
    t0 = time.time()
    user_msg = state.get("user_message") or state.get("original_message") or ""
    file_name = state.get("file_name")
    file_names = list(state.get("file_names") or [])
    collection_name = state.get("collection_name")
    user_id = state.get("user_id")

    if not user_msg.strip():
        return {
            "rag_context": "",
            "rag_sources": [],
            "rag_score": 0.0,
            "nodes_executed": ["rag_search"],
            "node_timings": {"rag_search": 0},
        }

    try:
        # Lazy import — döngüsel import riskini engellemek için node içinde
        from services.ai_service import _build_semantic_context, _get_user_excluded_files
        from core.db_bridge import get_assigned_agent

        # Aggregator'ın atanmış ajanının allowed_rags konfigürasyonu.
        # State cache'inden oku; cache miss'te DB fallback.
        agent_excluded: list[str] = []
        allowed_pools: list[str] | None = None
        try:
            agg_agent = get_agent_config(state, "aggregator")
            if agg_agent is None:
                agg_agent = get_assigned_agent("aggregator")
            allowed_rags = (agg_agent or {}).get("allowed_rags") or []
            agent_excluded = [str(r)[1:] for r in allowed_rags if str(r).startswith("!")]
            pools = [str(r) for r in allowed_rags if not str(r).startswith("!")]
            allowed_pools = pools or None
        except Exception as e:
            logger.warning("[rag_search] aggregator allowed_rags okunamadı: %s", e)

        # rag_search node ajanının kendi node_config'inden top_k / score_threshold oku
        rag_top_k: int | None = None
        rag_score_threshold: float = 0.0
        try:
            rag_agent = get_agent_config(state, "rag_search")
            if rag_agent is None:
                rag_agent = get_assigned_agent("rag_search") or {}
            node_cfg = (rag_agent or {}).get("node_config") or {}
            tk = node_cfg.get("top_k")
            if tk:
                rag_top_k = int(tk)
            rag_score_threshold = float(node_cfg.get("score_threshold") or 0.0)
            rag_allowed = (rag_agent or {}).get("allowed_rags") or []
            if rag_allowed:
                # rag_search override
                _ex = [str(r)[1:] for r in rag_allowed if str(r).startswith("!")]
                _po = [str(r) for r in rag_allowed if not str(r).startswith("!")]
                if _ex:
                    agent_excluded = list(set(agent_excluded) | set(_ex))
                if _po:
                    allowed_pools = _po
        except Exception as e:
            logger.warning("[rag_search] node_config okunamadı: %s", e)

        user_excluded = _get_user_excluded_files(user_id) if user_id else []
        excluded = list(set(agent_excluded) | set(user_excluded))

        # Hangi dosya(lar) için arama yapılacak?
        targets: list[str | None]
        if len(file_names) > 1:
            targets = list(file_names)
        elif file_name:
            targets = [file_name]
        else:
            targets = [None]  # genel havuz

        # Her hedef için paralel arama (asyncio.gather + threadpool)
        async def _search_one(fn: str | None):
            return await run_in_threadpool(
                _build_semantic_context,
                user_msg,
                file_name=fn,
                collection_name=collection_name,
                top_k=rag_top_k,
                excluded_file_ids=excluded,
                allowed_pools=allowed_pools,
                user_id=user_id,
            )

        results = await asyncio.gather(*[_search_one(t) for t in targets])
        rag_context, sources, ui_action = _merge_search_results(results)

        # score_threshold altında kalan kaynakları ele
        if rag_score_threshold > 0 and sources:
            kept = [s for s in sources if float(s.get("score") or 0.0) >= rag_score_threshold]
            if len(kept) != len(sources):
                logger.info(
                    "[rag_search] score_threshold=%.3f → %d/%d kaynak filtrelendi",
                    rag_score_threshold, len(sources) - len(kept), len(sources),
                )
                sources = kept
                if not sources:
                    rag_context = ""

        elapsed_ms = int((time.time() - t0) * 1000)
        score = _max_score(sources)

        logger.info(
            "[rag_search] %d hedef, %d kaynak, en yüksek skor=%.3f, %d ms",
            len(targets), len(sources or []), score, elapsed_ms,
        )

        out: dict = {
            "rag_context": rag_context or "",
            "rag_sources": sources or [],
            "rag_score": score,
            "nodes_executed": ["rag_search"],
            "node_timings": {"rag_search": elapsed_ms},
        }
        if ui_action:
            out["ui_action"] = ui_action
        return out

    except Exception as e:
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.error("[rag_search] hata: %s", e, exc_info=True)
        return {
            "rag_context": "",
            "rag_sources": [],
            "rag_score": 0.0,
            "nodes_executed": ["rag_search"],
            "node_timings": {"rag_search": elapsed_ms},
            "node_errors": {"rag_search": str(e)},
        }
