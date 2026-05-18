"""
settings_user.py — Kullanıcı/oturum yönetimi ve sohbet UX endpoint'leri.

Kapsam:
  - Konuşma oturumu listeleme, silme, dışa aktarma (/sessions)
  - Hazır cevaplar (chitchat bypass) (/canned-responses)
"""

from fastapi import APIRouter, HTTPException

router = APIRouter()


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
        _log = __import__("logging").getLogger("routes.settings_user")
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
        _log = __import__("logging").getLogger("routes.settings_user")
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


# ── Hazır Cevaplar (SistemAyari: anahtar = 'hazir_cevaplar') ─────────────────
# Veri formatı: [{"id": str, "triggers": [str], "response": str, "active": bool}]

_DEFAULT_CANNED = [
    {"id": "builtin_1", "triggers": ["selam", "merhaba", "mrb", "slm", "hey", "hi", "hello", "günaydın", "iyi günler", "iyi akşamlar", "iyi geceler"], "response": "Merhaba! Nasıl yardımcı olabilirim?", "active": True},
    {"id": "builtin_2", "triggers": ["teşekkürler", "teşekkür ederim", "teşekkür", "sağol", "sağ ol", "eyvallah"], "response": "Rica ederim! Başka bir konuda yardımcı olabilir miyim?", "active": True},
    {"id": "builtin_3", "triggers": ["görüşürüz", "hoşçakal", "bay", "bb", "güle güle"], "response": "Güle güle! İyi çalışmalar.", "active": True},
    {"id": "builtin_4", "triggers": ["naber", "nbr", "nasılsın", "nslsn", "ne haber", "naptın"], "response": "İyiyim, teşekkürler! Nasıl yardımcı olabilirim?", "active": True},
    {"id": "builtin_5", "triggers": ["tamam", "ok", "peki", "oldu", "anladım", "tamamdır", "okey"], "response": "Anlaşıldı! Başka yardımcı olabileceğim bir konu var mı?", "active": True},
]


@router.get("/canned-responses")
def get_canned_responses():
    """Hazır cevap listesini döner; DB'de yoksa varsayılanları döner."""
    from database.sql.session import get_session
    from database.sql.models import SistemAyari
    from sqlalchemy import select

    with get_session() as db:
        row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == "hazir_cevaplar"))
        data = row.deger if row and isinstance(row.deger, list) else None

    return {"items": data if data is not None else _DEFAULT_CANNED}


@router.post("/canned-responses")
def save_canned_responses(body: dict):
    """Hazır cevap listesini SistemAyari tablosuna kaydeder."""
    from database.sql.session import get_session
    from database.sql.models import SistemAyari
    from sqlalchemy import select
    import datetime

    items = body.get("items")
    if not isinstance(items, list):
        raise HTTPException(status_code=422, detail="'items' listesi gerekli")

    # Basit doğrulama
    for item in items:
        if not isinstance(item.get("triggers"), list) or not item.get("response"):
            raise HTTPException(status_code=422, detail="Her kayıt triggers[] ve response içermeli")

    now = datetime.datetime.utcnow().isoformat()
    with get_session() as db:
        row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == "hazir_cevaplar"))
        if row:
            row.deger = items
            row.guncelleme_tarihi = now
        else:
            db.add(SistemAyari(
                anahtar="hazir_cevaplar",
                deger=items,
                aciklama="Sohbet hazır cevap listesi (chitchat bypass)",
                hassas_mi=False,
                olusturulma_tarihi=now,
                guncelleme_tarihi=now,
            ))
        db.commit()

    # Supervisor + settings cache'ini sıfırla
    try:
        from services.agent_graph.nodes.supervisor import invalidate_canned_cache
        invalidate_canned_cache()
    except Exception:
        pass
    try:
        from core.db_bridge import invalidate_settings_cache
        invalidate_settings_cache()
    except Exception:
        pass

    return {"ok": True}
