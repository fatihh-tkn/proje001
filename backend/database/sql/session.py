"""
database/session.py
───────────────────
SQLAlchemy engine + session factory.

Tasarim Kurallari:
  - Tek engine, tek SessionLocal, her request yeni session alir.
  - SQLite icin FK zorunlulugu event listener ile aktif edilir.
  - DATABASE_URL env var ile PostgreSQL'e gecmek tek satir degisiklik.
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session

# -- Baglanti URL'i -----------------------------------------------------------
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_DEFAULT_SQLITE_URL = f"sqlite:///{os.path.join(_BASE_DIR, 'app.db')}"

DATABASE_URL: str = os.getenv("DATABASE_URL", _DEFAULT_SQLITE_URL)

# -- Engine -------------------------------------------------------------------
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=_connect_args,
    pool_pre_ping=True,
    echo=False,
)

# -- SQLite FK Zorunlulugu ----------------------------------------------------
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys = ON;")
        cursor.close()

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
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_session() -> Generator[Session, None, None]:
    """
    Context manager olarak session kullanimi icin:
        with get_session() as db:
            ...
    db_bridge.py ve route'lardaki with-bloklari bu fonksiyonla calisir.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
