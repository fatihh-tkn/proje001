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
            agent_id=log_entry.get("agent_id") or log_entry.get("agentId"),
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
        # KRİTİK: get_session() exit'te otomatik commit etmiyor — flush'lanan log
        # kaydının kalıcı olması için açıkça commit et. Bu satır eksikti; api_loglari
        # tablosu hiç dolmuyordu → loglar / sohbet listesi / kullanım maliyeti boş.
        db.commit()


# -- get_all_logs_for_dashboard -----------------------------------------------
def get_all_logs_for_dashboard(project_id: Optional[str] = None, agent_id: Optional[str] = None) -> list[dict]:
    with get_session() as db:
        repo = LogRepository(db)
        logs = repo.list_logs(agent_id=agent_id, limit=2000)

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
        db.commit()

# No-op clear_logs_from_db was here, but properly handled above


# -- get_user_models ----------------------------------------------------------
def get_user_models(include_secret: bool = False) -> list[dict]:
    """
    Tüm kayıtlı modelleri döner. Her kayıt için provider registry'ye danışıp
    base_url, extra_headers ve protocol alanlarını da hesaplar.

    GÜVENLİK: Default olarak gerçek `api_key` döndürmez (sadece masked_key).
    Backend internal kullanım (ai_service / llm_adapter) için açıkça
    include_secret=True geçmeli. HTTP response'a dönen yerler asla True
    geçmemeli — frontend tam key'i hiç görmemeli.
    """
    from services import provider_registry
    from services.crypto_service import decrypt as _decrypt_secret

    with get_session() as db:
        from sqlalchemy import select
        rows = list(db.scalars(select(AIModeli).order_by(AIModeli.olusturulma_tarihi)).all())
        result = []
        for m in rows:
            # DB'den gelen değer şifreli olabilir; decrypt() prefix'e bakar,
            # düz metinse olduğu gibi döner (geriye dönük uyumlu).
            key = _decrypt_secret(m.api_anahtari) or ""
            masked = key[:6] + "..." + key[-4:] if len(key) > 10 else "***"
            raw_provider = m.tedarikci or ""
            raw_base_url = m.temel_url or ""
            spec = provider_registry.resolve({
                "api_key": key,
                "provider": raw_provider,
                "base_url": raw_base_url,
            })
            item = {
                "id": m.kimlik,
                "name": m.ad,
                "masked_key": masked,
                "created_at": m.olusturulma_tarihi,
                # raw_provider boşsa registry'nin tahminini göster
                "provider": raw_provider or spec["provider"],
                "provider_label": spec["label"],
                "protocol": spec["protocol"],
                "base_url": spec["base_url"],
                "has_key": True,
                "status": "active",
                "description": "Kullanici tarafindan eklenen model.",
                "avg_latency": "-",
                "cost_per_1k": "-",
                "max_tokens": "-",
                "features": ["Ozel Model"],
            }
            if include_secret:
                # Yalnızca backend internal çağrıları için. HTTP'ye gitmemeli.
                item["api_key"] = key
                item["extra_headers"] = spec["extra_headers"]
            result.append(item)
        return result


# -- add_user_model -----------------------------------------------------------
def add_user_model(
    name: str,
    api_key: str,
    *,
    provider: str | None = None,
    base_url: str | None = None,
) -> str:
    """
    Yeni model kaydı ekler. api_key, FERNET_KEY tanımlıysa Fernet ile
    şifrelenerek yazılır; yoksa düz metin yazılır (geçiş sürümü).

    DB tarafında üretilen `kimlik` (UUID4 string) döndürülür — caller bunu
    response'a koyar; uydurma bir id üretmez.
    """
    from services.crypto_service import encrypt as _encrypt_secret

    with get_session() as db:
        model = AIModeli(
            ad=name,
            api_anahtari=_encrypt_secret(api_key),
            tedarikci=(provider or None),
            temel_url=(base_url or None),
        )
        db.add(model)
        db.commit()
        return model.kimlik

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
            "error_message": agent.error_message,
            "node_config": agent.node_config or {},
            "model_locked": getattr(agent, "model_locked", False) or False,
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
import time as _time

