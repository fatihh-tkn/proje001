"""
api/routes/embedding.py
─────────────────────────────────────────────────────────────────────
Embedding Model Yönetim API'si

Endpoint'ler:
  GET  /api/embedding/models       → Kullanılabilir tüm modelleri listele
  GET  /api/embedding/active       → Aktif modeli getir
  PUT  /api/embedding/active       → Aktif modeli değiştir
  POST /api/embedding/re-vectorize → Tüm belgeleri yeni modelle yeniden vektörleştir
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging

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
