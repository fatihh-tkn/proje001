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

from database.sql.base import Base
from database.sql.session import engine

# Tüm modellerin Base'e kayıtlı olması için import şart
from database.sql import models  # noqa: F401 – side-effect import

logger = logging.getLogger(__name__)


def init_db() -> None:
    """
    Eksik tabloları oluştur. Mevcut tablolara dokunmaz.
    Üretimde bu fonksiyon yerine 'alembic upgrade head' kullanılır.
    """
    logger.info("Veritabanı tabloları kontrol ediliyor / oluşturuluyor...")
    Base.metadata.create_all(bind=engine)
    logger.info("Veritabanı hazır.")
