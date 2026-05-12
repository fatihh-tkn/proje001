"""
database/vector/hybrid_search.py
────────────────────────────────────────────────────────────────────
Hibrit Arama Motoru — Vektör + Full-Text Search (RRF Birleştirme)

Pipeline:
  1. Vektör Araması   (pgvector cosine_distance)   → Anlamsal benzerlik
  2. Full-Text Arama  (websearch_to_tsquery / OR)  → Kelime/terim eşleştirme
  3. RRF Birleştirme  (k=60)                       → İki listeyi puan tabanlı birleştir
  4. Re-Ranking       (multilingual Cross-Encoder) → En alakalıyı üste çıkar
  5. Belge Çeşitliliği (max_per_doc)              → Aynı belgeden fazla yineleme önle

NOT: `expand_inline_context=False` (varsayılan) — inline metin genişletme
     devre dışı; ai_service NetworkX üzerinden genişletmeyi kendiüstlenir.
     Sadece NetworkX grafiği olmayan doğrudan kullanımlarda True yapın.
"""

import logging
from typing import Any, Optional

from sqlalchemy import select, text
from database.sql.session import get_session
from database.sql.models import VektorParcasi, Belge
from database.vector.embedding_manager import get_embeddings

def _expand_context_window(results: list[dict]) -> list[dict]:
    """
    Eşleşen sonuçlar için (eğer varsa) prev_id ve next_id metadata'larını kullanarak
    önceki ve sonraki chunk metinlerini DB'den çeker ve 'icerik' değerini genişletir.
    (Small-to-Big Retrieval)
    """
    if not results:
        return results

    neighbor_ids = set()
    for r in results:
        meta = r.get("meta") or {}
        if meta.get("prev_id"):
            neighbor_ids.add(meta["prev_id"])
        if meta.get("next_id"):
            neighbor_ids.add(meta["next_id"])

    if not neighbor_ids:
        return results

    # DB'den çek
    neighbors_map = {}
    with get_session() as db:
        stmt = select(VektorParcasi.chromadb_kimlik, VektorParcasi.icerik).where(
            VektorParcasi.chromadb_kimlik.in_(neighbor_ids)
        )
        rows = db.execute(stmt).all()
        for row in rows:
            neighbors_map[row.chromadb_kimlik] = row.icerik or ""

    # Sonuçların iceriklerini genişlet
    for r in results:
        meta = r.get("meta") or {}
        p_id = meta.get("prev_id")
        n_id = meta.get("next_id")

        expanded_text = []
        if p_id and p_id in neighbors_map:
            expanded_text.append(f"--- ÖNCEKİ BAĞLAM ---\n{neighbors_map[p_id]}\n\n")
            
        expanded_text.append(r["icerik"])
        
        if n_id and n_id in neighbors_map:
            expanded_text.append(f"\n\n--- SONRAKİ BAĞLAM ---\n{neighbors_map[n_id]}")
            
        r["icerik"] = "".join(expanded_text)

    return results

logger = logging.getLogger(__name__)

# RRF sabit parametresi
_RRF_K = 60


def _get_doc_ids_by_kategori(kategori: str) -> list[str]:
    """Belirtilen kategorideki tüm belge kimliklerini döndürür."""
    with get_session() as db:
        rows = db.execute(
            select(Belge.kimlik).where(Belge.kategori == kategori)
        ).all()
    return [r.kimlik for r in rows]


def _apply_document_diversity(
    results: list[dict],
    max_per_doc: int = 3,
) -> list[dict]:
    """
    Aynı belgeden en fazla `max_per_doc` chunk döndürür.
    Reranker zaten en iyi sıralamayı yapmıştır; burada sadece tekrar kırpılır.
    Bu, LLM'e aynı belgeden 10 benzer paragraf gitmesini önler.
    """
    if max_per_doc <= 0:
        return results
    doc_count: dict[str, int] = {}
    kept: list[dict] = []
    for r in results:
        doc_id = str(r.get("belge_kimlik") or "")
        count = doc_count.get(doc_id, 0)
        if count < max_per_doc:
            kept.append(r)
            doc_count[doc_id] = count + 1
    return kept


