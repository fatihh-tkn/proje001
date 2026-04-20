from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from database.sql.session import get_db
from database.sql.models import Egitim, EgitimBolumu, KullaniciEgitimProfili, KullaniciEgitimAtama, Kullanici, Belge, VektorParcasi, _simdi
from database.vector.embedding_manager import get_embeddings, get_active_model_key
import uuid

router = APIRouter()

# ── Pydantic Şemaları ──────────────────────────────────────────

class EgitimBolumuCreate(BaseModel):
    baslik: str
    sure_dk: int
    sira: int

class EgitimCreate(BaseModel):
    ad: str
    kod: Optional[str] = None
    aciklama: Optional[str] = None
    sure_saat: float = 0.0
    gecme_notu: Optional[int] = None
    egitmen: Optional[str] = None
    tur: str = "Zorunlu"
    seviye: str = "Başlangıç"
    format: str = "Online"
    ilgili_moduller: Optional[List[str]] = None
    hedef_roller: Optional[List[str]] = None
    hedef_departmanlar: Optional[List[str]] = None
    sinav_zorunlu: bool = False
    sertifika_ver: bool = False
    tekrar_izni: bool = True
    onay_gerekli: bool = False
    durum: str = "Taslak"
    yayin_tarihi: Optional[str] = None
    son_tamamlama_tarihi: Optional[str] = None
    bolumler: Optional[List[EgitimBolumuCreate]] = []

class KullaniciProfiliUpdate(BaseModel):
    ise_baslama_tarihi: Optional[str] = None
    departman: Optional[str] = None
    kullanilan_moduller: Optional[List[str]] = None
    dis_egitimler: Optional[List[Dict[str, Any]]] = None
    dis_sertifikalar: Optional[List[Dict[str, Any]]] = None

# ── Helper: Virtual Document for Education Mappings ───────────────
def _get_or_create_egitim_belge(db: Session, belge_turu: str = "Egitim Kataloğu"):
    # Check if we have a virtual document for this type
    stmt = select(Belge).where(Belge.dosya_adi == belge_turu)
    belge = db.scalars(stmt).first()
    if not belge:
        belge = Belge(
            dosya_adi=belge_turu,
            dosya_turu="system_db",
            erisim_politikasi="herkese_acik",
            durum="onaylandi",
            vektorlestirildi_mi=True
        )
        db.add(belge)
        db.flush()
    return belge

# ── Endpoints ──────────────────────────────────────────────────

