"""
api/routes/global_chat.py
──────────────────────────────────────────────────────────────────────────────
Global Sohbet — WebSocket destekli gerçek zamanlı kanal tabanlı chat.

Endpoint'ler:
  GET  /kanallar                  → kanal listesi (ilk açılışta 2 varsayılan üretir)
  POST /kanallar                  → yeni kanal oluştur
  GET  /mesajlar/{kanal_id}       → son N mesaj (sayfalama destekli)
  DEL  /mesajlar/{mesaj_id}       → soft-delete (sadece mesaj sahibi)
  WS   /ws/{kanal_id}             → gerçek zamanlı mesajlaşma

WebSocket protocol (JSON):
  → {"type":"message",  "text":"...", "reply_id":"..."}
  → {"type":"typing",   "is_typing": true|false}
  → {"type":"react",    "message_id":"...", "emoji":"👍"}
  → {"type":"delete",   "message_id":"..."}
  ← {"type":"message",  "message": {...}}
  ← {"type":"message_deleted", "message_id":"..."}
  ← {"type":"reaction_update", "message_id":"...", "reactions":{...}}
  ← {"type":"typing",   "users": [...]}
  ← {"type":"presence", "count": N, "users": [...]}
"""
from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from database.sql.models import GlobalKanal, GlobalMesaj
from database.sql.session import SessionLocal, get_db

logger = logging.getLogger(__name__)
router = APIRouter()


# ── WebSocket Connection Manager ──────────────────────────────────────────────

class _ChannelManager:
    """Her kanal için bağlantı havuzu, presence ve typing yönetimi."""

    def __init__(self) -> None:
        self._channels: dict[str, dict[str, dict]] = {}
        self._typing:   dict[str, dict[str, float]] = {}

    async def connect(self, channel_id: str, uid: str, uname: str, ws: WebSocket) -> None:
        await ws.accept()
        self._channels.setdefault(channel_id, {})[uid] = {"ws": ws, "name": uname}
        await self._push_presence(channel_id)

    def disconnect(self, channel_id: str, uid: str) -> None:
        self._channels.get(channel_id, {}).pop(uid, None)
        if not self._channels.get(channel_id):
            self._channels.pop(channel_id, None)
        self._typing.get(channel_id, {}).pop(uid, None)

    async def broadcast(self, channel_id: str, data: dict) -> None:
        dead: list[str] = []
        for uid, conn in list(self._channels.get(channel_id, {}).items()):
            try:
                await conn["ws"].send_json(data)
            except Exception:
                dead.append(uid)
        for uid in dead:
            self.disconnect(channel_id, uid)

    def online_count(self, channel_id: str) -> int:
        return len(self._channels.get(channel_id, {}))

    def online_users(self, channel_id: str) -> list[str]:
        return [c["name"] for c in self._channels.get(channel_id, {}).values()]

    async def _push_presence(self, channel_id: str) -> None:
        await self.broadcast(channel_id, {
            "type":  "presence",
            "count": self.online_count(channel_id),
            "users": self.online_users(channel_id),
        })

    async def set_typing(self, channel_id: str, uid: str, uname: str, is_typing: bool) -> None:
        slot = self._typing.setdefault(channel_id, {})
        if is_typing:
            slot[uid] = time.monotonic()
        else:
            slot.pop(uid, None)
        now = time.monotonic()
        names = [
            self._channels[channel_id][u]["name"]
            for u, ts in list(slot.items())
            if now - ts < 5 and u in self._channels.get(channel_id, {})
        ]
        await self.broadcast(channel_id, {"type": "typing", "users": names})


_mgr = _ChannelManager()


# ── Yardımcılar ───────────────────────────────────────────────────────────────

def _iso_ms(iso: str) -> int:
    try:
        return int(datetime.fromisoformat(iso).timestamp() * 1000)
    except Exception:
        return 0


def _msg_dict(msg: GlobalMesaj) -> dict:
    reply_preview: dict | None = None
    if msg.yanit:
        r = msg.yanit
        reply_preview = {
            "id":      r.kimlik,
            "author":  r.yazar_adi,
            "text":    r.metin[:120] if not r.silindi else None,
            "deleted": r.silindi,
        }
    return {
        "id":         msg.kimlik,
        "channel_id": msg.kanal_id,
        "author":     msg.yazar_adi,
        "author_id":  msg.yazar_id,
        "text":       msg.metin if not msg.silindi else None,
        "deleted":    msg.silindi,
        "reply_to":   reply_preview,
        "reply_id":   msg.yanit_id,
        "reactions":  msg.reaksiyonlar or {},
        "timestamp":  _iso_ms(msg.olusturulma_tarihi),
    }


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _seed_defaults(db: Session) -> None:
    defaults = [
        ("genel",     "Şirket geneli genel sohbet"),
        ("duyurular", "Önemli duyurular ve güncellemeler"),
    ]
    changed = False
    for ad, aciklama in defaults:
        if not db.query(GlobalKanal).filter(GlobalKanal.ad == ad).first():
            db.add(GlobalKanal(kimlik=str(uuid.uuid4()), ad=ad, aciklama=aciklama))
            changed = True
    if changed:
        db.commit()


# ── REST Endpoints ────────────────────────────────────────────────────────────

