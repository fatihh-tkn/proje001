"""Shared utility: resolve vision model config for document processing.

Returns (api_key, model_name) from the user-selected AIModeli entry.
No defaults, no provider restrictions — if not properly configured returns ('', '').
"""
from __future__ import annotations

_SETTING_KEY = "vision_model_id"


def get_vision_config() -> tuple[str, str]:
    """Returns (api_key, model_name).

    Both empty strings when:
      - No model selected in SistemAyari
      - Selected AIModeli row has no api_key or no model_id
    The caller is responsible for handling the empty case.
    """
    try:
        from database.sql.session import get_session
        from database.sql.models import SistemAyari, AIModeli
        from services.crypto_service import decrypt as _decrypt
        from sqlalchemy import select

        with get_session() as db:
            row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == _SETTING_KEY))
            if not (row and row.deger):
                return "", ""
            entry_id = str(row.deger).strip('"').strip("'")
            m = db.get(AIModeli, entry_id)
            if not m:
                return "", ""
            key = _decrypt(m.api_anahtari) if m.api_anahtari else ""
            model_name = (m.model_id or "").strip()
            if not key or not model_name:
                return "", ""
            return key, model_name
    except Exception:
        return "", ""


def get_vision_api_key() -> str:
    """Backward-compat shim — returns api_key only."""
    api_key, _ = get_vision_config()
    return api_key
