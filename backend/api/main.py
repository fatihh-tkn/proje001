from fastapi import APIRouter

from api.routes import chat, db, files, bridge, monitor, sql_explorer, archive, n8n, orchestrator

api_router = APIRouter()

api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(db.router, prefix="/db", tags=["database"])
api_router.include_router(bridge.router, tags=["ai-bridge"])
api_router.include_router(monitor.router, prefix="/monitor", tags=["monitoring"])
api_router.include_router(sql_explorer.router, prefix="/sql", tags=["sql_explorer"])
api_router.include_router(archive.router, prefix="/archive", tags=["archive"])
api_router.include_router(n8n.router, prefix="/n8n", tags=["n8n"])
api_router.include_router(orchestrator.router, prefix="/orchestrator", tags=["orchestrator"])
