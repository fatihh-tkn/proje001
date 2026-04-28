"""
api/routes/talepler.py
──────────────────────
Kullanıcı talepleri (kullanici_talepleri tablosu) için CRUD uçları.

Akış:
  - Kullanıcı POST /api/talepler ile yeni talep oluşturur (opsiyonel resim eki).
  - Kullanıcı GET /api/talepler/benim ile kendi taleplerini listeler.
  - Yönetici GET /api/talepler ile tüm talepleri filtreleyerek görür.
  - Yönetici PATCH /api/talepler/{id} ile durum/not günceller.
  - Yönetici DELETE /api/talepler/{id} ile siler.
  - GET /api/talepler/{id}/resim talebe iliştirilmiş görseli stream eder.

Yetki: super_kullanici_mi=True olan veya meta.ui_request_management=True
olan kullanıcılar yönetim uçlarına erişebilir.
"""

import os
import uuid
import mimetypes
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.sql.session import get_db
from database.sql.models import KullaniciTalebi, Kullanici, DenetimIzi


router = APIRouter()


# ── Sabitler ─────────────────────────────────────────────────────────────────

GECERLI_DURUMLAR = {"incelemede", "onaylandi", "reddedildi", "tamamlandi"}
GECERLI_KATEGORILER = {"erisim", "kota", "egitim", "hata", "diger"}
GECERLI_ONCELIKLER = {"dusuk", "orta", "yuksek"}

DURUM_RENK = {
    "incelemede": "amber",
    "onaylandi": "emerald",
    "reddedildi": "red",
    "tamamlandi": "sky",
}

DURUM_ETIKET = {
    "incelemede": "İncelemede",
    "onaylandi": "Onaylandı",
    "reddedildi": "Reddedildi",
    "tamamlandi": "Tamamlandı",
}

# Resim yükleme kuralları
RESIM_KOK_DIZIN = "./talep_uploads"
GECERLI_RESIM_UZANTILARI = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
GECERLI_RESIM_MIME = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAKS_RESIM_BAYT = 5 * 1024 * 1024  # 5 MB

os.makedirs(RESIM_KOK_DIZIN, exist_ok=True)