def _vector_search(
    query_embedding: list[float],
    n_results: int = 20,
    doc_id_filter: str | None = None,
    allowed_doc_ids: list[str] | None = None,
) -> list[dict[str, Any]]:
    """
    pgvector cosine_distance ile semantik arama.
    Döner: [{kimlik, chromadb_kimlik, icerik, belge_kimlik, sayfa_no, meta, distance}, ...]

    allowed_doc_ids: Sorgulama yapılabilecek belge kimliklerinin listesi (havuz filtresi).
                     None ise tüm belgeler taranır.
    """
    results = []
    with get_session() as db:
        stmt = (
            select(
                VektorParcasi.kimlik,
                VektorParcasi.chromadb_kimlik,
                VektorParcasi.icerik,
                VektorParcasi.belge_kimlik,
                VektorParcasi.sayfa_no,
                VektorParcasi.konum_imi,
                VektorParcasi.meta,
                VektorParcasi.vektor_verisi.cosine_distance(query_embedding).label("distance"),
            )
            .where(VektorParcasi.vektor_verisi.is_not(None))
        )

        if doc_id_filter:
            stmt = stmt.where(VektorParcasi.belge_kimlik == doc_id_filter)
        elif allowed_doc_ids is not None:
            if not allowed_doc_ids:
                return []  # Hiç erişilebilir belge yok
            stmt = stmt.where(VektorParcasi.belge_kimlik.in_(allowed_doc_ids))

        stmt = stmt.order_by("distance").limit(n_results)
        rows = db.execute(stmt).all()

        for row in rows:
            results.append({
                "kimlik": row.kimlik,
                "chromadb_kimlik": row.chromadb_kimlik,
                "icerik": row.icerik or "",
                "belge_kimlik": row.belge_kimlik,
                "sayfa_no": row.sayfa_no,
                "konum_imi": row.konum_imi,
                "meta": row.meta,
                "distance": float(row.distance) if row.distance is not None else 1.0,
                "search_type": "vector",
            })
    return results


