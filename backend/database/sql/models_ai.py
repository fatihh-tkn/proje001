"""
database/sql/models_ai.py
──────────────────────────────────────────────────────────────────────
Yapay Zeka İzleme Katmanı  — AIModeli, BilgisayarOturumu
Sistem & Denetim Katmanı   — SistemAyari, DenetimIzi
AI Orchestrator Katmanı    — AIAgent
API Log Katmanı             — ApiLogu
N8n Önbellek Katmanı       — N8nWorkflowCache
Hata Kayıtları Katmanı     — Hata, KullaniciHataKaydi
Ajan Çalışma Sırası        — AjanCalismaSirasi
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .base import Base
from .models_auth import _uuid, _simdi


# ═══════════════════════════════════════════════════════════════════
# 5. YAPAY ZEKA İZLEME KATMANI
#    AIModeli, BilgisayarOturumu
# ═══════════════════════════════════════════════════════════════════


class AIModeli(Base):
    """
    Kullanıcı veya yönetici tarafından eklenen API anahtarları ve model konfigürasyonları.
    Sistemde aktif olarak kullanılabilecek modellerin listesi.
    """
    __tablename__ = "ai_modelleri"

    kimlik: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    ad: Mapped[str] = mapped_column(String(128), nullable=False)
    # Tedarikçi: openai | gemini | anthropic | groq | openrouter | openai_compat
    tedarikci: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # API anahtarı (şifreli saklanmalı — uygulama katmanında)
    api_anahtari: Mapped[str] = mapped_column(String(1024), nullable=False)
    # Opsiyonel base URL — OpenAI-uyumlu özel servisler için override.
    temel_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
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
    # Router ajan için izin verilen n8n workflow isimleri JSON array
    allowed_workflows: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # Node-specific opsiyonlar
    node_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # ChatBar'dan global model değişikliği yapıldığında bu ajan etkilenmesin.
    model_locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        Index("ix_ai_agents_ad", "ad"),
        Index("ix_ai_agents_aktif_mi", "aktif_mi"),
    )


# ═══════════════════════════════════════════════════════════════════
# 8. API LOG KATMANI
# ═══════════════════════════════════════════════════════════════════

class ApiLogu(Base):
    """
    Her yapay zeka API çağrısının detaylı log kaydı.
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
    ajan_kimlik: Mapped[str | None] = mapped_column(String(36), nullable=True)
    olusturulma_tarihi: Mapped[str] = mapped_column(String(32), nullable=False, default=_simdi)

    __table_args__ = (
        Index("ix_api_loglari_durum", "durum"),
        Index("ix_api_loglari_kullanici_kimlik", "kullanici_kimlik"),
        Index("ix_api_loglari_model", "model"),
        Index("ix_api_loglari_oturum_kimlik", "oturum_kimlik"),
        Index("ix_api_loglari_tarih", "olusturulma_tarihi"),
        Index("ix_api_loglari_tedarikci", "tedarikci"),
        Index("ix_api_loglari_ajan_kimlik", "ajan_kimlik"),
    )


# ═══════════════════════════════════════════════════════════════════
# 10. N8N ÖNBELLEK KATMANI
# ═══════════════════════════════════════════════════════════════════

class N8nWorkflowCache(Base):
    """
    n8n iş akışlarının veritabanındaki önbelleği.
    n8n kapalıyken bile iş akışlarının arayüzde salt-okunur gösterilmesini sağlar.
    """
    __tablename__ = "n8n_workflows_cache"

    id: Mapped[str] = mapped_column(String(128), primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=False)
    tags: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)
    trigger: Mapped[str] = mapped_column(String(64), default="Manuel")
    last_run: Mapped[str] = mapped_column(String(64), default="Bilinmiyor")
    success_rate: Mapped[int] = mapped_column(Integer, default=100)
    executions_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="stopped")

    cached_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# ═══════════════════════════════════════════════════════════════════
# 11. HATA KAYITLARI KATMANI
# ═══════════════════════════════════════════════════════════════════

class Hata(Base):
    """
    Sistemdeki tanımlı hatalar (admin tarafından eklenir).
    AI hata çözümü sırasında veritabanından eşleşme aranır.
    """
    __tablename__ = "hatalar"

    kimlik:           Mapped[str]           = mapped_column(String(36), primary_key=True, default=_uuid)
    hata_kodu:        Mapped[str]           = mapped_column(String(64), nullable=False, index=True)
    baslik:           Mapped[str]           = mapped_column(String(512), nullable=False)
    modul:            Mapped[str | None]    = mapped_column(String(64), nullable=True)
    severity:         Mapped[str]           = mapped_column(String(16), default="medium")  # low|medium|high|critical
    sebep:            Mapped[str | None]    = mapped_column(Text, nullable=True)
    adimlar:          Mapped[list | None]   = mapped_column(JSON, default=list, nullable=True)  # [{title, tcode, detail}]
    dokumanlar:       Mapped[list | None]   = mapped_column(JSON, default=list, nullable=True)  # [{name, page}]
    olusturan_id:     Mapped[str | None]    = mapped_column(String(36), ForeignKey("kullanicilar.kimlik", ondelete="SET NULL"), nullable=True)
    olusturulma:      Mapped[str]           = mapped_column(String(64), default=_simdi)

    __table_args__ = (
        Index("ix_hatalar_kod_modul", "hata_kodu", "modul"),
    )


