"""
database/sql/models.py
──────────────────────────────────────────────────────────────────────
Yılgenci Platformu — Tam ORM Şeması (SQLAlchemy 2.x, PostgreSQL + pgvector)

Mimari Katmanlar:
  1. Kimlik & Yetki         → Kullanici, Rol, KullaniciRol
  2. Sohbet & Hafıza        → SohbetOturumu, SohbetMesaji
  2.5 Ses & Toplantılar     → Toplanti, ToplantiSegmenti, ToplantiOzeti
  3. Belge & Arşiv          → Belge, VektorParcasi (pgvector tabanlı)
  4. Bilgi Grafiği          → BilgiIliskisi (Optimized Indexes)
  5. Yapay Zeka İzleme      → AIModeli, BilgisayarOturumu
  6. Sistem & Güvenlik      → SistemAyarlari
  7. Denetim & İzleme       → DenetimIzleri

Tasarım Kuralları:
  - Tüm PK alanlar UUID string (36 karakter) veya Integer (autoincrement).
  - Tüm tarih alanlar UTC ISO 8601 string olarak saklanır.
  - Yabancı anahtarlar ForeignKey ile tanımlanır; ondelete davranışı belirtilir.
  - İndeksler sorgu performansı için kritik alanlara eklenmiştir.
  - JSON alanlar esnek meta veri için kullanılır.
  - Vektör alanlar pgvector Vector(384) ile saklanır.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from pgvector.sqlalchemy import Vector
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
#    kullanicilar, roller, kullanici_roller
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
# 2.5 TOPLANTILAR & SES KAYITLARI (Eski SQLite Meetings DB Alternatifi)
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
    # Belge durumu
    durum: Mapped[str] = mapped_column(String(32), nullable=False, default="karantina")
    vektorlestirildi_mi: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # İşlem pipeline izleme
    isleme_suresi_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hata_kodu: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Belgede en son ne zaman arama yapıldığı (kullanılmayan belgeleri tespit için)
    son_sorgulama_tarihi: Mapped[str | None] = mapped_column(String(32), nullable=True)
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
    )


class VektorParcasi(Base):
    """
    Bir belgenin pgvector tabanlı semantic parçası (chunk).
    Hem metin içeriği hem de 384 boyutlu vektör embedding'i bu tabloda saklanır.
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
    vektor_verisi: Mapped[list[float] | None] = mapped_column(Vector(384), nullable=True)
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


# ═══════════════════════════════════════════════════════════════════
# 5. YAPAY ZEKA İZLEME KATMANI
#    AIModeli, BilgisayarOturumu
#    (ApiCagrisi/Logs tablosu logs.db üzerine taşınmıştır)
# ═══════════════════════════════════════════════════════════════════


class AIModeli(Base):
    """
    Kullanıcı veya yönetici tarafından eklenen API anahtarları ve model konfigürasyonları.
    Sistemde aktif olarak kullanılabilecek modellerin listesi.
    """
    __tablename__ = "ai_modelleri"

    kimlik: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    ad: Mapped[str] = mapped_column(String(128), nullable=False)
    # Tedarikçi: openai | google | anthropic | ollama
    tedarikci: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # API anahtarı (şifreli saklanmalı — uygulama katmanında)
    api_anahtari: Mapped[str] = mapped_column(String(1024), nullable=False)
    # Model endpoint veya model ID'si
    model_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    aktif_mi: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Ek konfigürasyonlar: {"max_tokens": 4096, "temperature": 0.7}
    yapilandirma: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    olusturulma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)

    __table_args__ = (
        UniqueConstraint("ad", name="uq_ai_modelleri_ad"),
        Index("ix_ai_modelleri_tedarikci", "tedarikci"),
    )


