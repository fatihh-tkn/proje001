"""
migrations/env.py
──────────────────
Alembic migration ortamı.

- database.session.engine kullanılarak mevcut uygulama engine'i devralınır.
- database.models import edilir → tüm tablolar autogenerate ile keşfedilir.
- DATABASE_URL env değişkeni SQLite veya PostgreSQL olabilir; kod değişmez.
"""

import os
import sys
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy import engine_from_config

from alembic import context

# ── Proje kök yolunu sys.path'e ekle ──────────────────────────────
# Alembic, backend/ klasöründen çalıştırıldığı varsayılır.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ── Uygulama modüllerini import et ────────────────────────────────
from database.sql.base import Base          # noqa: E402
from database.sql import models             # noqa: E402, F401  (side-effect: tüm tablolar register edilir)
from database.sql.session import DATABASE_URL  # noqa: E402

# ── Alembic config ────────────────────────────────────────────────
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Alembic'e gerçek URL'i ver (alembic.ini'deki placeholder'ı geçersiz kıl)
config.set_main_option("sqlalchemy.url", DATABASE_URL)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # SQLite'ta FK kısıtlama ifadeleri için render_as_batch gerekli
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,   # ALTER TABLE emulation for SQLite
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
