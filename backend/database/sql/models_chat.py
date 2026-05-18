"""
database/sql/models_chat.py
──────────────────────────────────────────────────────────────────────
Sohbet & Hafıza Katmanı — SohbetOturumu, SohbetMesaji
Toplantılar Katmanı    — Toplanti, ToplantiSegmenti, ToplantiOzeti
Global Sohbet Katmanı  — GlobalKanal, GlobalMesaj
"""

from __future__ import annotations

from sqlalchemy import Boolean, Float, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .models_auth import _uuid, _simdi


# ═══════════════════════════════════════════════════════════════════
# 2. SOHBET & HAFIZA KATMANI
#    sohbet_oturumlari, sohbet_mesajlari
# ═══════════════════════════════════════════════════════════════════

class SohbetOturumu(Base):
    """
    Tek bir kullanıcıya ait sohbet oturumu.
    Birden fazla SohbetMesaji içerir.
    RAG ile sorgulanan belge koleksiyonu oturuma bağlanır.
    """
    __tablename__ = "sohbet_oturumlari"

    kimlik: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    kullanici_kimlik: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("kullanicilar.kimlik", ondelete="SET NULL"), nullable=True
    )
    baslik: Mapped[str | None] = mapped_column(String(256), nullable=True)
    # Bu oturumda kullanılan son AI modeli
    kullanilan_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # Oturumun bağlı olduğu pgvector koleksiyonu / RAG belge filtresi
    koleksiyon_adi: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # Oturumun bağlı olduğu açık belge (dosya adı)
    aktif_dosya: Mapped[str | None] = mapped_column(String(512), nullable=True)
    mesaj_sayisi: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Toplam token ve maliyet özetleri
    toplam_token: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    toplam_maliyet_usd: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    olusturulma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)
    guncelleme_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)

    # İlişkiler
    kullanici: Mapped["Kullanici | None"] = relationship("Kullanici", back_populates="sohbet_oturumlari")
    mesajlar: Mapped[list["SohbetMesaji"]] = relationship(
        "SohbetMesaji", back_populates="oturum", cascade="all, delete-orphan",
        order_by="SohbetMesaji.olusturulma_tarihi"
    )

    __table_args__ = (
        Index("ix_sohbet_oturumlari_kullanici_kimlik", "kullanici_kimlik"),
        Index("ix_sohbet_oturumlari_guncelleme_tarihi", "guncelleme_tarihi"),
    )


class SohbetMesaji(Base):
    """
    Sohbet oturumundaki her bir mesaj satırı.
    rol: 'kullanici' | 'asistan' | 'sistem'
    RAG kullanıldıysa hangi vektör parçalarından yararlanıldığı rag_kaynaklar'da tutulur.
    """
    __tablename__ = "sohbet_mesajlari"

    kimlik: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    oturum_kimlik: Mapped[str] = mapped_column(
        String(36), ForeignKey("sohbet_oturumlari.kimlik", ondelete="CASCADE"), nullable=False
    )
    # 'kullanici' | 'asistan' | 'sistem'
    rol: Mapped[str] = mapped_column(String(16), nullable=False)
    icerik: Mapped[str] = mapped_column(Text, nullable=False)
    # Yanıt üretiminde kullanılan model
    model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # Token sayıları
    istek_token: Mapped[int | None] = mapped_column(Integer, nullable=True)
    yanit_token: Mapped[int | None] = mapped_column(Integer, nullable=True)
    toplam_token: Mapped[int | None] = mapped_column(Integer, nullable=True)
    maliyet_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Yanıt süresi (milisaniye)
    sure_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # RAG kaynakları: [{"parca_kimlik": "...", "belge_kimlik": "...", "skor": 0.92}]
    rag_kaynaklar: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # UI yönlendirme aksiyonu (dosya aç, sayfaya git vb.)
    ui_aksiyonu: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Kullanıcı geri bildirimi: -1 (hatalı), 0 (nötr), 1 (faydalı)
    geri_bildirim: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Kullanıcının yanıtı neden hatalı bulduğuna dair serbest metin notu
    duzeltme_notu: Mapped[str | None] = mapped_column(Text, nullable=True)
    olusturulma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)

    # İlişkiler
    oturum: Mapped["SohbetOturumu"] = relationship("SohbetOturumu", back_populates="mesajlar")

    __table_args__ = (
        Index("ix_sohbet_mesajlari_oturum_kimlik", "oturum_kimlik"),
        Index("ix_sohbet_mesajlari_rol", "rol"),
    )


# ═══════════════════════════════════════════════════════════════════
# 2.5 TOPLANTILAR & SES KAYITLARI
# ═══════════════════════════════════════════════════════════════════

