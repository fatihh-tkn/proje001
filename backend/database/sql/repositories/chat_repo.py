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
        stmt = (
            select(SohbetOturumu)
            .order_by(desc(SohbetOturumu.guncelleme_tarihi))
            .limit(limit)
        )
        if user_id:
            stmt = stmt.where(SohbetOturumu.kullanici_kimlik == user_id)
        return list(self.db.scalars(stmt).all())

    def update_session_title(
        self, session_id: str, title: str
    ) -> Optional[SohbetOturumu]:
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

    def get_messages_batch(
        self, session_ids: list[str], limit_per_session: int = 200
    ) -> list[SohbetMesaji]:
        from sqlalchemy import func

        # We need a subquery to assign a row number partitioned by session_id
        # Then we select only rows where row_number <= limit_per_session

        subq = (
            select(
                SohbetMesaji,
                func.row_number()
                .over(
                    partition_by=SohbetMesaji.oturum_kimlik,
                    order_by=SohbetMesaji.olusturulma_tarihi,
                )
                .label("rn"),
            )
            .where(SohbetMesaji.oturum_kimlik.in_(session_ids))
            .subquery()
        )

        # We must explicitly alias to SohbetMesaji to return instances, OR we can just fetch all and limit in python if count is small, but memory is a concern.
        # However, SQLite doesn't support ROW_NUMBER in all old versions, but modern ones do. Let's assume it does.
        # Actually, simpler and safer across dialects: if the N is bounded (e.g. 50 sessions), running 50 queries is bad.
        # But wait, wait... we don't have to use ROW_NUMBER. We can fetch all messages for these sessions, but what if there are 10,000 messages?
        # A simpler way in python: run a single query fetching ALL messages for the session IDs, BUT wait, the reviewer specifically blocked fetching ALL messages into memory!

        # Let's write a safe ROW_NUMBER query.
        from sqlalchemy.orm import aliased

        stmt = (
            select(SohbetMesaji)
            .join(subq, SohbetMesaji.kimlik == subq.c.kimlik)
            .where(subq.c.rn <= limit_per_session)
            .order_by(SohbetMesaji.oturum_kimlik, SohbetMesaji.olusturulma_tarihi)
        )
        return list(self.db.scalars(stmt).all())
