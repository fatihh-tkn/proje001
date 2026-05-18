"""
rag_search.py — RAG (Retrieval-Augmented Generation) pipeline.

İçerir:
  - AppSettings / SETTINGS   : DB'den okunan sistem ayarları
  - _truncate                : Chunk içeriğini karakter bütçesine göre kırpar
  - _jaccard_trigram         : Near-duplicate tespiti için trigram Jaccard benzerliği
  - _build_file_context      : Dosya bazlı QA için wrapper
  - _build_semantic_context  : Ana RAG pipeline — hybrid search + reranking + graph expand
  - _fetch_zli_report_matches: ZLI rapor tablosunda token-bazlı SQL arama
"""
import logging

from core.logger import get_logger

logger = get_logger("rag_search")

# ── Sabitler (SQL Veritabanı Sistem Ayarları) ──────────────────────────────────────────
class AppSettings:
    @staticmethod
    def _get(key: str, default):
        try:
            from core.db_bridge import get_system_settings
            val = get_system_settings().get(key)
            return type(default)(val) if val is not None else default
        except Exception:
            return default

    @property
    def FILE_MODE_MAX_CHUNKS(self) -> int: return self._get("FILE_MODE_MAX_CHUNKS", 40)
    @property
    def GENERAL_RAG_TOP_K(self) -> int: return self._get("GENERAL_RAG_TOP_K", 10)
    @property
    def CHUNK_CHAR_LIMIT(self) -> int: return self._get("CHUNK_CHAR_LIMIT", 2000)
    @property
    def MAX_HISTORY_TURNS(self) -> int: return self._get("MAX_HISTORY_TURNS", 2)
    @property
    def LLM_PRE_FILTER_DISTANCE_THRESHOLD(self) -> float: return self._get("LLM_PRE_FILTER_DISTANCE_THRESHOLD", 1.6)

SETTINGS = AppSettings()
# ─────────────────────────────────────────────────────────────────────────────

_AUDIO_EXTS: frozenset[str] = frozenset({
    "mp3", "wav", "ogg", "m4a", "flac", "aac", "opus", "wma",
    "mp4", "avi", "mov", "mkv", "webm", "m4v", "wmv",
})

# LLM context penceresi için yaklaşık karakter bütçesi (~6 000 token × 4 ort.)
_CONTEXT_MAX_CHARS: int = 24_000

_DOC_TYPE_LABEL: dict[str, str] = {
    "pdf": "PDF", "docx": "Word", "doc": "Word",
    "xlsx": "Excel", "xls": "Excel", "pptx": "PowerPoint",
    "ppt": "PowerPoint", "txt": "Metin", "csv": "CSV",
    "mp3": "Ses", "wav": "Ses", "mp4": "Video",
}


def _truncate(text: str, limit: int = None) -> str:
    limit = limit or SETTINGS.CHUNK_CHAR_LIMIT
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n...[{len(text) - limit} karakter kırpıldı]"


def _jaccard_trigram(a: str, b: str) -> float:
    """İki metin arasında trigram Jaccard benzerliği döndürür [0,1]."""
    words_a = a.lower().split()
    words_b = b.lower().split()
    if len(words_a) < 3 or len(words_b) < 3:
        return 0.0
    tg_a = {tuple(words_a[i:i+3]) for i in range(len(words_a) - 2)}
    tg_b = {tuple(words_b[i:i+3]) for i in range(len(words_b) - 2)}
    if not tg_a or not tg_b:
        return 0.0
    return len(tg_a & tg_b) / len(tg_a | tg_b)


def _build_file_context(
    user_message: str,
    file_name: str,
    collection_name: str | None,
    top_k_candidates: int = 40,
    max_pages: int = 8,
    excluded_file_ids: list[str] = None,
    allowed_pools: list[str] = None,
    user_id: str | None = None,
) -> tuple[str, list[dict], dict | None]:
    return _build_semantic_context(
        user_message=user_message,
        file_name=file_name,
        collection_name=collection_name,
        top_k=max_pages,
        excluded_file_ids=excluded_file_ids,
        allowed_pools=allowed_pools,
        user_id=user_id,
    )


