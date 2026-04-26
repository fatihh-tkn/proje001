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

from sqlalchemy import text

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


def _run_schema_migrations(eng) -> None:
    """
    Mevcut veritabanına eksik kolonları ekler (create_all() mevcut tabloları değiştirmez).
    Her ALTER TABLE IF NOT EXISTS idempotent olduğundan güvenle tekrar çalışabilir.
    """
    migrations = [
        # VektorParcasi: chunk metadata (image_path, page_width, page_height, type vb.)
        "ALTER TABLE vektor_parcalari ADD COLUMN IF NOT EXISTS meta JSONB",
        # BilgisayarOturumu: eski kurulumlar için eksik sütunlar
        "ALTER TABLE bilgisayar_oturumlari ADD COLUMN IF NOT EXISTS bilgisayar_adi VARCHAR(255)",
        "ALTER TABLE bilgisayar_oturumlari ADD COLUMN IF NOT EXISTS tarayici VARCHAR(256)",
        "ALTER TABLE bilgisayar_oturumlari ADD COLUMN IF NOT EXISTS son_aktivite_tarihi VARCHAR(32)",
    ]
    with eng.connect() as conn:
        for stmt in migrations:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception as e:
                logger.warning(f"Schema migration atlandı ({stmt[:60]}...): {e}")


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
            with engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                conn.commit()
            Base.metadata.create_all(bind=engine)
            _run_schema_migrations(engine)
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
