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
    """Lazy Graf Modu: DB hazır olunca kenar sayısını logla."""
    try:
        from database.sql.init_db import wait_for_db
        wait_for_db(timeout=30.0)
        from database.sql.session import get_session
        from database.sql.models import BilgiIliskisi
        from sqlalchemy import func, select
        with get_session() as db:
            count = db.scalar(select(func.count()).select_from(BilgiIliskisi)) or 0
        print(f"[GRAPH] Lazy mod hazır — {count} kenar SQL'de mevcut, startup RAM yüklemesi YOK.")
    except Exception as e:
        print(f"[GRAPH] Kenar sayısı okunamadı: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Sunucu anında ayağa kalkar (yield hemen).
    DB init ve diğer ağır işler background thread'de çalışır.
    Login endpoint, DB hazır olduğu anda (genellikle <1s) çalışmaya başlar.
    """
    asyncio.create_task(run_in_threadpool(init_db))
    asyncio.create_task(run_in_threadpool(_graph_ready_hint))

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
