"""
crypto_service.py
────────────────────────────────────────────────────────────────────
DB'de saklanan hassas alanlar (api_anahtari) için simetrik şifreleme.

Algoritma: Fernet (AES-128-CBC + HMAC-SHA256, kütüphanenin garantisi).
Master key: FERNET_KEY ortam değişkeni. Boşsa "fall-through" mod —
şifreleme YAPILMAZ, mevcut düz metin kayıtlarla geriye uyumlu kalır.
Bu, "encryption opt-in" geçişi için kritiktir.

Şifreli çıktıların başında "fer:v1:" prefix'i bulunur — okuma sırasında
düz metin mi şifreli mi olduğunu prefix'ten ayırt ederiz. Böylece eski
düz metin kayıtlar otomatik tanınır, yeni yazımlar şifrelenir.

Public:
  encryption_enabled() -> bool
  encrypt(plain: str) -> str
  decrypt(token: str) -> str
  generate_master_key() -> str        # bir kerelik kurulum için
"""

from __future__ import annotations

import os
from cryptography.fernet import Fernet, InvalidToken

_PREFIX = "fer:v1:"
_fernet: Fernet | None = None
_init_done = False


def _get_fernet() -> Fernet | None:
    global _fernet, _init_done
    if _init_done:
        return _fernet
    _init_done = True

    raw_key = (os.environ.get("FERNET_KEY") or "").strip()
    if not raw_key:
        # Şifreleme kapalı — eski davranış.
        _fernet = None
        return None

    try:
        _fernet = Fernet(raw_key.encode("utf-8"))
    except Exception as e:
        # Hatalı key'de fail-closed davransak da, başlangıçta uygulamayı
        # kilitlemek istemiyoruz; logger üzerinden uyaralım.
        try:
            from core.logger import get_logger
            get_logger("crypto").error(
                "FERNET_KEY geçersiz, şifreleme devre dışı: %s", e,
            )
        except Exception:
            pass
        _fernet = None
    return _fernet


def encryption_enabled() -> bool:
    return _get_fernet() is not None


def encrypt(plain: str) -> str:
    """
    Düz metni şifreler. FERNET_KEY tanımlı değilse olduğu gibi döner —
    geçiş sırasında geriye dönük uyumluluk için.
    """
    if plain is None:
        return plain
    f = _get_fernet()
    if f is None:
        return plain
    token = f.encrypt(plain.encode("utf-8")).decode("utf-8")
    return _PREFIX + token


def decrypt(token: str) -> str:
    """
    Şifreli ise çözer; düz metinse (eski kayıt) olduğu gibi döner.
    Şifreli ama key yoksa veya bozuksa — hata yerine boş string döner ve
    log basar (uygulamayı çökertmek istemeyiz; admin uyarılır).
    """
    if token is None:
        return token
    if not isinstance(token, str) or not token.startswith(_PREFIX):
        # Eski düz metin kayıt — olduğu gibi geri dön.
        return token
    f = _get_fernet()
    if f is None:
        try:
            from core.logger import get_logger
            get_logger("crypto").error(
                "Şifreli kayıt bulundu fakat FERNET_KEY tanımlı değil — okunamıyor.",
            )
        except Exception:
            pass
        return ""
    try:
        return f.decrypt(token[len(_PREFIX):].encode("utf-8")).decode("utf-8")
    except InvalidToken:
        try:
            from core.logger import get_logger
            get_logger("crypto").error(
                "InvalidToken: kayıt şifre çözülemedi (FERNET_KEY rotasyonu mu?).",
            )
        except Exception:
            pass
        return ""


def generate_master_key() -> str:
    """Bir kerelik kurulum için yeni Fernet key üretir."""
    return Fernet.generate_key().decode("utf-8")
