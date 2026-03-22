"""
core/db_bridge.py
------------------
Servisler (ai_service.py, processor.py, monitor.py) icin
ORM repository'lerini sarmalayan uyumluluk katmani.

Tum veri erisimi artik yeni app.db uzerinden SQLAlchemy ORM ile yapilir.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from database.sql.session import get_session
from database.sql.repositories.log_repo import LogRepository
from database.sql.models import AIModeli

# Backward compatibility
UserModel = AIModeli


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


# -- add_log_to_db ------------------------------------------------------------
def add_log_to_db(log_entry: dict) -> None:
    with get_session() as db:
        repo = LogRepository(db)
        repo.add(
            session_id=log_entry.get("sessionId") or log_entry.get("session_id"),
            provider=log_entry.get("provider"),
            model=log_entry.get("model"),
            status=log_entry.get("status", "success"),
            error_code=str(log_entry["error"]) if log_entry.get("error") else None,
            prompt_tokens=log_entry.get("promptTokens") or log_entry.get("prompt_tokens"),
            completion_tokens=log_entry.get("completionTokens") or log_entry.get("completion_tokens"),
            total_tokens=log_entry.get("totalTokens") or log_entry.get("total_tokens"),
            cost_usd=log_entry.get("cost"),
            duration_ms=log_entry.get("duration") or log_entry.get("duration_ms"),
            ip=log_entry.get("ip"),
            mac=log_entry.get("mac"),
            request_preview=(log_entry.get("request") or "")[:2000] or None,
            response_preview=(log_entry.get("response") or "")[:2000] or None,
        )


# -- get_all_logs_for_dashboard -----------------------------------------------
def get_all_logs_for_dashboard(project_id: Optional[str] = None) -> list[dict]:
    with get_session() as db:
        repo = LogRepository(db)
        logs = repo.list_logs(limit=2000)
        
        # Format logs for dashboard
        formatted_logs = []
        for log in logs:
            formatted_logs.append({
                "id": log.kimlik,
                "timestamp": log.olusturulma_tarihi,
                "provider": log.tedarikci or "unknown",
                "model": log.model or "unknown",
                "promptTokens": log.istek_token or 0,
                "completionTokens": log.yanit_token or 0,
                "totalTokens": log.toplam_token or 0,
                "duration": log.sure_ms or 0,
                "status": log.durum,
                "cost": log.maliyet_usd or 0.0,
                "sessionId": log.oturum_kimlik or "default",
                "projectId": project_id or "default",
                "role": "assistant",
                "error": log.hata_kodu,
                "request": log.istek_onizleme or "",
                "response": log.yanit_onizleme or "",
                "ip": log.ip_adresi or "unknown",
                "mac": log.mac_adresi or "unknown",
            })
            
        return formatted_logs


# -- get_logs_from_db ---------------------------------------------------------
def get_logs_from_db(limit: int = 100, project_id: Optional[str] = None) -> list[dict]:
    logs = get_all_logs_for_dashboard(project_id)
    return logs[:limit]


# -- clear_logs_from_db -------------------------------------------------------
def clear_logs_from_db() -> None:
    with get_session() as db:
        repo = LogRepository(db)
        repo.clear_all()

# No-op clear_logs_from_db was here, but properly handled above


# -- get_user_models ----------------------------------------------------------
def get_user_models() -> list[dict]:
    with get_session() as db:
        from sqlalchemy import select
        rows = list(db.scalars(select(AIModeli).order_by(AIModeli.olusturulma_tarihi)).all())
        result = []
        for m in rows:
            key = m.api_anahtari
            masked = key[:6] + "..." + key[-4:] if len(key) > 10 else "***"
            result.append({
                "id": m.kimlik,
                "name": m.ad,
                "api_key": m.api_anahtari,
                "masked_key": masked,
                "created_at": m.olusturulma_tarihi,
                "provider": m.tedarikci or "Custom",
                "has_key": True,
                "status": "active",
                "description": "Kullanici tarafindan eklenen model.",
                "avg_latency": "-",
                "cost_per_1k": "-",
                "max_tokens": "-",
                "features": ["Ozel Model"],
            })
        return result


# -- add_user_model -----------------------------------------------------------
def add_user_model(model_id: str, name: str, api_key: str) -> None:
    with get_session() as db:
        model = AIModeli(ad=name, api_anahtari=api_key)
        db.add(model)
        db.commit()


# -- delete_user_model --------------------------------------------------------
def delete_user_model(model_id: str) -> None:
    with get_session() as db:
        m = db.get(AIModeli, model_id)
        if m:
            db.delete(m)
            db.commit()


# -- init_db (no-op: main.py lifespan ile yapiliyor) --------------------------
def init_db() -> None:
    pass
