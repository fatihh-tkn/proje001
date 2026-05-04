from fastapi import APIRouter, HTTPException
from typing import Optional

router = APIRouter()


# ── RAG Kalibrasyon (SistemAyari tablosu) ────────────────────────────────────

RAG_KEYS = [
    {"key": "GENERAL_RAG_TOP_K",                   "label": "Genel RAG Top-K",              "type": "int",   "default": 10,   "min": 1,  "max": 50,  "desc": "Semantik aramada kaç sonuç getirileceği"},
    {"key": "FILE_MODE_MAX_CHUNKS",                 "label": "Dosya Modu Maks. Chunk",       "type": "int",   "default": 40,   "min": 5,  "max": 200, "desc": "Dosya bazlı sorguda maksimum parça sayısı"},
    {"key": "CHUNK_CHAR_LIMIT",                     "label": "Chunk Karakter Limiti",        "type": "int",   "default": 2000, "min": 500,"max": 8000,"desc": "Her parçanın LLM'e gönderilecek karakter limiti"},
    {"key": "MAX_HISTORY_TURNS",                    "label": "Konuşma Hafızası (Tur)",       "type": "int",   "default": 2,    "min": 0,  "max": 20,  "desc": "LLM'e dahil edilecek geçmiş konuşma turu sayısı"},
    {"key": "LLM_PRE_FILTER_DISTANCE_THRESHOLD",   "label": "Mesafe Eşiği (Distance)",      "type": "float", "default": 1.6,  "min": 0.1,"max": 3.0, "desc": "Vektör uzaklığı bu değeri aşan sonuçlar elenir (düşük = daha katı)"},
    {"key": "daily_cost_cap_usd",                  "label": "Günlük Maliyet Tavanı ($)",     "type": "float", "default": 0.0,  "min": 0.0,"max": 10000.0, "desc": "0 = devre dışı. Aşıldığında LLM çağrıları durur, kullanıcıya uyarı döner."},
    {"key": "monthly_cost_cap_usd",                "label": "Aylık Maliyet Tavanı ($)",      "type": "float", "default": 0.0,  "min": 0.0,"max": 100000.0,"desc": "0 = devre dışı. Bu ay için toplam harcamayı sınırlar."},
]


@router.get("/rag")
def get_rag_settings():
    """SistemAyari tablosundan RAG parametrelerini okur."""
    from database.sql.session import get_session
    from database.sql.models import SistemAyari
    from sqlalchemy import select

    with get_session() as db:
        rows = {r.anahtar: r.deger for r in db.scalars(select(SistemAyari)).all()}

    result = []
    for meta in RAG_KEYS:
        raw = rows.get(meta["key"])
        if raw is not None:
            try:
                value = float(raw) if meta["type"] == "float" else int(raw)
            except (TypeError, ValueError):
                value = meta["default"]
        else:
            value = meta["default"]
        result.append({**meta, "value": value})
    return {"settings": result}


@router.post("/rag")
def save_rag_settings(body: dict):
    """RAG parametrelerini SistemAyari tablosuna yazar."""
    from database.sql.session import get_session
    from database.sql.models import SistemAyari
    from sqlalchemy import select
    import datetime

    updates: dict = body.get("settings", {})
    allowed_keys = {m["key"] for m in RAG_KEYS}

    with get_session() as db:
        for key, value in updates.items():
            if key not in allowed_keys:
                continue
            row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == key))
            now = datetime.datetime.utcnow().isoformat()
            if row:
                row.deger = value
                row.guncelleme_tarihi = now
            else:
                db.add(SistemAyari(
                    anahtar=key,
                    deger=value,
                    aciklama=next((m["desc"] for m in RAG_KEYS if m["key"] == key), ""),
                    hassas_mi=False,
                    olusturulma_tarihi=now,
                    guncelleme_tarihi=now,
                ))
        db.commit()
    return {"ok": True}


# ── Feature Flags (Boolean SistemAyari kayıtları) ─────────────────────────────

FEATURE_FLAGS = [
    {
        "key": "agent_graph_enabled",
        "label": "LangGraph Pipeline (multi-agent)",
        "desc": (
            "Sohbet istekleri supervisor → uzman ajanlar (RAG + hata çözümü "
            "+ Z'li rapor + n8n) → birleştirici → revize akışından geçer. "
            "Kapalıyken klasik AIService akışına düşer (acil rollback için)."
        ),
        "default": True,
    },
]


@router.get("/feature-flags")
def get_feature_flags():
    """SistemAyari tablosundan boolean özellik bayraklarını döner."""
    from database.sql.session import get_session
    from database.sql.models import SistemAyari
    from sqlalchemy import select

    with get_session() as db:
        rows = {r.anahtar: r.deger for r in db.scalars(select(SistemAyari)).all()}

    def _to_bool(raw, default):
        if raw is None:
            return bool(default)
        return str(raw).strip().lower() in ("1", "true", "yes", "on")

    flags = []
    for meta in FEATURE_FLAGS:
        flags.append({**meta, "value": _to_bool(rows.get(meta["key"]), meta["default"])})
    return {"flags": flags}


