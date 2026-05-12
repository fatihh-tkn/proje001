"""
api/routes/embedding.py
─────────────────────────────────────────────────────────────────────
Embedding Model Yönetim API'si

Endpoint'ler:
  GET  /api/embedding/models        → Kullanılabilir tüm modelleri listele
  GET  /api/embedding/active        → Aktif modeli getir
  PUT  /api/embedding/active        → Aktif modeli değiştir
  POST /api/embedding/re-vectorize  → Tüm belgeleri yeni modelle yeniden vektörleştir
  GET  /api/embedding/health        → Vektör sağlık istatistikleri
  POST /api/embedding/fix-orphans   → Sorunlu kayıtları onar (SSE)
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import logging
import json
import asyncio
import threading

logger = logging.getLogger(__name__)

router = APIRouter()


class SetModelRequest(BaseModel):
    model_key: str


# ── GET /models — Tüm modelleri listele ───────────────────────────────────────

@router.get("/models", summary="Kullanılabilir embedding modellerini listele")
def list_embedding_models():
    """Desteklenen tüm embedding modellerinin listesini döner."""
    from database.vector.embedding_manager import EMBEDDING_MODELS, get_active_model_key

    active = get_active_model_key()
    result = []
    for key, info in EMBEDDING_MODELS.items():
        item = info.copy()
        item["key"] = key
        item["is_active"] = (key == active)
        result.append(item)
    return {"models": result, "active": active}


# ── GET /active — Aktif modeli getir ──────────────────────────────────────────

@router.get("/active", summary="Aktif embedding modelini getir")
def get_active_model():
    """Şu an kullanılmakta olan embedding modelinin bilgilerini döner."""
    from database.vector.embedding_manager import get_active_model_info
    return get_active_model_info()


# ── PUT /active — Aktif modeli değiştir ───────────────────────────────────────

@router.put("/active", summary="Aktif embedding modelini değiştir")
def set_active_model(body: SetModelRequest):
    """Embedding modelini değiştirir. Yeniden vektörleştirme gerekebilir."""
    from database.vector.embedding_manager import set_active_model as _set

    try:
        info = _set(body.model_key, persist=True)
        return {
            "status": "ok",
            "message": f"Aktif embedding modeli '{body.model_key}' olarak değiştirildi.",
            "model": info,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── POST /re-vectorize — Tüm belgeleri yeniden vektörleştir ──────────────────

@router.post("/re-vectorize", summary="Tüm mevcut belgeleri aktif modelle yeniden vektörleştir")
def re_vectorize_all():
    """
    Veritabanındaki tüm VektorParcasi kayıtlarının embedding'lerini
    aktif modelle yeniden hesaplayıp günceller.
    
    ⚠️ Bu işlem büyük veritabanlarında uzun sürebilir.
    """
    from database.vector.embedding_manager import get_embeddings, get_active_model_key
    from database.sql.session import get_session
    from database.sql.models import VektorParcasi
    from sqlalchemy import select

    model_key = get_active_model_key()
    updated = 0
    errors = 0
    batch_size = 50

    try:
        with get_session() as db:
            all_parcalar = list(db.scalars(select(VektorParcasi).where(VektorParcasi.icerik.is_not(None))).all())
            total = len(all_parcalar)

            for i in range(0, total, batch_size):
                batch = all_parcalar[i:i + batch_size]
                texts = [p.icerik for p in batch]

                try:
                    vecs = get_embeddings(texts)
                    for j, parca in enumerate(batch):
                        parca.vektor_verisi = vecs[j]
                        parca.embedding_modeli = model_key
                    updated += len(batch)
                except Exception as e:
                    logger.error(f"Batch {i}-{i+batch_size} vektörleştirme hatası: {e}")
                    errors += len(batch)

            db.commit()

    except Exception as e:
        logger.error(f"Re-vectorize genel hatası: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "status": "ok",
        "model": model_key,
        "total": total if 'total' in dir() else 0,
        "updated": updated,
        "errors": errors,
    }


# ── GET /health — Vektör sağlık istatistikleri ────────────────────────────────

@router.get("/health", summary="VektorParcasi sağlık istatistiklerini döner")
def get_vector_health():
    """
    Tek sorguda tüm vektör sağlık metriklerini döner:
    - Toplam parça sayısı
    - Vektörsüz (vektor_verisi IS NULL) parça sayısı
    - İçeriksiz parça sayısı
    - Model uyumsuz parça sayısı
    - Yetim belgeler (vektorlestirildi=True ama 0 gerçek parça)
    - Model dağılımı
    """
    from database.vector.embedding_manager import get_active_model_key
    from database.sql.session import get_session
    from database.sql.models import VektorParcasi
    from sqlalchemy import select, func, text

    active_model = get_active_model_key()

    with get_session() as db:
        total_chunks = db.scalar(select(func.count()).select_from(VektorParcasi)) or 0

        null_vector_chunks = db.scalar(
            select(func.count()).select_from(VektorParcasi)
            .where(VektorParcasi.vektor_verisi.is_(None))
        ) or 0

        null_content_chunks = db.scalar(
            select(func.count()).select_from(VektorParcasi)
            .where(VektorParcasi.icerik.is_(None))
        ) or 0

        model_mismatch_chunks = db.scalar(
            select(func.count()).select_from(VektorParcasi)
            .where(VektorParcasi.embedding_modeli != active_model)
            .where(VektorParcasi.vektor_verisi.is_not(None))
        ) or 0

        by_model_rows = db.execute(
            select(VektorParcasi.embedding_modeli, func.count().label("cnt"))
            .group_by(VektorParcasi.embedding_modeli)
            .order_by(func.count().desc())
        ).all()
        by_model = [{"model": row[0], "count": row[1]} for row in by_model_rows]

        orphans_result = db.execute(text("""
            SELECT b.kimlik, b.dosya_adi, b.parca_sayisi,
                   CAST(COUNT(v.kimlik) AS INTEGER) AS gercek_parca_sayisi
            FROM belgeler b
            LEFT JOIN vektor_parcalari v ON v.belge_kimlik = b.kimlik
            WHERE b.vektorlestirildi_mi = TRUE
            GROUP BY b.kimlik, b.dosya_adi, b.parca_sayisi
            HAVING COUNT(v.kimlik) = 0
            LIMIT 50
        """)).all()
        orphan_docs = [
            {
                "kimlik": row[0],
                "dosya_adi": row[1],
                "parca_sayisi_kayit": row[2] or 0,
                "gercek_parca_sayisi": row[3],
            }
            for row in orphans_result
        ]

        avg_result = db.scalar(text("""
            SELECT ROUND(AVG(cnt)::numeric, 1)
            FROM (SELECT COUNT(*) AS cnt FROM vektor_parcalari GROUP BY belge_kimlik) sub
        """))
        avg_chunks = float(avg_result or 0)

    issues = null_vector_chunks + len(orphan_docs)
    if issues == 0 and model_mismatch_chunks == 0:
        status = "ok"
    elif issues < 20:
        status = "warning"
    else:
        status = "critical"

    return {
        "status": status,
        "active_model": active_model,
        "total_chunks": total_chunks,
        "null_vector_chunks": null_vector_chunks,
        "null_content_chunks": null_content_chunks,
        "model_mismatch_chunks": model_mismatch_chunks,
        "avg_chunks_per_doc": avg_chunks,
        "orphan_documents": orphan_docs,
        "by_model": by_model,
    }


# ── POST /fix-orphans — Sorunlu kayıtları SSE ile onar ───────────────────────

@router.post("/fix-orphans", summary="Sorunlu vektör kayıtlarını SSE akışı ile onar")
async def fix_orphans(request: Request):
    """
    İki modda çalışır:
      Body {}            → tüm null-vektör parçaları + yetim belgeleri onar
      Body {doc_id: ...} → sadece bu belgeyi yeniden vektörleştir

    SSE event formatı:
      data: {"type": "progress", "step": "null_vectors"|"orphans"|"reindex",
             "message": "...", "current": N, "total": M}
      data: {"type": "done", "fixed_vectors": N, "reindexed_docs": N, "errors": N}
      data: {"type": "error", "message": "..."}
    """
    try:
        body = await request.json()
    except Exception:
        body = {}

    doc_id: str | None = body.get("doc_id")
    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def _emit(event: dict) -> None:
        asyncio.run_coroutine_threadsafe(queue.put(event), loop)

    def _worker() -> None:
        try:
            from database.vector.embedding_manager import get_embeddings, get_active_model_key
            from database.sql.session import get_session
            from database.sql.models import VektorParcasi, Belge
            from sqlalchemy import select, text

            model_key = get_active_model_key()
            fixed_vectors = 0
            reindexed_docs = 0
            errors = 0

            # ── Tek belge modu ───────────────────────────────────────────────
            if doc_id:
                _emit({"type": "progress", "step": "reindex",
                       "message": "Belge yeniden vektörleştiriliyor...", "current": 0, "total": 1})
                try:
                    with get_session() as db:
                        db.query(VektorParcasi).filter(
                            VektorParcasi.belge_kimlik == doc_id
                        ).delete(synchronize_session=False)
                        belge = db.query(Belge).filter(Belge.kimlik == doc_id).first()
                        if belge:
                            belge.vektorlestirildi_mi = False
                            belge.parca_sayisi = 0
                        db.commit()

                    from api.routes.archive import _run_vectorization
                    _run_vectorization(doc_id)
                    reindexed_docs = 1
                    _emit({"type": "progress", "step": "reindex",
                           "message": "Tamamlandı.", "current": 1, "total": 1})
                except Exception as exc:
                    logger.error("Belge reindex hatası (%s): %s", doc_id, exc)
                    errors += 1
                    _emit({"type": "error", "message": str(exc)})

                _emit({"type": "done", "fixed_vectors": 0,
                       "reindexed_docs": reindexed_docs, "errors": errors})
                return

            # ── Global fix modu ──────────────────────────────────────────────
            # Adım 1: vektor_verisi IS NULL ama icerik var → yeniden embed et
            with get_session() as db:
                null_chunks = list(db.scalars(
                    select(VektorParcasi)
                    .where(VektorParcasi.vektor_verisi.is_(None))
                    .where(VektorParcasi.icerik.is_not(None))
                ).all())

            total_null = len(null_chunks)
            if total_null > 0:
                _emit({"type": "progress", "step": "null_vectors",
                       "message": f"{total_null} vektörsüz parça yeniden embed ediliyor...",
                       "current": 0, "total": total_null})
                batch_size = 50
                for i in range(0, total_null, batch_size):
                    batch = null_chunks[i:i + batch_size]
                    texts = [p.icerik for p in batch]
                    try:
                        vecs = get_embeddings(texts)
                        with get_session() as db:
                            for j, parca in enumerate(batch):
                                db_p = db.query(VektorParcasi).filter(
                                    VektorParcasi.kimlik == parca.kimlik
                                ).first()
                                if db_p:
                                    db_p.vektor_verisi = vecs[j]
                                    db_p.embedding_modeli = model_key
                            db.commit()
                        fixed_vectors += len(batch)
                        _emit({"type": "progress", "step": "null_vectors",
                               "message": f"Embed: {fixed_vectors}/{total_null}",
                               "current": fixed_vectors, "total": total_null})
                    except Exception as exc:
                        logger.error("Null-vector batch hatası: %s", exc)
                        errors += len(batch)
                        _emit({"type": "progress", "step": "null_vectors",
                               "message": f"Batch hatası: {exc}",
                               "current": fixed_vectors, "total": total_null})

            # Adım 2: Yetim belgeler → sıfırla + yeniden vektörleştir
            with get_session() as db:
                orphans = db.execute(text("""
                    SELECT b.kimlik, b.dosya_adi
                    FROM belgeler b
                    LEFT JOIN vektor_parcalari v ON v.belge_kimlik = b.kimlik
                    WHERE b.vektorlestirildi_mi = TRUE
                    GROUP BY b.kimlik, b.dosya_adi
                    HAVING COUNT(v.kimlik) = 0
                """)).all()

            total_orphans = len(orphans)
            if total_orphans > 0:
                _emit({"type": "progress", "step": "orphans",
                       "message": f"{total_orphans} yetim belge yeniden vektörleştiriliyor...",
                       "current": 0, "total": total_orphans})
                from api.routes.archive import _run_vectorization
                for idx, (oid, oname) in enumerate(orphans):
                    try:
                        with get_session() as db:
                            belge = db.query(Belge).filter(Belge.kimlik == oid).first()
                            if belge:
                                belge.vektorlestirildi_mi = False
                                belge.parca_sayisi = 0
                            db.commit()
                        _run_vectorization(oid)
                        reindexed_docs += 1
                        _emit({"type": "progress", "step": "orphans",
                               "message": f"{oname}: tamamlandı",
                               "current": idx + 1, "total": total_orphans})
                    except Exception as exc:
                        logger.error("Orphan reindex hatası (%s): %s", oid, exc)
                        errors += 1
                        _emit({"type": "progress", "step": "orphans",
                               "message": f"{oname}: hata — {exc}",
                               "current": idx + 1, "total": total_orphans})

            _emit({"type": "done", "fixed_vectors": fixed_vectors,
                   "reindexed_docs": reindexed_docs, "errors": errors})

        except Exception as exc:
            logger.error("fix-orphans genel hatası: %s", exc)
            _emit({"type": "error", "message": str(exc)})
            _emit({"type": "done", "fixed_vectors": 0, "reindexed_docs": 0, "errors": 1})
        finally:
            asyncio.run_coroutine_threadsafe(queue.put(None), loop)

    threading.Thread(target=_worker, daemon=True).start()

    async def generate():
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=300)
            except asyncio.TimeoutError:
                break
            if event is None:
                break
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
