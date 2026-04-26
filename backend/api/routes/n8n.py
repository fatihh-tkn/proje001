import subprocess
import os
import psutil
import httpx
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from database.sql.session import get_db
from database.sql.models import N8nWorkflowCache
from core.logger import get_logger

logger = get_logger("routes.n8n")
router = APIRouter()

N8N_PROCESS = None

@router.get("/status", summary="n8n motorunun anlık durumunu getirir")
def get_status():
    global N8N_PROCESS
    if N8N_PROCESS and N8N_PROCESS.poll() is None:
        import urllib.request
        import urllib.error
        try:
            # Sadece port aktif mi diye hafif bir istek gonder
            urllib.request.urlopen("http://localhost:5678", timeout=1)
            return {"status": "running", "pid": N8N_PROCESS.pid, "url": "http://localhost:5678"}
        except Exception:
            # Process devrede ama port yanit vermiyor = npx su an paketi indiriyor veya nodejs ServerBoot evresinde.
            return {"status": "installing", "pid": N8N_PROCESS.pid}
    return {"status": "stopped"}

@router.post("/start", summary="n8n motorunu arka planda başlatır")
def start_n8n():
    global N8N_PROCESS
    if N8N_PROCESS and N8N_PROCESS.poll() is None:
        return {"status": "already_running"}
    
    env = os.environ.copy()
    try:
        is_windows = os.name == 'nt'
        cmd = ["n8n.cmd", "start"] if is_windows else ["n8n", "start"]
        
        env["N8N_SKIP_WEBHOOK_DEREGISTRATION_ON_SHUTDOWN"] = "true"
        env["N8N_USER_MANAGEMENT_DISABLED"] = "true"  # Oturum acma / Kullanici kayit ekranini tamamen kaldirir
        
        log_file = open("n8n_log.txt", "w")
        N8N_PROCESS = subprocess.Popen(
            cmd, 
            env=env,
            shell=False,
            stdout=log_file,
            stderr=subprocess.STDOUT
        )
        return {"status": "started", "pid": N8N_PROCESS.pid}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/stop", summary="Çalışan n8n motorunu durdurur")
def stop_n8n():
    global N8N_PROCESS
    if N8N_PROCESS and N8N_PROCESS.poll() is None:
        try:
            parent = psutil.Process(N8N_PROCESS.pid)
            for child in parent.children(recursive=True):
                child.kill()
            parent.kill()
            N8N_PROCESS = None
            return {"status": "stopped"}
        except Exception as e:
            logger.error("n8n durdurma hatası: %s", e, exc_info=True)
            return {"status": "error", "message": str(e)}
    return {"status": "not_running"}


