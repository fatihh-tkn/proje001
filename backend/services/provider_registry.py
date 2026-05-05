"""
provider_registry.py
────────────────────────────────────────────────────────────────────
Tüm AI sağlayıcıların metadata'sı tek yerde — base_url, ek header,
protokol ve API-key prefix eşleşmeleri.

Yeni bir OpenAI-uyumlu servis eklemek için bu sözlüğe satır eklemek
yeterli (Together, DeepInfra, Fireworks, vLLM, lokal Ollama vs.).
Tamamen farklı protokol gerekiyorsa `protocol` alanına yeni değer
eklenip ai_service / llm_adapter dallarında ele alınması gerekir.

Public:
  PROVIDERS              — sözlük {provider_id: spec}
  detect_from_key(key)   — API key prefix'inden provider tahmini
  get(provider_id)       — spec
  resolve(model_info)    — DB kaydından çalışma anı spec'i hesapla
                           (base_url, extra_headers, protocol)
"""

from __future__ import annotations

from typing import Iterable


# ── Statik registry ────────────────────────────────────────────────────────
# protocol değerleri:
#   "openai_compatible"   — POST {base}/chat/completions, Authorization: Bearer
#   "google_gemini"       — POST generativelanguage.googleapis.com/.../generateContent?key=
#   "anthropic_messages"  — POST {base}/messages, x-api-key + anthropic-version

PROVIDERS: dict[str, dict] = {
    "gemini": {
        "label": "Google Gemini",
        "protocol": "google_gemini",
        "base_url": "https://generativelanguage.googleapis.com/v1beta",
        "prefix_hints": ("AIza",),
        "extra_headers": {},
        "default_models": ["gemini-2.0-flash"],
    },
    "anthropic": {
        "label": "Anthropic",
        "protocol": "anthropic_messages",
        "base_url": "https://api.anthropic.com/v1",
        "prefix_hints": ("sk-ant-",),
        "extra_headers": {"anthropic-version": "2023-06-01"},
        "default_models": [
            "claude-3-5-sonnet-20240620",
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
        ],
    },
    "openrouter": {
        "label": "OpenRouter",
        "protocol": "openai_compatible",
        "base_url": "https://openrouter.ai/api/v1",
        # OpenRouter key formatı: "sk-or-v1-..." — sk-'den daha uzun olduğu
        # için detect_from_key() bunu OpenAI'dan önce eşleştirir.
        "prefix_hints": ("sk-or-",),
        "extra_headers": {
            "HTTP-Referer": "http://localhost",
            "X-Title": "Yilgenci Platform",
        },
        "default_models": [],
    },
    "groq": {
        "label": "Groq",
        "protocol": "openai_compatible",
        "base_url": "https://api.groq.com/openai/v1",
        "prefix_hints": ("gsk_",),
        "extra_headers": {},
        "default_models": ["llama3-70b-8192"],
    },
    "openai": {
        "label": "OpenAI",
        "protocol": "openai_compatible",
        "base_url": "https://api.openai.com/v1",
        # En jenerik prefix en sona; daha spesifik (sk-ant-, sk-or-) önce eşleşir.
        "prefix_hints": ("sk-",),
        "extra_headers": {},
        "default_models": ["gpt-4o"],
    },
    # Generic OpenAI-uyumlu — kullanıcı manuel base_url verir
    # (Together, DeepInfra, vLLM, lokal Ollama vb.).
    "openai_compat": {
        "label": "OpenAI-uyumlu (özel)",
        "protocol": "openai_compatible",
        "base_url": "",  # zorunlu olarak DB'den gelir
        "prefix_hints": (),  # otomatik tespit edilmez
        "extra_headers": {},
        "default_models": [],
    },
}


# ── Yardımcılar ────────────────────────────────────────────────────────────

def get(provider_id: str | None) -> dict | None:
    if not provider_id:
        return None
    return PROVIDERS.get(provider_id.lower())


def detect_from_key(api_key: str | None) -> str | None:
    """
    API key prefix'inden provider id tahmini. En uzun eşleşen prefix kazanır
    (örn. 'sk-or-' → openrouter, 'sk-ant-' → anthropic, 'sk-' → openai).
    Bilinmeyen prefix'lerde None döner — caller manuel provider beklemeli.
    """
    if not api_key:
        return None
    best_id: str | None = None
    best_len = 0
    for pid, spec in PROVIDERS.items():
        for prefix in spec.get("prefix_hints", ()) or ():
            if api_key.startswith(prefix) and len(prefix) > best_len:
                best_id = pid
                best_len = len(prefix)
    return best_id


def resolve(model_info: dict) -> dict:
    """
    DB'den gelen model kaydını runtime spec'e çevirir.

    Öncelik:
      1) model_info['provider'] — kullanıcı UI'dan seçtiyse veya kayıtta tutulduysa
      2) detect_from_key(api_key)
      3) 'openai' (geriye dönük varsayılan)

    base_url öncelik:
      1) model_info['base_url'] (kullanıcı override) — varsa o
      2) PROVIDERS[provider]['base_url']

    Döner:
      {
        "provider": str,            # spec id ('openai', 'openrouter', ...)
        "label": str,               # kullanıcıya gösterilen
        "protocol": str,            # openai_compatible | google_gemini | anthropic_messages
        "base_url": str,            # chat endpoint kökü
        "extra_headers": dict[str, str],
      }
    """
    api_key = (model_info or {}).get("api_key", "") or ""
    raw_provider = (model_info or {}).get("provider") or ""
    raw_provider_norm = raw_provider.lower().strip() if raw_provider else ""

    # 'Custom' gibi placeholder değerleri otomatik tespite eşitle
    if raw_provider_norm in ("", "custom", "bilinmeyen", "unknown"):
        raw_provider_norm = ""

    provider_id = (
        raw_provider_norm
        if raw_provider_norm in PROVIDERS
        else (detect_from_key(api_key) or "openai")
    )
    spec = PROVIDERS[provider_id]

    # base_url override: kullanıcı manuel verdiyse onu kullan,
    # yoksa registry varsayılanı.
    user_base = (model_info or {}).get("base_url") or ""
    user_base = user_base.strip().rstrip("/") if user_base else ""
    base_url = user_base or spec["base_url"]

    return {
        "provider": provider_id,
        "label": spec["label"],
        "protocol": spec["protocol"],
        "base_url": base_url,
        "extra_headers": dict(spec.get("extra_headers", {}) or {}),
    }


def openai_chat_url(base_url: str) -> str:
    """OpenAI-uyumlu provider'lar için chat endpoint'i."""
    return f"{(base_url or '').rstrip('/')}/chat/completions"


def openai_headers(api_key: str, extra: dict | None = None) -> dict:
    """OpenAI-uyumlu auth header'ları + provider'a özgü ekler."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


def list_provider_choices() -> list[dict]:
    """Frontend'in dropdown'da göstereceği seçenekler."""
    return [
        {"id": pid, "label": spec["label"], "protocol": spec["protocol"]}
        for pid, spec in PROVIDERS.items()
    ]