@router.post("/feature-flags")
def save_feature_flags(body: dict):
    """Boolean özellik bayraklarını yazar."""
    from database.sql.session import get_session
    from database.sql.models import SistemAyari
    from sqlalchemy import select
    import datetime

    updates: dict = body.get("flags", {})
    allowed_keys = {m["key"] for m in FEATURE_FLAGS}

    with get_session() as db:
        for key, value in updates.items():
            if key not in allowed_keys:
                continue
            str_val = "true" if bool(value) else "false"
            row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == key))
            now = datetime.datetime.utcnow().isoformat()
            if row:
                row.deger = str_val
                row.guncelleme_tarihi = now
            else:
                db.add(SistemAyari(
                    anahtar=key,
                    deger=str_val,
                    aciklama=next((m["desc"] for m in FEATURE_FLAGS if m["key"] == key), ""),
                    hassas_mi=False,
                    olusturulma_tarihi=now,
                    guncelleme_tarihi=now,
                ))
        db.commit()
    return {"ok": True}


# ── Agent Assignments (Graph rolü → AIAgent eşleştirmesi) ─────────────────────

# UI'da dropdown sırası ve insan-okur etiketler
AGENT_ROLES = [
    {"key": "supervisor",   "label": "Supervisor (intent + plan)",          "default_kind": "chatbot"},
    {"key": "aggregator",   "label": "Aggregator (sentez + RAG)",            "default_kind": "chatbot"},
    {"key": "error_solver", "label": "Hata Çözücü (specialist)",             "default_kind": "chatbot"},
    {"key": "zli_finder",   "label": "Z'li Rapor (specialist)",              "default_kind": "chatbot"},
    {"key": "msg_polish",   "label": "Mesaj Revize (post-process)",          "default_kind": "worker"},
    {"key": "n8n_trigger",  "label": "n8n Tetikleyici (router)",             "default_kind": "router"},
]


@router.get("/agent-assignments")
def get_agent_assignments_route():
    """
    Graph rolleri ↔ atanmış agent_id eşleşmesini döner.
    Mevcut atama yoksa o role default_kind ajanını fallback olarak gösterir.
    """
    from core.db_bridge import get_agent_assignments, get_ai_agent

    saved = get_agent_assignments()
    out = []
    for role in AGENT_ROLES:
        assigned_id = saved.get(role["key"])
        # UI bilgi amaçlı: fallback olarak hangi ajanın çalışacağını da hesapla
        from core.db_bridge import get_assigned_agent
        try:
            effective = get_assigned_agent(role["key"]) or {}
            effective_id = effective.get("id")
        except Exception:
            effective_id = None
        out.append({
            **role,
            "assigned_id": assigned_id,
            "effective_id": effective_id,
        })
    return {"roles": out}


@router.post("/agent-assignments")
def save_agent_assignments_route(body: dict):
    """
    Atamaları toplu günceller. Her role için agent_id veya null kabul edilir.
    null/eksik roller mevcut ataması varsa silinir → fallback'e düşer.
    """
    from core.db_bridge import set_agent_assignments
    incoming = body.get("assignments", {}) or {}
    allowed_roles = {r["key"] for r in AGENT_ROLES}
    cleaned = {}
    for k, v in incoming.items():
        if k not in allowed_roles:
            continue
        if v:  # null / "" / 0 atlanır → o rol fallback'e düşer
            cleaned[k] = str(v)
    set_agent_assignments(cleaned)
    return {"ok": True, "saved": cleaned}


# ── Prompt Şablonları ─────────────────────────────────────────────────────────

PROMPT_DEFAULTS = {
    "general_rag": (
        "Sen çok yetenekli bir asistansın. Aşağıda kullanıcının sistemine yüklenmiş "
        "belgelerden elde edilen ilgili bilgiler yer almaktadır. Bu bilgileri kullanarak "
        "soruyu cevapla. Eğer bilgi bulunmuyorsa kendi genel bilginle yanıt ver.\n\n"
    ),
    "file_qa": (
        "PROFILIN: Sen çok üst düzey, bağımsız düşünebilen bir yapay zeka ve danışmansın.\n"
        "KULLANICI TALEBİ: Sana bir soru soruyor ve arka planda belgenin veritabanı tarama sonuçlarını (gizli bağlam olarak) sağlıyor.\n\n"
        "KATI KURALLAR:\n"
        "1. KESİNLİKLE belgeyi özetleme, 'Belgede şu yazıyor' diye madde madde sayma veya metni kopyala-yapıştır yapma!\n"
        "2. Kullanıcının ne istediğini ANLA ve sanki hiçbir belge yokmuş gibi, DİREKT konuyu anlatan, çözüm sunan, kendi yorumlarını katan bir cevap yaz.\n"
        "3. Gelen veritabanı sonuçlarını sadece 'kendi bilgini zenginleştirmek' ve 'haklı çıkmak' için arka planda kullan.\n"
        "4. Yan sekmede dökümanı referans gösterecek bir ui_action arayüze dönecek, o yüzden ekrana çok uzun metinler yazıp kalabalık yapma.\n"
    ),
    "chat_memory": (
        "=== ESKİ SOHBET GEÇMİŞİ (HATIRLAMAN GEREKENLER) ===\n"
        "Kullanıcının şu anki sorusuyla bağlantılı olarak daha önce konuştuğunuz bazı konuşma kesitleri aşağıdadır:\n"
        "{chat_memory}\n"
        "====================================================\n\n"
    ),
}