# ── Yardımcılar ──────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _kullanici_getir(db: Session, user_id: str) -> Kullanici:
    user = db.query(Kullanici).filter(Kullanici.kimlik == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return user


def _yonetici_mi(user: Kullanici) -> bool:
    if user.super_kullanici_mi:
        return True
    meta = user.meta or {}
    return meta.get("ui_request_management") is True


def _serialize(t: KullaniciTalebi, kullanici_adi: Optional[str] = None) -> dict:
    tarih_kisa = (t.olusturulma_tarihi or "").split("T")[0] if t.olusturulma_tarihi else ""
    return {
        "id": t.kimlik,
        "kullanici_kimlik": t.kullanici_kimlik,
        "kullanici_adi": kullanici_adi,
        "baslik": t.baslik,
        "mesaj": t.mesaj,
        "kategori": t.kategori,
        "oncelik": t.oncelik,
        "durum": t.durum,
        "durum_etiket": DURUM_ETIKET.get(t.durum, t.durum),
        "renk": DURUM_RENK.get(t.durum, "slate"),
        "yonetici_notu": t.yonetici_notu,
        "yonetici_kimlik": t.yonetici_kimlik,
        "resim_var_mi": bool(t.resim_yolu),
        "resim_url": f"/api/talepler/{t.kimlik}/resim" if t.resim_yolu else None,
        "tarih": tarih_kisa,
        "olusturulma_tarihi": t.olusturulma_tarihi,
        "guncelleme_tarihi": t.guncelleme_tarihi,
    }


def _resim_kaydet(resim: UploadFile) -> str:
    """Yüklenen görseli diske yazar, kaydedilen mutlak yolu döndürür."""
    asil_ad = resim.filename or "image"
    uzanti = os.path.splitext(asil_ad)[1].lower()
    if uzanti not in GECERLI_RESIM_UZANTILARI:
        raise HTTPException(status_code=400, detail="Yalnızca JPG, PNG, GIF veya WEBP dosyaları yükleyebilirsiniz.")
    if resim.content_type and resim.content_type not in GECERLI_RESIM_MIME:
        raise HTTPException(status_code=400, detail="Geçersiz görsel türü.")

    icerik = resim.file.read()
    if len(icerik) == 0:
        raise HTTPException(status_code=400, detail="Boş dosya.")
    if len(icerik) > MAKS_RESIM_BAYT:
        raise HTTPException(status_code=413, detail="Görsel 5 MB'tan büyük olamaz.")

    benzersiz = uuid.uuid4().hex[:12]
    guvenli_ad = f"{benzersiz}{uzanti}"
    yol = os.path.join(RESIM_KOK_DIZIN, guvenli_ad)
    with open(yol, "wb") as f:
        f.write(icerik)
    return yol


# ── Şemalar ──────────────────────────────────────────────────────────────────

class TalepGuncelleRequest(BaseModel):
    durum: Optional[str] = None
    yonetici_notu: Optional[str] = None
    yonetici_kimlik: Optional[str] = None


# ── Uçlar ────────────────────────────────────────────────────────────────────

@router.post("")
def talep_olustur(
    kullanici_kimlik: str = Form(...),
    baslik: str = Form(...),
    mesaj: str = Form(...),
    kategori: str = Form("diger"),
    oncelik: str = Form("orta"),
    resim: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    """Kullanıcı yeni bir talep oluşturur (opsiyonel görsel eki ile)."""
    if kategori not in GECERLI_KATEGORILER:
        raise HTTPException(status_code=400, detail="Geçersiz kategori")
    if oncelik not in GECERLI_ONCELIKLER:
        raise HTTPException(status_code=400, detail="Geçersiz öncelik")
    baslik_kirpilmis = baslik.strip()
    mesaj_kirpilmis = mesaj.strip()
    if len(baslik_kirpilmis) < 3 or len(baslik_kirpilmis) > 200:
        raise HTTPException(status_code=400, detail="Başlık 3–200 karakter olmalı.")
    if len(mesaj_kirpilmis) < 5 or len(mesaj_kirpilmis) > 4000:
        raise HTTPException(status_code=400, detail="Mesaj 5–4000 karakter olmalı.")

    user = _kullanici_getir(db, kullanici_kimlik)

    resim_yolu: str | None = None
    if resim is not None and resim.filename:
        resim_yolu = _resim_kaydet(resim)

    talep = KullaniciTalebi(
        kullanici_kimlik=user.kimlik,
        baslik=baslik_kirpilmis,
        mesaj=mesaj_kirpilmis,
        kategori=kategori,
        oncelik=oncelik,
        durum="incelemede",
        resim_yolu=resim_yolu,
    )
    db.add(talep)
    db.add(DenetimIzi(
        kullanici_kimlik=user.kimlik,
        islem_turu="TALEP_OLUSTURMA",
        tablo_adi="kullanici_talepleri",
        kayit_kimlik=talep.kimlik,
        yeni_deger={"baslik": talep.baslik, "kategori": talep.kategori, "resim_var_mi": bool(resim_yolu)},
    ))
    db.commit()
    db.refresh(talep)
    return _serialize(talep, kullanici_adi=user.tam_ad)


@router.get("/benim")
def kendi_taleplerim(
    kullanici_kimlik: str = Query(..., description="Talepleri istenen kullanıcı"),
    db: Session = Depends(get_db),
):
    """Kullanıcının kendi taleplerini en yeni en üstte olacak şekilde döndürür."""
    user = _kullanici_getir(db, kullanici_kimlik)
    talepler = (
        db.query(KullaniciTalebi)
        .filter(KullaniciTalebi.kullanici_kimlik == user.kimlik)
        .order_by(KullaniciTalebi.olusturulma_tarihi.desc())
        .all()
    )
    return [_serialize(t, kullanici_adi=user.tam_ad) for t in talepler]


@router.get("")
def tum_talepler(
    yonetici_kimlik: str = Query(..., description="İsteği yapan yönetici"),
    durum: Optional[str] = None,
    kategori: Optional[str] = None,
    arama: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Yönetici tüm talepleri filtreleyerek listeler."""
    yonetici = _kullanici_getir(db, yonetici_kimlik)
    if not _yonetici_mi(yonetici):
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")

    q = db.query(KullaniciTalebi)
    if durum and durum in GECERLI_DURUMLAR:
        q = q.filter(KullaniciTalebi.durum == durum)
    if kategori and kategori in GECERLI_KATEGORILER:
        q = q.filter(KullaniciTalebi.kategori == kategori)
    if arama:
        kalip = f"%{arama.strip()}%"
        q = q.filter(
            (KullaniciTalebi.baslik.ilike(kalip)) | (KullaniciTalebi.mesaj.ilike(kalip))
        )
    talepler = q.order_by(KullaniciTalebi.olusturulma_tarihi.desc()).all()

    user_ids = {t.kullanici_kimlik for t in talepler}
    isim_haritasi: dict[str, str] = {}
    if user_ids:
        rows = db.query(Kullanici.kimlik, Kullanici.tam_ad).filter(
            Kullanici.kimlik.in_(user_ids)
        ).all()
        isim_haritasi = {r[0]: r[1] for r in rows}

    return [_serialize(t, kullanici_adi=isim_haritasi.get(t.kullanici_kimlik)) for t in talepler]


@router.get("/{talep_id}/resim")
def talep_resmi_getir(talep_id: str, db: Session = Depends(get_db)):
    """Talebe iliştirilmiş görseli tarayıcıda gösterir."""
    talep = db.query(KullaniciTalebi).filter(KullaniciTalebi.kimlik == talep_id).first()
    if not talep or not talep.resim_yolu:
        raise HTTPException(status_code=404, detail="Görsel bulunamadı")
    if not os.path.exists(talep.resim_yolu):
        raise HTTPException(status_code=404, detail="Fiziksel dosya eksik")
    mime_type, _ = mimetypes.guess_type(talep.resim_yolu)
    return FileResponse(
        path=talep.resim_yolu,
        media_type=mime_type or "application/octet-stream",
        headers={"Content-Disposition": "inline"},
    )


@router.patch("/{talep_id}")
def talep_guncelle(
    talep_id: str,
    req: TalepGuncelleRequest,
    yonetici_kimlik: str = Query(..., description="İşlemi yapan yönetici"),
    db: Session = Depends(get_db),
):
    """Yönetici talebin durumunu ve/veya notunu günceller."""
    yonetici = _kullanici_getir(db, yonetici_kimlik)
    if not _yonetici_mi(yonetici):
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")

    talep = db.query(KullaniciTalebi).filter(KullaniciTalebi.kimlik == talep_id).first()
    if not talep:
        raise HTTPException(status_code=404, detail="Talep bulunamadı")

    eski = {"durum": talep.durum, "yonetici_notu": talep.yonetici_notu}
    if req.durum is not None:
        if req.durum not in GECERLI_DURUMLAR:
            raise HTTPException(status_code=400, detail="Geçersiz durum")
        talep.durum = req.durum
    if req.yonetici_notu is not None:
        talep.yonetici_notu = req.yonetici_notu.strip() or None
    talep.yonetici_kimlik = yonetici.kimlik
    talep.guncelleme_tarihi = _now_iso()

    db.add(DenetimIzi(
        kullanici_kimlik=yonetici.kimlik,
        islem_turu="TALEP_DURUM_DEGISIKLIK",
        tablo_adi="kullanici_talepleri",
        kayit_kimlik=talep.kimlik,
        eski_deger=eski,
        yeni_deger={"durum": talep.durum, "yonetici_notu": talep.yonetici_notu},
    ))
    db.commit()
    db.refresh(talep)

    sahip = db.query(Kullanici).filter(Kullanici.kimlik == talep.kullanici_kimlik).first()
    return _serialize(talep, kullanici_adi=sahip.tam_ad if sahip else None)


@router.delete("/{talep_id}")
def talep_sil(
    talep_id: str,
    yonetici_kimlik: str = Query(..., description="İşlemi yapan yönetici"),
    db: Session = Depends(get_db),
):
    """Yönetici talebi siler. Görsel dosyası da diskten silinir."""
    yonetici = _kullanici_getir(db, yonetici_kimlik)
    if not _yonetici_mi(yonetici):
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")

    talep = db.query(KullaniciTalebi).filter(KullaniciTalebi.kimlik == talep_id).first()
    if not talep:
        raise HTTPException(status_code=404, detail="Talep bulunamadı")

    db.add(DenetimIzi(
        kullanici_kimlik=yonetici.kimlik,
        islem_turu="TALEP_SILME",
        tablo_adi="kullanici_talepleri",
        kayit_kimlik=talep.kimlik,
        eski_deger={"baslik": talep.baslik, "durum": talep.durum},
    ))
    resim_yolu = talep.resim_yolu
    db.delete(talep)
    db.commit()

    if resim_yolu and os.path.exists(resim_yolu):
        try:
            os.remove(resim_yolu)
        except OSError:
            pass

    return {"mesaj": "Talep silindi", "id": talep_id}
