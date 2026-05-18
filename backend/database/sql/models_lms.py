"""
database/sql/models_lms.py
──────────────────────────────────────────────────────────────────────
Eğitim Yönetim Sistemi (LMS Katmanı):
  Egitim, EgitimBolumu, KullaniciEgitimProfili, KullaniciEgitimAtama

Kullanıcı Talepleri Katmanı:
  KullaniciTalebi, ZliRapor
"""

from __future__ import annotations

from sqlalchemy import Boolean, Float, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .models_auth import _uuid, _simdi


# ═══════════════════════════════════════════════════════════════════
# 9. EĞİTİM YÖNETİM SİSTEMİ (LMS Katmanı)
#    egitimler, egitim_bolumleri, kullanici_egitim_profilleri, kullanici_egitim_atamalari
# ═══════════════════════════════════════════════════════════════════

class Egitim(Base):
    """
    Yöneticilerin kataloğa eklediği eğitimler.
    EgitimAcmaSlideOver veya Admin Panel üzerinden doldurulur.
    """
    __tablename__ = "egitimler"

    kimlik: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    ad: Mapped[str] = mapped_column(String(256), nullable=False)
    kod: Mapped[str | None] = mapped_column(String(64), nullable=True)
    aciklama: Mapped[str | None] = mapped_column(Text, nullable=True)
    sure_saat: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    gecme_notu: Mapped[int | None] = mapped_column(Integer, nullable=True)
    egitmen: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Kategorizasyon
    tur: Mapped[str] = mapped_column(String(64), nullable=False, default="Zorunlu")
    seviye: Mapped[str] = mapped_column(String(64), nullable=False, default="Başlangıç")
    format: Mapped[str] = mapped_column(String(64), nullable=False, default="Online")

    # Hedef Kitle ve Kapsam (JSON dizileri)
    ilgili_moduller: Mapped[list | None] = mapped_column(JSON, nullable=True)
    hedef_roller: Mapped[list | None] = mapped_column(JSON, nullable=True)
    hedef_departmanlar: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Ayarlar
    sinav_zorunlu: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sertifika_ver: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    tekrar_izni: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    onay_gerekli: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    durum: Mapped[str] = mapped_column(String(32), nullable=False, default="Taslak")  # Taslak | Yayınlandı

    yayin_tarihi: Mapped[str | None] = mapped_column(String(32), nullable=True)
    son_tamamlama_tarihi: Mapped[str | None] = mapped_column(String(32), nullable=True)
    olusturulma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)

    # İlişkiler
    bolumler: Mapped[list["EgitimBolumu"]] = relationship(
        "EgitimBolumu", back_populates="egitim", cascade="all, delete-orphan",
        order_by="EgitimBolumu.sira"
    )
    atamalar: Mapped[list["KullaniciEgitimAtama"]] = relationship(
        "KullaniciEgitimAtama", back_populates="egitim", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_egitimler_durum", "durum"),
        Index("ix_egitimler_tur", "tur"),
    )


class EgitimBolumu(Base):
    """
    Eğitimlerin altındaki video, doküman vb. parçaları.
    """
    __tablename__ = "egitim_bolumleri"

    kimlik: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    egitim_kimlik: Mapped[str] = mapped_column(
        String(36), ForeignKey("egitimler.kimlik", ondelete="CASCADE"), nullable=False
    )
    baslik: Mapped[str] = mapped_column(String(256), nullable=False)
    sure_dk: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sira: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    egitim: Mapped["Egitim"] = relationship("Egitim", back_populates="bolumler")


class KullaniciEgitimProfili(Base):
    """
    Kullanıcının UserVeriGirisi (Bilgi Girişi) ekranından doldurduğu kendi beyanları.
    """
    __tablename__ = "kullanici_egitim_profilleri"

    kimlik: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kullanici_kimlik: Mapped[str] = mapped_column(
        String(36), ForeignKey("kullanicilar.kimlik", ondelete="CASCADE"), nullable=False, unique=True
    )
    ise_baslama_tarihi: Mapped[str | None] = mapped_column(String(32), nullable=True)
    departman: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Kullanıcının bildirdiği modüller (JSON Array: ["FI", "MM"])
    kullanilan_moduller: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Udemy vs. dış eğitimler: [{"name": "", "provider": "", "module": "", ...}]
    dis_egitimler: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Dış sertifikalar: [{"name": "", "issuer": "", "module": "", ...}]
    dis_sertifikalar: Mapped[list | None] = mapped_column(JSON, nullable=True)

    guncelleme_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)


