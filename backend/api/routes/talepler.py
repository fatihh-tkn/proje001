"""
api/routes/talepler.py
──────────────────────
Kullanıcı talepleri (kullanici_talepleri tablosu) için CRUD uçları.

Akış:
  - Kullanıcı POST /api/talepler ile yeni talep oluşturur.
  - Kullanıcı GET /api/talepler/benim ile kendi taleplerini listeler.
  - Yönetici GET /api/talepler ile tüm talepleri filtreleyerek görür.
  - Yönetici PATCH /api/talepler/{id} ile durum/not günceller.
  - Yönetici DELETE /api/talepler/{id} ile siler.

Yetki: super_kullanici_mi=True olan veya meta.ui_request_management=True
olan kullanıcılar yönetim uçlarına erişebilir.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.sql.session import get_db
from database.sql.models import KullaniciTalebi, Kullanici, DenetimIzi


router = APIRouter()


# ── Yardımcılar ──────────────────────────────────────────────────────────────

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
        "tarih": tarih_kisa,
        "olusturulma_tarihi": t.olusturulma_tarihi,
        "guncelleme_tarihi": t.guncelleme_tarihi,
    }


# ── Şemalar ──────────────────────────────────────────────────────────────────

class TalepOlusturRequest(BaseModel):
    kullanici_kimlik: str
    baslik: str = Field(min_length=3, max_length=200)
    mesaj: str = Field(min_length=5, max_length=4000)
    kategori: str = "diger"
    oncelik: str = "orta"


class TalepGuncelleRequest(BaseModel):
    durum: Optional[str] = None
    yonetici_notu: Optional[str] = None
    yonetici_kimlik: Optional[str] = None


# ── Uçlar ────────────────────────────────────────────────────────────────────

@router.post("")
def talep_olustur(req: TalepOlusturRequest, db: Session = Depends(get_db)):
    """Kullanıcı yeni bir talep oluşturur."""
    if req.kategori not in GECERLI_KATEGORILER:
        raise HTTPException(status_code=400, detail="Geçersiz kategori")
    if req.oncelik not in GECERLI_ONCELIKLER:
        raise HTTPException(status_code=400, detail="Geçersiz öncelik")

    user = _kullanici_getir(db, req.kullanici_kimlik)

    talep = KullaniciTalebi(
        kullanici_kimlik=user.kimlik,
        baslik=req.baslik.strip(),
        mesaj=req.mesaj.strip(),
        kategori=req.kategori,
        oncelik=req.oncelik,
        durum="incelemede",
    )
    db.add(talep)
    db.add(DenetimIzi(
        kullanici_kimlik=user.kimlik,
        islem_turu="TALEP_OLUSTURMA",
        tablo_adi="kullanici_talepleri",
        kayit_kimlik=talep.kimlik,
        yeni_deger={"baslik": talep.baslik, "kategori": talep.kategori},
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

    # Kullanıcı adlarını tek seferde topla (N+1 önlemi)
    user_ids = {t.kullanici_kimlik for t in talepler}
    isim_haritasi: dict[str, str] = {}
    if user_ids:
        rows = db.query(Kullanici.kimlik, Kullanici.tam_ad).filter(
            Kullanici.kimlik.in_(user_ids)
        ).all()
        isim_haritasi = {r[0]: r[1] for r in rows}

    return [_serialize(t, kullanici_adi=isim_haritasi.get(t.kullanici_kimlik)) for t in talepler]


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
    """Yönetici talebi siler."""
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
    db.delete(talep)
    db.commit()
    return {"mesaj": "Talep silindi", "id": talep_id}