class BilgisayarOturumu(Base):
    """
    Sisteme bağlanan her istemci bilgisayarın oturum kaydı.
    IP, MAC, işletim sistemi ve son etkinlik bilgilerini içerir.
    """
    __tablename__ = "bilgisayar_oturumlari"

    kimlik: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    kullanici_kimlik: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("kullanicilar.kimlik", ondelete="SET NULL"), nullable=True
    )
    ip_adresi: Mapped[str | None] = mapped_column(String(64), nullable=True)
    mac_adresi: Mapped[str | None] = mapped_column(String(32), nullable=True)
    bilgisayar_adi: Mapped[str | None] = mapped_column(String(255), nullable=True)
    isletim_sistemi: Mapped[str | None] = mapped_column(String(128), nullable=True)
    tarayici: Mapped[str | None] = mapped_column(String(256), nullable=True)
    aktif_mi: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    ilk_baglanti_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)
    son_aktivite_tarihi: Mapped[str | None] = mapped_column(String(32), nullable=True)

    # İlişkiler
    kullanici: Mapped["Kullanici | None"] = relationship("Kullanici", back_populates="bilgisayar_oturumlari")

    __table_args__ = (
        Index("ix_bilgisayar_oturumlari_ip_adresi", "ip_adresi"),
        Index("ix_bilgisayar_oturumlari_mac_adresi", "mac_adresi"),
        Index("ix_bilgisayar_oturumlari_son_aktivite", "son_aktivite_tarihi"),
    )


# ═══════════════════════════════════════════════════════════════════
# 6. SİSTEM & DENETİM KATMANI
#    sistem_ayarlari, denetim_izleri
# ═══════════════════════════════════════════════════════════════════

class SistemAyari(Base):
    """
    Uygulama genelindeki anahtar-değer ayar deposu.
    Örnek: varsayilan_model, max_cevap_uzunlugu, vektörizasyon_aktif_mi
    """
    __tablename__ = "sistem_ayarlari"

    kimlik: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    # Ayar anahtarı (benzersiz): 'varsayilan_model', 'max_token'
    anahtar: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    # Değer her zaman JSON formatında saklanır
    deger: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    aciklama: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Hassas ayar mı? (frontend'e gönderilmez)
    hassas_mi: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    olusturulma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)
    guncelleme_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)

    __table_args__ = (
        Index("ix_sistem_ayarlari_anahtar", "anahtar"),
    )


class DenetimIzi(Base):
    """
    Kritik sistem işlemlerinin değiştirilemez denetim kaydı.
    Kim, ne zaman, hangi tabloda, ne yaptı bilgilerini tutar.
    Silme, güncelleme ve izin değişiklikleri burada izlenir.
    """
    __tablename__ = "denetim_izleri"

    kimlik: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    kullanici_kimlik: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("kullanicilar.kimlik", ondelete="SET NULL"), nullable=True
    )
    # İşlem türü: 'olusturma' | 'guncelleme' | 'silme' | 'giris' | 'cikis' | 'erisim_reddedildi'
    islem_turu: Mapped[str] = mapped_column(String(32), nullable=False)
    # Etkilenen tablo adı
    tablo_adi: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # Etkilenen kayıt kimliği
    kayit_kimlik: Mapped[str | None] = mapped_column(String(36), nullable=True)
    # Eski ve yeni değer özeti (hassas alanlar maskelenir)
    eski_deger: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    yeni_deger: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Ağ bilgisi
    ip_adresi: Mapped[str | None] = mapped_column(String(64), nullable=True)
    olusturulma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)

    __table_args__ = (
        Index("ix_denetim_izleri_kullanici_kimlik", "kullanici_kimlik"),
        Index("ix_denetim_izleri_islem_turu", "islem_turu"),
        Index("ix_denetim_izleri_tablo_adi", "tablo_adi"),
        Index("ix_denetim_izleri_olusturulma_tarihi", "olusturulma_tarihi"),
    )


# ═══════════════════════════════════════════════════════════════════
# 7. AI ORCHESTRATOR KATMANI
#    ai_agents
# ═══════════════════════════════════════════════════════════════════