PROMPT_META = [
    {"key": "general_rag", "label": "Genel RAG Sistem Promptu",   "desc": "Belge olmadan genel sohbet için kullanılan sistem promptu"},
    {"key": "file_qa",     "label": "Dosya Q&A Sistem Promptu",    "desc": "Belge/dosya sorgularında kullanılan sistem promptu"},
    {"key": "chat_memory", "label": "Konuşma Hafızası Şablonu",    "desc": "Geçmiş sohbet bağlamı eklenirken kullanılan şablon"},
]


@router.get("/prompts")
def get_prompts():
    from database.sql.session import get_session
    from database.sql.models import SistemAyari
    from sqlalchemy import select

    with get_session() as db:
        rows = {r.anahtar: r.deger for r in db.scalars(select(SistemAyari)).all()}

    result = []
    for meta in PROMPT_META:
        db_key = f"prompt_template_{meta['key']}"
        value = rows.get(db_key) or PROMPT_DEFAULTS.get(meta["key"], "")
        result.append({**meta, "value": str(value)})
    return {"prompts": result}


@router.post("/prompts")
def save_prompts(body: dict):
    from database.sql.session import get_session
    from database.sql.models import SistemAyari
    from sqlalchemy import select
    import datetime

    updates: dict = body.get("prompts", {})
    allowed_keys = {m["key"] for m in PROMPT_META}

    with get_session() as db:
        for key, value in updates.items():
            if key not in allowed_keys:
                continue
            db_key = f"prompt_template_{key}"
            row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == db_key))
            now = datetime.datetime.utcnow().isoformat()
            if row:
                row.deger = value
                row.guncelleme_tarihi = now
            else:
                db.add(SistemAyari(
                    anahtar=db_key,
                    deger=value,
                    aciklama=next((m["desc"] for m in PROMPT_META if m["key"] == key), ""),
                    hassas_mi=False,
                    olusturulma_tarihi=now,
                    guncelleme_tarihi=now,
                ))
        db.commit()
    return {"ok": True}


@router.post("/prompts/reset/{key}")
def reset_prompt(key: str):
    """Bir prompt şablonunu varsayılana sıfırlar."""
    if key not in PROMPT_DEFAULTS:
        raise HTTPException(status_code=404, detail="Prompt anahtarı bulunamadı")
    from database.sql.session import get_session
    from database.sql.models import SistemAyari
    from sqlalchemy import select
    import datetime

    db_key = f"prompt_template_{key}"
    with get_session() as db:
        row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == db_key))
        if row:
            row.deger = PROMPT_DEFAULTS[key]
            row.guncelleme_tarihi = datetime.datetime.utcnow().isoformat()
            db.commit()
    return {"ok": True, "value": PROMPT_DEFAULTS[key]}


# ── Session / Konuşma Yöneticisi ─────────────────────────────────────────────

