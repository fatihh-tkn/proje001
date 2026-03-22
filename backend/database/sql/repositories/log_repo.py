"""
database/repositories/log_repo.py
────────────────────────────────────
ApiLog için veri erişim katmanı.
Mevcut monitor.db / monitor_db.py'nin ORM karşılığı.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import func, select, desc
from sqlalchemy.orm import Session

from database.sql.models import ApiCagrisi

# Backward compatibility
ApiLog = ApiCagrisi


class LogRepository:

    def __init__(self, db: Session):
        self.db = db

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
    ) -> ApiCagrisi:
        log = ApiCagrisi(
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
            istek_onizleme=request_preview,
            yanit_onizleme=response_preview,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def list_logs(
        self,
        session_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
    ) -> list[ApiCagrisi]:
        stmt = select(ApiCagrisi).order_by(desc(ApiCagrisi.olusturulma_tarihi)).limit(limit)
        if session_id:
            stmt = stmt.where(ApiCagrisi.oturum_kimlik == session_id)
        if status:
            stmt = stmt.where(ApiCagrisi.durum == status)
        return list(self.db.scalars(stmt).all())

    def get_stats(self) -> dict:
        """Toplam maliyet, token ve istek sayısı gibi istatistikleri döner."""
        stmt = select(
            func.count(ApiCagrisi.kimlik),
            func.sum(ApiCagrisi.toplam_token),
            func.sum(ApiCagrisi.maliyet_usd),
            func.avg(ApiCagrisi.sure_ms),
        )
        res = self.db.execute(stmt).first()
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
        self.db.execute(ApiCagrisi.__table__.delete())
        self.db.commit()
