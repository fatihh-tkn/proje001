"""
database/vector/embedding_manager.py
─────────────────────────────────────────────────────────────────────
Çoklu Embedding Model Yöneticisi

Desteklenen modeller:
  1. paraphrase-multilingual-MiniLM-L12-v2  (Varsayılan, 384 boyut, çok dilli)
  2. all-MiniLM-L6-v2                       (Eski varsayılan, 384 boyut, İngilizce)
  3. BAAI/bge-m3                            (Üst düzey, 1024 boyut, çok dilli)
  4. openai/text-embedding-3-small          (OpenAI API, 1536 boyut)
  5. openai/text-embedding-3-large          (OpenAI API, 3072 boyut → truncate 1536)

Model seçimi SistemAyari tablosundan veya ortam değişkeni EMBEDDING_MODEL ile belirlenir.
"""

from __future__ import annotations

import logging
import os
from typing import Optional

import torch

logger = logging.getLogger(__name__)

# ─── Model Kayıt Defteri ──────────────────────────────────────────────────────

EMBEDDING_MODELS = {
    "paraphrase-multilingual-MiniLM-L12-v2": {
        "display_name": "Multilingual MiniLM (Varsayılan)",
        "provider": "sentence-transformers",
        "model_id": "paraphrase-multilingual-MiniLM-L12-v2",
        "dimension": 384,
        "description": "Çok dilli destek, hızlı, hafif. Türkçe ve 50+ dil.",
        "max_seq_length": 128,
    },
    "all-MiniLM-L6-v2": {
        "display_name": "MiniLM v2 (İngilizce)",
        "provider": "sentence-transformers",
        "model_id": "all-MiniLM-L6-v2",
        "dimension": 384,
        "description": "Hafif ve hızlı, İngilizce odaklı.",
        "max_seq_length": 256,
    },
    "BAAI/bge-m3": {
        "display_name": "BGE-M3 (State-of-the-Art)",
        "provider": "sentence-transformers",
        "model_id": "BAAI/bge-m3",
        "dimension": 1024,
        "description": "Açık kaynak en iyi skor. Tüm dillerde mükemmel. Daha fazla RAM gerektirir.",
        "max_seq_length": 8192,
    },
    "openai/text-embedding-3-small": {
        "display_name": "OpenAI Small",
        "provider": "openai",
        "model_id": "text-embedding-3-small",
        "dimension": 1536,
        "description": "OpenAI API tabanlı. Sunucu yükü yok, API maliyeti var.",
        "max_seq_length": 8191,
    },
    "openai/text-embedding-3-large": {
        "display_name": "OpenAI Large",
        "provider": "openai",
        "model_id": "text-embedding-3-large",
        "dimension": 3072,
        "description": "OpenAI en güçlü embedding modeli. Yüksek maliyet.",
        "max_seq_length": 8191,
    },
}

# Veritabanında saklanan vektör boyutu — tüm modeller bu boyuta pad/truncate edilir
MAX_VECTOR_DIM = 1536

DEFAULT_MODEL_KEY = "paraphrase-multilingual-MiniLM-L12-v2"

# ─── Singleton Yönetimi ───────────────────────────────────────────────────────

_current_model_key: str | None = None
_loaded_model = None          # SentenceTransformer nesnesi (lokalde)
_openai_client = None         # openai.OpenAI istemcisi


def _resolve_model_key() -> str:
    """Aktif embedding model anahtarını belirler.
    Öncelik sırası:
      1. Ortam değişkeni EMBEDDING_MODEL
      2. SistemAyari tablosu (embedding_model anahtarı)
      3. DEFAULT_MODEL_KEY sabit değeri
    """
    env_val = os.getenv("EMBEDDING_MODEL", "").strip()
    if env_val and env_val in EMBEDDING_MODELS:
        return env_val

    # Config dosyasından oku (pydantic-settings .env desteği)
    try:
        from core.config import settings
        cfg_val = getattr(settings, "EMBEDDING_MODEL", "").strip()
        if cfg_val and cfg_val in EMBEDDING_MODELS:
            return cfg_val
    except Exception as _e:
        logger.debug("Config'den embedding_model okunamadı: %s", _e)

    # Veritabanından oku (lazy import — döngüsel importu önlemek için)
    try:
        from database.sql.session import get_session
        from database.sql.models import SistemAyari
        from sqlalchemy import select

        with get_session() as db:
            row = db.scalar(
                select(SistemAyari).where(SistemAyari.anahtar == "embedding_model")
            )
            if row and row.deger and isinstance(row.deger, dict):
                db_val = row.deger.get("value", "")
                if db_val in EMBEDDING_MODELS:
                    return db_val
    except Exception:
        logger.debug("SistemAyari tablosundan embedding_model okunamadı, varsayılan kullanılacak.")

    return DEFAULT_MODEL_KEY


def get_active_model_key() -> str:
    """Şu an aktif olan model anahtarını döndürür."""
    global _current_model_key
    if _current_model_key is None:
        _current_model_key = _resolve_model_key()
    return _current_model_key


