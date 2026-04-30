"""
api/routes/zli_raporlar.py
──────────────────────────
Z'li (Z-tipi ABAP) rapor kaydedicisi.

Akış:
  - Kullanıcı chat'te "Z'li Rapor Sorgusu" hızlı aksiyonunu seçer.
  - AIService.suggest_zli_report SQL araması yapar, en iyi eşleşmeleri döndürür.
  - Kullanıcı "Hayır" derse → KullaniciTalebi (kategori='zli_rapor') olarak yeni
    rapor talebi açabilir; admin /talepler ekranında bunları görür.

Yetki:
  - GET /, /search → giriş yapmış herkes
  - POST /, PATCH /{id}, DELETE /{id} → yönetici
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database.sql.session import get_db
from database.sql.models import ZliRapor, Kullanici


router = APIRouter()


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
    return meta.get("ui_zli_rapor_yonetimi") is True or meta.get("ui_request_management") is True


def _serialize(r: ZliRapor) -> dict:
    return {
        "id":              r.kimlik,
        "kod":             r.kod,
        "ad":              r.ad,
        "aciklama":        r.aciklama,
        "modul":           r.modul,
        "kullanim_alani":  r.kullanim_alani,
        "parametreler":    r.parametreler or {},
        "aktif_mi":        r.aktif_mi,
        "olusturulma_tarihi": r.olusturulma_tarihi,
        "guncelleme_tarihi":  r.guncelleme_tarihi,
    }


# ── Şemalar ──────────────────────────────────────────────────────────────────

class ZliRaporOlusturRequest(BaseModel):
    kod: str = Field(min_length=2, max_length=64)
    ad: str = Field(min_length=2, max_length=200)
    aciklama: str = Field(min_length=5, max_length=4000)
    modul: Optional[str] = Field(default=None, max_length=32)
    kullanim_alani: Optional[str] = Field(default=None, max_length=4000)
    parametreler: Optional[dict] = None
    aktif_mi: bool = True


class ZliRaporGuncelleRequest(BaseModel):
    ad: Optional[str] = None
    aciklama: Optional[str] = None
    modul: Optional[str] = None
    kullanim_alani: Optional[str] = None
    parametreler: Optional[dict] = None
    aktif_mi: Optional[bool] = None


class ZliRaporAramaRequest(BaseModel):
    sorgu: str = Field(min_length=2, max_length=500)
    limit: int = Field(default=5, ge=1, le=20)


# ── Uçlar ────────────────────────────────────────────────────────────────────

@router.get("")
def liste(
    sadece_aktif: bool = Query(default=True),
    db: Session = Depends(get_db),
):
    q = db.query(ZliRapor)
    if sadece_aktif:
        q = q.filter(ZliRapor.aktif_mi == True)  # noqa: E712 (SQLAlchemy idiomu)
    return [_serialize(r) for r in q.order_by(ZliRapor.kod.asc()).all()]


@router.post("/search")
def ara(req: ZliRaporAramaRequest, db: Session = Depends(get_db)):
    """
    Basit ILIKE araması: kod / ad / açıklama / kullanım alanı üzerinden eşleşir.
    Eşleşme önceliği: kod > ad > açıklama > kullanim_alani.
    Hiç eşleşme yoksa boş liste döner — frontend kullanıcıya talep formunu açar.
    """
    sorgu = req.sorgu.strip()
    if not sorgu:
        return {"sorgu": sorgu, "matches": []}

    # Token bazlı arama: sorguyu kelimelere böl, her kelime için OR koşulu.
    # En çok kelimeyi yakalayan kayıt en üstte.
    tokens = [t for t in sorgu.split() if len(t) >= 2][:8]
    if not tokens:
        tokens = [sorgu]

    rows = (
        db.query(ZliRapor)
        .filter(ZliRapor.aktif_mi == True)  # noqa: E712
        .all()
    )

    def score(rapor: ZliRapor) -> float:
        haystack_kod      = (rapor.kod or "").lower()
        haystack_ad       = (rapor.ad or "").lower()
        haystack_aciklama = (rapor.aciklama or "").lower()
        haystack_alan     = (rapor.kullanim_alani or "").lower()

        s = 0.0
        for tok in tokens:
            t = tok.lower()
            if t in haystack_kod:      s += 4.0
            if t in haystack_ad:       s += 3.0
            if t in haystack_aciklama: s += 1.5
            if t in haystack_alan:     s += 1.0
        return s

    scored = [(r, score(r)) for r in rows]
    scored = [(r, sc) for r, sc in scored if sc > 0]
    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[: req.limit]

    return {
        "sorgu":   sorgu,
        "matches": [{**_serialize(r), "score": round(sc, 2)} for r, sc in top],
    }


@router.post("")
def olustur(
    req: ZliRaporOlusturRequest,
    yonetici_kimlik: str = Query(..., description="İşlemi yapan yönetici"),
    db: Session = Depends(get_db),
):
    yonetici = _kullanici_getir(db, yonetici_kimlik)
    if not _yonetici_mi(yonetici):
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")

    mevcut = db.query(ZliRapor).filter(ZliRapor.kod == req.kod.strip()).first()
    if mevcut:
        raise HTTPException(status_code=409, detail=f"'{req.kod}' kodlu rapor zaten var")

    rapor = ZliRapor(
        kod=req.kod.strip(),
        ad=req.ad.strip(),
        aciklama=req.aciklama.strip(),
        modul=(req.modul or "").strip() or None,
        kullanim_alani=(req.kullanim_alani or "").strip() or None,
        parametreler=req.parametreler or None,
        aktif_mi=req.aktif_mi,
    )
    db.add(rapor)
    db.commit()
    db.refresh(rapor)
    return _serialize(rapor)


@router.patch("/{rapor_id}")
def guncelle(
    rapor_id: str,
    req: ZliRaporGuncelleRequest,
    yonetici_kimlik: str = Query(...),
    db: Session = Depends(get_db),
):
    yonetici = _kullanici_getir(db, yonetici_kimlik)
    if not _yonetici_mi(yonetici):
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")

    rapor = db.query(ZliRapor).filter(ZliRapor.kimlik == rapor_id).first()
    if not rapor:
        raise HTTPException(status_code=404, detail="Rapor bulunamadı")

    if req.ad is not None:             rapor.ad = req.ad.strip()
    if req.aciklama is not None:       rapor.aciklama = req.aciklama.strip()
    if req.modul is not None:          rapor.modul = req.modul.strip() or None
    if req.kullanim_alani is not None: rapor.kullanim_alani = req.kullanim_alani.strip() or None
    if req.parametreler is not None:   rapor.parametreler = req.parametreler
    if req.aktif_mi is not None:       rapor.aktif_mi = req.aktif_mi
    rapor.guncelleme_tarihi = _now_iso()
    db.commit()
    db.refresh(rapor)
    return _serialize(rapor)


@router.delete("/{rapor_id}")
def sil(
    rapor_id: str,
    yonetici_kimlik: str = Query(...),
    db: Session = Depends(get_db),
):
    yonetici = _kullanici_getir(db, yonetici_kimlik)
    if not _yonetici_mi(yonetici):
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")

    rapor = db.query(ZliRapor).filter(ZliRapor.kimlik == rapor_id).first()
    if not rapor:
        raise HTTPException(status_code=404, detail="Rapor bulunamadı")
    db.delete(rapor)
    db.commit()
    return {"mesaj": "Z'li rapor silindi", "id": rapor_id}
