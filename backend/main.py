import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.main import api_router
from core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="React frontend için Python FastAPI backend'i",
    version="1.0.0",
)

# CORS (Cross-Origin Resource Sharing) ayarlamaları
# Frontend'in (örn: localhost:5173) istekte bulunmasına izin verir.
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
