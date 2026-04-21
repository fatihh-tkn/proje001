from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from datetime import datetime, timezone
import bcrypt

from database.sql.session import get_db
from database.sql.models import Kullanici, Belge, AIModeli, DenetimIzi, ApiLogu as ApiLog


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

router = APIRouter()

class RegisterRequest(BaseModel):
    tam_ad: str
    eposta: str
    sifre: str

class LoginRequest(BaseModel):
    eposta: str
    sifre: str

def hash_password(password: str) -> str:
    # rounds=10: ~80ms (default 12 = ~300ms, still bcrypt-secure)
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    try:
        yeni_kullanici = Kullanici(
            tam_ad=req.tam_ad,
            eposta=req.eposta,
            sifre_karma=hash_password(req.sifre)
        )
        db.add(yeni_kullanici)
        db.commit()
        db.refresh(yeni_kullanici)
        return {"mesaj": "Kayıt başarılı", "kimlik": yeni_kullanici.kimlik}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kullanılıyor.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Sunucu hatası: Can't register user")

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    from database.sql.init_db import is_db_ready
    if not is_db_ready():
        raise HTTPException(status_code=503, detail="Sistem henüz hazırlanıyor, lütfen birkaç saniye sonra tekrar deneyin.")
    # E-postaya gore kullaniciyi bul (aktif filtresi yok - durumu biz kontrol ederiz)
    kullanici = db.query(Kullanici).filter(
        Kullanici.eposta == req.eposta
    ).first()
    
    # 1. Kullanıcı sistemde yok
    if not kullanici:
        # epostayi bulamadik, kime log atalim? sistem bazinda atabiliriz.
        log = DenetimIzi(islem_turu="LOGIN_FAILED_NOTFOUND", eski_deger={"eposta": req.eposta}, ip_adresi="N/A")
        db.add(log)
        db.commit()
        raise HTTPException(
            status_code=404,
            detail="Bu e-posta adresiyle kayıtlı bir hesap bulunamadı. Lütfen bilgilerinizi kontrol edin veya yeni kayıt oluşturun."
        )
    
    # 2. Hesap askiya alinmis mi? (sifre kontrolunden once)
    # aktif_mi None donebilir, bu yüzden is False ile karsilastir
    if kullanici.aktif_mi is False or kullanici.aktif_mi == 0:
        log = DenetimIzi(kullanici_kimlik=kullanici.kimlik, islem_turu="LOGIN_FAILED_SUSPENDED", ip_adresi="N/A")
        db.add(log)
        db.commit()
        raise HTTPException(
            status_code=403,
            detail="Bu hesap yönetici tarafından askıya alınmıştır. Erişim hakkınızı geri kazanmak için sistem yöneticinizle iletişime geçin."
        )
    
    # 3. Sifre yanlis
    if not kullanici.sifre_karma or not verify_password(req.sifre, kullanici.sifre_karma):
        log = DenetimIzi(kullanici_kimlik=kullanici.kimlik, islem_turu="LOGIN_FAILED_PASSWORD", ip_adresi="N/A")
        db.add(log)
        db.commit()
        raise HTTPException(
            status_code=401,
            detail="Girdiğiniz şifre hatalı. Lütfen tekrar deneyin veya 'Şifremi Unuttum' seçeneğini kullanın."
        )

    # Basarili giris - son giris tarihini guncelle
    kullanici.son_giris_tarihi = _now_iso()
    log = DenetimIzi(kullanici_kimlik=kullanici.kimlik, islem_turu="LOGIN_SUCCESS", ip_adresi="N/A")
    db.add(log)
    db.commit()
    db.refresh(kullanici)

    return {
        "mesaj": "Giriş başarılı",
        "id": kullanici.kimlik,
        "tam_ad": kullanici.tam_ad,
        "meta": kullanici.meta or {},
        "super": kullanici.super_kullanici_mi or False
    }