class KullaniciHataKaydi(Base):
    """
    Kullanıcının chat'te 'Hata Çözümü' modunda aldığı ve kaydetmek istediği çözümler.
    Geçmişe dönük bakabilmek + benzer hatalarda tekrar gösterebilmek için.
    """
    __tablename__ = "kullanici_hata_kayitlari"

    kimlik:           Mapped[str]           = mapped_column(String(36), primary_key=True, default=_uuid)
    kullanici_id:     Mapped[str]           = mapped_column(String(36), ForeignKey("kullanicilar.kimlik", ondelete="CASCADE"), nullable=False, index=True)
    hata_kodu:        Mapped[str | None]    = mapped_column(String(64), nullable=True, index=True)
    baslik:           Mapped[str]           = mapped_column(String(512), nullable=False)
    modul:            Mapped[str | None]    = mapped_column(String(64), nullable=True)
    severity:         Mapped[str | None]    = mapped_column(String(16), nullable=True)
    ozet:             Mapped[str | None]    = mapped_column(Text, nullable=True)
    cevap_json:       Mapped[dict | None]   = mapped_column(JSON, default=dict, nullable=True)  # ErrorSolution payload
    oturum_id:        Mapped[str | None]    = mapped_column(String(64), nullable=True)
    kayit_tarihi:     Mapped[str]           = mapped_column(String(64), default=_simdi, index=True)

    __table_args__ = (
        Index("ix_user_error_user_date", "kullanici_id", "kayit_tarihi"),
    )


# ═══════════════════════════════════════════════════════════════════
# 13. AJAN ÇALIŞMA SIRASI (Per-Node Execution Log)
# ═══════════════════════════════════════════════════════════════════

class AjanCalismaSirasi(Base):
    """
    LangGraph'taki her node'un çalışma kaydı.
    AgentConfigPanel'de ajan başına tarihçe + performans göstermek için.
    """
    __tablename__ = "ajan_calisma_siralari"

    kimlik:             Mapped[str]           = mapped_column(String(36), primary_key=True, default=_uuid)
    # Hangi graph node'u? (supervisor, rag_search, aggregator, critic, ...)
    ajan_rolu:          Mapped[str]           = mapped_column(String(64), nullable=False)
    oturum_kimlik:      Mapped[str | None]    = mapped_column(String(64), nullable=True)
    # Kullanıcının sorusu (ilk 500 karakter)
    kullanici_mesaji:   Mapped[str | None]    = mapped_column(String(500), nullable=True)
    # Supervisor'ın belirlediği intent
    intent:             Mapped[str | None]    = mapped_column(String(64), nullable=True)
    # Confidence skoru (0.0–1.0)
    intent_confidence:  Mapped[float | None]  = mapped_column(Float, nullable=True)
    # Karmaşıklık seviyesi: low | medium | high
    complexity:         Mapped[str | None]    = mapped_column(String(16), nullable=True)
    # Supervisor'ın bu node için ürettiği kısa brief (görev tanımı)
    brief:              Mapped[str | None]    = mapped_column(Text, nullable=True)
    # Node'un ürettiği çıktının özeti (ilk 300 karakter)
    cikti_ozet:         Mapped[str | None]    = mapped_column(String(300), nullable=True)
    # Başarı durumu
    basarili_mi:        Mapped[bool]          = mapped_column(Boolean, nullable=False, default=True)
    hata_mesaji:        Mapped[str | None]    = mapped_column(Text, nullable=True)
    # Performans
    sure_ms:            Mapped[int | None]    = mapped_column(Integer, nullable=True)
    prompt_token:       Mapped[int | None]    = mapped_column(Integer, nullable=True)
    completion_token:   Mapped[int | None]    = mapped_column(Integer, nullable=True)
    # Critic sonucu (aggregator ve critic node'larında anlamlı)
    critic_onayladi_mi: Mapped[bool | None]   = mapped_column(Boolean, nullable=True)
    revision_sayisi:    Mapped[int | None]    = mapped_column(Integer, nullable=True)
    olusturulma_tarihi: Mapped[str]           = mapped_column(String(32), nullable=False, default=_simdi)

    __table_args__ = (
        Index("ix_ajan_calisma_rolu",    "ajan_rolu"),
        Index("ix_ajan_calisma_oturum",  "oturum_kimlik"),
        Index("ix_ajan_calisma_tarih",   "olusturulma_tarihi"),
        Index("ix_ajan_calisma_rolu_tarih", "ajan_rolu", "olusturulma_tarihi"),
    )