class AIAgent(Base):
    """
    Kullanıcı arayüzünde konfigüre edilen yapay zeka ajanları (Chatbot, Asistan vb.)
    """
    __tablename__ = "ai_agents"

    kimlik: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    # Ajan türü: 'chatbot' | 'worker' vb.
    agent_kind: Mapped[str] = mapped_column(String(32), nullable=False, default="chatbot")
    ad: Mapped[str] = mapped_column(String(128), nullable=False)
    # Ajanın sistem promptu (persona / rol)
    persona: Mapped[str | None] = mapped_column(Text, nullable=True)
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    negative_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Model ve Provider
    provider: Mapped[str] = mapped_column(String(64), nullable=False, default="openai")
    model: Mapped[str] = mapped_column(String(64), nullable=False, default="gpt-4o")
    
    # Parametreler
    temperature: Mapped[float] = mapped_column(Float, nullable=False, default=0.7)
    max_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=2048)
    
    # Seçenekler
    strict_fact_check: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    chat_history_length: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    can_ask_follow_up: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # UI Bilgileri
    aktif_mi: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    avatar_emoji: Mapped[str | None] = mapped_column(String(16), nullable=True)
    widget_color: Mapped[str | None] = mapped_column(String(16), nullable=True)
    
    olusturulma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)
    guncelleme_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)
    
    # Hangi RAG koleksiyonlarına yetkili? JSON array (örn: ["rag_1", "rag_2"])
    allowed_rags: Mapped[list | None] = mapped_column(JSON, nullable=True)

    __table_args__ = (
        Index("ix_ai_agents_ad", "ad"),
        Index("ix_ai_agents_aktif_mi", "aktif_mi"),
    )

# ═══════════════════════════════════════════════════════════════════
# 8. API LOG KATMANI (Eski logs.db → PostgreSQL)
# ═══════════════════════════════════════════════════════════════════

class ApiLogu(Base):
    """
    Her yapay zeka API çağrısının detaylı log kaydı.
    Daha önce ayrı logs.db dosyasında tutulurdu; artık PostgreSQL'de.
    """
    __tablename__ = "api_loglari"

    kimlik: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    oturum_kimlik: Mapped[str | None] = mapped_column(String(36), nullable=True)
    kullanici_kimlik: Mapped[str | None] = mapped_column(String(36), nullable=True)
    tedarikci: Mapped[str | None] = mapped_column(String(64), nullable=True)
    model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    durum: Mapped[str] = mapped_column(String(16), nullable=False, default="ok")
    hata_kodu: Mapped[str | None] = mapped_column(String(64), nullable=True)
    hata_mesaji: Mapped[str | None] = mapped_column(Text, nullable=True)
    istek_token: Mapped[int | None] = mapped_column(Integer, nullable=True)
    yanit_token: Mapped[int | None] = mapped_column(Integer, nullable=True)
    toplam_token: Mapped[int | None] = mapped_column(Integer, nullable=True)
    maliyet_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    sure_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ip_adresi: Mapped[str | None] = mapped_column(String(64), nullable=True)
    mac_adresi: Mapped[str | None] = mapped_column(String(32), nullable=True)
    istek_onizleme: Mapped[str | None] = mapped_column(Text, nullable=True)
    yanit_onizleme: Mapped[str | None] = mapped_column(Text, nullable=True)
    rag_kullanildi_mi: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    rag_dosya_adi: Mapped[str | None] = mapped_column(String(512), nullable=True)
    olusturulma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)

    __table_args__ = (
        Index("ix_api_loglari_durum", "durum"),
        Index("ix_api_loglari_kullanici_kimlik", "kullanici_kimlik"),
        Index("ix_api_loglari_model", "model"),
        Index("ix_api_loglari_oturum_kimlik", "oturum_kimlik"),
        Index("ix_api_loglari_tarih", "olusturulma_tarihi"),
        Index("ix_api_loglari_tedarikci", "tedarikci"),
    )


# ═══════════════════════════════════════════════════════════════════
# GERİYE DÖNÜK UYUMLULUK KISAYOLLARI
# ═══════════════════════════════════════════════════════════════════
User        = Kullanici
ChatSession = SohbetOturumu
ChatMessage = SohbetMesaji
Document    = Belge
Node        = VektorParcasi
Relation    = BilgiIliskisi
UserModel   = AIModeli
Agent       = AIAgent
ApiLog      = ApiLogu