_settings_cache: dict | None = None
_settings_cache_ts: float = 0.0
_SETTINGS_TTL = 10.0  # saniye


def invalidate_settings_cache() -> None:
    """Ayarlar değiştiğinde çağrılır (POST /settings vb.)."""
    global _settings_cache, _settings_cache_ts
    _settings_cache = None
    _settings_cache_ts = 0.0


def get_system_settings() -> dict:
    """SQL veritabanından sistem ayarlarını sözlük olarak okur. 10 sn TTL cache."""
    global _settings_cache, _settings_cache_ts
    now = _time.time()
    if _settings_cache is not None and (now - _settings_cache_ts) < _SETTINGS_TTL:
        return _settings_cache
    from database.sql.models import SistemAyari
    from sqlalchemy import select
    with get_session() as db:
        rows = list(db.scalars(select(SistemAyari)).all())
        _settings_cache = {r.anahtar: r.deger for r in rows}
    _settings_cache_ts = now
    return _settings_cache


# LG.7 — Her graph rolünün kendi DB ajanı var (sys_node_<role>).
# Önceki "her rol chatbot ajanına düşer" yapısı yerine: rol → ajan ID 1:1 eşleşme.
# `agent_assignments` SistemAyari override mekanizması korunuyor.
_DEFAULT_ROLE_AGENT_ID = {
    "supervisor":    "sys_node_supervisor",
    "rag_search":    "sys_node_rag_search",
    "aggregator":    "sys_node_aggregator",
    "error_solver":  "sys_node_error_solver",
    "zli_finder":    "sys_node_zli_finder",
    "msg_polish":    "sys_node_msg_polish",
    "n8n_trigger":   "sys_node_n8n_trigger",
    "critic":        "sys_node_critic",
    "skill_reader":  "sys_node_skill_reader",
}

# Yeni node ajanı silinmiş veya seed çalışmamışsa son çare olarak hangi
# kind'ın aktif kaydına düşelim
_FALLBACK_KIND_BY_ROLE = {
    "supervisor":    "graph_node",
    "rag_search":    "graph_node",
    "aggregator":    "graph_node",
    "error_solver":  "graph_node",
    "zli_finder":    "graph_node",
    "msg_polish":    "graph_node",
    "n8n_trigger":   "graph_node",
    "critic":        "graph_node",
    "skill_reader":  "graph_node",
}


def get_agent_assignments() -> dict:
    """`agent_assignments` system setting'ini JSON olarak okur. Boşsa {}."""
    import json as _json
    try:
        raw = get_system_settings().get("agent_assignments")
        if not raw:
            return {}
        return _json.loads(raw) if isinstance(raw, str) else (raw or {})
    except Exception:
        return {}


def set_agent_assignments(assignments: dict) -> None:
    """`agent_assignments` system setting'ini günceller."""
    import json as _json
    import datetime
    from database.sql.models import SistemAyari
    from sqlalchemy import select
    payload = _json.dumps(assignments or {}, ensure_ascii=False)
    now = datetime.datetime.utcnow().isoformat()
    with get_session() as db:
        row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == "agent_assignments"))
        if row:
            row.deger = payload
            row.guncelleme_tarihi = now
        else:
            db.add(SistemAyari(
                anahtar="agent_assignments",
                deger=payload,
                aciklama="Graph node rolü → atanmış AIAgent.kimlik eşlemesi",
                hassas_mi=False,
                olusturulma_tarihi=now,
                guncelleme_tarihi=now,
            ))
        db.commit()