@router.get("/kanallar")
def list_channels(db: Session = Depends(get_db)):
    _seed_defaults(db)
    rows = db.query(GlobalKanal).order_by(GlobalKanal.olusturulma_tarihi).all()
    return [{"id": r.kimlik, "name": r.ad, "description": r.aciklama} for r in rows]


@router.post("/kanallar")
def create_channel(body: dict = Body(...), db: Session = Depends(get_db)):
    ad = (body.get("name") or "").strip().lower().replace(" ", "-")[:32]
    if not ad:
        raise HTTPException(400, "Kanal adı boş olamaz.")
    if db.query(GlobalKanal).filter(GlobalKanal.ad == ad).first():
        raise HTTPException(409, "Bu isimde kanal zaten var.")
    ch = GlobalKanal(kimlik=str(uuid.uuid4()), ad=ad, aciklama=body.get("description") or None)
    db.add(ch)
    db.commit()
    return {"id": ch.kimlik, "name": ch.ad, "description": ch.aciklama}


@router.get("/mesajlar/{kanal_id}")
def get_messages(
    kanal_id: str,
    limit: int = Query(80, le=200),
    before: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(GlobalMesaj).filter(GlobalMesaj.kanal_id == kanal_id)
    if before:
        q = q.filter(GlobalMesaj.olusturulma_tarihi < before)
    msgs = q.order_by(GlobalMesaj.olusturulma_tarihi.desc()).limit(limit).all()
    msgs.reverse()
    for m in msgs:
        if m.yanit_id:
            _ = m.yanit  # eager-load
    return [_msg_dict(m) for m in msgs]


@router.delete("/mesajlar/{mesaj_id}")
def delete_message(mesaj_id: str, body: dict = Body({}), db: Session = Depends(get_db)):
    msg = db.query(GlobalMesaj).filter(GlobalMesaj.kimlik == mesaj_id).first()
    if not msg:
        raise HTTPException(404, "Mesaj bulunamadı.")
    uid = body.get("user_id")
    if uid and msg.yazar_id and msg.yazar_id != uid:
        raise HTTPException(403, "Bu mesajı silemezsiniz.")
    msg.silindi = True
    db.commit()
    return {"ok": True}


# ── WebSocket Endpoint ────────────────────────────────────────────────────────

@router.websocket("/ws/{kanal_id}")
async def ws_channel(
    websocket: WebSocket,
    kanal_id:  str,
    user_id:   str = Query(""),
    user_name: str = Query("Kullanıcı"),
):
    db: Session = SessionLocal()
    eff_uid = user_id or str(uuid.uuid4())
    connected = False

    try:
        kanal = db.query(GlobalKanal).filter(GlobalKanal.kimlik == kanal_id).first()
        if not kanal:
            await websocket.close(code=4004)
            return

        await _mgr.connect(kanal_id, eff_uid, user_name, websocket)
        connected = True

        while True:
            data = await websocket.receive_json()
            t = data.get("type")

            if t == "message":
                text = (data.get("text") or "").strip()
                if not text:
                    continue
                reply_id = data.get("reply_id") or None

                yanit: GlobalMesaj | None = None
                if reply_id:
                    yanit = db.query(GlobalMesaj).filter(GlobalMesaj.kimlik == reply_id).first()

                msg = GlobalMesaj(
                    kimlik=str(uuid.uuid4()),
                    kanal_id=kanal_id,
                    yazar_id=user_id or None,
                    yazar_adi=user_name,
                    metin=text,
                    yanit_id=reply_id,
                )
                db.add(msg)
                db.commit()
                db.refresh(msg)
                msg.yanit = yanit

                await _mgr.broadcast(kanal_id, {"type": "message", "message": _msg_dict(msg)})
                await _mgr.set_typing(kanal_id, eff_uid, user_name, False)

            elif t == "typing":
                await _mgr.set_typing(kanal_id, eff_uid, user_name, bool(data.get("is_typing")))

            elif t == "react":
                msg_id = data.get("message_id", "")
                emoji  = data.get("emoji", "")
                if msg_id and emoji:
                    msg = db.query(GlobalMesaj).filter(GlobalMesaj.kimlik == msg_id).first()
                    if msg:
                        rxn = dict(msg.reaksiyonlar or {})
                        users: list[str] = list(rxn.get(emoji, []))
                        if eff_uid in users:
                            users.remove(eff_uid)
                        else:
                            users.append(eff_uid)
                        if users:
                            rxn[emoji] = users
                        else:
                            rxn.pop(emoji, None)
                        msg.reaksiyonlar = rxn
                        db.commit()
                        await _mgr.broadcast(kanal_id, {
                            "type":       "reaction_update",
                            "message_id": msg_id,
                            "reactions":  rxn,
                        })

            elif t == "delete":
                msg_id = data.get("message_id", "")
                if msg_id:
                    msg = db.query(GlobalMesaj).filter(GlobalMesaj.kimlik == msg_id).first()
                    if msg and (not msg.yazar_id or msg.yazar_id == user_id):
                        msg.silindi = True
                        db.commit()
                        await _mgr.broadcast(kanal_id, {
                            "type":       "message_deleted",
                            "message_id": msg_id,
                        })

    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("ws_channel beklenmeyen hata — kanal=%s uid=%s", kanal_id, eff_uid)
    finally:
        if connected:
            _mgr.disconnect(kanal_id, eff_uid)
            await _mgr._push_presence(kanal_id)
        db.close()