def _fulltext_search(
    query: str,
    n_results: int = 20,
    doc_id_filter: str | None = None,
    allowed_doc_ids: list[str] | None = None,
) -> list[dict[str, Any]]:
    """
    PostgreSQL tsvector/tsquery ile Full-Text arama.
    Kelime eşleştirme — özel isimler, kodlar, numaralar için mükemmel.

    Strateji:
      1. websearch_to_tsquery (örtük AND + tırnak + cümle desteği) — hassas
      2. Sonuç yoksa to_tsquery OR mantığına fallback               — geniş kapsam

    allowed_doc_ids: Sorgulama yapılabilecek belge kimliklerinin listesi (havuz filtresi).
                     None ise tüm belgeler taranır.
    """
    results = []

    # En az 3 karakter — stop-word gürültüsünü azaltır
    words = [w.strip() for w in query.split() if len(w.strip()) >= 3]
    if not words:
        return []

    if allowed_doc_ids is not None and not allowed_doc_ids:
        return []

    tsquery_or = " | ".join(words)

    try:
        with get_session() as db:
            if doc_id_filter:
                pool_clause = "AND belge_kimlik = :doc_id"
            elif allowed_doc_ids is not None:
                pool_clause = "AND belge_kimlik = ANY(:allowed_ids)"
            else:
                pool_clause = ""

            base_params: dict = {"limit": n_results}
            if doc_id_filter:
                base_params["doc_id"] = doc_id_filter
            elif allowed_doc_ids is not None:
                base_params["allowed_ids"] = allowed_doc_ids

            def _run(sql_tmpl: str, extra_params: dict) -> list:
                return db.execute(text(sql_tmpl), {**base_params, **extra_params}).all()

            # Birincil: websearch_to_tsquery — "bütçe onay" → 'bütçe' & 'onay'
            sql_web = f"""
                SELECT kimlik, chromadb_kimlik, icerik, belge_kimlik, sayfa_no,
                       konum_imi, meta,
                       ts_rank_cd(arama_vektoru, websearch_to_tsquery('simple', :wq)) AS rank_score
                FROM vektor_parcalari
                WHERE arama_vektoru @@ websearch_to_tsquery('simple', :wq)
                {pool_clause}
                ORDER BY rank_score DESC
                LIMIT :limit
            """
            rows = _run(sql_web, {"wq": query})

            # Fallback: OR mantığı — daha geniş hatırlama (recall)
            if not rows:
                sql_or = f"""
                    SELECT kimlik, chromadb_kimlik, icerik, belge_kimlik, sayfa_no,
                           konum_imi, meta,
                           ts_rank_cd(arama_vektoru, to_tsquery('simple', :tsq)) AS rank_score
                    FROM vektor_parcalari
                    WHERE arama_vektoru @@ to_tsquery('simple', :tsq)
                    {pool_clause}
                    ORDER BY rank_score DESC
                    LIMIT :limit
                """
                rows = _run(sql_or, {"tsq": tsquery_or})

            for row in rows:
                results.append({
                    "kimlik": row.kimlik,
                    "chromadb_kimlik": row.chromadb_kimlik,
                    "icerik": row.icerik or "",
                    "belge_kimlik": row.belge_kimlik,
                    "sayfa_no": row.sayfa_no,
                    "konum_imi": row.konum_imi,
                    "meta": row.meta,
                    "fts_rank": float(row.rank_score) if row.rank_score else 0.0,
                    "search_type": "fulltext",
                })
    except Exception as e:
        logger.warning(f"[HybridSearch] Full-Text arama hatası: {e}")
    return results


def _reciprocal_rank_fusion(
    vector_results: list[dict],
    fts_results: list[dict],
    k: int = _RRF_K,
) -> list[dict]:
    """
    RRF ile iki sonuç kümesini birleştirir.
    Aynı chunk birden fazla listede varsa puanları toplanır.
    """
    scored: dict[int, dict] = {}  # kimlik → {data + rrf_score}

    # Vektör sonuçları — rank bazlı puanlama
    for rank, item in enumerate(vector_results):
        pk = item["kimlik"]
        rrf = 1.0 / (k + rank + 1)
        if pk in scored:
            scored[pk]["rrf_score"] += rrf
            scored[pk]["in_vector"] = True
        else:
            scored[pk] = {**item, "rrf_score": rrf, "in_vector": True, "in_fts": False}

    # FTS sonuçları — rank bazlı puanlama
    for rank, item in enumerate(fts_results):
        pk = item["kimlik"]
        rrf = 1.0 / (k + rank + 1)
        if pk in scored:
            scored[pk]["rrf_score"] += rrf
            scored[pk]["in_fts"] = True
        else:
            scored[pk] = {**item, "rrf_score": rrf, "in_vector": False, "in_fts": True}

    # RRF puanına göre sırala
    merged = sorted(scored.values(), key=lambda x: x["rrf_score"], reverse=True)
    return merged


