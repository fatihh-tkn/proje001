"""
agent_graph/checkpoint.py
────────────────────────────────────────────────────────────────────
PostgresSaver factory. Mevcut DATABASE_URL'i kullanarak LangGraph
checkpoint'lerini ana veritabanında saklar — restart-safe.

Tablolar (ilk çağrıda otomatik oluşturulur):
    - checkpoints
    - checkpoint_blobs
    - checkpoint_writes
    - checkpoint_migrations

Public:
    get_async_checkpointer()   — singleton AsyncPostgresSaver context
    setup_checkpointer_tables() — uygulama açılışında bir kez çağır
"""

from __future__ import annotations

import os
import logging
from contextlib import asynccontextmanager

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

logger = logging.getLogger("agent_graph.checkpoint")

_saver_instance: AsyncPostgresSaver | None = None
_saver_cm = None  # context manager handle


def _get_dsn() -> str:
    """Mevcut DATABASE_URL'den postgres DSN üretir."""
    url = os.getenv(
        "DATABASE_URL",
        "postgresql://proje001:proje001pass@localhost:5432/proje001db",
    )
    # SQLAlchemy 'postgresql://' önekini kabul eder; psycopg de aynı şekilde.
    # `postgresql+psycopg2://` gibi dialect'leri sade hale getir
    if url.startswith("postgresql+"):
        url = "postgresql://" + url.split("://", 1)[1]
    return url


@asynccontextmanager
async def open_checkpointer():
    """
    Async context manager. Uygulama yaşam döngüsünde bir kez açılır
    (FastAPI lifespan), sonra graph compile sırasında inject edilir.

    Kullanım:
        async with open_checkpointer() as cp:
            graph = build_graph(checkpointer=cp)
            ...
    """
    dsn = _get_dsn()
    logger.info("[checkpoint] PostgresSaver bağlantısı kuruluyor")
    async with AsyncPostgresSaver.from_conn_string(dsn) as saver:
        try:
            await saver.setup()
        except Exception as e:
            logger.warning("[checkpoint] setup atlandı (idempotent olabilir): %s", e)
        logger.info("[checkpoint] PostgresSaver hazır")
        yield saver


async def init_checkpointer_global():
    """
    Lifespan startup için çağrılır — checkpointer instance'ını global tutar
    böylece graph compile her seferinde yeni bağlantı açmaz.

    Bu pattern lifespan'ın başında yield öncesi setup için kullanılır:

        async with AsyncPostgresSaver.from_conn_string(dsn) as cp:
            app.state.checkpointer = cp
            yield
    """
    # Bu fonksiyon yer tutucu — gerçek init main.py lifespan'ında
    # `open_checkpointer()` context manager'ı ile yapılacak.
    pass