@router.get("/workflows", summary="n8n API üzerinden kayıtlı tüm iş akışlarını çeker")
async def get_workflows(request: Request, db: Session = Depends(get_db)):
    """
    Yerel n8n sunucusuna bağlanarak workspace'teki iş akışlarını okur ve frontend formatına temizleyip döner.
    Bağlantı başarısız olursa veritabanındaki (cache) iş akışlarını `is_cached: True` bayrağı ile döner.
    """
    # Gelen istekte x-n8n-api-key var mı? Yoksa çevresel değişkene bak (Fallback)
    api_key = request.headers.get("x-n8n-api-key") or os.getenv("N8N_API_KEY", "")
    n8n_url = "http://localhost:5678/api/v1/workflows"
    
    headers = {
        "accept": "application/json"
    }
    if api_key:
        headers["X-N8N-API-KEY"] = api_key
    else:
        # API anahtarı tamamen yoksa uyarı dön
        return {
            "success": False,
            "need_auth": True,
            "error": "n8n API Key (Anahtarı) eksik."
        }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(n8n_url, headers=headers, timeout=5.0)
            
            if response.status_code == 200:
                data = response.json()
                
                # N8n sürümlerine göre veri doğrudan liste veya dict->data olarak dönebilir.
                if isinstance(data, list):
                    n8n_workflows = data
                else:
                    n8n_workflows = data.get("data", []) if isinstance(data, dict) else []
                
                formatted = []
                for wf in n8n_workflows:
                    if not isinstance(wf, dict): continue
                    
                    # Tagleri güvenli okuma
                    tags_raw = wf.get("tags")
                    tags = []
                    if isinstance(tags_raw, list):
                        for t in tags_raw:
                            if isinstance(t, dict):
                                tags.append(t.get("name", "Tag"))
                            else:
                                tags.append(str(t))
                    
                    nodes = wf.get("nodes")
                    if not isinstance(nodes, list): nodes = []
                    
                    trigger = "Manuel"
                    for node in nodes:
                        if not isinstance(node, dict): continue
                        node_type = node.get("type", "").lower()
                        if "webhook" in node_type:
                            trigger = "Webhook"
                            break
                        elif "schedule" in node_type or "cron" in node_type:
                            trigger = "Zamanlanmış"
                            break
                        elif "trigger" in node_type:
                            trigger = "Event"
                            break

                    active = wf.get("active", False)
                    created_at = wf.get("createdAt", "Bilinmiyor")
                    updated_at = wf.get("updatedAt", "Bilinmiyor")
                    
                    if isinstance(created_at, str) and "T" in created_at: created_at = created_at[:16].replace("T", " ")
                    if isinstance(updated_at, str) and "T" in updated_at: updated_at = updated_at[:16].replace("T", " ")
                    
                    workflow_data = {
                        "id": str(wf.get("id", "")),
                        "name": wf.get("name", "İsimsiz Şema"),
                        "active": bool(active),
                        "tags": tags,
                        "trigger": trigger,
                        "last_run": str(updated_at),
                        "success_rate": 100,
                        "executions_count": len(nodes) * 4,
                        "status": "healthy" if active else "stopped"
                    }

                    # Veritabanına UPSERT işlemi (Update or Insert)
                    existing = db.query(N8nWorkflowCache).filter(N8nWorkflowCache.id == workflow_data["id"]).first()
                    if existing:
                        for k, v in workflow_data.items():
                            setattr(existing, k, v)
                    else:
                        new_cache = N8nWorkflowCache(**workflow_data)
                        db.add(new_cache)
                    
                    # Frontend'in beklediği camelCase formata çevir
                    formatted.append({
                        "id": workflow_data["id"],
                        "name": workflow_data["name"],
                        "active": workflow_data["active"],
                        "tags": workflow_data["tags"],
                        "trigger": workflow_data["trigger"],
                        "lastRun": workflow_data["last_run"],
                        "successRate": workflow_data["success_rate"],
                        "executionsCount": workflow_data["executions_count"],
                        "status": workflow_data["status"]
                    })
                
                # Cache değişikliklerini kaydet
                db.commit()
                return {"success": True, "is_cached": False, "workflows": formatted}
            else:
                return {
                    "success": False, 
                    "error": f"n8n API Hatası ({response.status_code}). N8N_API_KEY ayarını kontrol edin."
                }
    
    except Exception as e:
        # Timeout, ConnectionRefusedError vs. gelirse Cache'den dön
        cached_workflows = db.query(N8nWorkflowCache).all()
        formatted = []
        for wf in cached_workflows:
            formatted.append({
                "id": wf.id,
                "name": wf.name,
                "active": wf.active,
                "tags": wf.tags,
                "trigger": wf.trigger,
                "lastRun": wf.last_run,
                "successRate": wf.success_rate,
                "executionsCount": wf.executions_count,
                "status": "offline" # Motor kapalı, offline etiketiyle damgala
            })
        
        # Eğer henüz DB'de hiç kayıt yoksa ve ilk çalışmadan patladıysa:
        if len(formatted) == 0:
            return {"success": False, "error": f"n8n bağlantı hatası: {str(e)} ve önbellek (cache) boş."}
            
        return {"success": True, "is_cached": True, "workflows": formatted}


@router.post("/workflows/{workflow_id}/run", summary="Bir n8n iş akışını manuel olarak tetikler")
async def run_workflow(workflow_id: str, request: Request):
    api_key = request.headers.get("x-n8n-api-key") or os.getenv("N8N_API_KEY", "")
    body = {}
    try:
        body = await request.json()
    except Exception as _e:
        logger.debug("Workflow run body ayrıştırılamadı, boş payload kullanılıyor: %s", _e)

    headers = {"accept": "application/json", "Content-Type": "application/json"}
    if api_key:
        headers["X-N8N-API-KEY"] = api_key

    try:
        async with httpx.AsyncClient() as client:
            url = f"http://localhost:5678/api/v1/workflows/{workflow_id}/run"
            response = await client.post(url, headers=headers, json=body, timeout=10.0)
            if response.status_code in (200, 201):
                return {"success": True, "status": "triggered", "data": response.json()}
            else:
                return {"success": False, "error": f"n8n Hata Kodu ({response.status_code})"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/workflows/{workflow_id}/toggle", summary="Bir n8n iş akışını (workflow) aktif veya pasif yapar")
async def toggle_workflow(workflow_id: str, request: Request):
    api_key = request.headers.get("x-n8n-api-key") or os.getenv("N8N_API_KEY", "")
    data = await request.json()
    make_active = data.get("active", False)
    
    action = "activate" if make_active else "deactivate"
    n8n_url = f"http://localhost:5678/api/v1/workflows/{workflow_id}/{action}"
    
    headers = {
        "accept": "application/json"
    }
    if api_key:
        headers["X-N8N-API-KEY"] = api_key

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(n8n_url, headers=headers, timeout=5.0)
            if response.status_code == 200:
                return {"success": True, "status": "activated" if make_active else "deactivated"}
            else:
                return {"success": False, "error": f"n8n Hata Kodu ({response.status_code})"}
    except Exception as e:
        return {"success": False, "error": str(e)}
