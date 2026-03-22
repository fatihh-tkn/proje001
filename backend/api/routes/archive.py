"""
backend/api/routes/archive.py
──────────────────────────────────────────────────────────────────────
Arşiv Yöneticisi API Endpoint'leri.

Tablolar: belgeler (Belge modeli)
  - Klasörleme: belge.meta["klasor_kimlik"] alanı kullanılır.
  - Durum: 'arsivde' | 'karantina' | 'onaylandi' | 'reddedildi' | 'folder'
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from sqlalchemy import select
from pydantic import BaseModel
from database.sql.session import get_session
from database.sql.models import Belge, Kullanici, VektorParcasi
import os
import uuid
import shutil

router = APIRouter()

ARSIV_KLASORU = "./archive_uploads"
os.makedirs(ARSIV_KLASORU, exist_ok=True)


# ── Pydantic Şemaları ──────────────────────────────────────────────────────────

class KlasorOlusturRequest(BaseModel):
    ad: str
    ust_klasor_kimlik: str | None = None


class BelgeTasiRequest(BaseModel):
    belge_kimlik: str
    hedef_klasor_kimlik: str | None = None


# ── API Endpoint'leri ──────────────────────────────────────────────────────────

@router.get("/list")
def arsiv_listele(klasor_kimlik: str = None):
    """
    Verilen klasör içindeki belge ve klasörleri döner.
    klasor_kimlik=None ise kök dizin gösterilir.
    """
    with get_session() as db:
        belgeler = db.scalars(select(Belge)).all()

        sonuclar = []
        for b in belgeler:
            meta = b.meta or {}
            belge_klasor_kimlik = meta.get("klasor_kimlik")

            # Yükleyici bilgisi
            yukleyen_adi = "Bilinmiyor"
            if b.yukleyen_kimlik:
                kullanici = db.get(Kullanici, b.yukleyen_kimlik)
                if kullanici:
                    yukleyen_adi = kullanici.tam_ad

            # Bağlantılı parçalar
            parcalar = db.scalars(
                select(VektorParcasi).where(VektorParcasi.belge_kimlik == b.kimlik)
            ).all()

            sonuclar.append({
                "id": b.kimlik,
                "filename": b.dosya_adi,
                "file_type": b.dosya_turu,
                "file_size": b.dosya_boyutu_bayt,
                "created_at": b.olusturulma_tarihi,
                "is_vectorized": b.vektorlestirildi_mi,
                "durum": b.durum,
                "uploader": yukleyen_adi,
                "folder_id": belge_klasor_kimlik,
                "total_chunks": len(parcalar),
                "chunks_preview": [
                    {"id": p.kimlik, "chroma_id": p.chromadb_kimlik}
                    for p in parcalar[:5]
                ],
                "storage_path": b.depolama_yolu,
                "erisim_politikasi": b.erisim_politikasi,
            })

        return {"items": sonuclar}


@router.post("/create-folder")
def klasor_olustur(istek: KlasorOlusturRequest):
    """
    Arşiv içinde yeni bir klasör oluşturur.
    Klasör, meta["klasor_kimlik"] ile üst dizinine bağlanır.
    """
    with get_session() as db:
        yeni_klasor = Belge(
            dosya_adi=istek.ad,
            dosya_turu="folder",
            dosya_boyutu_bayt=0,
            parca_sayisi=0,
            durum="folder",
            meta={"klasor_kimlik": istek.ust_klasor_kimlik} if istek.ust_klasor_kimlik else {}
        )
        db.add(yeni_klasor)
        db.commit()
        db.refresh(yeni_klasor)
        return {"status": "success", "id": yeni_klasor.kimlik}


@router.post("/move")
def belge_tasi(istek: BelgeTasiRequest):
    """
    Bir belgeyi farklı bir klasöre taşır.
    hedef_klasor_kimlik=None ise kök dizine taşır.
    """
    with get_session() as db:
        belge = db.get(Belge, istek.belge_kimlik)
        if not belge:
            raise HTTPException(status_code=404, detail="Belge bulunamadı.")

        meta = dict(belge.meta or {})
        if istek.hedef_klasor_kimlik:
            meta["klasor_kimlik"] = istek.hedef_klasor_kimlik
        else:
            meta.pop("klasor_kimlik", None)

        belge.meta = meta
        db.commit()
        return {"status": "success"}


@router.post("/direct-upload")
def dogrudan_yukle(
    file: UploadFile = File(...),
    folder_id: str = Form(None)
):
    """
    Dosyayı vektörleştirme olmadan doğrudan arşive yükler.
    SQL'deki belgeler tablosuna 'arsivde' durumuyla kaydeder.
    """
    os.makedirs(ARSIV_KLASORU, exist_ok=True)

    benzersiz_ad = f"{uuid.uuid4().hex[:8]}_{file.filename}"
    arsiv_yolu = os.path.join(ARSIV_KLASORU, benzersiz_ad)

    with open(arsiv_yolu, "wb") as tampon:
        shutil.copyfileobj(file.file, tampon)

    dosya_uzantisi = file.filename.split(".")[-1] if "." in file.filename else "unknown"

    with get_session() as db:
        yeni_belge = Belge(
            dosya_adi=file.filename,
            dosya_turu=dosya_uzantisi,
            dosya_boyutu_bayt=os.path.getsize(arsiv_yolu),
            depolama_yolu=arsiv_yolu,
            vektorlestirildi_mi=False,
            durum="arsivde",
            meta={"klasor_kimlik": folder_id} if folder_id and folder_id != "null" else {}
        )
        db.add(yeni_belge)
        db.commit()
        db.refresh(yeni_belge)

    return {"status": "success", "id": yeni_belge.kimlik, "filename": file.filename}