def _build_semantic_context(
    user_message: str,
    file_name: str | None = None,
    collection_name: str | None = None,
    top_k: int = None,
    excluded_file_ids: list[str] = None,
    allowed_pools: list[str] = None,
    user_id: str | None = None,
    expand_chunk_graph: bool = True,
    candidate_pool_size: int | None = None,
    query_variants: list[str] | None = None,
    max_per_doc: int = 3,
    use_reranker: bool = True,
    near_dup_threshold: float = 0.65,
    context_max_chars: int | None = None,
    kategori_filter: str | None = None,
) -> tuple[str, list[dict], dict | None]:
    """
    RAG Pipeline — Hybrid Search + Re-Ranking Mimarisi:
    1. Hybrid Search: pgvector (vektörel) + websearch FTS → RRF birleştirme
    2. Multi-query: query_variants varsa her sorgudan sonuç al, en iyiyi tut
    3. Belge çeşitlilik filtresi (max_per_doc)
    4. Re-Ranking: Çok dilli Cross-Encoder ile sıralama (use_reranker=True)
    5. ChunkGraph ile komşu genişletmesi
    6. DocumentRepository ile zengin bağlam çekme
    7. Near-duplicate detection (near_dup_threshold) + token budget (context_max_chars)
    """
    top_k = top_k or SETTINGS.GENERAL_RAG_TOP_K
    _budget = context_max_chars if context_max_chars and context_max_chars > 0 else _CONTEXT_MAX_CHARS
    try:
        from database.vector.pgvector_db import vector_db
        from database.sql.session import get_session
        from database.sql.repositories.document_repo import DocumentRepository

        parts:   list[str] = []
        sources: list[dict] = []
        best_ui_action: dict | None = None

        # ── Havuz Filtresi: Kullanıcının erişebildiği belgeler ─────────────
        # Sistem havuzu (herkese açık) + kullanıcının kendi havuzu birleştirilir.
        pool_doc_ids: list[str] | None = None
        from database.sql.session import get_session as _gs2
        from database.sql.repositories.document_repo import DocumentRepository as _DR2
        try:
            with _gs2() as _db2:
                _repo2 = _DR2(_db2)
                pool_doc_ids = _repo2.get_pool_doc_ids(user_id)
        except Exception as _e:
            logger.warning("[RAG-POOL] Havuz filtresi alınamadı, tüm belgeler taranacak: %s", _e)

        # ── Hybrid Search: Vektör + FTS + RRF + Re-Ranking ──────────────
        _pool_size = candidate_pool_size or 40
        _queries = list(dict.fromkeys(q for q in (query_variants or []) if q.strip()))
        if not _queries:
            _queries = [user_message]

        def _run_hybrid(q: str) -> list[dict]:
            return vector_db.hybrid_query(
                query_text=q,
                n_results=top_k * 2,
                use_reranker=use_reranker,
                allowed_doc_ids=pool_doc_ids,
                vector_weight=_pool_size,
                fts_weight=_pool_size,
                max_per_doc=max_per_doc,
                expand_inline_context=False,  # NetworkX genişletmesi aşağıda yapılır
                kategori_filter=kategori_filter,
            )

        # Multi-query: tüm variant'lardan sonuç al, chroma_id başına en iyi skoru tut.
        # Per-query try-except — bir variant patlarsa diğerlerinin sonuçları korunur.
        seen_cids: dict[str, dict] = {}
        _any_query_ok = False
        for q in _queries:
            try:
                for r in _run_hybrid(q):
                    cid = r.get("chromadb_kimlik")
                    if not cid:
                        continue
                    rerank = r.get("rerank_score")
                    rrf    = r.get("rrf_score") or 0.0
                    score  = float(rerank) if rerank is not None else float(rrf)
                    prev   = seen_cids.get(cid)
                    prev_score = (
                        float(prev.get("rerank_score") if prev.get("rerank_score") is not None else (prev.get("rrf_score") or 0.0))
                        if prev else -1.0
                    )
                    if score > prev_score:
                        seen_cids[cid] = r
                _any_query_ok = True
            except Exception as _qe:
                logger.warning("[RAG-MULTI] Sorgu atlandı ('%s…'): %s", q[:40], _qe)

        if _any_query_ok:
            hybrid_results: list[dict] = sorted(
                seen_cids.values(),
                key=lambda x: float(x.get("rerank_score") if x.get("rerank_score") is not None else (x.get("rrf_score") or 0)),
                reverse=True,
            )
            if len(_queries) > 1:
                logger.info("[RAG-MULTI] %d sorgu → %d tekil aday", len(_queries), len(hybrid_results))
        else:
            logger.warning("[RAG-HYBRID] Tüm sorgular başarısız, klasik yola düşülüyor.")
            hybrid_results = []

        if hybrid_results:
            # Hybrid Search başarılı — sonuçları chromadb_kimlik listesine çevir
            hybrid_ids = []
            for r in hybrid_results:
                cid = r.get("chromadb_kimlik")
                if cid:
                    hybrid_ids.append(cid)

            if hybrid_ids:
                # ChunkGraph ile komşu genişletmesi (node_config.expand_chunk_graph ile kapatılabilir)
                if expand_chunk_graph:
                    try:
                        from database.graph.networkx_db import chunk_graph
                        expanded_ids = chunk_graph.expand(hybrid_ids)
                    except Exception as _e:
                        logger.warning("[RAG] Graf genişletme başarısız, ham ID'ler kullanılıyor: %s", _e)
                        expanded_ids = hybrid_ids
                else:
                    expanded_ids = hybrid_ids

                # DocumentRepository ile zengin bağlam
                with get_session() as db:
                    repo = DocumentRepository(db)
                    rich_contexts = repo.node_ids_to_context(expanded_ids[:top_k])

                    # Near-dup karşılaştırması için sadece içerik tutulur
                    # (parts listesi header+graph_note içerdiğinden kullanılamaz)
                    _seen_contents: list[str] = []

                    # O(1) hybrid meta erişimi için önceden indeksle
                    hybrid_map = {hr.get("chromadb_kimlik"): hr for hr in hybrid_results}

                    for ctx in rich_contexts:
                        doc_info = ctx["document"]
                        src = doc_info["filename"]

                        if file_name and src != file_name:
                            continue

                        if excluded_file_ids and doc_info.get("id") in excluded_file_ids:
                            continue

                        # f_type tek seferde hesaplanır; pool kontrolü ve başlık için paylaşılır
                        f_type = (doc_info.get("dosya_turu") or doc_info.get("file_type") or "").lower().replace(".", "")

                        # Havuz yetki kontrolü
                        if allowed_pools:
                            pool_id = "rag_2" if f_type in _AUDIO_EXTS else "rag_1"
                            if pool_id not in allowed_pools:
                                continue

                        marker  = ctx["location_marker"]
                        content = ctx["content"] or ""
                        page    = ctx.get("page")
                        bbox    = ctx.get("bbox")

                        # ── Near-duplicate tespiti (token budget öncesi hesaplanır) ──
                        truncated_content = _truncate(content)
                        if any(_jaccard_trigram(truncated_content, c) > near_dup_threshold for c in _seen_contents):
                            logger.debug("[RAG] Near-duplicate chunk atlandı: %s", src)
                            continue
                        _seen_contents.append(truncated_content)

                        # ── Token budget kontrolü ──────────────────────────
                        total_chars = sum(len(p) for p in parts)
                        if total_chars + len(truncated_content) > _budget:
                            logger.info("[RAG] Context bütçesi doldu (%d char), kalan chunk'lar atlandı.", total_chars)
                            break

                        # ── Graf notu ──────────────────────────────────────
                        graph_note = ""
                        if ctx["related_nodes"]:
                            graph_note = "\n[Sistem Graph Notu: Bu düğüm şunlarla ilişkilidir:\n"
                            for rel in ctx["related_nodes"]:
                                tgt = rel.get('document_name') or 'Bilinmeyen'
                                r_type = rel.get('relation_type', 'bağlı')
                                graph_note += f"- '{tgt}' ({r_type})\n"
                            graph_note += "]\n"

                        # ── Hybrid arama meta-bilgisi (O(1) map lookup) ───
                        hybrid_info = ""
                        chroma_id = ctx.get("chroma_id", "")
                        rrf_score = 0.0
                        rerank_score = None
                        hr = hybrid_map.get(chroma_id)
                        if hr:
                            methods = []
                            if hr.get("in_vector"): methods.append("Vektör")
                            if hr.get("in_fts"):    methods.append("FTS")
                            rrf_score    = float(hr.get("rrf_score", 0) or 0)
                            rerank_score = hr.get("rerank_score")
                            score_str    = f"RRF:{rrf_score:.4f}"
                            if rerank_score is not None:
                                score_str += f" | ReRank:{float(rerank_score):.2f}"
                            hybrid_info = f" [{'+'.join(methods)} | {score_str}]"

                        # ── Zengin başlık: dosya türü de göster ───────────
                        type_label = _DOC_TYPE_LABEL.get(f_type, f_type.upper() if f_type else "")
                        type_str = f" | {type_label}" if type_label else ""

                        header = f"[{src}{type_str}" + (f" | {marker}" if marker else "") + f"{hybrid_info}]"
                        parts.append(f"{header}\n{truncated_content}{graph_note}")

                        # UI Action — sadece kullanıcı belirli bir dosyaya soru soruyorsa
                        # otomatik sekme aç. Genel RAG'da AI alaka derecesini chip listesinde
                        # bildirir; sekme açılmaz.
                        if file_name and not best_ui_action:
                            pdf_url = (
                                f"/api/archive/file/{doc_info.get('id')}"
                                if doc_info.get("id")
                                else ""
                            )
                            best_ui_action = {
                                "command":     "OPEN_PDF_AT",
                                "pdf_url":     pdf_url,
                                "source_file": src,
                                "page":        page,
                                "bbox":        bbox,
                                "doc_id":      doc_info.get("id"),
                            }

                        sources.append({
                            "file":             src,
                            "location_marker":  marker,
                            "chroma_id":        chroma_id,
                            "page":             page,
                            "bbox":             bbox,
                            "doc_id":           doc_info.get("id"),
                            "element_id":       ctx.get("element_id"),
                            "element_name":     ctx.get("element_name"),
                            "image_path":       ctx.get("image_path"),
                            "slide_w":          ctx.get("slide_w"),
                            "slide_h":          ctx.get("slide_h"),
                            "chunk_type":       ctx.get("chunk_type"),
                            # Alaka skoru — frontend ilgisiz chip'leri eler.
                            # Rerank varsa onu, yoksa RRF'i kullan; yüksek = daha alakalı.
                            "score":            float(rerank_score) if rerank_score is not None else rrf_score,
                        })

            if parts:
                return "\n\n---\n\n".join(parts), sources, best_ui_action

        # ── Fallback: Klasik vektör araması (hybrid başarısız olursa) ────
        all_collections = vector_db.list_collections()
        if not all_collections:
            return "", [], None

        target_cols = [collection_name] if collection_name else all_collections

        for col in target_cols:
            if col not in all_collections:
                continue
            try:
                results = vector_db.query(
                    collection_name=col,
                    query_texts=[user_message],
                    n_results=top_k * 2,
                )
                chroma_ids = results.get("ids", [[]])[0]
                dists = results.get("distances", [[]])[0]

                if not chroma_ids:
                    continue

                filtered_ids = []
                for rank, cid in enumerate(chroma_ids):
                    dist = dists[rank] if rank < len(dists) else 0.0
                    if dist <= SETTINGS.LLM_PRE_FILTER_DISTANCE_THRESHOLD:
                        filtered_ids.append(cid)

                if not filtered_ids:
                    continue

                if expand_chunk_graph:
                    try:
                        from database.graph.networkx_db import chunk_graph
                        expanded_ids = chunk_graph.expand(filtered_ids)
                    except Exception as _e:
                        logger.warning("[RAG] Dosya modu graf genişletme başarısız: %s", _e)
                        expanded_ids = filtered_ids
                else:
                    expanded_ids = filtered_ids

                with get_session() as db:
                    repo = DocumentRepository(db)
                    rich_contexts = repo.node_ids_to_context(expanded_ids[:top_k])

                    _seen_contents_fb: list[str] = []
                    _doc_counts_fb: dict[str, int] = {}

                    for ctx in rich_contexts:
                        doc_info = ctx["document"]
                        src = doc_info["filename"]

                        if file_name and src != file_name:
                            continue

                        if excluded_file_ids and doc_info.get("id") in excluded_file_ids:
                            continue

                        _ft = (doc_info.get("dosya_turu") or doc_info.get("file_type") or "").lower().replace(".", "")

                        if allowed_pools:
                            pool_id = "rag_2" if _ft in _AUDIO_EXTS else "rag_1"
                            if pool_id not in allowed_pools:
                                continue

                        doc_id_fb = doc_info.get("id") or src
                        if _doc_counts_fb.get(doc_id_fb, 0) >= max_per_doc:
                            continue

                        marker = ctx["location_marker"]
                        content = ctx["content"]
                        page    = ctx.get("page")
                        bbox    = ctx.get("bbox")

                        _tc = _truncate(content or "")
                        if any(_jaccard_trigram(_tc, c) > near_dup_threshold for c in _seen_contents_fb):
                            logger.debug("[RAG-FB] Near-duplicate chunk atlandı: %s", src)
                            continue
                        _seen_contents_fb.append(_tc)
                        _doc_counts_fb[doc_id_fb] = _doc_counts_fb.get(doc_id_fb, 0) + 1

                        total_chars_fb = sum(len(p) for p in parts)
                        if total_chars_fb + len(_tc) > _budget:
                            logger.info("[RAG-FB] Context bütçesi doldu (%d char), kalan chunk'lar atlandı.", total_chars_fb)
                            break

                        graph_note = ""
                        if ctx["related_nodes"]:
                            graph_note = "\n[Sistem Graph Notu: Bu düğüm şunlarla ilişkilidir:\n"
                            for rel in ctx["related_nodes"]:
                                tgt = rel.get('document_name') or 'Bilinmeyen'
                                r_type = rel.get('relation_type', 'bağlı')
                                graph_note += f"- '{tgt}' ({r_type})\n"
                            graph_note += "]\n"

                        _tl = _DOC_TYPE_LABEL.get(_ft, _ft.upper() if _ft else "")
                        _ts = f" | {_tl}" if _tl else ""
                        header = f"[{src}{_ts}" + (f" | {marker}" if marker else "") + "]"
                        parts.append(f"{header}\n{_tc}{graph_note}")

                        # UI Action — sadece dosya QA modunda otomatik aç
                        if file_name and not best_ui_action:
                            pdf_url = (
                                f"/api/archive/file/{doc_info.get('id')}"
                                if doc_info.get("id")
                                else ""
                            )
                            best_ui_action = {
                                "command":     "OPEN_PDF_AT",
                                "pdf_url":     pdf_url,
                                "source_file": src,
                                "page":        page,
                                "bbox":        bbox,
                                "doc_id":      doc_info.get("id"),
                            }

                        # Chroma cosine distance: küçük = daha yakın.
                        # Frontend için score = 1 - distance (büyük = alakalı) olarak normalize.
                        cur_chroma_id = ctx["chroma_id"]
                        cur_dist = next(
                            (dists[i] for i, c in enumerate(chroma_ids) if c == cur_chroma_id and i < len(dists)),
                            None,
                        )
                        cur_score = (1.0 - float(cur_dist)) if cur_dist is not None else 0.0

                        sources.append({
                            "file":             src,
                            "location_marker":  marker,
                            "chroma_id":        cur_chroma_id,
                            "page":             page,
                            "bbox":             bbox,
                            "doc_id":           doc_info.get("id"),
                            "image_path":       ctx.get("image_path"),
                            "slide_w":          ctx.get("slide_w"),
                            "slide_h":          ctx.get("slide_h"),
                            "chunk_type":       ctx.get("chunk_type"),
                            "score":            cur_score,
                        })

            except Exception as ex:
                logger.warning("[RAG-SEMANTIC] Koleksiyon sorgu hatası [%s]: %s", col, ex)
                continue

        return "\n\n---\n\n".join(parts), sources, best_ui_action

    except Exception as e:
        logger.error("[RAG] Genel hata: %s", e, exc_info=True)
        return "", [], None


