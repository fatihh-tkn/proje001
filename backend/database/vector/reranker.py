"""
database/vector/reranker.py
────────────────────────────────────────────────────────────────────
Cross-Encoder Re-Ranking Modülü

Hybrid Search'ten gelen kaba sonuçları, Cross-Encoder ile yeniden puanlayıp
en alakalı sonuçları en üste çıkarır.

Model: cross-encoder/ms-marco-MiniLM-L-6-v2
  - Küçük (~80MB), hızlı, İngilizce + çok dilli sorguları iyi sıralar.
  - Input: (query, passage) çiftleri → Output: relevance skoru

Kullanım:
    from database.vector.reranker import rerank
    reranked = rerank(query="proje bütçesi", candidates=[...], top_k=5)
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)

# ── Lazy load — model sadece ilk kullanımda yüklenir ─────────────────────────
_cross_encoder = None
_RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"


def _load_model():
    """Cross-Encoder modelini lazy olarak yükler."""
    global _cross_encoder
    if _cross_encoder is not None:
        return _cross_encoder
    try:
        from sentence_transformers import CrossEncoder
        logger.info(f"[Reranker] Model yükleniyor: {_RERANKER_MODEL}")
        _cross_encoder = CrossEncoder(_RERANKER_MODEL, max_length=512)
        logger.info(f"[Reranker] Model başarıyla yüklendi.")
        return _cross_encoder
    except ImportError:
        logger.warning(
            "[Reranker] sentence-transformers kurulu değil. "
            "Re-ranking devre dışı. Kurmak için: pip install sentence-transformers"
        )
        return None
    except Exception as e:
        logger.error(f"[Reranker] Model yüklenemedi: {e}")
        return None


def rerank(
    query: str,
    candidates: list[dict[str, Any]],
    top_k: int = 10,
    text_key: str = "content",
) -> list[dict[str, Any]]:
    """
    Aday chunk'ları Cross-Encoder ile yeniden sıralar.

    Parameters
    ----------
    query : str
        Kullanıcının arama sorgusu.
    candidates : list[dict]
        Her dict en azından `text_key` anahtarında metin içermelidir.
        Ek alanlar (id, score, metadata vb.) korunur.
    top_k : int
        Döndürülecek en alakalı sonuç sayısı.
    text_key : str
        Candidate dict'lerdeki metin alanının anahtarı.

    Returns
    -------
    list[dict]
        Yeniden sıralanmış ve puanlanmış candidates.
        Her dict'e 'rerank_score' eklenir.
    """
    if not candidates:
        return []

    if len(candidates) <= 1:
        for c in candidates:
            c["rerank_score"] = 1.0
        return candidates

    model = _load_model()
    if model is None:
        # Model yüklenemedi → orijinal sırayla dön
        for i, c in enumerate(candidates):
            c["rerank_score"] = 1.0 - (i * 0.01)
        return candidates[:top_k]

    try:
        # (query, passage) çiftlerini oluştur
        pairs = []
        for c in candidates:
            text = c.get(text_key, "") or ""
            # Cross-Encoder max_length=512, çok uzun metinleri kırp
            pairs.append((query, text[:2000]))

        # Puanlama
        scores = model.predict(pairs)

        # Puanları candidate'lere ekle
        for i, score in enumerate(scores):
            candidates[i]["rerank_score"] = float(score)

        # En yüksek puandan düşüğe sırala
        candidates.sort(key=lambda x: x["rerank_score"], reverse=True)

        logger.info(
            f"[Reranker] {len(candidates)} aday → top {top_k} | "
            f"en iyi skor: {candidates[0]['rerank_score']:.4f}"
        )

        return candidates[:top_k]

    except Exception as e:
        logger.error(f"[Reranker] Puanlama hatası: {e}")
        # Hata durumunda orijinal sıra
        for i, c in enumerate(candidates):
            c["rerank_score"] = 1.0 - (i * 0.01)
        return candidates[:top_k]