def get_period_cost_usd(period: str = "day") -> float:
    """
    api_loglari tablosundan mevcut periyodun toplam maliyetini (USD) döner.
    period = "day"  → bugünün UTC 00:00'dan itibaren
            "month" → bu ayın 1'inden itibaren
    Hata durumunda 0.0 döner (cap kontrolü güvenli tarafa düşsün).
    """
    import datetime as _dt
    from database.sql.models import ApiLogu
    from sqlalchemy import select, func

    now = _dt.datetime.utcnow()
    if period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_iso = start.isoformat()

    try:
        with get_session() as db:
            stmt = select(func.coalesce(func.sum(ApiLogu.maliyet_usd), 0.0)).where(
                ApiLogu.olusturulma_tarihi >= start_iso
            )
            return float(db.scalar(stmt) or 0.0)
    except Exception:
        return 0.0


def get_cost_caps() -> dict:
    """daily_cost_cap_usd ve monthly_cost_cap_usd ayarlarını döner.
    0 / yok = devre dışı (limit yok)."""
    s = get_system_settings()

    def _to_float(v):
        try:
            return float(v) if v is not None else 0.0
        except (TypeError, ValueError):
            return 0.0

    return {
        "daily":   _to_float(s.get("daily_cost_cap_usd")),
        "monthly": _to_float(s.get("monthly_cost_cap_usd")),
    }


def check_cost_cap() -> tuple[bool, str]:
    """
    Mevcut periyot maliyetlerini caps ile karşılaştırır.
    Döner: (aşıldı_mı, kullanıcı_mesajı). Aşılmadıysa (False, "").
    """
    caps = get_cost_caps()
    daily = caps["daily"]
    monthly = caps["monthly"]
    if daily <= 0 and monthly <= 0:
        return False, ""

    if daily > 0:
        spent = get_period_cost_usd("day")
        if spent >= daily:
            return True, (
                f"⚠️ Günlük yapay zeka bütçesi aşıldı "
                f"(${spent:.2f} / ${daily:.2f}). Lütfen daha sonra tekrar deneyin "
                f"veya yöneticiyle iletişime geçin."
            )
    if monthly > 0:
        spent = get_period_cost_usd("month")
        if spent >= monthly:
            return True, (
                f"⚠️ Aylık yapay zeka bütçesi aşıldı "
                f"(${spent:.2f} / ${monthly:.2f}). Bu ay için sınır doldu."
            )
    return False, ""


def get_assigned_agent(role: str) -> Optional[dict]:
    """
    Graph node rolüne (örn. `aggregator`, `error_solver`) atanmış ajanı döner.

    Önce `agent_assignments` system setting'inde özel atama var mı bakar.
    Atama yoksa veya o ID'li ajan pasif/silinmişse, rolün varsayılan kind'ına
    (`chatbot` / `worker` / `router`) düşer. O da bulunamazsa None döner.
    """
    assignments = get_agent_assignments()
    assigned_id = (assignments or {}).get(role)

    # 1) Özel atama
    if assigned_id:
        a = get_ai_agent(agent_id=assigned_id)
        if a:
            return a

    # 2) Rol için bilinen varsayılan agent_id (sys_node_<role>)
    default_id = _DEFAULT_ROLE_AGENT_ID.get(role)
    if default_id:
        a = get_ai_agent(agent_id=default_id)
        if a:
            return a

    # 3) Rol → kind eşlemesi (graph_node fallback). Seed çalışmamış ya da
    #    tüm sys_node_* ajanları silinmişse, herhangi bir aktif graph_node
    #    ajanına düşer; o da yoksa legacy chatbot.
    default_kind = _FALLBACK_KIND_BY_ROLE.get(role, "chatbot")
    a = get_ai_agent(agent_kind=default_kind)
    if a:
        return a
    # Son emniyet: legacy chatbot (rollback senaryosu)
    return get_ai_agent(agent_kind="chatbot")