def get_active_model_info() -> dict:
    """Aktif modelin tüm bilgilerini sözlük olarak döndürür."""
    key = get_active_model_key()
    info = EMBEDDING_MODELS[key].copy()
    info["key"] = key
    return info


def set_active_model(model_key: str, persist: bool = True) -> dict:
    """Aktif embedding modelini değiştirir.
    
    Args:
        model_key: EMBEDDING_MODELS kayıt defterindeki anahtar
        persist: True ise SistemAyari tablosuna kaydet
    
    Returns:
        Yeni aktif model bilgisi
    
    Raises:
        ValueError: model_key geçersizse
    """
    if model_key not in EMBEDDING_MODELS:
        raise ValueError(
            f"Bilinmeyen embedding modeli: '{model_key}'. "
            f"Geçerli modeller: {list(EMBEDDING_MODELS.keys())}"
        )

    global _current_model_key, _loaded_model, _openai_client
    
    old_key = _current_model_key
    _current_model_key = model_key

    # Eski yüklü modeli temizle (RAM'den sil)
    if old_key != model_key:
        _loaded_model = None
        _openai_client = None
        logger.info(f"Embedding modeli değiştirildi: {old_key} → {model_key}")

    # Veritabanına kaydet
    if persist:
        try:
            from database.sql.session import get_session
            from database.sql.models import SistemAyari
            from sqlalchemy import select
            from datetime import datetime, timezone

            with get_session() as db:
                row = db.scalar(
                    select(SistemAyari).where(SistemAyari.anahtar == "embedding_model")
                )
                if row:
                    row.deger = {"value": model_key}
                    row.guncelleme_tarihi = datetime.now(timezone.utc).isoformat()
                else:
                    import uuid
                    row = SistemAyari(
                        kimlik=str(uuid.uuid4()),
                        anahtar="embedding_model",
                        deger={"value": model_key},
                        aciklama="Aktif embedding modeli anahtarı",
                    )
                    db.add(row)
                db.commit()
        except Exception as e:
            logger.warning(f"Embedding model ayarı veritabanına kaydedilemedi: {e}")

    return get_active_model_info()


# ─── Embedding Üretme ─────────────────────────────────────────────────────────

def _get_sentence_transformer(model_id: str):
    """SentenceTransformer modelini lazy-load eder."""
    global _loaded_model

    if _loaded_model is not None:
        return _loaded_model

    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        raise ImportError("sentence_transformers kütüphanesi bulunamadı. `pip install sentence-transformers` çalıştırın.")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Embedding modeli yükleniyor: {model_id} ({device}) ...")
    _loaded_model = SentenceTransformer(model_id, device=device)
    logger.info(f"Embedding modeli hazır: {model_id}")
    return _loaded_model


def _get_openai_client():
    """OpenAI istemcisini lazy-load eder."""
    global _openai_client
    if _openai_client is not None:
        return _openai_client

    try:
        import openai
    except ImportError:
        raise ImportError("openai kütüphanesi bulunamadı. `pip install openai` çalıştırın.")

    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        # Config'den dene
        try:
            from core.config import settings
            api_key = settings.OPENAI_API_KEY
        except Exception as _e:
            logger.debug("OpenAI API key config'den okunamadı: %s", _e)
    
    if not api_key:
        raise ValueError("OpenAI embedding modeli için OPENAI_API_KEY ortam değişkeni veya config ayarı gereklidir.")

    _openai_client = openai.OpenAI(api_key=api_key)
    return _openai_client


def _pad_or_truncate(vec: list[float], target_dim: int) -> list[float]:
    """Vektörü hedef boyuta uyumlu hale getirir.
    Kısa vektörler 0 ile doldurulur, uzun vektörler kesilir.
    """
    if len(vec) == target_dim:
        return vec
    if len(vec) > target_dim:
        return vec[:target_dim]
    return vec + [0.0] * (target_dim - len(vec))


def get_embeddings(texts: list[str]) -> list[list[float]]:
    """Metinleri aktif embedding modeli ile vektöre çevirir.
    
    Tüm çıktılar MAX_VECTOR_DIM boyutuna normalize edilir.
    
    Returns:
        Her metin için MAX_VECTOR_DIM boyutlu float listesi
    """
    if not texts:
        return []

    model_key = get_active_model_key()
    model_info = EMBEDDING_MODELS[model_key]
    provider = model_info["provider"]
    model_id = model_info["model_id"]
    native_dim = model_info["dimension"]

    if provider == "sentence-transformers":
        model = _get_sentence_transformer(model_id)
        raw_vecs = [v.tolist() for v in model.encode(texts)]
    elif provider == "openai":
        client = _get_openai_client()
        response = client.embeddings.create(
            model=model_id,
            input=texts,
        )
        raw_vecs = [item.embedding for item in response.data]
    else:
        raise ValueError(f"Bilinmeyen provider: {provider}")

    # Boyut normalizasyonu
    return [_pad_or_truncate(v, MAX_VECTOR_DIM) for v in raw_vecs]


def get_native_dimension() -> int:
    """Aktif modelin doğal vektör boyutunu döner."""
    return EMBEDDING_MODELS[get_active_model_key()]["dimension"]
