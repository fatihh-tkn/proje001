"""
database/init_db.py
────────────────────
Uygulama ilk açıldığında tabloları oluşturur.

Kullanım:
    from database.sql.init_db import init_db
    init_db()   # main.py startup event'inde çağrılır

Alembic Notu:
    Geliştirme aşamasında create_all() kullanıyoruz.
    Üretime geçince create_all() kaldırılır, Alembic migrations devralır.
"""

from __future__ import annotations

import logging
import time
import threading

from sqlalchemy.exc import OperationalError

from database.sql.base import Base
from database.sql.session import engine

# Tüm modellerin Base'e kayıtlı olması için import şart
from database.sql import models  # noqa: F401 – side-effect import

logger = logging.getLogger(__name__)

# Diğer endpoint'lerin DB'nin hazır olup olmadığını kontrol etmesi için bayrak
_db_ready = threading.Event()


def is_db_ready() -> bool:
    return _db_ready.is_set()


def wait_for_db(timeout: float = 30.0) -> bool:
    """DB hazır olana kadar bekle. timeout süresi içinde hazır olursa True döner."""
    return _db_ready.wait(timeout=timeout)


def init_db() -> None:
    """
    Postgres hazır olana kadar retry'lı bağlantı dener, ardından tabloları oluşturur.
    Maksimum 30 saniye bekler (Docker cold start senaryosu için yeterli).
    """
    max_attempts = 30
    wait_seconds = 1.0

    for attempt in range(1, max_attempts + 1):
        try:
            logger.info(f"Veritabanı bağlantısı deneniyor... ({attempt}/{max_attempts})")
            Base.metadata.create_all(bind=engine)
            logger.info("Veritabanı hazır.")
            _db_ready.set()
            return
        except OperationalError as e:
            if attempt == max_attempts:
                logger.error(f"Veritabanına bağlanılamadı: {e}")
                return
            logger.warning(f"DB henüz hazır değil, {wait_seconds}s bekleniyor... ({e.__class__.__name__})")
            time.sleep(wait_seconds)
        except Exception as e:
            logger.error(f"init_db beklenmeyen hata: {e}")
            return