def get_all_assigned_agents() -> dict[str, dict]:
    """
    Tüm graph rollerinin ajan konfigürasyonlarını tek SQL sorgusunda döner.
    9 ayrı DB round-trip yerine 1 IN query kullanır.
    """
    from database.sql.models import AIAgent
    from sqlalchemy import select

    # Özel atamalar (genellikle boş; cache'li get_system_settings kullanır)
    assignments = get_agent_assignments()

    # Her rol için hedef agent_id'yi belirle
    role_to_id: dict[str, str] = {}
    for role, default_id in _DEFAULT_ROLE_AGENT_ID.items():
        role_to_id[role] = assignments.get(role) or default_id

    needed_ids = set(role_to_id.values())
    try:
        with get_session() as db:
            agents_list = list(db.scalars(
                select(AIAgent)
                .where(AIAgent.aktif_mi == True)
                .where(AIAgent.kimlik.in_(needed_ids))
            ).all())
        agents_by_id = {a.kimlik: a for a in agents_list}
    except Exception:
        agents_by_id = {}

    def _to_dict(agent) -> dict:
        return {
            "id": agent.kimlik,
            "kimlik": agent.kimlik,
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
            "error_message": agent.error_message,
            "node_config": agent.node_config or {},
            "model_locked": getattr(agent, "model_locked", False) or False,
            "aktif_mi": agent.aktif_mi,
        }

    out: dict[str, dict] = {}
    for role, agent_id in role_to_id.items():
        agent = agents_by_id.get(agent_id)
        if agent:
            out[role] = _to_dict(agent)
        else:
            # Fallback: sys_node_* bulunamadıysa bireysel sorgu dene
            try:
                a = get_assigned_agent(role)
                if a:
                    out[role] = a
            except Exception:
                pass
    return out


def is_agent_graph_enabled() -> bool:
    """
    Feature flag — `agent_graph_enabled` system setting'i. Default: True.
    LangGraph artık birincil yol; klasik AIService akışı sadece acil rollback
    için kapalıya çekildiğinde aktif olur. DB erişilemezse True (graph birincil).
    """
    try:
        val = get_system_settings().get("agent_graph_enabled")
        if val is None:
            return True  # ayar henüz yazılmamışsa graph default
        return str(val).strip().lower() in ("1", "true", "yes", "on")
    except Exception:
        return True


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


# -- log_agent_execution -------------------------------------------------------
def log_agent_execution(
    ajan_rolu: str,
    *,
    oturum_kimlik: Optional[str] = None,
    kullanici_mesaji: Optional[str] = None,
    intent: Optional[str] = None,
    intent_confidence: Optional[float] = None,
    complexity: Optional[str] = None,
    brief: Optional[str] = None,
    cikti_ozet: Optional[str] = None,
    basarili_mi: bool = True,
    hata_mesaji: Optional[str] = None,
    sure_ms: Optional[int] = None,
    prompt_token: Optional[int] = None,
    completion_token: Optional[int] = None,
    critic_onayladi_mi: Optional[bool] = None,
    revision_sayisi: Optional[int] = None,
) -> None:
    """Her graph node'unun çalışma kaydını ajan_calisma_siralari tablosuna yazar."""
    try:
        from database.sql.models import AjanCalismaSirasi
        with get_session() as db:
            kayit = AjanCalismaSirasi(
                ajan_rolu=ajan_rolu,
                oturum_kimlik=oturum_kimlik,
                kullanici_mesaji=(kullanici_mesaji or "")[:500] if kullanici_mesaji else None,
                intent=intent,
                intent_confidence=intent_confidence,
                complexity=complexity,
                brief=brief,
                cikti_ozet=(cikti_ozet or "")[:300] if cikti_ozet else None,
                basarili_mi=basarili_mi,
                hata_mesaji=hata_mesaji,
                sure_ms=sure_ms,
                prompt_token=prompt_token,
                completion_token=completion_token,
                critic_onayladi_mi=critic_onayladi_mi,
                revision_sayisi=revision_sayisi,
                olusturulma_tarihi=_utcnow(),
            )
            db.add(kayit)
            db.commit()
    except Exception as e:
        import logging
        logging.getLogger("db_bridge").warning("[log_agent_execution] hata: %s", e)