@router.post("/", summary="Yeni Eğitim Aç (Admin)")
def create_egitim(req: EgitimCreate, db: Session = Depends(get_db)):
    """SapEgitimAdminPaneli / EgitimAcmaSlideOver'dan gelen veriyi kaydeder"""
    yeni_egitim = Egitim(
        ad=req.ad,
        kod=req.kod,
        aciklama=req.aciklama,
        sure_saat=req.sure_saat,
        gecme_notu=req.gecme_notu,
        egitmen=req.egitmen,
        tur=req.tur,
        seviye=req.seviye,
        format=req.format,
        ilgili_moduller=req.ilgili_moduller,
        hedef_roller=req.hedef_roller,
        hedef_departmanlar=req.hedef_departmanlar,
        sinav_zorunlu=req.sinav_zorunlu,
        sertifika_ver=req.sertifika_ver,
        tekrar_izni=req.tekrar_izni,
        onay_gerekli=req.onay_gerekli,
        durum=req.durum,
        yayin_tarihi=req.yayin_tarihi,
        son_tamamlama_tarihi=req.son_tamamlama_tarihi
    )
    db.add(yeni_egitim)
    db.flush() # ID almak için
    
    if req.bolumler:
        for bolum in req.bolumler:
            yeni_bolum = EgitimBolumu(
                egitim_kimlik=yeni_egitim.kimlik,
                baslik=bolum.baslik,
                sure_dk=bolum.sure_dk,
                sira=bolum.sira
            )
            db.add(yeni_bolum)
            
    db.commit()
    
    # ── AI Vectorization (RAG Integration) ──
    try:
        belge = _get_or_create_egitim_belge(db, "Eğitim Katalogları")
        
        # Metni hazırla
        bolum_metinleri = ", ".join([f"{b.sira}. {b.baslik} ({b.sure_dk} dk)" for b in req.bolumler]) if req.bolumler else "Bölüm yok."
        vec_text = (
            f"Eğitim Adı: {req.ad}\n"
            f"Kod: {req.kod}\n"
            f"Tür: {req.tur}, Seviye: {req.seviye}, Format: {req.format}\n"
            f"Süre: {req.sure_saat} saat, Geçme Notu: {req.gecme_notu}\n"
            f"İlgili Modüller: {', '.join(req.ilgili_moduller or [])}\n"
            f"Hedef Roller: {', '.join(req.hedef_roller or [])}\n"
            f"Hedef Departmanlar: {', '.join(req.hedef_departmanlar or [])}\n"
            f"Açıklama: {req.aciklama}\n"
            f"Bölümler: {bolum_metinleri}"
        )
        
        # Vektörize et
        vec = get_embeddings([vec_text])[0]
        model_key = get_active_model_key()
        
        yeni_parca = VektorParcasi(
            belge_kimlik=belge.kimlik,
            chromadb_kimlik=str(uuid.uuid4()),
            icerik=vec_text,
            konum_imi=f"egitim={yeni_egitim.kimlik}",
            embedding_modeli=model_key,
            vektor_verisi=vec,
            meta={"type": "egitim_katalogu", "id": yeni_egitim.kimlik, "ad": req.ad}
        )
        db.add(yeni_parca)
        db.commit()
    except Exception as e:
        print(f"Vektörleştirme hatası: {e}")
        # Hata olsa bile normal kaydı bozmamak için devam ediyoruz.

    db.refresh(yeni_egitim)
    return {"status": "success", "id": yeni_egitim.kimlik}

@router.post("/profil/{user_id}", summary="Kullanıcı Eğitim Bilgisi Kaydet (Kullanıcı)")
def update_user_profile(user_id: str, req: KullaniciProfiliUpdate, db: Session = Depends(get_db)):
    """UserVeriGirisi (Bilgi Girişi) ekranından gelen kullanıcının bireysel beyanları"""
    stmt = select(KullaniciEgitimProfili).where(KullaniciEgitimProfili.kullanici_kimlik == user_id)
    profil = db.scalars(stmt).first()
    
    if not profil:
        profil = KullaniciEgitimProfili(kullanici_kimlik=user_id)
        db.add(profil)
        
    if req.ise_baslama_tarihi is not None: profil.ise_baslama_tarihi = req.ise_baslama_tarihi
    if req.departman is not None: profil.departman = req.departman
    if req.kullanilan_moduller is not None: profil.kullanilan_moduller = req.kullanilan_moduller
    if req.dis_egitimler is not None: profil.dis_egitimler = req.dis_egitimler
    if req.dis_sertifikalar is not None: profil.dis_sertifikalar = req.dis_sertifikalar
    
    profil.guncelleme_tarihi = _simdi()
    db.commit()
    
    # ── AI Vectorization (User Profile for RAG) ──
    try:
        belge = _get_or_create_egitim_belge(db, "Kullanıcı Profilleri")
        
        dis_moduller = ", ".join(req.kullanilan_moduller) if req.kullanilan_moduller else "Girilmedi"
        dis_egit_isimleri = ", ".join([e.get("name", "") for e in req.dis_egitimler]) if req.dis_egitimler else "Yok"
        dis_sert_isimleri = ", ".join([c.get("name", "") for c in req.dis_sertifikalar]) if req.dis_sertifikalar else "Yok"
        
        vec_text = (
            f"Kullanıcı ID: {user_id}\n"
            f"Departmanı: {req.departman or profil.departman}\n"
            f"Açıkça bildirdiği dış SAP modül yetkinlikleri: {dis_moduller}\n"
            f"Dışarıdan aldığı eğitimler: {dis_egit_isimleri}\n"
            f"Sahip olduğu sertifikalar: {dis_sert_isimleri}\n"
            f"Bu kişi bu bilgilere sahiptir."
        )
        
        vec = get_embeddings([vec_text])[0]
        model_key = get_active_model_key()
        
        # Eğer bu kullanıcının daha önce bir parçası varsa eskiyi silebiliriz, veya simple insert yap.
        parca = VektorParcasi(
            belge_kimlik=belge.kimlik,
            chromadb_kimlik=str(uuid.uuid4()),
            icerik=vec_text,
            konum_imi=f"profil={user_id}",
            embedding_modeli=model_key,
            vektor_verisi=vec,
            meta={"type": "kullanici_profili", "kullanici_id": user_id}
        )
        db.add(parca)
        db.commit()
    except Exception as e:
        print(f"Profil vektörleştirme hatası: {e}")

    return {"status": "success"}

