"""
database/sql/models_auth.py
──────────────────────────────────────────────────────────────────────
Kimlik & Yetki Katmanı — Kullanici
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Float, ForeignKey, Index, Integer, String, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


# ── Yardımcı Fonksiyonlar ─────────────────────────────────────────────────────
def _uuid() -> str:
    """Benzersiz UUID4 string. Tüm PK alanlarında kullanılır."""
    return str(uuid.uuid4())


def _simdi() -> str:
    """ISO 8601 UTC zaman damgası. PostgreSQL TIMESTAMP uyumlu."""
    return datetime.now(timezone.utc).isoformat()


# ═══════════════════════════════════════════════════════════════════
# 1. KİMLİK & YETKİ KATMANI
#    kullanicilar
# ═══════════════════════════════════════════════════════════════════


class Kullanici(Base):
    """
    Sisteme kayıtlı kullanıcı.
    Şifre ASLA düz metin saklanmaz; bcrypt karma tutulur.
    Ek bilgiler (departman, pozisyon, avatar_url) meta alanında saklanır.
    """
    __tablename__ = "kullanicilar"

    kimlik: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    eposta: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    tam_ad: Mapped[str] = mapped_column(String(128), nullable=False)
    # bcrypt ile üretilmiş hash — asla plain text değil
    sifre_karma: Mapped[str | None] = mapped_column(String(128), nullable=True)
    aktif_mi: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    super_kullanici_mi: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Kullanıcı profil & ek bilgiler (departman, pozisyon, avatar vb.)
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    olusturulma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)
    son_giris_tarihi: Mapped[str | None] = mapped_column(String(32), nullable=True)

    # Kullanıcı RAG havuzu kotaları (NULL = sınırsız)
    dosya_limiti: Mapped[int | None] = mapped_column(Integer, nullable=True)
    depolama_limiti_mb: Mapped[float | None] = mapped_column(Float, nullable=True)

    # İlişkiler
    sohbet_oturumlari: Mapped[list["SohbetOturumu"]] = relationship(
        "SohbetOturumu", back_populates="kullanici"
    )
    belgeler: Mapped[list["Belge"]] = relationship(
        "Belge", back_populates="yukleyen"
    )
    bilgisayar_oturumlari: Mapped[list["BilgisayarOturumu"]] = relationship(
        "BilgisayarOturumu", back_populates="kullanici"
    )

    __table_args__ = (
        Index("ix_kullanicilar_eposta", "eposta"),
    )
