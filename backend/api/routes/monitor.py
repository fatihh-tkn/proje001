"""
API Monitoring Routes
LLM çağrılarını kaydeden ve istatistik sunan endpoint'ler.
"""
from fastapi import APIRouter, Query, Body, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import time
import uuid

router = APIRouter()

# In-memory log store
memory_logs: list[dict] = []

# Mock API Keys
mock_api_keys: list[dict] = [
    {
        "id": "key-openai-1",
        "name": "Production Key (OpenAI)",
        "provider": "openai",
        "preview": "sk-proj...8f9a",
        "status": "active",
        "usage": {"current": 12.50, "limit": 100.00},
        "requests": 1500,
        "lastUsed": "Yakın zamanda",
        "created": "2024-01-01"
    },
    {
        "id": "key-gemini-1",
        "name": "Dev Key (Gemini)",
        "provider": "google",
        "preview": "AIzaSy...5kqp",
        "status": "active",
        "usage": {"current": 2.10, "limit": 50.00},
        "requests": 560,
        "lastUsed": "Yakın zamanda",
        "created": "2024-01-03"
    }
]

COST_TABLE = {
    "gpt-4":            {"prompt": 0.03,   "completion": 0.06},
    "gpt-4-turbo":      {"prompt": 0.01,   "completion": 0.03},
    "gpt-3.5-turbo":    {"prompt": 0.0005, "completion": 0.0015},
    "claude-3-opus":    {"prompt": 0.015,  "completion": 0.075},
    "claude-3-sonnet":  {"prompt": 0.003,  "completion": 0.015},
    "gemini-1.5-pro":   {"prompt": 0.00125,"completion": 0.005},
    "gemini-2.0-flash": {"prompt": 0.0002, "completion": 0.0008},
    "gemma3:4b":        {"prompt": 0.0,    "completion": 0.0},
}

def calc_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    table = COST_TABLE.get(model, {"prompt": 0.001, "completion": 0.002})
    return (prompt_tokens / 1000) * table["prompt"] + (completion_tokens / 1000) * table["completion"]


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
    }

    memory_logs.append(log_entry)
    if len(memory_logs) > 5000:
        memory_logs.pop(0)

    return {"ok": True, "id": log_entry["id"]}


# ── Dashboard Özet ─────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def get_dashboard(project_id: Optional[str] = None):
    logs = memory_logs if not project_id else [l for l in memory_logs if l.get("projectId") == project_id]

    total_reqs  = len(logs)
    total_cost  = sum(l.get("cost", 0) for l in logs)
    total_tokens= sum(l.get("totalTokens", 0) for l in logs)
    latencies   = [l["duration"] for l in logs if l.get("duration", 0) > 0]
    avg_latency = sum(latencies) / len(latencies) if latencies else 0

    date_slots = [(datetime.utcnow() - timedelta(days=i)).strftime("%d/%m") for i in range(13, -1, -1)]
    daily_map  = {d: {"date": d, "requests": 0, "cost": 0.0, "latencySum": 0, "latencyCount": 0} for d in date_slots}

    for log in logs:
        try:
            d = datetime.fromisoformat(log["timestamp"]).strftime("%d/%m")
        except Exception:
            continue
        if d in daily_map:
            daily_map[d]["requests"] += 1
            daily_map[d]["cost"]     += log.get("cost", 0)
            if log.get("duration", 0) > 0:
                daily_map[d]["latencySum"]   += log["duration"]
                daily_map[d]["latencyCount"] += 1

    trend_data = [
        {
            "date":       v["date"],
            "requests":   v["requests"],
            "cost":       v["cost"],
            "avgLatency": (v["latencySum"] / v["latencyCount"]) if v["latencyCount"] else 0,
        }
        for v in daily_map.values()
    ]

    err_counts = {"500": 0, "429": 0, "400": 0, "Other": 0}
    for log in logs:
        if log.get("status") != "success":
            code = str(log.get("error", ""))
            if code in err_counts:
                err_counts[code] += 1
            else:
                err_counts["Other"] += 1

    ERROR_COLORS = {"500": "#ef4444", "429": "#f59e0b", "400": "#06b6d4", "Other": "#a855f7"}
    error_stats = [{"name": k, "value": v, "color": ERROR_COLORS.get(k, "#64748b")} for k, v in err_counts.items() if v > 0]

    MODEL_COLORS = {
        "gpt-4":            "#10b981",
        "gpt-3.5-turbo":    "#f59e0b",
        "claude-3-opus":    "#ec4899",
        "gemini-1.5-pro":   "#3b82f6",
        "gemini-2.0-flash": "#3b82f6",
        "gemma3:4b":        "#8b5cf6",
    }

    model_map: dict[str, dict] = {}
    for log in logs:
        m = log.get("model", "unknown")
        if m not in model_map:
            model_map[m] = {"requests": 0, "cost": 0.0}
        model_map[m]["requests"] += 1
        model_map[m]["cost"]     += log.get("cost", 0)

    top_models = sorted(model_map.items(), key=lambda x: -x[1]["requests"])[:5]
    top_models_fmt = [
        {
            "name":     name,
            "requests": stats["requests"],
            "percent":  round(stats["requests"] / total_reqs * 100) if total_reqs else 0,
            "color":    MODEL_COLORS.get(name, "#64748b"),
        }
        for name, stats in top_models
    ]

    model_costs_fmt = sorted(
        [{"name": n, "cost": s["cost"], "percent": round(s["cost"] / total_cost * 100) if total_cost else 0,
          "color": MODEL_COLORS.get(n, "#64748b")} for n, s in model_map.items()],
        key=lambda x: -x["cost"]
    )[:5]

    return JSONResponse({
        "totalRequests": total_reqs,
        "totalCost":     total_cost,
        "totalTokens":   total_tokens,
        "avgLatency":    avg_latency,
        "requests":      [{"date": d["date"], "success": d["requests"], "error": 0} for d in trend_data],
        "costs":         [{"date": d["date"], "amount": d["cost"]} for d in trend_data],
        "latencyTrend":  [{"date": d["date"], "value": d["avgLatency"]} for d in trend_data],
        "errors":        error_stats,
        "topModels":     top_models_fmt,
        "modelCosts":    model_costs_fmt,
    })

