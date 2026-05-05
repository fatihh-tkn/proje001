from fastapi import APIRouter, Query, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Optional
from datetime import datetime
import time
import uuid
import asyncio
import json

from core.db_bridge import (
    init_db, add_log_to_db, get_logs_from_db, clear_logs_from_db,
    get_user_models, add_user_model, delete_user_model
)
from services.monitor_service import (
    AI_MODELS, calc_cost, get_dashboard_stats, get_sessions_stats,
    get_computers_stats, verify_custom_model_api,
    set_computer_alias, remove_computer_alias,
    get_user_consumption,
)
from services.session_service import get_pcs_with_sessions, deactivate_session, heartbeat as session_heartbeat
from services.storage_service import get_storage_overview, get_user_documents, update_user_quota

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
async def get_logs(
    limit: int = Query(200, le=2000),
    project_id: Optional[str] = None,
    user_id: Optional[str] = None,
    model: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
):
    logs = get_logs_from_db(
        limit=limit,
        project_id=project_id,
        user_id=user_id,
        model=model,
        status=status,
        date_from=date_from,
        date_to=date_to,
        search=search,
    )
    return {"logs": logs, "total": len(logs)}


@router.get("/logs/stream")
async def stream_logs(
    user_id: Optional[str] = None,
    model: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
):
    """
    SSE stream: ilk yanıtta son 200 logu gönderir, sonra 3 sn'de bir
    yeni logları (since_id'den sonraki) push eder.
    """
    async def event_generator():
        # İlk snapshot
        logs = get_logs_from_db(
            limit=200,
            user_id=user_id, model=model, status=status,
            date_from=date_from, date_to=date_to, search=search,
        )
        last_id = logs[0]["id"] if logs else None
        payload = json.dumps({"type": "snapshot", "logs": logs})
        yield f"data: {payload}\n\n"

        # Polling — yeni loglar gelince push et
        while True:
            await asyncio.sleep(3)
            try:
                new_logs = get_logs_from_db(
                    limit=50,
                    user_id=user_id, model=model, status=status,
                    date_from=date_from, date_to=date_to, search=search,
                    since_id=last_id,
                )
                if new_logs:
                    last_id = new_logs[0]["id"]
                    payload = json.dumps({"type": "new", "logs": new_logs})
                    yield f"data: {payload}\n\n"
                else:
                    yield "data: {\"type\":\"ping\"}\n\n"
            except Exception:
                yield "data: {\"type\":\"ping\"}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.delete("/logs")
async def clear_logs():
    clear_logs_from_db()
    return {"ok": True, "message": "Tüm loglar temizlendi."}


# ── Kullanıcı Tüketimi ────────────────────────────────────────────────────────

@router.get("/user-usage")
async def get_user_usage():
    """Kullanıcı bazlı AI tüketim özeti (token, maliyet, istek, modeller)."""
    users = get_user_consumption()
    return {"users": users, "total": len(users)}


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


# ── PC + Oturum Yönetimi ──────────────────────────────────────────────────────

@router.get("/pcs")
async def get_pcs():
    """PC listesi ve her PC'nin aktif / toplam oturum bilgisi."""
    pcs = get_pcs_with_sessions()
    return {"pcs": pcs}


@router.post("/heartbeat")
async def pc_heartbeat(body: dict, request: Request):
    """
    Uygulama açıkken frontend tarafından periyodik olarak çağrılır.
    PC'yi bilgisayar_oturumlari tablosuna kaydeder / son aktiviteyi günceller.
    Hiçbir zaman hata döndürmez — bloklamaz.
    """
    pc_id = (body.get("pc_id") or body.get("mac") or "").strip()
    tab_id = (body.get("tab_id") or "").strip()
    if not pc_id or not tab_id:
        return {"ok": False, "reason": "pc_id veya tab_id eksik"}
    client_ip = request.client.host if request.client else None
    try:
        session_heartbeat(
            pc_id=pc_id,
            tab_id=tab_id,
            user_id=body.get("user_id"),
            ip=client_ip,
        )
    except Exception:
        pass  # Heartbeat asla istemciyi bloklamaz
    return {"ok": True}