def hybrid_search(
    query: str,
    n_results: int = 10,
    doc_id_filter: str | None = None,
    use_reranker: bool = True,
    vector_weight: int = 40,
    fts_weight: int = 40,
    allowed_doc_ids: list[str] | None = None,
    max_per_doc: int = 3,
    expand_inline_context: bool = False,
    kategori_filter: str | None = None,
) -> list[dict[str, Any]]:
    """
    Ana Hybrid Search fonksiyonu.

    1. Vektör araması (semantik)
    2. Full-Text araması (websearch → OR fallback)
    3. RRF ile birleştirme
    4. (Opsiyonel) Cross-Encoder Re-Ranking (çok dilli model)

    Parameters
    ----------
    query : str
        Kullanıcı sorgusu
    n_results : int
        Döndürülecek sonuç sayısı
    doc_id_filter : str | None
        Belirli bir belgeye sınırla (tek dosya modu)
    use_reranker : bool
        Cross-Encoder re-ranking aktif mi
    vector_weight : int
        Vektör aramada kaç aday çekilecek (default 40 — daha geniş pool)
    fts_weight : int
        FTS aramada kaç aday çekilecek (default 40)
    allowed_doc_ids : list[str] | None
        Havuz filtresi — sadece bu belge kimliklerinde ara.
        None → tüm belgeler taranır (eski davranış).
        [] → hiç belge yok, boş sonuç döner.

    Returns
    -------
    list[dict]
        Birleştirilmiş ve sıralanmış sonuçlar.
        Her dict: kimlik, chromadb_kimlik, icerik, belge_kimlik, sayfa_no,
                  konum_imi, meta, rrf_score, in_vector, in_fts
    """
    logger.info(f"[HybridSearch] Sorgu: '{query[:80]}...' | top_k={n_results} | pool={vector_weight}+{fts_weight} | kategori={kategori_filter}")

    # Kategori filtresi: allowed_doc_ids ile kesişim (ya da doğrudan kategori ID listesi)
    if kategori_filter:
        kat_ids = _get_doc_ids_by_kategori(kategori_filter)
        if allowed_doc_ids is not None:
            allowed_doc_ids = list(set(allowed_doc_ids) & set(kat_ids))
        else:
            allowed_doc_ids = kat_ids

    # Havuz tamamen boşsa aramaya gerek yok
    if allowed_doc_ids is not None and len(allowed_doc_ids) == 0:
        return []

    # 1. Embedding oluştur
    try:
        embeddings = get_embeddings([query])
        q_embedding = embeddings[0]
    except Exception as e:
        logger.error(f"[HybridSearch] Embedding hatası: {e}")
        return []

    # 2. Paralel olmasa da sırayla iki arama
    vector_results = _vector_search(
        q_embedding, n_results=vector_weight,
        doc_id_filter=doc_id_filter, allowed_doc_ids=allowed_doc_ids,
    )
    fts_results = _fulltext_search(
        query, n_results=fts_weight,
        doc_id_filter=doc_id_filter, allowed_doc_ids=allowed_doc_ids,
    )

    logger.info(
        f"[HybridSearch] Vektör: {len(vector_results)} sonuç | "
        f"FTS: {len(fts_results)} sonuç"
    )

    # 3. RRF birleştirme
    merged = _reciprocal_rank_fusion(vector_results, fts_results)

    # 4. Re-Ranking (opsiyonel)
    final_results = merged[:n_results]
    if use_reranker and merged:
        try:
            from database.vector.reranker import rerank
            final_results = rerank(
                query=query,
                candidates=merged,
                top_k=n_results,
                text_key="icerik",
            )
            logger.info(f"[HybridSearch] Re-Ranking tamamlandı: {len(final_results)} sonuç")
        except Exception as e:
            logger.warning(f"[HybridSearch] Re-Ranking hatası, RRF sırasıyla devam: {e}")

    # 5. Belge çeşitlilik filtresi — aynı belgeden fazla yinelemeyi önle
    if max_per_doc > 0:
        before = len(final_results)
        final_results = _apply_document_diversity(final_results, max_per_doc=max_per_doc)
        if len(final_results) < before:
            logger.info(
                "[HybridSearch] Belge çeşitlilik filtresi: %d → %d (max_per_doc=%d)",
                before, len(final_results), max_per_doc,
            )

    # 6. Inline bağlam genişletme — sadece NetworkX olmayan doğrudan kullanımda açık
    if expand_inline_context:
        final_results = _expand_context_window(final_results)

    return final_results
