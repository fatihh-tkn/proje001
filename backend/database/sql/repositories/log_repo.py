"""
database/repositories/log_repo.py
────────────────────────────────────
ApiLogu için veri erişim katmanı.

Loglar artık ayrı logs.db'de DEĞİL, ana PostgreSQL app db'de tutulur.
"""

from __future__ import annotations

from typing import Optional
from sqlalchemy import func, select, desc
from sqlalchemy.orm import Session

from database.sql.models import ApiLogu as ApiLog
from database.sql.session import get_session

# Metin kırpma limiti (karakter) — büyük payload'lar kesilir
_PREVIEW_LIMIT = 500

def _trim(text: Optional[str]) -> Optional[str]:
    """Önizleme metnini _PREVIEW_LIMIT karakterle kırpar."""
    if not text:
        return None
    return text[:_PREVIEW_LIMIT] + "…" if len(text) > _PREVIEW_LIMIT else text

class LogRepository:
    def __init__(self, db: Session):
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
            istek_onizleme=_trim(request_preview),
            yanit_onizleme=_trim(response_preview),
            rag_kullanildi_mi=rag_kullanildi_mi,
            rag_dosya_adi=rag_dosya_adi,
        )
        self._main_db.add(log)
        self._main_db.flush()
        return log

    def list_logs(
        self,
        session_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
    ) -> list[ApiLog]:
        stmt = select(ApiLog).order_by(desc(ApiLog.olusturulma_tarihi)).limit(limit)
        if session_id:
            stmt = stmt.where(ApiLog.oturum_kimlik == session_id)
        if status:
            stmt = stmt.where(ApiLog.durum == status)
        return list(self._main_db.scalars(stmt).all())

    def get_stats(self) -> dict:
        stmt = select(
            func.count(ApiLog.kimlik),
            func.sum(ApiLog.toplam_token),
            func.sum(ApiLog.maliyet_usd),
            func.avg(ApiLog.sure_ms),
        )
        res = self._main_db.execute(stmt).first()
        if not res:
            return {"count": 0, "total_tokens": 0, "total_cost": 0.0, "avg_duration": 0}
        return {
            "count": res[0] or 0,
            "total_tokens": int(res[1] or 0),
            "total_cost": float(res[2] or 0.0),
            "avg_duration": int(res[3] or 0),
        }

    def clear_all(self):
        self._main_db.execute(ApiLog.__table__.delete())
        self._main_db.flush()