class Toplanti(Base):
    __tablename__ = "toplantilar"
    kimlik: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    baslik: Mapped[str] = mapped_column(String(256), nullable=False)
    dosya_adi: Mapped[str] = mapped_column(String(512), nullable=False)
    ses_yolu: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    sure_saniye: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    durum: Mapped[str] = mapped_column(String(32), nullable=False, default="processing")
    olusturulma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)


class ToplantiSegmenti(Base):
    __tablename__ = "toplanti_segmentleri"
    kimlik: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    toplanti_kimlik: Mapped[int] = mapped_column(Integer, ForeignKey("toplantilar.kimlik", ondelete="CASCADE"), nullable=False)
    konusmaci: Mapped[str] = mapped_column(String(64), nullable=False, default="Konuşmacı")
    baslangic_ms: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    bitis_ms: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    metin: Mapped[str] = mapped_column(Text, nullable=False)
    olusturulma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)


class ToplantiOzeti(Base):
    __tablename__ = "toplanti_ozetleri"
    kimlik: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    toplanti_kimlik: Mapped[int] = mapped_column(Integer, ForeignKey("toplantilar.kimlik", ondelete="CASCADE"), nullable=False)
    ozet: Mapped[str | None] = mapped_column(Text, nullable=True)
    aksiyon_maddeleri: Mapped[list | None] = mapped_column(JSON, nullable=True)
    anahtar_kelimeler: Mapped[list | None] = mapped_column(JSON, nullable=True)
    olusturulma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)


# ═══════════════════════════════════════════════════════════════════
# 12. GLOBAL SOHBET KATMANI
#     global_kanallar, global_mesajlar
# ═══════════════════════════════════════════════════════════════════

class GlobalKanal(Base):
    """Kullanıcıların gerçek zamanlı mesajlaştığı sohbet kanalı."""
    __tablename__ = "global_kanallar"

    kimlik:             Mapped[str]           = mapped_column(String(36), primary_key=True, default=_uuid)
    ad:                 Mapped[str]           = mapped_column(String(64), nullable=False, unique=True)
    aciklama:           Mapped[str | None]    = mapped_column(String(256), nullable=True)
    olusturulma_tarihi: Mapped[str]           = mapped_column(String(32), nullable=False, default=_simdi)

    mesajlar: Mapped[list["GlobalMesaj"]] = relationship(
        "GlobalMesaj", back_populates="kanal",
        foreign_keys="[GlobalMesaj.kanal_id]",
        cascade="all, delete-orphan",
    )

    __table_args__ = (Index("ix_global_kanallar_ad", "ad"),)


class GlobalMesaj(Base):
    """Bir global sohbet kanalındaki tek mesaj."""
    __tablename__ = "global_mesajlar"

    kimlik:             Mapped[str]           = mapped_column(String(36), primary_key=True, default=_uuid)
    kanal_id:           Mapped[str]           = mapped_column(
        String(36), ForeignKey("global_kanallar.kimlik", ondelete="CASCADE"), nullable=False
    )
    yazar_id:           Mapped[str | None]    = mapped_column(
        String(36), ForeignKey("kullanicilar.kimlik", ondelete="SET NULL"), nullable=True
    )
    yazar_adi:          Mapped[str]           = mapped_column(String(128), nullable=False)
    metin:              Mapped[str]           = mapped_column(Text, nullable=False)
    yanit_id:           Mapped[str | None]    = mapped_column(
        String(36), ForeignKey("global_mesajlar.kimlik", ondelete="SET NULL"), nullable=True
    )
    reaksiyonlar:       Mapped[dict | None]   = mapped_column(JSON, nullable=True)
    silindi:            Mapped[bool]          = mapped_column(Boolean, nullable=False, default=False)
    olusturulma_tarihi: Mapped[str]           = mapped_column(String(32), nullable=False, default=_simdi)

    kanal:  Mapped["GlobalKanal"]              = relationship("GlobalKanal", back_populates="mesajlar", foreign_keys="[GlobalMesaj.kanal_id]")
    yazar:  Mapped["Kullanici | None"]         = relationship("Kullanici", foreign_keys="[GlobalMesaj.yazar_id]")
    yanit:  Mapped["GlobalMesaj | None"]       = relationship(
        "GlobalMesaj",
        foreign_keys="[GlobalMesaj.yanit_id]",
        primaryjoin="GlobalMesaj.yanit_id == GlobalMesaj.kimlik",
        remote_side="GlobalMesaj.kimlik",
        uselist=False,
    )

    __table_args__ = (
        Index("ix_global_mesajlar_kanal_id", "kanal_id"),
        Index("ix_global_mesajlar_tarih",    "olusturulma_tarihi"),
    )