@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    from sqlalchemy import select, func
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    users = db.query(Kullanici).all()

    # --- Session counts (bugünkü LOGIN_SUCCESS olayları) ---
    session_rows = (
        db.query(DenetimIzi.kullanici_kimlik, func.count(DenetimIzi.kimlik).label("cnt"))
        .filter(
            DenetimIzi.islem_turu == "LOGIN_SUCCESS",
            DenetimIzi.olusturulma_tarihi.like(f"{today}%")
        )
        .group_by(DenetimIzi.kullanici_kimlik)
        .all()
    )
    session_counts = {row.kullanici_kimlik: row.cnt for row in session_rows}

    # --- Token totals (bugünkü API logları) ---
    from database.sql.models import ApiLogu as ApiLog
    token_rows = (
        db.query(ApiLog.kullanici_kimlik, func.coalesce(func.sum(ApiLog.toplam_token), 0).label("tok"))
        .filter(ApiLog.olusturulma_tarihi.like(f"{today}%"))
        .group_by(ApiLog.kullanici_kimlik)
        .all()
    )
    token_counts = {row.kullanici_kimlik: int(row.tok) for row in token_rows}

    return [{
        "id": u.kimlik,
        "name": u.tam_ad,
        "email": u.eposta,
        "role": "Sistem Yöneticisi" if u.super_kullanici_mi else "Standart Kullanıcı",
        "status": "Aktif" if u.aktif_mi else "Askıya Alındı",
        "lastLogin": u.son_giris_tarihi or "Bilinmiyor",
        "meta": u.meta or {},
        "department": (u.meta or {}).get("department", "Belirtilmemiş"),
        "sessionCount": session_counts.get(u.kimlik, 0),
        "totalTokens": token_counts.get(u.kimlik, 0),
    } for u in users]

class StatusUpdateRequest(BaseModel):
    status: str

