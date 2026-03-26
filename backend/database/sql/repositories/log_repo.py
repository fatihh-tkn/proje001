"""
database/repositories/log_repo.py
────────────────────────────────────
ApiLog için veri erişim katmanı.

Loglar artık ana app.db'ye DEĞİL, ayrı logs.db'ye yazılır.
Bu sayede app.db'nin şişmesi önlenir.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import func, select, desc
from sqlalchemy.orm import Session

from database.logs.models import ApiLog
from database.logs.session import get_logs_session

# Metin kırpma limiti (karakter) — büyük payload'lar kesilir
_PREVIEW_LIMIT = 500


def _trim(text: Optional[str]) -> Optional[str]:
    """Önizleme metnini _PREVIEW_LIMIT karakterle kırpar."""
    if not text:
        return None
    return text[:_PREVIEW_LIMIT] + "…" if len(text) > _PREVIEW_LIMIT else text


class LogRepository:

    def __init__(self, db: Session):
        # db parametresi geriye dönük uyumluluk için alınır ama kullanılmaz.
        # Tüm yazma işlemleri kendi logs.db session'ı üzerinden gider.
        self._main_db = db

    def add(
        self,
        session_id: Optional[str] = None,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        status: str = "success",
        error_code: Optional[str] = None,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
        total_tokens: Optional[int] = None,
        cost_usd: Optional[float] = None,
        duration_ms: Optional[int] = None,
        ip: Optional[str] = None,
        mac: Optional[str] = None,
        request_preview: Optional[str] = None,
        response_preview: Optional[str] = None,
        rag_kullanildi_mi: bool = False,
        rag_dosya_adi: Optional[str] = None,
    ) -> ApiLog:
        log = ApiLog(
            oturum_kimlik=session_id,
            tedarikci=provider,
            model=model,
            durum=status,
            hata_kodu=error_code,
            istek_token=prompt_tokens,
            yanit_token=completion_tokens,
            toplam_token=total_tokens,
            maliyet_usd=cost_usd,
            sure_ms=duration_ms,
            ip_adresi=ip,
            mac_adresi=mac,
            istek_onizleme=_trim(request_preview),   # Max 500 karakter
            yanit_onizleme=_trim(response_preview),  # Max 500 karakter
            rag_kullanildi_mi=rag_kullanildi_mi,
            rag_dosya_adi=rag_dosya_adi,
        )
        with get_logs_session() as db:
            db.add(log)
            db.commit()
            db.refresh(log)
        return log

    def list_logs(
        self,
        session_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
    ) -> list[ApiLog]:
        with get_logs_session() as db:
            stmt = select(ApiLog).order_by(desc(ApiLog.olusturulma_tarihi)).limit(limit)
            if session_id:
                stmt = stmt.where(ApiLog.oturum_kimlik == session_id)
            if status:
                stmt = stmt.where(ApiLog.durum == status)
            return list(db.scalars(stmt).all())

    def get_stats(self) -> dict:
        """Toplam maliyet, token ve istek sayısı gibi istatistikleri döner."""
        with get_logs_session() as db:
            stmt = select(
                func.count(ApiLog.kimlik),
                func.sum(ApiLog.toplam_token),
                func.sum(ApiLog.maliyet_usd),
                func.avg(ApiLog.sure_ms),
            )
            res = db.execute(stmt).first()
        if not res:
            return {"count": 0, "total_tokens": 0, "total_cost": 0.0, "avg_duration": 0}
        return {
            "count": res[0] or 0,
            "total_tokens": int(res[1] or 0),
            "total_cost": float(res[2] or 0.0),
            "avg_duration": int(res[3] or 0),
        }

    def clear_all(self):
        """Tüm logları temizler."""
        with get_logs_session() as db:
            db.execute(ApiLog.__table__.delete())
            db.commit()
