"""
nodes/rag_search.py
────────────────────────────────────────────────────────────────────
Bilgi tabanı (vektör + FTS hybrid) araması. Kullanıcı dosya bağlamı
verdiyse o dosyaya göre, vermediyse genel havuzda arar.

Pipeline:
  1. Query expansion — rule-based (her zaman) + opsiyonel LLM (use_query_expansion=true)
  2. _build_semantic_context ile multi-query hybrid arama
  3. Adaptif skor filtresi (skor dağılımına göre dinamik eşik)

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
import re
import time
from typing import TYPE_CHECKING

from fastapi.concurrency import run_in_threadpool

from core.logger import get_logger
from ..state import AgentState, get_agent_config

if TYPE_CHECKING:
    pass

logger = get_logger("agent_graph.rag_search")

# Türkçe soru kelimeleri — FTS/vektör aramasında gürültü yaratan ekler
_TR_QUESTION_WORDS = re.compile(
    r"\b(nedir|nasıl|nerede|ne\s*zaman|hangi|neden|niçin|kim|kaç|kadar|"
    r"midir|mudur|mıdır|müdür|mı|mi|mu|mü|hakkında|ilgili|anlat|açıkla|"
    r"söyle|yardım|istiyorum|yapabilir\s*misin|var\s*mı|olan|olan)\b",
    re.IGNORECASE | re.UNICODE,
)


def _rule_expand_query(query: str) -> list[str]:
    """
    Soru kelimelerini kaldırarak arama için çekirdek terim sürümünü üretir.
    Türkçe için özellikle önemli: "bütçe nedir" → ["bütçe nedir", "bütçe"]

    Döner: [orijinal, ...alternatifler] — en fazla 3 sorgu.
    """
    queries: list[str] = [query]

    # Soru kelimelerini at, çekirdek terimleri bul
    core = _TR_QUESTION_WORDS.sub("", query).strip()
    # Tekrarlı boşlukları temizle, noktalama kaldır
    core = re.sub(r"[?!.,;:]", "", core)
    core = re.sub(r"\s{2,}", " ", core).strip()

    if core and core.lower() != query.lower() and len(core.split()) >= 2:
        queries.append(core)

    # Sadece ilk 3 token (kısa terim kombinasyonu) — çok spesifik sorgular için
    words = [w for w in core.split() if len(w) >= 4]
    if len(words) >= 2:
        short = " ".join(words[:3])
        if short.lower() not in [q.lower() for q in queries]:
            queries.append(short)

    return queries[:3]


async def _llm_expand_query(
    query: str,
    agent_config: dict | None,
) -> list[str]:
    """
    LLM ile 2 alternatif sorgu üretir.
    5 saniye timeout; başarısız olursa sessizce [query] döner.
    """
    try:
        from ..llm_adapter import call_llm
        import json

        prompt = (
            "Aşağıdaki soruyu bilgi tabanında aramak için 2 farklı şekilde ifade et. "
            "Sadece JSON array döndür, açıklama ekleme: [\"alternatif1\", \"alternatif2\"]\n\n"
            f"Soru: {query}"
        )
        result = await asyncio.wait_for(
            call_llm(
                agent_config,
                [{"role": "user", "content": prompt}],
                max_tokens=80,
                temperature=0.4,
                timeout=4.0,
            ),
            timeout=5.0,
        )
        raw = (result.get("text") or "").strip()
        match = re.search(r"\[.*?\]", raw, re.DOTALL)
        if match:
            alts = json.loads(match.group())
            return [query] + [str(a).strip() for a in alts if str(a).strip()][:2]
    except Exception as e:
        logger.debug("[rag_search] LLM query expansion başarısız: %s", e)
    return [query]


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

        # rag_search node ajanının kendi node_config'inden tüm ayarları oku
        rag_top_k: int | None = None
        rag_score_threshold: float = 0.0
        rag_expand_graph: bool = True
        rag_candidate_pool: int | None = None
        rag_max_per_doc: int = 3
        rag_use_query_expansion: bool = False
        rag_adaptive_score: bool = True
        rag_use_reranker: bool = True
        rag_near_dup_threshold: float = 0.65
        rag_max_query_variants: int = 4
        rag_use_rule_expansion: bool = True
        rag_context_max_chars: int | None = None
        rag_kategori: str | None = None
        rag_agent_config: dict | None = None
        try:
            rag_agent = get_agent_config(state, "rag_search")
            if rag_agent is None:
                rag_agent = get_assigned_agent("rag_search") or {}
            rag_agent_config = rag_agent or None
            node_cfg = (rag_agent or {}).get("node_config") or {}
            tk = node_cfg.get("top_k")
            if tk:
                rag_top_k = int(tk)
            rag_score_threshold     = float(node_cfg.get("score_threshold") or 0.0)
            rag_expand_graph        = bool(node_cfg.get("expand_chunk_graph", True))
            rag_use_query_expansion = bool(node_cfg.get("use_query_expansion", False))
            rag_adaptive_score      = bool(node_cfg.get("adaptive_score_filter", True))
            rag_use_reranker        = bool(node_cfg.get("use_reranker", True))
            rag_use_rule_expansion  = bool(node_cfg.get("use_rule_expansion", True))
            _ndt = node_cfg.get("near_dup_threshold")
            if _ndt is not None:
                rag_near_dup_threshold = float(_ndt)
            _mqv = node_cfg.get("max_query_variants")
            if _mqv is not None:
                rag_max_query_variants = max(1, int(_mqv))
            _cmc = node_cfg.get("context_max_chars")
            if _cmc:
                rag_context_max_chars = int(_cmc)
            cp = node_cfg.get("candidate_pool_size")
            if cp:
                rag_candidate_pool = int(cp)
            mpd = node_cfg.get("max_per_doc")
            if mpd is not None:
                rag_max_per_doc = int(mpd)
            _kat = node_cfg.get("kategori")
            if _kat:
                rag_kategori = str(_kat)
            rag_allowed = (rag_agent or {}).get("allowed_rags") or []
            if rag_allowed:
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

        # ── Query Expansion ──────────────────────────────────────────
        query_variants = _rule_expand_query(user_msg) if rag_use_rule_expansion else [user_msg]
        if rag_use_query_expansion and len(query_variants) < rag_max_query_variants:
            llm_variants = await _llm_expand_query(user_msg, rag_agent_config)
            all_v = list(dict.fromkeys(query_variants + llm_variants))
            query_variants = all_v[:rag_max_query_variants]
            logger.info("[rag_search] LLM expansion: %d sorgu üretildi", len(query_variants))
        else:
            query_variants = query_variants[:rag_max_query_variants]

        logger.debug("[rag_search] Query variants: %s", query_variants)

        # ── Hangi dosya(lar) için arama yapılacak? ───────────────────
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
                expand_chunk_graph=rag_expand_graph,
                candidate_pool_size=rag_candidate_pool,
                query_variants=query_variants,
                max_per_doc=rag_max_per_doc,
                use_reranker=rag_use_reranker,
                near_dup_threshold=rag_near_dup_threshold,
                context_max_chars=rag_context_max_chars,
                kategori_filter=rag_kategori,
            )

        results = await asyncio.gather(*[_search_one(t) for t in targets])
        rag_context, sources, ui_action = _merge_search_results(results)

        # ── Skor filtresi: sabit eşik ─────────────────────────────────
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

        # ── Adaptif skor filtresi: dağılıma göre dinamik eşik ────────
        # Sabit eşik uygulandıktan sonra kalan kaynaklar üzerinde çalışır.
        if rag_adaptive_score and len(sources) > 2:
            scores = [float(s.get("score") or 0.0) for s in sources]
            top = max(scores)
            if top > 0:
                # En yüksek skorun %25'inin altındakileri at (gürültü)
                cutoff = top * 0.25
                adaptive_kept = [s for s in sources if float(s.get("score") or 0.0) >= cutoff]
                if len(adaptive_kept) >= 1 and len(adaptive_kept) < len(sources):
                    logger.info(
                        "[rag_search] Adaptif filtre: cutoff=%.3f → %d/%d kaynak kaldı",
                        cutoff, len(adaptive_kept), len(sources),
                    )
                    sources = adaptive_kept

        elapsed_ms = int((time.time() - t0) * 1000)
        score = _max_score(sources)

        logger.info(
            "[rag_search] %d hedef, %d variant, %d kaynak, skor=%.3f, %d ms",
            len(targets), len(query_variants), len(sources or []), score, elapsed_ms,
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
