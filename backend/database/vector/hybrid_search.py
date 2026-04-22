"""
database/vector/hybrid_search.py
────────────────────────────────────────────────────────────────────
Hibrit Arama Motoru — Vektör + Full-Text Search (RRF Birleştirme)

Mimari:
  1. Vektör Araması (pgvector cosine_distance) → Anlamsal benzerlik
  2. Full-Text Search (tsvector + tsquery)     → Kelime/terim eşleştirme
  3. Reciprocal Rank Fusion (RRF)              → İki sonuç kümesini birleştirir
  4. Re-Ranking (Cross-Encoder)                → En alakalı sonuçları üste çıkarır

RRF Formülü: score(d) = Σ 1 / (k + rank_i(d))
  k = 60 (standart sabit, aşırı sıra baskısını engeller)
"""

import logging
from typing import Any, Optional

from sqlalchemy import select, text, func
from database.sql.session import get_session
from database.sql.models import VektorParcasi
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

    allowed_doc_ids: Sorgulama yapılabilecek belge kimliklerinin listesi (havuz filtresi).
                     None ise tüm belgeler taranır.
    """
    results = []

    words = [w.strip() for w in query.split() if len(w.strip()) >= 2]
    if not words:
        return []

    if allowed_doc_ids is not None and not allowed_doc_ids:
        return []  # Hiç erişilebilir belge yok

    # OR mantığı kullan (daha toleranslı)
    tsquery_str = " | ".join(words)

    try:
        with get_session() as db:
            if doc_id_filter:
                pool_clause = "AND belge_kimlik = :doc_id"
            elif allowed_doc_ids is not None:
                pool_clause = "AND belge_kimlik = ANY(:allowed_ids)"
            else:
                pool_clause = ""

            sql = text(f"""
                SELECT
                    kimlik,
                    chromadb_kimlik,
                    icerik,
                    belge_kimlik,
                    sayfa_no,
                    konum_imi,
                    meta,
                    ts_rank_cd(arama_vektoru, to_tsquery('simple', :tsq)) AS rank_score
                FROM vektor_parcalari
                WHERE arama_vektoru @@ to_tsquery('simple', :tsq)
                {pool_clause}
                ORDER BY rank_score DESC
                LIMIT :limit
            """)

            params: dict = {"tsq": tsquery_str, "limit": n_results}
            if doc_id_filter:
                params["doc_id"] = doc_id_filter
            elif allowed_doc_ids is not None:
                params["allowed_ids"] = allowed_doc_ids

            rows = db.execute(sql, params).all()

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
    vector_weight: int = 20,
    fts_weight: int = 20,
    allowed_doc_ids: list[str] | None = None,
) -> list[dict[str, Any]]:
    """
    Ana Hybrid Search fonksiyonu.

    1. Vektör araması (semantik)
    2. Full-Text araması (kelime eşleştirme)
    3. RRF ile birleştirme
    4. (Opsiyonel) Cross-Encoder Re-Ranking

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
        Vektör aramada kaç aday çekilecek
    fts_weight : int
        FTS aramada kaç aday çekilecek
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
    logger.info(f"[HybridSearch] Sorgu: '{query[:80]}...' | top_k={n_results}")

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

    # 5. Small-to-Big Retrieval (Bağlam Genişletme)
    final_results = _expand_context_window(final_results)

    return final_results