@router.get("/profil/{user_id}", summary="Kullanıcı Eğitim Bilgisi Getir (Kullanıcı)")
def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    stmt = select(KullaniciEgitimProfili).where(KullaniciEgitimProfili.kullanici_kimlik == user_id)
    profil = db.scalars(stmt).first()
    
    if not profil:
        return {
            "ise_baslama_tarihi": "",
            "departman": "",
            "kullanilan_moduller": [],
            "dis_egitimler": [],
            "dis_sertifikalar": []
        }
    
    return {
        "ise_baslama_tarihi": profil.ise_baslama_tarihi or "",
        "departman": profil.departman or "",
        "kullanilan_moduller": profil.kullanilan_moduller or [],
        "dis_egitimler": profil.dis_egitimler or [],
        "dis_sertifikalar": profil.dis_sertifikalar or []
    }

@router.get("/dashboard/{user_id}", summary="Kullanıcı Eğitim Dashboard Verisi (Kullanıcı)")
def get_user_dashboard(user_id: str, db: Session = Depends(get_db)):
    """UserEgitimDashboard için gerekli olan Atama ve Profil verilerini sentezler"""
    # 1. Kullanıcının atanan iç eğitimleri
    stmt_atamalar = select(KullaniciEgitimAtama).where(KullaniciEgitimAtama.kullanici_kimlik == user_id)
    atamalar = db.scalars(stmt_atamalar).all()
    
    # 2. Kullanıcının beyan ettiği dış profil
    stmt_profil = select(KullaniciEgitimProfili).where(KullaniciEgitimProfili.kullanici_kimlik == user_id)
    profil = db.scalars(stmt_profil).first()
    
    return {
        "status": "success",
        "ic_atamalar": [
            {
                "egitim_id": a.egitim_kimlik,
                "durum": a.durum,
                "ilerleme": a.ilerleme_yuzdesi
            } for a in atamalar
        ],
        "dis_profil": {
            "moduller": profil.kullanilan_moduller if profil else [],
            "dis_egitimler_sayisi": len(profil.dis_egitimler) if profil and profil.dis_egitimler else 0,
            "dis_sertifika_sayisi": len(profil.dis_sertifikalar) if profil and profil.dis_sertifikalar else 0
        }
    }

@router.get("/istatistikler", summary="Genel Eğitim İstatistikleri (Admin)")
def get_admin_stats(db: Session = Depends(get_db)):
    """SapEgitimAdminPaneli için şirket geneli KPI ve tamamlanma oranları"""
    toplam_egitim = db.scalar(select(func.count(Egitim.kimlik))) or 0
    toplam_atama = db.scalar(select(func.count(KullaniciEgitimAtama.kimlik))) or 0
    toplam_kullanici = db.scalar(select(func.count(Kullanici.kimlik))) or 0
    
    # Örnek basit agregasyonlar
    tamamlanmis_atama = db.scalar(
        select(func.count(KullaniciEgitimAtama.kimlik)).where(KullaniciEgitimAtama.durum == 'Tamamlandi')
    ) or 0
    
    ortalama_tamamlanma = 0
    if toplam_atama > 0:
        ortalama_tamamlanma = (tamamlanmis_atama / toplam_atama) * 100
        
    return {
        "toplam_kullanici": toplam_kullanici,
        "toplam_aktif_egitim": toplam_egitim,
        "toplam_atama": toplam_atama,
        "ortalama_tamamlanma_yuzdesi": int(ortalama_tamamlanma)
    }
