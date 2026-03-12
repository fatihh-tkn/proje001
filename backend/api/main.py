from fastapi import APIRouter

from api.routes import chat, db, files, bridge, monitor

api_router = APIRouter()

api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(db.router, prefix="/db", tags=["database"])
api_router.include_router(bridge.router, tags=["ai-bridge"])
api_router.include_router(monitor.router, prefix="/monitor", tags=["monitoring"])