class KullaniciEgitimAtama(Base):
    """
    Sistemdeki bir eğitimin kullanıcıya atanması ve anlık ilerlemesi.
    Kullanıcının 'Eğitimlerim' dashboard'unda listelenecek kısımdır.
    """
    __tablename__ = "kullanici_egitim_atamalari"

    kimlik: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kullanici_kimlik: Mapped[str] = mapped_column(
        String(36), ForeignKey("kullanicilar.kimlik", ondelete="CASCADE"), nullable=False
    )
    egitim_kimlik: Mapped[str] = mapped_column(
        String(36), ForeignKey("egitimler.kimlik", ondelete="CASCADE"), nullable=False
    )

    # Durum: Atandi | Devam Ediyor | Tamamlandi | Suresi Gecmis
    durum: Mapped[str] = mapped_column(String(32), nullable=False, default="Atandi")
    ilerleme_yuzdesi: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    atanma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)
    tamamlama_tarihi: Mapped[str | None] = mapped_column(String(32), nullable=True)
    not_degeri: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Sınav varsa

    egitim: Mapped["Egitim"] = relationship("Egitim", back_populates="atamalar")

    __table_args__ = (
        UniqueConstraint("kullanici_kimlik", "egitim_kimlik", name="uq_kullanici_egitim"),
        Index("ix_kullanici_egitim_atamalari_durum", "durum"),
    )


# ═══════════════════════════════════════════════════════════════════
# 9.5 KULLANICI TALEPLERİ KATMANI
# ═══════════════════════════════════════════════════════════════════

class KullaniciTalebi(Base):
    """
    Kullanıcıların yöneticilere ilettiği talepler (erişim, kota, eğitim, hata, diğer).
    Yönetici durum ve not güncelleyebilir; tarihçe denetim_izleri tablosuna düşer.
    """
    __tablename__ = "kullanici_talepleri"

    kimlik: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    kullanici_kimlik: Mapped[str] = mapped_column(
        String(36), ForeignKey("kullanicilar.kimlik", ondelete="CASCADE"), nullable=False
    )
    baslik: Mapped[str] = mapped_column(String(200), nullable=False)
    mesaj: Mapped[str] = mapped_column(Text, nullable=False)
    # 'erisim' | 'kota' | 'egitim' | 'hata' | 'diger'
    kategori: Mapped[str] = mapped_column(String(32), nullable=False, default="diger")
    # 'dusuk' | 'orta' | 'yuksek'
    oncelik: Mapped[str] = mapped_column(String(16), nullable=False, default="orta")
    # 'incelemede' | 'onaylandi' | 'reddedildi' | 'tamamlandi'
    durum: Mapped[str] = mapped_column(String(16), nullable=False, default="incelemede")
    yonetici_notu: Mapped[str | None] = mapped_column(Text, nullable=True)
    yonetici_kimlik: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("kullanicilar.kimlik", ondelete="SET NULL"), nullable=True
    )
    olusturulma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)
    guncelleme_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)

    __table_args__ = (
        Index("ix_kullanici_talepleri_kullanici_kimlik", "kullanici_kimlik"),
        Index("ix_kullanici_talepleri_durum", "durum"),
        Index("ix_kullanici_talepleri_olusturulma_tarihi", "olusturulma_tarihi"),
    )


class ZliRapor(Base):
    """
    Sistemde yüklü Z'li (Z'tipi ABAP) raporlar. Hızlı aksiyon "Z'li Rapor Sorgusu"
    burada arar; eşleşen rapor yoksa kullanıcı KullaniciTalebi (kategori='zli_rapor')
    olarak yeni rapor talebi açabilir.
    """
    __tablename__ = "zli_raporlar"

    kimlik: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    kod: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)            # ör. ZMM_STOK_LIST
    ad: Mapped[str] = mapped_column(String(200), nullable=False)                          # ör. "Stok Listesi"
    aciklama: Mapped[str] = mapped_column(Text, nullable=False)                           # raporun ne işe yaradığı
    modul: Mapped[str | None] = mapped_column(String(32), nullable=True)                  # MM/PP/SD/FI...
    kullanim_alani: Mapped[str | None] = mapped_column(Text, nullable=True)               # nerede kullanılır
    parametreler: Mapped[dict | None] = mapped_column(JSON, nullable=True)                # input alan listesi
    aktif_mi: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    olusturulma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)
    guncelleme_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)

    __table_args__ = (
        Index("ix_zli_raporlar_kod", "kod"),
        Index("ix_zli_raporlar_modul", "modul"),
        Index("ix_zli_raporlar_aktif", "aktif_mi"),
    )