def _fetch_zli_report_matches(query: str, limit: int = 5) -> list[dict]:
    """
    SQL üzerinden basit token-bazlı arama (zli_raporlar tablosu).
    /api/zli-raporlar/search ile aynı puanlama mantığı; AIService bu çağrıyı
    threadpool'da yapar (sync DB).
    """
    from database.sql.session import get_session
    from database.sql.models import ZliRapor

    sorgu = (query or "").strip()
    if not sorgu:
        return []
    tokens = [t for t in sorgu.split() if len(t) >= 2][:8] or [sorgu]

    with get_session() as db:
        rows = db.query(ZliRapor).filter(ZliRapor.aktif_mi == True).all()  # noqa: E712

        def score(r: ZliRapor) -> float:
            kod   = (r.kod or "").lower()
            ad    = (r.ad or "").lower()
            acik  = (r.aciklama or "").lower()
            alan  = (r.kullanim_alani or "").lower()
            s = 0.0
            for tok in tokens:
                t = tok.lower()
                if t in kod:   s += 4.0
                if t in ad:    s += 3.0
                if t in acik:  s += 1.5
                if t in alan:  s += 1.0
            return s

        scored = [(r, score(r)) for r in rows]
        scored = [(r, sc) for r, sc in scored if sc > 0]
        scored.sort(key=lambda x: x[1], reverse=True)

        return [
            {
                "kod":            r.kod,
                "ad":             r.ad,
                "aciklama":       r.aciklama,
                "modul":          r.modul,
                "kullanim_alani": r.kullanim_alani,
                "score":          round(sc, 2),
            }
            for r, sc in scored[:limit]
        ]
