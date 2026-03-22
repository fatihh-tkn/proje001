from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import datetime
import time
import uuid

from core.db_bridge import (
    init_db, add_log_to_db, get_logs_from_db, clear_logs_from_db,
    get_user_models, add_user_model, delete_user_model
)
from services.monitor_service import (
    AI_MODELS, calc_cost, get_dashboard_stats, get_sessions_stats, 
    get_computers_stats, verify_custom_model_api, 
    set_computer_alias, remove_computer_alias
)

# Artık no-op; gerçek init main.py lifespan'ında yapılıyor
init_db()

router = APIRouter()

# ── Log Kayıt Endpoint ────────────────────────────────────────────────────────

@router.post("/logs")
async def add_log(payload: dict):
    now = datetime.utcnow()
    prompt_tokens     = payload.get("prompt_tokens", 0)
    completion_tokens = payload.get("completion_tokens", 0)
    model             = payload.get("model", "unknown")
    cost              = calc_cost(model, prompt_tokens, completion_tokens)

    log_entry = {
        "id":               f"log_{int(time.time()*1000)}_{uuid.uuid4().hex[:4]}",
        "timestamp":        now.isoformat(),
        "provider":         payload.get("provider", "unknown"),
        "model":            model,
        "promptTokens":     prompt_tokens,
        "completionTokens": completion_tokens,
        "totalTokens":      prompt_tokens + completion_tokens,
        "duration":         payload.get("duration_ms", 0),
        "status":           payload.get("status", "success"),
        "cost":             cost,
        "projectId":        payload.get("project_id", "default"),
        "sessionId":        payload.get("session_id", "session_default"),
        "role":             payload.get("role", "assistant"),
        "error":            payload.get("error_code"),
        "request":          payload.get("request", ""),
        "response":         payload.get("response", ""),
        "ip":               payload.get("ip", "127.0.0.1"),
        "mac":              payload.get("mac", "00:00:00:00:00:00"),
    }

    add_log_to_db(log_entry)
    return {"ok": True, "id": log_entry["id"]}


# ── Dashboard Özet ─────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def get_dashboard(project_id: Optional[str] = None):
    stats = get_dashboard_stats(project_id)
    return JSONResponse(stats)


# ── Ham Log Listesi ──────────────────────────────────────────────────────────

@router.get("/logs")
async def get_logs(limit: int = Query(100, le=1000), project_id: Optional[str] = None):
    logs = get_logs_from_db(limit=limit, project_id=project_id)
    return {"logs": logs, "total": len(logs)}

@router.delete("/logs")
async def clear_logs():
    clear_logs_from_db()
    return {"ok": True, "message": "Tüm loglar temizlendi."}


# ── Sessions Endpoint ────────────────────────────────────────────────────────

@router.get("/sessions")
async def get_sessions(limit: int = 50):
    sessions = get_sessions_stats(limit)
    return {"sessions": sessions}


@router.get("/computers")
async def get_computers():
    computers = get_computers_stats()
    return {"computers": computers}


@router.delete("/computers/{mac}/{ip}")
async def delete_computer(mac: str, ip: str):
    from database.sql.session import get_session
    from database.sql.models import ApiLog
    from sqlalchemy import delete as sa_delete
    remove_computer_alias(mac, ip)
    with get_session() as db:
        stmt = sa_delete(ApiLog).where(ApiLog.mac == mac, ApiLog.ip == ip)
        result = db.execute(stmt)
        db.commit()
        deleted = result.rowcount
    return {"ok": True, "deleted": deleted}

@router.patch("/computers/rename")
async def rename_computer(body: dict):
    mac = body.get("mac", "")
    ip = body.get("ip", "")
    name = body.get("name", "").strip()
    if not name:
        return {"ok": False, "error": "name is required"}
    set_computer_alias(mac, ip, name)
    return {"ok": True}


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    from database.sql.session import get_session
    from database.sql.models import ApiLog
    from sqlalchemy import delete as sa_delete
    from services.ai_service import clear_session_history
    with get_session() as db:
        stmt = sa_delete(ApiLog).where(ApiLog.session_id == session_id)
        db.execute(stmt)
        db.commit()
    clear_session_history(session_id)
    return {"ok": True}


# ── Modeller Endpoint ──────────────────────────────────────────────────────────

@router.get("/catalog")
async def get_models():
    user_models = get_user_models()
    return {"models": user_models}


# ── Kullanıcı Modelleri Yönetimi ─────────────────────────────────────────────

@router.post("/custom-models/verify")
async def verify_custom_model(body: dict):
    api_key = body.get("api_key", "").strip()
    model_name = body.get("model_name", "").strip()
    if not api_key:
        raise HTTPException(status_code=400, detail="api_key gereklidir")
        
    result = await verify_custom_model_api(model_name, api_key)
    return result

@router.post("/custom-models")
async def save_custom_model(body: dict):
    api_key = body.get("api_key", "").strip()
    if not api_key:
        raise HTTPException(status_code=400, detail="api_key gereklidir")
        
    name = body.get("name", "").strip()
    if not name:
        if api_key.startswith("AIza"):
            name = "gemini-2.0-flash"
        elif api_key.startswith("sk-ant-"):
            name = "claude-3-5-sonnet"
        elif api_key.startswith("sk-"):
            name = "gpt-4o"
        elif api_key.startswith("gsk_"):
            name = "llama3-70b-8192"
        else:
            name = "custom-model"

    model_id = f"model_{uuid.uuid4().hex[:8]}"
    add_user_model(model_id, name, api_key)
    return {"ok": True, "id": model_id, "name": name}

@router.delete("/custom-models/{model_id}")
async def remove_custom_model(model_id: str):
    delete_user_model(model_id)
    return {"ok": True}
