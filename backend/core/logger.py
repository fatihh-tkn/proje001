"""
core/logger.py
──────────────
Uygulama genelinde kullanılan merkezi loglama altyapısı.

Kullanım:
    from core.logger import get_logger
    logger = get_logger(__name__)
    logger.info("İşlem tamamlandı")
    logger.error("Hata oluştu: %s", hata, exc_info=True)
"""

import logging
import sys
import os


def _build_handler() -> logging.StreamHandler:
    """UTF-8 zorunlu StreamHandler oluşturur (Windows cp1254/cp1252 sorununu önler)."""
    handler = logging.StreamHandler(sys.stdout)
    try:
        # stdout'u UTF-8'e zorla (Windows'ta crash önleme)
        handler.stream = open(handler.stream.fileno(), mode="w", encoding="utf-8", closefd=False)
    except Exception:
        pass  # Ortam desteklemiyorsa varsayılan davranışa geri dön
    return handler


def _get_log_level() -> int:
    """LOG_LEVEL ortam değişkeninden seviye okur, varsayılan INFO."""
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    return getattr(logging, level_name, logging.INFO)


# ── Kök logger'ı bir kez yapılandır ──────────────────────────────────────────
def _configure_root() -> None:
    root = logging.getLogger()
    if root.handlers:
        return  # Zaten yapılandırılmış

    level = _get_log_level()
    root.setLevel(level)

    handler = _build_handler()
    handler.setLevel(level)
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    root.addHandler(handler)


_configure_root()


def get_logger(name: str) -> logging.Logger:
    """Modül adıyla yapılandırılmış logger döner."""
    return logging.getLogger(name)