@router.delete("/pcs/{pc_id}/sessions/{session_kimlik}")
async def kick_pc_session(pc_id: str, session_kimlik: str):  # noqa: ARG001 pc_id URL yapısı için
    """Belirtilen oturumu admin olarak sonlandırır."""
    ok = deactivate_session(session_kimlik)
    if not ok:
        raise HTTPException(status_code=404, detail="Oturum bulunamadı")
    return {"ok": True}


# ── Depolama / Belge Kotası ───────────────────────────────────────────────────

@router.get("/storage")
async def get_storage():
    """Sistem geneli + kullanıcı bazlı depolama özeti."""
    return get_storage_overview()


@router.get("/storage/{user_id}/documents")
async def get_storage_user_documents(user_id: str):
    """Bir kullanıcının yüklediği tüm belgelerin detayı."""
    docs = get_user_documents(user_id)
    return {"documents": docs, "count": len(docs)}


@router.patch("/storage/{user_id}/quota")
async def patch_storage_quota(user_id: str, body: dict):
    """
    Kullanıcı kotasını günceller.
    body: { "quota_mb": 500.0, "quota_files": 100 }
    Negatif (-1) gönderilirse sınırsız (NULL) olur.
    """
    quota_mb = body.get("quota_mb")
    quota_files = body.get("quota_files")
    ok = update_user_quota(
        user_id=user_id,
        quota_mb=float(quota_mb) if quota_mb is not None else None,
        quota_files=int(quota_files) if quota_files is not None else None,
    )
    if not ok:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return {"ok": True}


# ── Modeller Endpoint ──────────────────────────────────────────────────────────

@router.get("/catalog")
async def get_models():
    user_models = get_user_models()
    return {"models": user_models}


@router.get("/custom-models/providers")
async def list_providers():
    """Frontend'in 'Sağlayıcı' dropdown'unu beslemesi için statik liste."""
    from services import provider_registry
    return {"providers": provider_registry.list_provider_choices()}


# ── Kullanıcı Modelleri Yönetimi ─────────────────────────────────────────────

@router.post("/custom-models/verify")
async def verify_custom_model(body: dict):
    api_key = body.get("api_key", "").strip()
    model_name = body.get("model_name", "").strip()
    provider = (body.get("provider") or "").strip()
    base_url = (body.get("base_url") or "").strip()
    if not api_key:
        raise HTTPException(status_code=400, detail="api_key gereklidir")

    result = await verify_custom_model_api(
        model_name, api_key,
        provider=provider or None,
        base_url=base_url or None,
    )
    return result

@router.post("/custom-models")
async def save_custom_model(body: dict):
    api_key = body.get("api_key", "").strip()
    if not api_key:
        raise HTTPException(status_code=400, detail="api_key gereklidir")

    provider = (body.get("provider") or "").strip().lower() or None
    base_url = (body.get("base_url") or "").strip() or None

    name = body.get("name", "").strip()
    if not name:
        # Provider registry üzerinden default model adını seç
        from services import provider_registry
        pid = provider or provider_registry.detect_from_key(api_key) or "openai"
        spec = provider_registry.get(pid)
        defaults = (spec or {}).get("default_models") or []
        name = defaults[0] if defaults else "custom-model"

    model_id = f"model_{uuid.uuid4().hex[:8]}"
    add_user_model(model_id, name, api_key, provider=provider, base_url=base_url)
    return {"ok": True, "id": model_id, "name": name}

@router.post("/custom-models/{model_id}/verify")
async def verify_existing_custom_model(model_id: str):
    """
    Kayıtlı modelin durumunu yeniden doğrular. Frontend'in tam api_key
    bilmesine gerek YOK — backend DB'den kendisi çeker. (Güvenlik
    katmanı 5: api_key hiçbir şekilde HTTP response'a girmez.)
    """
    # Internal çağrı: api_key'e ihtiyacımız var, dolayısıyla include_secret=True
    models = get_user_models(include_secret=True)
    model = next((m for m in models if m["id"] == model_id), None)
    if not model:
        raise HTTPException(status_code=404, detail="Model bulunamadı")

    return await verify_custom_model_api(
        model.get("name") or "",
        model["api_key"],
        provider=model.get("provider"),
        base_url=model.get("base_url"),
    )


@router.delete("/custom-models/{model_id}")
async def remove_custom_model(model_id: str):
    delete_user_model(model_id)
    return {"ok": True}
