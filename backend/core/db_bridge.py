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
from database.sql.repositories.chat_repo import ChatRepository
from database.sql.models import AIModeli

# Backward compatibility
UserModel = AIModeli


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


# -- add_log_to_db ------------------------------------------------------------
def add_log_to_db(log_entry: dict) -> None:
    session_id = log_entry.get("sessionId") or log_entry.get("session_id")
    with get_session() as db:
        # OTURUM KONTROLÜ: FOREIGN KEY hatasını önlemek için session yoksa oluşturuyoruz.
        if session_id:
            chat_repo = ChatRepository(db)
            if not chat_repo.get_session(session_id):
                chat_repo.create_session(session_id=session_id, title="Yeni Sohbet")

        repo = LogRepository(db)
        repo.add(
            session_id=session_id,
            user_id=log_entry.get("user_id") or log_entry.get("userId"),
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
            request_preview=(log_entry.get("request") or "") or None,
            response_preview=(log_entry.get("response") or "") or None,
            rag_kullanildi_mi=bool(log_entry.get("rag_used", False)),
            rag_dosya_adi=log_entry.get("rag_file") or None,
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
def get_logs_from_db(
    limit: int = 200,
    project_id: Optional[str] = None,
    user_id: Optional[str] = None,
    model: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    since_id: Optional[str] = None,
) -> list[dict]:
    from database.sql.models import Kullanici
    with get_session() as db:
        repo = LogRepository(db)
        logs = repo.list_logs(
            user_id=user_id,
            model=model,
            status=status,
            date_from=date_from,
            date_to=date_to,
            search=search,
            since_id=since_id,
            limit=limit,
        )
        # Kullanıcı adlarını tek sorguda çek
        user_ids = {l.kullanici_kimlik for l in logs if l.kullanici_kimlik}
        user_map: dict[str, dict] = {}
        if user_ids:
            users = db.query(Kullanici).filter(Kullanici.kimlik.in_(user_ids)).all()
            user_map = {u.kimlik: {"name": u.tam_ad, "email": u.eposta} for u in users}

        result = []
        for log in logs:
            u_info = user_map.get(log.kullanici_kimlik, {})
            result.append({
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
                "userId": log.kullanici_kimlik,
                "userName": u_info.get("name"),
                "userEmail": u_info.get("email"),
                "projectId": project_id or "default",
                "role": "assistant",
                "error": log.hata_kodu,
                "request": log.istek_onizleme or "",
                "response": log.yanit_onizleme or "",
                "ip": log.ip_adresi or "unknown",
                "mac": log.mac_adresi or "unknown",
            })
        return result


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

# -- get_ai_agent -------------------------------------------------------------
def get_ai_agent(agent_kind: str = None, agent_id: str = None) -> Optional[dict]:
    """DB'den belirtilen ajanın güncel ayarlarını (prompt, temperature, vb.) çeker."""
    from database.sql.models import AIAgent
    from sqlalchemy import select
    with get_session() as db:
        stmt = select(AIAgent).where(AIAgent.aktif_mi == True)
        if agent_id:
            stmt = stmt.where(AIAgent.kimlik == agent_id)
        elif agent_kind:
            stmt = stmt.where(AIAgent.agent_kind == agent_kind)
            
        agent = db.scalars(stmt).first()
        if not agent:
            return None
            
        return {
            "id": agent.kimlik,
            "agent_kind": agent.agent_kind,
            "name": agent.ad,
            "prompt": agent.prompt,
            "negative_prompt": agent.negative_prompt,
            "persona": agent.persona,
            "temperature": agent.temperature,
            "max_tokens": agent.max_tokens,
            "model": agent.model,
            "provider": agent.provider,
            "allowed_rags": agent.allowed_rags,
            "allowed_workflows": agent.allowed_workflows or [],
            "strict_fact_check": agent.strict_fact_check,
            "chat_history_length": agent.chat_history_length,
            "can_ask_follow_up": agent.can_ask_follow_up,
            "error_message": agent.error_message
        }


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

# -- System Settings & Audit Logs (Issue 1 & 2) --------------------------------
def get_system_settings() -> dict:
    """SQL veritabanından sistem ayarlarını sözlük olarak okur."""
    from database.sql.models import SistemAyari
    from sqlalchemy import select
    with get_session() as db:
        rows = list(db.scalars(select(SistemAyari)).all())
        return {r.anahtar: r.deger for r in rows}


def add_audit_log(
    islem_turu: str,
    tablo_adi: Optional[str] = None,
    kayit_kimlik: Optional[str] = None,
    eski_deger: Optional[dict] = None,
    yeni_deger: Optional[dict] = None,
    kullanici_kimlik: Optional[str] = None,
    ip_adresi: Optional[str] = None,
) -> None:
    """Kritik sistem eylemlerini denetim_izleri (Audit Logs) tablosuna kaydeder."""
    from database.sql.models import DenetimIzi
    with get_session() as db:
        log = DenetimIzi(
            kullanici_kimlik=kullanici_kimlik,
            islem_turu=islem_turu,
            tablo_adi=tablo_adi,
            kayit_kimlik=kayit_kimlik,
            eski_deger=eski_deger,
            yeni_deger=yeni_deger,
            ip_adresi=ip_adresi,
        )
        db.add(log)
        db.commit()
