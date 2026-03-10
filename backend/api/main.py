from fastapi import APIRouter
from api.routes import chat, files

api_router = APIRouter()

api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
# Dosyalar (Excel, PPT vb.) için endpoint'i de ekliyoruz:
api_router.include_router(files.router, prefix="/files", tags=["files"])