@router.put("/users/{user_id}/status")
def update_user_status(user_id: str, req: StatusUpdateRequest, db: Session = Depends(get_db)):
    user = db.query(Kullanici).filter(Kullanici.kimlik == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Durumu bool olarak kaydet - 'Aktif' string'i True'ya, diger her sey False'a dönüştür
    yeni_aktif_durum = (req.status == "Aktif")
    user.aktif_mi = yeni_aktif_durum
    db.commit()
    db.refresh(user)  # Session cache'ini temizle, son degeri DB'den yeniden yukle
    
    # Double-check: Commit sonrasi deger bekledigiyle aynı mı?
    if user.aktif_mi != yeni_aktif_durum:
        raise HTTPException(status_code=500, detail="Durum kaydedilemedi, tekrar deneyin.")
    
    return {
        "mesaj": "Durum güncellendi",
        "user_id": user_id,
        "aktif_mi": user.aktif_mi,
        "yeni_durum": "Aktif" if user.aktif_mi else "Askıya Alındı"
    }

class RoleUpdateRequest(BaseModel):
    role: str

@router.put("/users/{user_id}/role")
def update_user_role(user_id: str, req: RoleUpdateRequest, db: Session = Depends(get_db)):
    user = db.query(Kullanici).filter(Kullanici.kimlik == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    is_super = True if req.role == "Sistem Yöneticisi" else False
    user.super_kullanici_mi = is_super
    db.commit()
    db.refresh(user)
    
    return {
        "mesaj": "Rol güncellendi",
        "user_id": user_id,
        "yeni_rol": "Sistem Yöneticisi" if user.super_kullanici_mi else "Standart Kullanıcı"
    }

@router.put("/users/{user_id}/meta")
def update_user_meta(user_id: str, meta: dict, db: Session = Depends(get_db)):
    user = db.query(Kullanici).filter(Kullanici.kimlik == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    # We replace entirely or merge based on logic, we will replace here for simple toggle state
    user.meta = meta
    db.commit()
    return {"mesaj": "Ayarlar güncellendi"}


class ProfileUpdateRequest(BaseModel):
    tam_ad: str

@router.patch("/users/{user_id}/profile")
def update_user_profile(user_id: str, req: ProfileUpdateRequest, db: Session = Depends(get_db)):
    """Kullanıcının profil bilgilerini (ad soyad) günceller."""
    user = db.query(Kullanici).filter(Kullanici.kimlik == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if not req.tam_ad.strip():
        raise HTTPException(status_code=400, detail="Ad soyad boş olamaz")
    user.tam_ad = req.tam_ad.strip()
    db.commit()
    return {"mesaj": "Profil güncellendi", "tam_ad": user.tam_ad}

@router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(Kullanici).filter(Kullanici.kimlik == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    db.delete(user)
    db.commit()
    return {"mesaj": "Kullanıcı başarıyla silindi"}

@router.get("/users/{user_id}/dashboard")
def get_user_dashboard(user_id: str, db: Session = Depends(get_db)):
    user = db.query(Kullanici).filter(Kullanici.kimlik == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
    belgeler_db = db.query(Belge).filter(Belge.yukleyen_kimlik == user_id).order_by(Belge.olusturulma_tarihi.desc()).limit(3).all()
    recent_docs = []
    for b in belgeler_db:
        recent_docs.append({
            "name": b.dosya_adi,
            "type": b.dosya_turu.upper() if b.dosya_turu else "FILE",
            "date": b.olusturulma_tarihi.split("T")[0] if b.olusturulma_tarihi else "Yakın Zamanda"
        })
        
    if not recent_docs:
         recent_docs = [
             {"name": "Maliyet_Analizi.xlsx", "type": "XLSX", "date": "Dün"},
             {"name": "Kullanim_Rehberi.pdf", "type": "PDF", "date": "1 Hafta Önce"}
         ]

    meta = user.meta or {}
    
    egitimler = meta.get("egitimler", [
        {"isim": "Temel YZ Kullanım Eğitimi", "durum": "Tamamlandı", "renk": "emerald"},
        {"isim": "İleri Seviye Prompt Mühendisliği", "durum": "%60 Devam Ediyor", "renk": "amber"}
    ])
    
    talepler = meta.get("talepler", [
        {"mesaj": "Pazarlama analiz modeline erişim izni talep ediyorum.", "durum": "Onaylandı", "tarih": "12 Mart", "renk": "emerald"},
        {"mesaj": "Grafik çizim AI aracı kotasının artırılması gerekiyor.", "durum": "İncelemede", "tarih": "Bugün", "renk": "amber"}
    ])
    
    return {
        "egitimler": egitimler,
        "belgeler": recent_docs,
        "talepler": talepler
    }

@router.get("/users/{user_id}/permissions-context")
def get_permissions_context(user_id: str, db: Session = Depends(get_db)):
    """Fetches real system objects to build dynamic permission toggles."""
    user = db.query(Kullanici).filter(Kullanici.kimlik == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
    meta = user.meta or {}

    # 1. Real System Models
    models_db = db.query(AIModeli).filter(AIModeli.aktif_mi == True).all()
    models = []
    
    # Her ihtimale karsi oncelikle default zorunlu modelleri ekleyelim.
    # Eger DB zaten onlari barindiriyorsa sorun yok, ayni id'leri cakismaz.
    for m in models_db:
        parts = [p for p in [m.tedarikci, m.model_id] if p]
        models.append({
            "key": f"model_{m.kimlik}",
            "label": m.ad,
            "model_id": m.model_id or "",
            "desc": " · ".join(parts) if parts else "Model bilgisi yok"
        })
        

    # 2. Real Document / Archive Access (Specific Files and Folders)
    all_docs = db.query(Belge).limit(100).all()
    archives = []
    
    # Group into folders and files
    folders = [doc for doc in all_docs if doc.dosya_turu == 'folder']
    files = [doc for doc in all_docs if doc.dosya_turu != 'folder']
    
    for f in folders:
        archives.append({
            "id": f.kimlik,
            "parent_id": (f.meta or {}).get("klasor_kimlik"),
            "is_folder": True,
            "key": f"archive_folder_{f.kimlik}",
            "label": f.dosya_adi,
            "desc": "Klasör"
        })
        
    for f in files:
        archives.append({
            "id": f.kimlik,
            "parent_id": (f.meta or {}).get("klasor_kimlik"),
            "is_folder": False,
            "key": f"archive_file_{f.kimlik}",
            "label": f.dosya_adi,
            "desc": f.dosya_turu.upper() if f.dosya_turu else 'DOSYA'
        })
        
    if not archives:
        archives.append({
            "key": "archive_empty",
            "label": "Arşiv Boş",
            "desc": "Sistemde listelenecek belge bulunamadı."
        })

    # 3. System UI Tabs — keys must match SettingsMenu.jsx tab keys
    system_tabs = [
        {"key": "ui_file_processing", "label": "Dosya İşleme", "desc": "Dosya yükleme, işleme ve arşiv yönetimi."},
        {"key": "ui_database", "label": "Veritabanı", "desc": "Sistemdeki dosyalara göz atma ve silme."},
        {"key": "ui_ai_orchestrator", "label": "Yapay Zeka Merkezi", "desc": "YZ modelleri, agentlar ve chatbot etkileşimi."},
        {"key": "ui_metrics", "label": "Sistem Metrikleri", "desc": "Gelişmiş analitik grafikleri ve izleme logları."},
        {"key": "ui_auth", "label": "Kullanıcı ve Rol Yönetimi", "desc": "Kullanıcı, rol ve yetki yönetimi (yönetici)."},
    ]

    return {
        "models": models,
        "archives": archives,
        "tabs": system_tabs,
        "user_meta": meta
    }

class AuditEventRequest(BaseModel):
    kullanici_kimlik: str
    islem_turu: str
    tablo_adi: str = None
    ip_adresi: str = None

@router.post("/audit/event")
def log_audit_event(req: AuditEventRequest, db: Session = Depends(get_db)):
    log = DenetimIzi(
        kullanici_kimlik=req.kullanici_kimlik,
        islem_turu=req.islem_turu[:32],
        tablo_adi=req.tablo_adi,
        ip_adresi=req.ip_adresi
    )
    db.add(log)
    db.commit()
    return {"status": "ok"}

@router.get("/audit/live-dashboard")
def get_live_dashboard(db: Session = Depends(get_db)):
    import collections

    users = db.query(Kullanici).all()
    user_map = {u.kimlik: {"name": u.tam_ad, "status": "Aktif" if u.aktif_mi else "Pasif"} for u in users}
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    stats_map = {}
    for u in users:
        stats_map[u.kimlik] = {
            "name": u.tam_ad,
            "status": "Aktif" if u.aktif_mi else "Pasif",
            "api_requests": 0,
            "total_tokens": 0,
            "favorite_tab": "N/A",
            "last_action": "Bilinmiyor",
            "session_duration": "-",
            "_last_login": None,
            "_last_logout": None
        }

    denetim_logs = db.query(DenetimIzi).order_by(DenetimIzi.olusturulma_tarihi.desc()).limit(1500).all()
    
    tab_counts = collections.defaultdict(list) 
    recent_events = []
    failed_logins = 0
    total_signals = 0
    
    from database.sql.session import get_session
    with get_session() as logs_db:
        from sqlalchemy import select
        api_logs = list(logs_db.scalars(
            select(ApiLog).where(ApiLog.olusturulma_tarihi.like(f"{today}%"))
        ).all())
        total_signals = len(api_logs)
        for al in api_logs:
            if al.kullanici_kimlik in stats_map:
                stats_map[al.kullanici_kimlik]["api_requests"] += 1
                stats_map[al.kullanici_kimlik]["total_tokens"] += int(al.toplam_token or 0)

    for d in denetim_logs:
        uid = d.kullanici_kimlik
        if d.islem_turu.startswith("LOGIN_FAILED") and d.olusturulma_tarihi.startswith(today):
            failed_logins += 1
                
        if len(recent_events) < 15:
            recent_events.append({
                "time": d.olusturulma_tarihi,
                "user": user_map.get(uid, {}).get("name", "Bilinmeyen"),
                "action": d.islem_turu,
                "detail": d.tablo_adi or "",
                "color": "red" if "FAILED" in d.islem_turu else "emerald" if "SUCCESS" in d.islem_turu else "blue"
            })
            
        if uid in stats_map:
            if d.islem_turu == "TAB_VIEW" and d.tablo_adi:
                tab_counts[uid].append(d.tablo_adi)
            
            if stats_map[uid]["last_action"] == "Bilinmiyor":
                stats_map[uid]["last_action"] = d.olusturulma_tarihi
                
            # For session duration logic
            if d.islem_turu == "LOGOUT" and stats_map[uid]["_last_logout"] is None:
                stats_map[uid]["_last_logout"] = d.olusturulma_tarihi
            if d.islem_turu == "LOGIN_SUCCESS" and stats_map[uid]["_last_login"] is None:
                stats_map[uid]["_last_login"] = d.olusturulma_tarihi

    for uid, stats in stats_map.items():
        # Top Tab
        if tab_counts[uid]:
            freq = collections.Counter(tab_counts[uid]).most_common(1)
            stats["favorite_tab"] = freq[0][0]
            
        # Session duration
        login_t = stats["_last_login"]
        logout_t = stats["_last_logout"]
        if login_t:
            fmt = "%Y-%m-%dT%H:%M:%S.%f%z" if "." in login_t else "%Y-%m-%dT%H:%M:%S%z"
            from datetime import datetime as dt
            try:
                lt = dt.strptime(login_t, fmt)
                tt = dt.strptime(logout_t, fmt) if logout_t else datetime.now(timezone.utc)
                if tt > lt:
                    diff_min = int((tt - lt).total_seconds() / 60)
                    stats["session_duration"] = f"{diff_min} dk"
            except Exception:
                pass
                
        del stats["_last_login"]
        del stats["_last_logout"]

    return {
        "overview": {
            "online_users": len([u for u in users if u.aktif_mi]), 
            "failed_logins": failed_logins,
            "total_signals": total_signals
        },
        "users": list(stats_map.values()),
        "timeline": recent_events
    }
