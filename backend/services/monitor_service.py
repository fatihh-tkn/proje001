import uuid
import httpx
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from core.db_bridge import get_all_logs_for_dashboard

# In-memory custom name store mapping mac_ip -> alias
_computer_aliases: Dict[str, str] = {}

AI_MODELS: list[dict] = [
    {
        "id": "gpt-4o",
        "name": "GPT-4o",
        "provider": "OpenAI",
        "provider_key": "openai",
        "description": "OpenAI'ın en yetenekli çok modlu modeli — metin, görsel ve ses işleme kapasitesi ile.",
        "avg_latency": "1.1s",
        "cost_per_1k": "$0.005",
        "max_tokens": "128,000",
        "features": ["Çok Modlu", "Görsel Analiz", "128K Bağlam", "JSON Modu"]
    },
    {
        "id": "gpt-4-turbo",
        "name": "GPT-4 Turbo",
        "provider": "OpenAI",
        "provider_key": "openai",
        "description": "Daha hızlı ve uygun maliyetli GPT-4 — 128K token bağlam ile büyük doküman analizi.",
        "avg_latency": "900ms",
        "cost_per_1k": "$0.01",
        "max_tokens": "128,000",
        "features": ["Gelişmiş Mantık", "Kod Yazma", "Uzun Bağlam"]
    },
    {
        "id": "gpt-3.5-turbo",
        "name": "GPT-3.5 Turbo",
        "provider": "OpenAI",
        "provider_key": "openai",
        "description": "Hızlı ve ekonomik, çoğu temel görev için ideal. Üretim ortamlarında en çok tercih edilen model.",
        "avg_latency": "400ms",
        "cost_per_1k": "$0.0005",
        "max_tokens": "16,385",
        "features": ["Hız", "Düşük Maliyet", "Sohbet", "Fine-tune"]
    },
    {
        "id": "claude-3-5-sonnet",
        "name": "Claude 3.5 Sonnet",
        "provider": "Anthropic",
        "provider_key": "anthropic",
        "description": "Anthropic'in en yeni ve en zeki modeli — kod yazma ve analiz görevlerinde üstün başarı.",
        "avg_latency": "1.5s",
        "cost_per_1k": "$0.003",
        "max_tokens": "200,000",
        "features": ["Artifacts", "Kod Yazma", "200K Bağlam", "Bilgisayar Kullanımı"]
    },
    {
        "id": "claude-3-opus",
        "name": "Claude 3 Opus",
        "provider": "Anthropic",
        "provider_key": "anthropic",
        "description": "Karmaşık analizler ve yaratıcı yazım için Anthropic'in güçlü büyük modeli.",
        "avg_latency": "2.5s",
        "cost_per_1k": "$0.015",
        "max_tokens": "200,000",
        "features": ["Yaratıcılık", "Uzun Bağlam", "Hassasiyet"]
    },
    {
        "id": "gemini-2.0-flash",
        "name": "Gemini 2.0 Flash",
        "provider": "Google",
        "provider_key": "google",
        "description": "Ultra hızlı, düşük gecikmeli Google'ın yeni nesil modeli. Real-time uygulamalar için ideal.",
        "avg_latency": "250ms",
        "cost_per_1k": "$0.0002",
        "max_tokens": "1,000,000",
        "features": ["Ultra Hız", "Real-time AI", "1M Bağlam", "Ekonomik"]
    },
    {
        "id": "gemini-1.5-pro",
        "name": "Gemini 1.5 Pro",
        "provider": "Google",
        "provider_key": "google",
        "description": "1 milyon+ token bağlam penceresiyle çok modlu devrim — video, ses ve metin analizi.",
        "avg_latency": "1.8s",
        "cost_per_1k": "$0.00125",
        "max_tokens": "1,000,000+",
        "features": ["Devasa Bağlam", "Video Analiz", "Google Ekosistemi"]
    },
    {
        "id": "gemma3:4b",
        "name": "Gemma 3 4B",
        "provider": "Local (Ollama)",
        "provider_key": "local",
        "description": "Google'ın açık kaynaklı hafif modeli — tamamen yerel çalışır, gizlilik odaklı.",
        "avg_latency": "~local",
        "cost_per_1k": "Ücretsiz",
        "max_tokens": "8,192",
        "features": ["Gizlilik", "Yerel Çalışma", "Ücretsiz", "Offline"]
    },
    {
        "id": "gemma3:12b",
        "name": "Gemma 3 12B",
        "provider": "Local (Ollama)",
        "provider_key": "local",
        "description": "Gemma'nın büyük versiyonu — daha güçlü akıl yürütme, yine de tamamen yerel.",
        "avg_latency": "~local",
        "cost_per_1k": "Ücretsiz",
        "max_tokens": "8,192",
        "features": ["Gizlilik", "Yerel Çalışma", "Gelişmiş Mantık", "Ücretsiz"]
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


def get_dashboard_stats(project_id: Optional[str] = None) -> dict:
    logs = get_all_logs_for_dashboard(project_id)
    total_reqs  = len(logs)
    total_cost  = sum(l.get("cost", 0) for l in logs)
    total_tokens= sum(l.get("totalTokens", 0) for l in logs)
    latencies   = [l["duration"] for l in logs if l.get("duration", 0) > 0]
    avg_latency = sum(latencies) / len(latencies) if latencies else 0

    date_slots = [(datetime.utcnow() - timedelta(days=i)).strftime("%d/%m") for i in range(13, -1, -1)]
    daily_map  = {d: {"date": d, "requests": 0, "cost": 0.0, "latencySum": 0, "latencyCount": 0, "models": {}} for d in date_slots}

    for log in logs:
        try:
            d = datetime.fromisoformat(log["timestamp"]).strftime("%d/%m")
        except Exception:
            continue
        if d in daily_map:
            daily_map[d]["requests"] = int(daily_map[d].get("requests", 0)) + 1
            daily_map[d]["cost"] = float(daily_map[d].get("cost", 0.0)) + float(log.get("cost", 0))
            dur = float(log.get("duration", 0) or 0)
            if dur > 0:
                daily_map[d]["latencySum"] = float(daily_map[d].get("latencySum", 0)) + dur
                daily_map[d]["latencyCount"] = int(daily_map[d].get("latencyCount", 0)) + 1
            
            m = log.get("model", "unknown")
            if m not in daily_map[d]["models"]:
                daily_map[d]["models"][m] = {"success": 0, "error": 0}
            
            if log.get("status") == "success":
                daily_map[d]["models"][m]["success"] += 1
            else:
                daily_map[d]["models"][m]["error"] += 1
    requests_trend = []
    costs_trend = []
    latency_trend = []
    for d in date_slots:
        daily_reqs = float(daily_map[d].get("requests", 0))
        lat_count = float(daily_map[d].get("latencyCount", 1))
        lat_count = 1 if lat_count == 0 else lat_count
        lat_sum = float(daily_map[d].get("latencySum", 0))
        cost = float(daily_map[d].get("cost", 0))
        
        avg_lat = lat_sum / lat_count if daily_reqs > 0 else 0
        
        requests_trend.append({
            "date": d,
            "models": daily_map[d]["models"],
            "success": sum(m.get("success", 0) for m in daily_map[d]["models"].values()),
            "error": sum(m.get("error", 0) for m in daily_map[d]["models"].values()),
        })
        costs_trend.append({"date": d, "amount": cost})
        latency_trend.append({"date": d, "value": avg_lat})

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

    return {
        "totalRequests": total_reqs,
        "totalCost":     total_cost,
        "totalTokens":   total_tokens,
        "avgLatency":    avg_latency,
        "requests":      requests_trend,
        "costs":         costs_trend,
        "latencyTrend":  latency_trend,

        "errors":        error_stats,
        "topModels":     top_models_fmt,
        "modelCosts":    model_costs_fmt,
    }


def get_sessions_stats(limit: int = 50) -> list[dict]:
    all_logs = get_all_logs_for_dashboard()
    sessions_map: Dict[str, Any] = {}
    
    for log in all_logs:
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
                "status": "completed",
                "ip": log.get("ip", "unknown"),
                "mac": log.get("mac", "unknown")
            }
        
        sess = sessions_map[sid]
        sess["endTime"] = log["timestamp"]
        sess["totalTokens"] += log.get("totalTokens", 0)
        sess["totalCost"] += log.get("cost", 0.0)
        sess["totalDuration"] += log.get("duration", 0)
        sess["messageCount"] += 1
        
        if log.get("request"):
            sess["messages"].append({
                "id": log["id"] + "_user",
                "timestamp": log["timestamp"],
                "role": "user",
                "content": log.get("request", ""),
                "promptTokens": 0, "completionTokens": 0, "cost": 0, "duration": 0
            })
        
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
    return session_list[:limit]


def get_computers_stats() -> list[dict]:
    all_logs = get_all_logs_for_dashboard()
    comp_map: Dict[str, Any] = {}
    
    # Predictable naming: Sort by first seen timestamp
    unique_devices = []
    seen = set()
    for log in sorted(all_logs, key=lambda x: x["timestamp"]):
        key = f"{log.get('mac')}_{log.get('ip')}"
        if key not in seen:
            unique_devices.append(key)
            seen.add(key)
            
    device_names = {key: f"computer{str(i+1).zfill(3)}" for i, key in enumerate(unique_devices)}

    for log in all_logs:
        mac = log.get("mac", "00:00:00:00:00:00")
        ip = log.get("ip", "127.0.0.1")
        key = f"{mac}_{ip}"
        cid = device_names.get(key, "computer999")
        
        if cid not in comp_map:
            comp_map[cid] = {
                "id": cid,
                "ip": ip,
                "mac": mac,
                "lastActive": log["timestamp"],
                "firstSeen": log["timestamp"],
                "totalRequests": 0,
                "totalCost": 0.0,
                "totalTokens": 0,
                "models": set(),
                "logs": []
            }
        
        c = comp_map[cid]
        c["totalRequests"] += 1
        c["totalCost"] += log.get("cost", 0.0)
        c["totalTokens"] += log.get("totalTokens", 0)
        c["models"].add(log.get("model"))
        if log["timestamp"] > c["lastActive"]:
            c["lastActive"] = log["timestamp"]
        if log["timestamp"] < c["firstSeen"]:
            c["firstSeen"] = log["timestamp"]
            
        c["logs"].append(log)

    result = []
    for cid, data in comp_map.items():
        data["models"] = list(data["models"])
        # Sort logs by timestamp
        data["logs"].sort(key=lambda x: x["timestamp"], reverse=True)
        result.append(data)
        
    result.sort(key=lambda x: x["id"])
    return result


def set_computer_alias(mac: str, ip: str, name: str) -> None:
    _computer_aliases[f"{mac}_{ip}"] = name

def remove_computer_alias(mac: str, ip: str) -> None:
    _computer_aliases.pop(f"{mac}_{ip}", None)


async def verify_custom_model_api(model_name: str, api_key: str) -> dict:
    available_models = []
    provider = "Bilinmeyen"

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            if model_name:
                # Canlı İstek Testi
                if api_key.startswith("AIza"):
                    provider = "Google"
                    payload = {"contents": [{"parts": [{"text": "hi"}]}], "generationConfig": {"maxOutputTokens": 1}}
                    res = await client.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}", json=payload)
                    return {"ok": res.status_code == 200, "provider": provider, "models": [model_name] if res.status_code == 200 else []}
                
                elif api_key.startswith("sk-ant-"):
                    provider = "Anthropic"
                    headers = {"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
                    payload = {"model": model_name, "max_tokens": 1, "messages": [{"role": "user", "content": "hi"}]}
                    res = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
                    return {"ok": res.status_code == 200, "provider": provider, "models": [model_name] if res.status_code == 200 else []}
                
                elif api_key.startswith("sk-") or api_key.startswith("gsk_"):
                    provider = "OpenAI/Groq"
                    url = "https://api.openai.com/v1/chat/completions" if api_key.startswith("sk-") else "https://api.groq.com/openai/v1/chat/completions"
                    headers = {"Authorization": f"Bearer {api_key}"}
                    payload = {"model": model_name, "max_tokens": 1, "messages": [{"role": "user", "content": "hi"}]}
                    res = await client.post(url, headers=headers, json=payload)
                    return {"ok": res.status_code == 200, "provider": provider, "models": [model_name] if res.status_code == 200 else []}
                
                else:
                    return {"ok": False, "provider": "Bilinmeyen", "models": []}

            # Toplu Model Çekme Okuması
            if api_key.startswith("AIza"):
                provider = "Google"
                res = await client.get(f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}")
                if res.status_code == 200:
                    data = res.json()
                    for m in data.get("models", []):
                        if "generateContent" in m.get("supportedGenerationMethods", []):
                            name = m.get("name", "").replace("models/", "")
                            available_models.append(name)
                else:
                    return {"ok": False, "provider": provider, "models": []}

            elif api_key.startswith("sk-ant-"):
                provider = "Anthropic"
                available_models = ["claude-3-5-sonnet-20240620", "claude-3-opus-20240229", "claude-3-sonnet-20240229"]

            elif api_key.startswith("sk-") or api_key.startswith("gsk_"):
                provider = "OpenAI/Groq"
                url = "https://api.openai.com/v1/models" if api_key.startswith("sk-") else "https://api.groq.com/openai/v1/models"
                res = await client.get(url, headers={"Authorization": f"Bearer {api_key}"})
                if res.status_code == 200:
                    data = res.json()
                    available_models = [m.get("id") for m in data.get("data", [])]
                else:
                    return {"ok": False, "provider": provider, "models": []}
            else:
                return {"ok": False, "provider": "Bilinmeyen", "models": []}
                
        except Exception as e:
            print("Model çekme hatası:", e)
            return {"ok": False, "provider": provider, "models": []}

    return {
        "ok": len(available_models) > 0, 
        "provider": provider, 
        "models": available_models
    }
