"""
api/routes/errors.py
─────────────────────────────────────────────────────────────────
Hata kayıtları yönetimi:
  - Admin tarafından eklenen tanımlı hatalar (Hata)
  - Kullanıcının chat'te kaydettiği çözümler (KullaniciHataKaydi)
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, desc

from database.sql.session import get_session
from database.sql.models import Hata, KullaniciHataKaydi
from core.logger import get_logger

logger = get_logger("routes.errors")
router = APIRouter()


# ── Şemalar ─────────────────────────────────────────────────────

class ErrorStep(BaseModel):
    title: str
    tcode: str | None = None
    detail: str | None = None


class ErrorDoc(BaseModel):
    name: str
    page: int | None = None


class ErrorCreate(BaseModel):
    hata_kodu: str
    baslik: str
    modul: str | None = None
    severity: str = "medium"
    sebep: str | None = None
    adimlar: list[ErrorStep] = []
    dokumanlar: list[ErrorDoc] = []


class UserErrorRecord(BaseModel):
    kullanici_id: str
    hata_kodu: str | None = None
    baslik: str
    modul: str | None = None
    severity: str | None = None
    ozet: str | None = None
    cevap_json: dict | None = None
    oturum_id: str | None = None


# ── Admin: tanımlı hata yönetimi ──────────────────────────────────

@router.get("/", summary="Tüm tanımlı hataları listele")
def list_errors(modul: str | None = None, q: str | None = None, limit: int = 200):
    with get_session() as db:
        stmt = select(Hata).order_by(desc(Hata.olusturulma)).limit(limit)
        if modul:
            stmt = stmt.where(Hata.modul == modul)
        rows = db.scalars(stmt).all()
        if q:
            ql = q.lower()
            rows = [
                r for r in rows
                if ql in (r.hata_kodu or "").lower()
                or ql in (r.baslik or "").lower()
                or ql in (r.sebep or "").lower()
            ]
        return {
            "total": len(rows),
            "errors": [
                {
                    "kimlik": r.kimlik,
                    "hata_kodu": r.hata_kodu,
                    "baslik": r.baslik,
                    "modul": r.modul,
                    "severity": r.severity,
                    "sebep": r.sebep,
                    "adimlar": r.adimlar or [],
                    "dokumanlar": r.dokumanlar or [],
                    "olusturulma": r.olusturulma,
                }
                for r in rows
            ],
        }


@router.post("/", summary="Yeni hata kaydı ekle")
def create_error(payload: ErrorCreate, user_id: str | None = Query(default=None)):
    with get_session() as db:
        hata = Hata(
            hata_kodu=payload.hata_kodu.strip(),
            baslik=payload.baslik.strip(),
            modul=(payload.modul or "").strip() or None,
            severity=payload.severity,
            sebep=payload.sebep,
            adimlar=[s.model_dump() for s in payload.adimlar],
            dokumanlar=[d.model_dump() for d in payload.dokumanlar],
            olusturan_id=user_id,
        )
        db.add(hata)
        db.commit()
        return {"kimlik": hata.kimlik, "status": "ok"}


@router.delete("/{kimlik}", summary="Hata kaydını sil")
def delete_error(kimlik: str):
    with get_session() as db:
        hata = db.get(Hata, kimlik)
        if not hata:
            raise HTTPException(status_code=404, detail="Hata kaydı bulunamadı")
        db.delete(hata)
        db.commit()
        return {"status": "ok"}


# ── Kullanıcı: chat'ten kaydedilen çözümler ────────────────────────

@router.post("/user-record", summary="Kullanıcının çözdüğü hatayı kaydet")
def record_user_error(payload: UserErrorRecord):
    with get_session() as db:
        kayit = KullaniciHataKaydi(
            kullanici_id=payload.kullanici_id,
            hata_kodu=(payload.hata_kodu or "").strip() or None,
            baslik=payload.baslik.strip(),
            modul=(payload.modul or "").strip() or None,
            severity=payload.severity,
            ozet=payload.ozet,
            cevap_json=payload.cevap_json,
            oturum_id=payload.oturum_id,
        )
        db.add(kayit)
        db.commit()
        return {"kimlik": kayit.kimlik, "status": "ok"}


@router.get("/user/{kullanici_id}", summary="Kullanıcının kayıtlı çözümlerini listele")
def list_user_errors(kullanici_id: str, limit: int = 100):
    with get_session() as db:
        stmt = (
            select(KullaniciHataKaydi)
            .where(KullaniciHataKaydi.kullanici_id == kullanici_id)
            .order_by(desc(KullaniciHataKaydi.kayit_tarihi))
            .limit(limit)
        )
        rows = db.scalars(stmt).all()
        return {
            "total": len(rows),
            "records": [
                {
                    "kimlik": r.kimlik,
                    "hata_kodu": r.hata_kodu,
                    "baslik": r.baslik,
                    "modul": r.modul,
                    "severity": r.severity,
                    "ozet": r.ozet,
                    "cevap_json": r.cevap_json or {},
                    "oturum_id": r.oturum_id,
                    "kayit_tarihi": r.kayit_tarihi,
                }
                for r in rows
            ],
        }


@router.delete("/user-record/{kimlik}", summary="Kullanıcının kayıtlı çözümünü sil")
def delete_user_record(kimlik: str):
    with get_session() as db:
        kayit = db.get(KullaniciHataKaydi, kimlik)
        if not kayit:
            raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
        db.delete(kayit)
        db.commit()
        return {"status": "ok"}
