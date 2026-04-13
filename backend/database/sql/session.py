"""
database/session.py
───────────────────
SQLAlchemy engine + session factory.

Tasarim Kurallari:
  - Tek engine, tek SessionLocal, her request yeni session alir.
  - DATABASE_URL her zaman PostgreSQL bağlantısıdır.
  - Bağlantı .env dosyasından okunur: DATABASE_URL=postgresql://...
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# -- Bağlantı URL'i (her zaman PostgreSQL) ------------------------------------
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql://proje001:proje001pass@localhost:5432/proje001db"
)

# -- Engine -------------------------------------------------------------------
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # Kopuk bağlantıları otomatik yeniler
    pool_size=10,         # Bağlantı havuzu
    max_overflow=20,
    echo=False,
)

# -- Session Factory ----------------------------------------------------------
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency injection ile kullanilir:
        db: Session = Depends(get_db)
    Request bitince session otomatik kapatilir.
    Exception durumunda rollback yapilir (FK ihlali dahil).
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()   # Yarim kalan transaction'i geri al
        raise
    finally:
        db.close()


@contextmanager
def get_session() -> Generator[Session, None, None]:
    """
    Context manager olarak session kullanimi icin:
        with get_session() as db:
            ...
    db_bridge.py ve route'lardaki with-bloklari bu fonksiyonla calisir.
    Exception durumunda otomatik rollback yapar; FK ihlali veya
    flush hatasi sonrasi yarim kalan yazma islemi askida kalmaz.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()   # Yarim kalan transaction'i geri al
        raise
    finally:
        db.close()
