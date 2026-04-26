import sys
# Windows terminali varsayılan olarak cp1252/charmap kullanır.
# Unicode karakterleri (→, ≤, vb.) print() ile yazılınca crash verir.
# main.py'nin en tepesinde stdout/stderr'i UTF-8'e zorla.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError
import uuid as _uuid

from api.main import api_router
from core.config import settings
from core.logger import get_logger
from database.sql.init_db import init_db

logger = get_logger("main")


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
        logger.info("[GRAPH] Lazy mod hazır — %d kenar SQL'de mevcut, startup RAM yüklemesi YOK.", count)
    except Exception as e:
        logger.warning("[GRAPH] Kenar sayısı okunamadı: %s", e)


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

# ── Global Exception Handler'lar ─────────────────────────────────────────────

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error_code": f"HTTP_{exc.status_code}",
            "message": exc.detail if isinstance(exc.detail, str) else str(exc.detail),
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    field_errors = [
        {"field": " -> ".join(str(loc) for loc in e["loc"]), "msg": e["msg"]}
        for e in errors
    ]
    logger.warning("Doğrulama hatası [%s %s]: %s", request.method, request.url.path, errors)
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error_code": "VALIDATION_ERROR",
            "message": "İstek verilerinde doğrulama hatası.",
            "detail": field_errors,
        },
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    request_id = _uuid.uuid4().hex[:8]
    logger.error("Veritabanı hatası [%s] [%s %s]: %s", request_id, request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error_code": "DB_ERROR",
            "message": "Veritabanı işlemi sırasında bir hata oluştu.",
            "detail": request_id,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    request_id = _uuid.uuid4().hex[:8]
    logger.error("Beklenmeyen hata [%s] [%s %s]: %s", request_id, request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error_code": "INTERNAL_ERROR",
            "message": "Sunucuda beklenmeyen bir hata oluştu.",
            "detail": request_id,
        },
    )


# ── CORS (Cross-Origin Resource Sharing) ayarlamaları ─────────────────────────
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