# -- get_agent_execution_logs -------------------------------------------------
def get_agent_execution_logs(
    ajan_rolu: Optional[str] = None,
    limit: int = 50,
) -> list[dict]:
    """AgentConfigPanel için çalışma geçmişini döner."""
    from database.sql.models import AjanCalismaSirasi
    from sqlalchemy import select, desc
    with get_session() as db:
        q = select(AjanCalismaSirasi)
        if ajan_rolu:
            q = q.where(AjanCalismaSirasi.ajan_rolu == ajan_rolu)
        q = q.order_by(desc(AjanCalismaSirasi.olusturulma_tarihi)).limit(limit)
        rows = db.scalars(q).all()
        return [
            {
                "kimlik": r.kimlik,
                "ajan_rolu": r.ajan_rolu,
                "oturum_kimlik": r.oturum_kimlik,
                "kullanici_mesaji": r.kullanici_mesaji,
                "intent": r.intent,
                "intent_confidence": r.intent_confidence,
                "complexity": r.complexity,
                "brief": r.brief,
                "cikti_ozet": r.cikti_ozet,
                "basarili_mi": r.basarili_mi,
                "hata_mesaji": r.hata_mesaji,
                "sure_ms": r.sure_ms,
                "prompt_token": r.prompt_token,
                "completion_token": r.completion_token,
                "critic_onayladi_mi": r.critic_onayladi_mi,
                "revision_sayisi": r.revision_sayisi,
                "olusturulma_tarihi": r.olusturulma_tarihi,
            }
            for r in rows
        ]


# -- get_conversation_traces --------------------------------------------------
def get_conversation_traces(limit: int = 30) -> list[dict]:
    """
    Sohbet bazlı ajan iz raporu.
    Her benzersiz oturum_kimlik için: kullanıcı mesajı + o sohbette çalışan
    tüm ajan adımlarını kronolojik sırayla döner.
    """
    from database.sql.models import AjanCalismaSirasi
    from sqlalchemy import select, desc
    with get_session() as db:
        # Son N konuşmada olan tüm kayıtları çek
        rows = db.scalars(
            select(AjanCalismaSirasi)
            .order_by(desc(AjanCalismaSirasi.olusturulma_tarihi))
            .limit(limit * 20)  # buffer — per session may have many rows
        ).all()

    # Group by session
    sessions: dict = {}
    for r in rows:
        sid = r.oturum_kimlik or "bilinmiyor"
        if sid not in sessions:
            sessions[sid] = {
                "oturum_kimlik": sid,
                "kullanici_mesaji": r.kullanici_mesaji,
                "baslangi_tarihi": r.olusturulma_tarihi,
                "intent": r.intent,
                "complexity": r.complexity,
                "adimlar": [],
            }
        sessions[sid]["adimlar"].append({
            "kimlik": r.kimlik,
            "ajan_rolu": r.ajan_rolu,
            "basarili_mi": r.basarili_mi,
            "sure_ms": r.sure_ms,
            "prompt_token": r.prompt_token,
            "completion_token": r.completion_token,
            "cikti_ozet": r.cikti_ozet,
            "hata_mesaji": r.hata_mesaji,
            "critic_onayladi_mi": r.critic_onayladi_mi,
            "revision_sayisi": r.revision_sayisi,
            "olusturulma_tarihi": r.olusturulma_tarihi,
        })

    # Sort sessions by start time desc, trim to limit
    sorted_sessions = sorted(sessions.values(), key=lambda s: s["baslangi_tarihi"] or "", reverse=True)[:limit]
    # Sort each session's steps chronologically
    for s in sorted_sessions:
        s["adimlar"].sort(key=lambda a: a["olusturulma_tarihi"] or "")

    return sorted_sessions