@router.get("/sessions")
def list_sessions(limit: int = 100, search: str = ""):
    from database.sql.session import get_session
    from database.sql.models import SohbetOturumu, SohbetMesaji, ApiLogu
    from sqlalchemy import select, func, desc

    with get_session() as db:
        stmt = select(SohbetOturumu).order_by(desc(SohbetOturumu.olusturulma_tarihi)).limit(limit)
        sessions = db.scalars(stmt).all()
        session_ids = [s.kimlik for s in sessions]

        msg_counts = {}
        last_messages = {}
        token_totals = {}

        if session_ids:
            # 1. Message counts
            mc_rows = db.execute(
                select(SohbetMesaji.oturum_kimlik, func.count(SohbetMesaji.kimlik))
                .where(SohbetMesaji.oturum_kimlik.in_(session_ids))
                .group_by(SohbetMesaji.oturum_kimlik)
            ).all()
            msg_counts = {r[0]: r[1] for r in mc_rows}

            # 2. Token totals
            tok_rows = db.execute(
                select(ApiLogu.oturum_kimlik, func.sum(ApiLogu.toplam_token))
                .where(ApiLogu.oturum_kimlik.in_(session_ids))
                .group_by(ApiLogu.oturum_kimlik)
            ).all()
            token_totals = {r[0]: r[1] or 0 for r in tok_rows}

            # 3. Last messages
            subq = (
                select(SohbetMesaji.oturum_kimlik, func.max(SohbetMesaji.olusturulma_tarihi).label("max_date"))
                .where(SohbetMesaji.oturum_kimlik.in_(session_ids))
                .group_by(SohbetMesaji.oturum_kimlik)
                .subquery()
            )
            lm_rows = db.execute(
                select(SohbetMesaji.oturum_kimlik, SohbetMesaji.icerik)
                .join(subq, (SohbetMesaji.oturum_kimlik == subq.c.oturum_kimlik) & (SohbetMesaji.olusturulma_tarihi == subq.c.max_date))
            ).all()
            # If a session has multiple messages with the same max timestamp, one will overwrite another. That's fine.
            last_messages = {r[0]: r[1] for r in lm_rows}

        result = []
        for s in sessions:
            msg_count = msg_counts.get(s.kimlik, 0)
            last_msg = last_messages.get(s.kimlik, "")
            token_total = token_totals.get(s.kimlik, 0)

            title = s.baslik or s.kimlik
            if search and search.lower() not in title.lower() and search.lower() not in last_msg.lower():
                continue

            result.append({
                "id": s.kimlik,
                "title": title,
                "messageCount": msg_count,
                "lastMessage": last_msg[:120] if last_msg else "",
                "createdAt": s.olusturulma_tarihi,
                "totalTokens": token_total,
            })

    return {"sessions": result, "total": len(result)}


@router.delete("/sessions/{session_id}")
def delete_session_full(session_id: str):
    """Session'ı SQL + vektör hafızasıyla birlikte siler."""
    from database.sql.session import get_session
    from database.sql.models import SohbetOturumu, SohbetMesaji, ApiLogu
    from sqlalchemy import delete as sa_del

    with get_session() as db:
        db.execute(sa_del(ApiLogu).where(ApiLogu.oturum_kimlik == session_id))
        db.execute(sa_del(SohbetMesaji).where(SohbetMesaji.oturum_kimlik == session_id))
        db.execute(sa_del(SohbetOturumu).where(SohbetOturumu.kimlik == session_id))
        db.commit()

    try:
        from database.vector.pgvector_db import vector_db
        col = f"chat_mem_{session_id}".replace("-", "_")
        if col in vector_db.list_collections():
            vector_db.delete_collection(col)
    except Exception as _e:
        _log = __import__("logging").getLogger("routes.settings")
        _log.warning("Session vektör koleksiyonu silinemedi [%s]: %s", session_id, _e)

    return {"ok": True}


@router.delete("/sessions")
def delete_all_sessions():
    """Tüm session'ları ve vektör hafızalarını temizler."""
    from database.sql.session import get_session
    from database.sql.models import SohbetOturumu, SohbetMesaji, ApiLogu
    from sqlalchemy import select, delete as sa_del

    with get_session() as db:
        ids = list(db.scalars(select(SohbetOturumu.kimlik)))
        db.execute(sa_del(SohbetMesaji))
        db.execute(sa_del(ApiLogu).where(ApiLogu.oturum_kimlik.in_(ids)))
        db.execute(sa_del(SohbetOturumu))
        db.commit()

    try:
        from database.vector.pgvector_db import vector_db
        for col in vector_db.list_collections():
            if col.startswith("chat_mem_"):
                vector_db.delete_collection(col)
    except Exception as _e:
        _log = __import__("logging").getLogger("routes.settings")
        _log.warning("Tüm session vektör koleksiyonları temizlenemedi: %s", _e)

    return {"ok": True}


@router.get("/sessions/{session_id}/export")
def export_session(session_id: str):
    """Session'ı JSON olarak dışa aktarır."""
    from database.sql.session import get_session
    from database.sql.models import SohbetOturumu, SohbetMesaji
    from sqlalchemy import select, asc

    with get_session() as db:
        s = db.scalar(select(SohbetOturumu).where(SohbetOturumu.kimlik == session_id))
        if not s:
            raise HTTPException(status_code=404, detail="Session bulunamadı")
        msgs = db.scalars(
            select(SohbetMesaji)
            .where(SohbetMesaji.oturum_kimlik == session_id)
            .order_by(asc(SohbetMesaji.olusturulma_tarihi))
        ).all()

    return {
        "sessionId": s.kimlik,
        "title": s.baslik,
        "createdAt": s.olusturulma_tarihi,
        "messages": [{"role": m.rol, "content": m.icerik, "timestamp": m.olusturulma_tarihi} for m in msgs],
    }
