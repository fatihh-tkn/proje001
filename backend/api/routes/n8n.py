import subprocess
import os
import psutil
from fastapi import APIRouter

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
            return {"status": "error", "message": str(e)}
    return {"status": "not_running"}


