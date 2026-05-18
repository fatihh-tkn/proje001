"""
database/sql/models_archive.py
──────────────────────────────────────────────────────────────────────
Belge & Arşiv Katmanı  — Belge, VektorParcasi
Bilgi Grafiği Katmanı  — BilgiIliskisi
"""

from __future__ import annotations

from sqlalchemy import Boolean, Float, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import TSVECTOR
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .models_auth import _uuid, _simdi


# ═══════════════════════════════════════════════════════════════════
# 3. BELGE & ARŞİV KATMANI
#    belgeler, vektor_parcalari
# ═══════════════════════════════════════════════════════════════════

class Belge(Base):
    """
    Sisteme yüklenen her dosyanın merkezi kaydı.
    Dosyanın fiziksel içeriği dosya sistemindedir; burada metadata tutulur.

    Durum yelpazesi:
      durum = 'karantina'   → Yüklendi, henüz onaylanmadı
      durum = 'onaylandi'   → Vektörleştirildi, arşive taşındı
      durum = 'reddedildi'  → Onay aşamasından geçemedi
      durum = 'arsivde'     → Sadece arşivde, vektörleştirilmedi

    Klasörleme: meta["klasor_kimlik"] ile ArşivKlasoru'na referans verilir.
    """
    __tablename__ = "belgeler"

    kimlik: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    yukleyen_kimlik: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("kullanicilar.kimlik", ondelete="SET NULL"), nullable=True
    )
    # Orijinal dosya adı (güvenlik temizlemesi yapılmış)
    dosya_adi: Mapped[str] = mapped_column(String(512), nullable=False)
    # Uzantı: pdf | xlsx | docx | bpmn | txt | png | jpg | folder
    dosya_turu: Mapped[str] = mapped_column(String(32), nullable=False)
    dosya_boyutu_bayt: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Fiziksel yol: ./archive_uploads/abc123_dosya.pdf
    depolama_yolu: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    # ChromaDB koleksiyon adı (vektörleştirildiyse)
    vektordb_koleksiyon: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # Toplam parça (chunk) sayısı — vektörleştirme sonrası güncellenir
    parca_sayisi: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Erişim politikası: 'herkese_acik' | 'ik' | 'finans' | 'yonetici' | 'gizli'
    erisim_politikasi: Mapped[str] = mapped_column(String(64), nullable=False, default="herkese_acik")
    # Havuz türü: 'sistem' → admin belgesi (herkese açık), 'kullanici' → kişisel belge
    havuz_turu: Mapped[str] = mapped_column(String(16), nullable=False, default="sistem")
    # Belge durumu
    durum: Mapped[str] = mapped_column(String(32), nullable=False, default="karantina")
    vektorlestirildi_mi: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # İşlem pipeline izleme
    isleme_suresi_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hata_kodu: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Belgede en son ne zaman arama yapıldığı (kullanılmayan belgeleri tespit için)
    son_sorgulama_tarihi: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # Arşiv kategorisi: belgeler | surecler | toplantılar | kisisel | teknik_resim
    kategori: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # Esnek metadata: {"klasor_kimlik": "...", "etiketler": ["muhasebe"], "yazar": "Ahmet"}
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    olusturulma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)
    guncelleme_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)

    # İlişkiler
    yukleyen: Mapped["Kullanici | None"] = relationship("Kullanici", back_populates="belgeler")
    vektor_parcalari: Mapped[list["VektorParcasi"]] = relationship(
        "VektorParcasi", back_populates="belge", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_belgeler_dosya_turu", "dosya_turu"),
        Index("ix_belgeler_durum", "durum"),
        Index("ix_belgeler_erisim_politikasi", "erisim_politikasi"),
        Index("ix_belgeler_vektordb_koleksiyon", "vektordb_koleksiyon"),
        Index("ix_belgeler_yukleyen_kimlik", "yukleyen_kimlik"),
        Index("ix_belgeler_havuz_turu", "havuz_turu"),
        Index("ix_belgeler_kategori", "kategori"),
    )


