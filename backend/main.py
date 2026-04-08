import sys
# Windows terminali varsayılan olarak cp1252/charmap kullanır.
# Unicode karakterleri (→, ≤, vb.) print() ile yazılınca crash verir.
# main.py'nin en tepesinde stdout/stderr'i UTF-8'e zorla.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.main import api_router
from core.config import settings
from database.sql.init_db import init_db


import asyncio
from fastapi.concurrency import run_in_threadpool

def _graph_ready_hint():
    """Lazy Graf Modu: startup'ta yükleme yok. Düğümler sorgu anında SQL'den çekilir."""
    try:
        from database.sql.session import get_session
        from database.sql.models import BilgiIliskisi
        from sqlalchemy import func, select
        with get_session() as db:
            count = db.scalar(select(func.count()).select_from(BilgiIliskisi)) or 0
        print(f"[GRAPH] Lazy mod hazır — {count} kenar SQL'de mevcut, startup RAM yüklemesi YOK.")
    except Exception as e:
        print(f"[GRAPH] Kenar sayısı okunamadı: {e}")


def _init_logs():
    """logs.db şemasını kur ve eski logları sil (TTL rotation)."""
    try:
        from database.logs.init_logs_db import init_logs_db, rotate_old_logs
        init_logs_db()
        # Varsayılan: 30 günden eski logları sil (sistem_ayarlari'ndan okunabilir)
        try:
            from core.db_bridge import get_system_settings
            days = int(get_system_settings().get("LOG_RETENTION_DAYS", 30))
        except Exception:
            days = 30
        rotate_old_logs(retention_days=days)
    except Exception as e:
        print(f"[LOGS-INIT] logs.db başlatılamadı: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Uygulama başladığında DB tablolarını oluştur."""
    init_db()
    asyncio.create_task(run_in_threadpool(_graph_ready_hint))
    asyncio.create_task(run_in_threadpool(_init_logs))

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="React frontend için Python FastAPI backend'i",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS (Cross-Origin Resource Sharing) ayarlamaları
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotaları ekleme
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def read_root():
    return {"message": f"{settings.PROJECT_NAME} API çalışıyor!"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)

# trigger restart
