import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.main import api_router
from core.config import settings
from database.sql.init_db import init_db


import asyncio
from fastapi.concurrency import run_in_threadpool

def _load_graph():
    try:
        from database.sql.session import get_session
        from database.sql.models import BilgiIliskisi
        from database.graph.networkx_db import graph_db
        from sqlalchemy import select
        
        with get_session() as db:
            db_edges = list(db.scalars(select(BilgiIliskisi)).all())
            formatted_edges = []
            for e in db_edges:
                src = e.kaynak_parca_kimlik
                dst = e.hedef_parca_kimlik
                weight = float(e.agirlik) if e.agirlik is not None else 1.0
                if src and dst:
                    formatted_edges.append({
                        "from_id": src,
                        "to_id": dst,
                        "relation": e.iliski_turu,
                        "weight": weight
                    })
            if formatted_edges:
                graph_db.build_graph(formatted_edges)
                print(f"[GRAPH] Bilgi grafiği motoru {len(formatted_edges)} kenar ile hafızaya yüklendi.")
            else:
                print(f"[GRAPH] Veritabanında ilişki bulunamadı, grafik boş başlatıldı.")
    except Exception as e:
        print(f"[GRAPH-ERROR] Bilgi grafiği başlatılamadı: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Uygulama başladığında DB tablolarını oluştur."""
    init_db()
    
    # Arka planda grafiği okuyalım ki Uvicorn açılışı kilitlenmesin
    asyncio.create_task(run_in_threadpool(_load_graph))

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