class VektorParcasi(Base):
    """
    Bir belgenin pgvector tabanlı semantic parçası (chunk).
    Hem metin içeriği hem de 1536 boyutlu vektör embedding'i bu tabloda saklanır.
    Farklı boyutlu modeller (384, 1024, 1536) sıfırla doldurularak normalize edilir.
    RAG sorgularında cosine distance ile bu tablo üzerinden arama yapılır.
    """
    __tablename__ = "vektor_parcalari"

    kimlik: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    belge_kimlik: Mapped[str] = mapped_column(
        String(36), ForeignKey("belgeler.kimlik", ondelete="CASCADE"), nullable=False
    )
    # ChromaDB'deki tekil vektör kimliği
    chromadb_kimlik: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    # Parçanın asıl metin içeriği (LLM'e gönderilir)
    icerik: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Konum imi: PDF → "sayfa=3", BPMN → "gorev=Task_1"
    konum_imi: Mapped[str | None] = mapped_column(String(256), nullable=True)
    # Sayfa/bölüm numarası (PDF için)
    sayfa_no: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Bounding box (görüntü tabanlı parçalar için)
    sinir_kutusu: Mapped[str | None] = mapped_column(String(256), nullable=True)
    # Chunk'ın tam metadata'sı: image_path, page_width, page_height, zoom_factor, type vb.
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Hangi embedding modeliyle vektörleştirildiği (model geçişlerini takip için)
    embedding_modeli: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # Bu parçanın RAG sorgularında kaç kez getirildiği
    tiklanma_sayisi: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    vektor_verisi: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)
    # Full-Text Search tsvector (trigger tarafından otomatik güncellenir)
    arama_vektoru: Mapped[object | None] = mapped_column(TSVECTOR, nullable=True)
    # En son hangi sorguda kullanıldığı
    son_sorgulanma_tarihi: Mapped[str | None] = mapped_column(String(32), nullable=True)
    olusturulma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)

    # İlişkiler
    belge: Mapped["Belge"] = relationship("Belge", back_populates="vektor_parcalari")
    bilgi_iliskileri_kaynak: Mapped[list["BilgiIliskisi"]] = relationship(
        "BilgiIliskisi",
        foreign_keys="BilgiIliskisi.kaynak_parca_kimlik",
        back_populates="kaynak_parca",
        cascade="all, delete-orphan"
    )
    bilgi_iliskileri_hedef: Mapped[list["BilgiIliskisi"]] = relationship(
        "BilgiIliskisi",
        foreign_keys="BilgiIliskisi.hedef_parca_kimlik",
        back_populates="hedef_parca",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_vektor_parcalari_belge_kimlik", "belge_kimlik"),
        Index("ix_vektor_parcalari_chromadb_kimlik", "chromadb_kimlik"),
        Index("ix_vektor_parcalari_sayfa_no", "sayfa_no"),
    )


# ═══════════════════════════════════════════════════════════════════
# 4. BİLGİ GRAFİĞİ KATMANI (RAG İlişki Haritası)
#    bilgi_iliskileri
# ═══════════════════════════════════════════════════════════════════

class BilgiIliskisi(Base):
    """
    Vektör parçaları arasındaki anlamsal bağlantı.
    Bilgi grafiği görselleştirmesinde düğümler arası kenarlardır.

    iliski_turu örnekleri:
      'GORSEL_DETAYI'   → Bir görsel, bir metni açıklar
      'SONRAKI_ADIM'    → BPMN süreç akışı
      'REFERANS_VERIR'  → Belgeler arası atıf
      'BENZER_ICERIK'   → Semantik yakınlık (otomatik)
    """
    __tablename__ = "bilgi_iliskileri"

    kimlik: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kaynak_parca_kimlik: Mapped[int] = mapped_column(
        Integer, ForeignKey("vektor_parcalari.kimlik", ondelete="CASCADE"), nullable=False
    )
    hedef_parca_kimlik: Mapped[int] = mapped_column(
        Integer, ForeignKey("vektor_parcalari.kimlik", ondelete="CASCADE"), nullable=False
    )
    # İlişki tipi
    iliski_turu: Mapped[str] = mapped_column(String(64), nullable=False)
    # Benzerlik skoru (0.0–1.0), mesafe veya güven değeri
    agirlik: Mapped[float | None] = mapped_column(Float, nullable=True)
    # 'otomatik' | 'manuel'
    kaynak: Mapped[str] = mapped_column(String(16), nullable=False, default="otomatik")
    olusturulma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)

    # İlişkiler
    kaynak_parca: Mapped["VektorParcasi"] = relationship(
        "VektorParcasi", foreign_keys=[kaynak_parca_kimlik], back_populates="bilgi_iliskileri_kaynak"
    )
    hedef_parca: Mapped["VektorParcasi"] = relationship(
        "VektorParcasi", foreign_keys=[hedef_parca_kimlik], back_populates="bilgi_iliskileri_hedef"
    )

    __table_args__ = (
        Index("ix_bilgi_iliskileri_kaynak", "kaynak_parca_kimlik"),
        Index("ix_bilgi_iliskileri_hedef", "hedef_parca_kimlik"),
        Index("ix_bilgi_iliskileri_turu", "iliski_turu"),
        # BİLEŞİK İNDEKSLER: Graf gezintisini ve tür bazlı filtrelemeyi hızlandırır
        Index("ix_bilgi_iliskileri_kaynak_turu", "kaynak_parca_kimlik", "iliski_turu"),
        Index("ix_bilgi_iliskileri_hedef_turu", "hedef_parca_kimlik", "iliski_turu"),
    )
