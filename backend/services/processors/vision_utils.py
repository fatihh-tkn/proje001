"""Shared utility: resolve vision/doc-processing model config.

get_vision_config()         → genel vision ayarı (vision_model_id)
get_doc_processing_config() → Teknik Döküman İşleme ayarı (doc_processing_model_id)
                              döner: (api_key, model_name, provider, base_url)
"""
from __future__ import annotations

_VISION_KEY     = "vision_model_id"
_DOC_PROC_KEY   = "doc_processing_model_id"


def _resolve(setting_key: str) -> tuple[str, str, str, str]:
    """(api_key, model_name, provider, base_url) — hepsi boş string olursa ayar yok."""
    try:
        from database.sql.session import get_session
        from database.sql.models import SistemAyari, AIModeli
        from services.crypto_service import decrypt as _decrypt
        from sqlalchemy import select

        with get_session() as db:
            row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == setting_key))
            if not (row and row.deger):
                return "", "", "", ""
            entry_id = str(row.deger).strip('"').strip("'")
            m = db.get(AIModeli, entry_id)
            if not m:
                return "", "", "", ""
            key        = _decrypt(m.api_anahtari) if m.api_anahtari else ""
            model_name = (m.model_id or m.ad or "").strip()
            provider   = (m.tedarikci or "").strip().lower()
            base_url   = (m.temel_url or "").strip()
            if not key:
                print(f"[vision_utils] {setting_key}: API anahtarı çözülemedi (model: {m.ad!r})")
                return "", "", "", ""
            if not model_name:
                print(f"[vision_utils] {setting_key}: model_id ve ad alanları boş (model: {m.ad!r}) — AI Modeller ayarında model adını girin")
                return "", "", "", ""
            # Provider otomatik tespiti: kayıt edilmemişse model adından çıkar
            if not provider:
                if base_url:
                    # base_url varsa OpenAI-uyumlu bir endpoint — compat path kullan
                    provider = "openai_compat"
                elif "/" in model_name:
                    # "org/model" formatı → OpenRouter
                    provider = "openrouter"
                    base_url = "https://openrouter.ai/api/v1"
                elif model_name.startswith(("gpt-", "text-", "o1", "o3")):
                    provider = "openai"
                elif model_name.startswith("claude-"):
                    provider = "anthropic"
                # else: gemini (boş provider = default Gemini SDK)
            return key, model_name, provider, base_url
    except Exception as e:
        print(f"[vision_utils] {setting_key} çözüm hatası: {e}")
        return "", "", "", ""


def get_vision_config() -> tuple[str, str]:
    """Geriye dönük uyumluluk — (api_key, model_name)."""
    key, model, _, _ = _resolve(_VISION_KEY)
    return key, model


def get_doc_processing_config() -> tuple[str, str, str, str]:
    """Teknik Döküman İşleme ayarı — (api_key, model_name, provider, base_url).
    Ayarlanmamışsa vision_model_id'ye düşer.
    """
    result = _resolve(_DOC_PROC_KEY)
    if result[0]:          # doc_processing_model_id set ve geçerli
        return result
    # Fallback: genel vision ayarı
    key, model, prov, url = _resolve(_VISION_KEY)
    return key, model, prov, url


def get_vision_api_key() -> str:
    """Backward-compat shim."""
    api_key, _ = get_vision_config()
    return api_key
