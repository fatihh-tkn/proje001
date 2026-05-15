"""
database/repositories/chat_repo.py
────────────────────────────────────
ChatSession ve ChatMessage için tüm veri erişim işlemleri.
Route'lar bu sınıfı kullanır; asla direkt SQL veya model sorgusuna dokunmaz.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from database.sql.models import SohbetMesaji, SohbetOturumu

# Backward compatibility
ChatMessage = SohbetMesaji
ChatSession = SohbetOturumu


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


class ChatRepository:

    def __init__(self, db: Session):
        self.db = db

    # ── Session işlemleri ──────────────────────────────────────────

    def create_session(
        self,
        session_id: str,
        user_id: Optional[str] = None,
        title: Optional[str] = None,
        model_used: Optional[str] = None,
    ) -> SohbetOturumu:
        session = SohbetOturumu(
            kimlik=session_id,
            kullanici_kimlik=user_id,
            baslik=title,
            kullanilan_model=model_used,
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_session(self, session_id: str) -> Optional[SohbetOturumu]:
        return self.db.get(SohbetOturumu, session_id)

    def list_sessions(
        self,
        user_id: Optional[str] = None,
        limit: int = 50,
    ) -> list[SohbetOturumu]:
        stmt = select(SohbetOturumu).order_by(desc(SohbetOturumu.guncelleme_tarihi)).limit(limit)
        if user_id:
            stmt = stmt.where(SohbetOturumu.kullanici_kimlik == user_id)
        return list(self.db.scalars(stmt).all())

    def update_session_title(self, session_id: str, title: str) -> Optional[SohbetOturumu]:
        session = self.db.get(SohbetOturumu, session_id)
        if session:
            session.baslik = title
            session.guncelleme_tarihi = _utcnow()
            self.db.commit()
            self.db.refresh(session)
        return session

    def delete_session(self, session_id: str) -> bool:
        session = self.db.get(SohbetOturumu, session_id)
        if session:
            self.db.delete(session)
            self.db.commit()
            return True
        return False

    # ── Message işlemleri ─────────────────────────────────────────

    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        model: Optional[str] = None,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
        total_tokens: Optional[int] = None,
        cost_usd: Optional[float] = None,
        duration_ms: Optional[int] = None,
        rag_sources: Optional[list] = None,
    ) -> SohbetMesaji:
        msg = SohbetMesaji(
            oturum_kimlik=session_id,
            rol=role,
            icerik=content,
            model=model,
            istek_token=prompt_tokens,
            yanit_token=completion_tokens,
            toplam_token=total_tokens,
            maliyet_usd=cost_usd,
            sure_ms=duration_ms,
            rag_kaynaklar=rag_sources,
        )
        self.db.add(msg)

        # Session güncelle
        session = self.db.get(SohbetOturumu, session_id)
        if session:
            session.mesaj_sayisi += 1
            session.guncelleme_tarihi = _utcnow()
            if model:
                session.kullanilan_model = model

        self.db.commit()
        self.db.refresh(msg)
        return msg

    def get_messages(self, session_id: str, limit: int = 200) -> list[SohbetMesaji]:
        stmt = (
            select(SohbetMesaji)
            .where(SohbetMesaji.oturum_kimlik == session_id)
            .order_by(SohbetMesaji.olusturulma_tarihi)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_messages_for_context(
        self, session_id: str, max_turns: int
    ) -> tuple[str | None, list[SohbetMesaji]]:
        """
        LLM context için mesajları döner.
        Son 'ozet' mesajını bulur; varsa özet içeriği + sonrasındaki turları,
        yoksa salt son turları döner. Kaskad özet mantığı: yeni özet her zaman
        önceki özeti de kapsar, bu yüzden sadece en son özet yeterli.
        """
        all_msgs = self.get_messages(session_id, limit=5000)

        last_ozet_idx = None
        for i, msg in enumerate(all_msgs):
            if msg.rol == "ozet":
                last_ozet_idx = i

        if last_ozet_idx is not None:
            ozet_icerik = all_msgs[last_ozet_idx].icerik
            after = [m for m in all_msgs[last_ozet_idx + 1:] if m.rol in ("user", "assistant")]
            return ozet_icerik, after[-(max_turns * 2):]
        else:
            recent = [m for m in all_msgs if m.rol in ("user", "assistant")]
            return None, recent[-(max_turns * 2):]

    def get_compactable_messages(self, session_id: str) -> tuple[str | None, list[SohbetMesaji]]:
        """
        Compact endpoint için: son özetin içeriği + sonrasındaki tüm mesajlar.
        Bunların tamamı yeni özete dahil edilecek.
        """
        all_msgs = self.get_messages(session_id, limit=5000)

        last_ozet_idx = None
        for i, msg in enumerate(all_msgs):
            if msg.rol == "ozet":
                last_ozet_idx = i

        if last_ozet_idx is not None:
            ozet_icerik = all_msgs[last_ozet_idx].icerik
            after = [m for m in all_msgs[last_ozet_idx + 1:] if m.rol in ("user", "assistant")]
            return ozet_icerik, after
        else:
            msgs = [m for m in all_msgs if m.rol in ("user", "assistant")]
            return None, msgs

    def add_compact_summary(self, session_id: str, summary: str) -> SohbetMesaji:
        """Konuşma özetini 'ozet' rolüyle kaydeder."""
        return self.add_message(session_id, role="ozet", content=summary)