# ── Ham Log Listesi ──────────────────────────────────────────────────────────

@router.get("/logs")
async def get_logs(limit: int = Query(100, le=1000), project_id: Optional[str] = None):
    logs = memory_logs if not project_id else [l for l in memory_logs if l.get("projectId") == project_id]
    return {"logs": logs[-limit:][::-1], "total": len(logs)}

@router.delete("/logs")
async def clear_logs():
    memory_logs.clear()
    return {"ok": True, "message": "Tüm loglar temizlendi."}

# ── Sessions Endpoint ────────────────────────────────────────────────────────

@router.get("/sessions")
async def get_sessions(limit: int = 50):
    sessions_map: Dict[str, Any] = {}
    
    for log in memory_logs:
        sid = log.get("sessionId", "unknown_session")
        if sid not in sessions_map:
            sessions_map[sid] = {
                "sessionId": sid,
                "projectId": log.get("projectId"),
                "userId": "User",
                "provider": log.get("provider"),
                "model": log.get("model"),
                "startTime": log["timestamp"],
                "endTime": log["timestamp"],
                "messages": [],
                "totalTokens": 0,
                "totalCost": 0.0,
                "totalDuration": 0,
                "messageCount": 0,
                "status": "completed"
            }
        
        sess = sessions_map[sid]
        sess["endTime"] = log["timestamp"]  # update end time
        sess["totalTokens"] += log.get("totalTokens", 0)
        sess["totalCost"] += log.get("cost", 0.0)
        sess["totalDuration"] += log.get("duration", 0)
        sess["messageCount"] += 1
        
        # Kullanıcı prompt'u mesajı (varsa)
        if log.get("request"):
            sess["messages"].append({
                "id": log["id"] + "_user",
                "timestamp": log["timestamp"],
                "role": "user",
                "content": log.get("request", ""),
                "promptTokens": 0, "completionTokens": 0, "cost": 0, "duration": 0
            })
        
        # Assistant yanıtı mesajı
        content = log.get("response", "")
        if not content and log.get("status") == "error":
            content = f"[ERROR] {log.get('error')}"

        sess["messages"].append({
            "id": log["id"],
            "timestamp": log["timestamp"],
            "role": log.get("role", "assistant"),
            "content": content,
            "promptTokens": log.get("promptTokens", 0),
            "completionTokens": log.get("completionTokens", 0),
            "cost": log.get("cost", 0.0),
            "duration": log.get("duration", 0)
        })

    session_list = list(sessions_map.values())
    session_list.sort(key=lambda s: s["startTime"], reverse=True)
    return {"sessions": session_list[:limit]}

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    global memory_logs
    memory_logs = [log for log in memory_logs if log.get("sessionId") != session_id]
    return {"ok": True}

# ── API Keys Endpoint ────────────────────────────────────────────────────────

@router.get("/keys")
async def get_keys():
    return {"keys": mock_api_keys}

@router.post("/keys")
async def create_key(payload: dict = Body(...)):
    new_key = {
        "id": f"key-{int(time.time())}",
        "name": payload.get("name", "New Key"),
        "provider": payload.get("provider", "unknown"),
        "preview": "sk-" + uuid.uuid4().hex[:8] + "...",
        "status": "active",
        "usage": {"current": 0, "limit": payload.get("limit", 100.0)},
        "requests": 0,
        "lastUsed": "Hiç",
        "created": datetime.utcnow().strftime("%Y-%m-%d")
    }
    mock_api_keys.append(new_key)
    return new_key

@router.delete("/keys/{key_id}")
async def delete_key(key_id: str):
    global mock_api_keys
    mock_api_keys = [k for k in mock_api_keys if k["id"] != key_id]
    return {"ok": True}

