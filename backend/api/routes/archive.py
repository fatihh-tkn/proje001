"""
backend/api/routes/archive.py
──────────────────────────────────────────────────────────────────────
Arşiv Yöneticisi API Endpoint'leri.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
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
    name: str
    parent_id: Optional[str] = None


class BelgeTasiRequest(BaseModel):
    belge_kimlik: str
    hedef_klasor_kimlik: Optional[str] = None


class YenidenAdlandirRequest(BaseModel):
    kimlik: str
    yeni_ad: str


class TopluSilRequest(BaseModel):
    ids: List[str]


class MetaGuncelleRequest(BaseModel):
    kimlik: str
    etiketler: Optional[List[str]] = None
    aciklama: Optional[str] = None


# ── API Endpoint'leri ──────────────────────────────────────────────────────────

@router.get("/list")
def arsiv_listele():
    """Tüm belge ve klasörleri döner."""
    with get_session() as db:
        belgeler = db.scalars(select(Belge)).all()

        sonuclar = []
        for b in belgeler:
            meta = b.meta or {}
            belge_klasor_kimlik = meta.get("klasor_kimlik")

            yukleyen_adi = "Bilinmiyor"
            if b.yukleyen_kimlik:
                kullanici = db.get(Kullanici, b.yukleyen_kimlik)
                if kullanici:
                    yukleyen_adi = kullanici.tam_ad

            parcalar = db.scalars(
                select(VektorParcasi).where(VektorParcasi.belge_kimlik == b.kimlik)
            ).all()

            sonuclar.append({
                "id": b.kimlik,
                "filename": b.dosya_adi,
                "file_type": b.dosya_turu,
                "file_size": b.dosya_boyutu_bayt,
                "created_at": b.olusturulma_tarihi,
                "updated_at": b.guncelleme_tarihi,
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
                "etiketler": meta.get("etiketler", []),
                "aciklama": meta.get("aciklama", ""),
            })

        return {"items": sonuclar}


@router.post("/create-folder")
def klasor_olustur(istek: KlasorOlusturRequest):
    """Arşiv içinde yeni bir klasör oluşturur."""
    with get_session() as db:
        yeni_klasor = Belge(
            dosya_adi=istek.name,
            dosya_turu="folder",
            dosya_boyutu_bayt=0,
            parca_sayisi=0,
            durum="folder",
            meta={"klasor_kimlik": istek.parent_id} if istek.parent_id else {}
        )
        db.add(yeni_klasor)
        db.commit()
        db.refresh(yeni_klasor)
        return {"status": "success", "id": yeni_klasor.kimlik}


@router.post("/move")
def belge_tasi(istek: BelgeTasiRequest):
    """Bir belgeyi farklı bir klasöre taşır."""
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


@router.patch("/rename")
def yeniden_adlandir(istek: YenidenAdlandirRequest):
    """Belge veya klasörün adını değiştirir."""
    with get_session() as db:
        belge = db.get(Belge, istek.kimlik)
        if not belge:
            raise HTTPException(status_code=404, detail="Belge bulunamadı.")
        belge.dosya_adi = istek.yeni_ad
        db.commit()
        return {"status": "success"}


@router.delete("/delete")
def toplu_sil(istek: TopluSilRequest):
    """Birden fazla belge veya klasörü siler. Diskten, VektörDB'den ve GraphDB'den aynı anda temizler."""
    from database.sql.models import VektorParcasi
    from database.vector.chroma_db import vector_db
    from database.graph.networkx_db import graph_db
    from sqlalchemy import select

    silinen = 0
    with get_session() as db:
        for kid in istek.ids:
            belge = db.get(Belge, kid)
            if not belge:
                continue

            # VektörDB (ChromaDB) ve GraphDB Temizliği
            if belge.vektorlestirildi_mi and belge.vektordb_koleksiyon:
                # İlgili parçaları SQL üzerinden bul (Primary Key'ler graf, ChromaDB_ID'ler vektör için)
                parcalar = db.scalars(
                    select(VektorParcasi).where(VektorParcasi.belge_kimlik == belge.kimlik)
                ).all()
                if parcalar:
                    chroma_ids = [p.chromadb_kimlik for p in parcalar]
                    graf_ids = [str(p.kimlik) for p in parcalar]
                    
                    try:
                        vector_db.delete_documents(belge.vektordb_koleksiyon, chroma_ids)
                    except Exception as e:
                        print(f"[ARŞİV SİLME] ChromaDB hatası: {e}")
                        
                    try:
                        graph_db.remove_nodes(graf_ids)
                    except Exception as e:
                        print(f"[ARŞİV SİLME] GraphDB hatası: {e}")

            # Diskten kaldır (klasörler için yol yoktur)
            if belge.depolama_yolu and os.path.exists(belge.depolama_yolu):
                try:
                    os.remove(belge.depolama_yolu)
                except Exception:
                    pass

            # Denetim İzi (Audit Log)
            from core.db_bridge import add_audit_log
            try:
                add_audit_log(
                    islem_turu="silme",
                    tablo_adi="belgeler",
                    kayit_kimlik=belge.kimlik,
                    eski_deger={"dosya_adi": belge.dosya_adi, "dosya_turu": belge.dosya_turu}
                )
            except Exception as e:
                print(f"[AUDIT LOG HATA] {e}")

            db.delete(belge)
            silinen += 1
        db.commit()
    return {"status": "success", "silinen": silinen}


@router.patch("/meta")
def meta_guncelle(istek: MetaGuncelleRequest):
    """Dosyanın etiket ve açıklama bilgisini günceller."""
    with get_session() as db:
        belge = db.get(Belge, istek.kimlik)
        if not belge:
            raise HTTPException(status_code=404, detail="Belge bulunamadı.")

        meta = dict(belge.meta or {})
        if istek.etiketler is not None:
            meta["etiketler"] = istek.etiketler
        if istek.aciklama is not None:
            meta["aciklama"] = istek.aciklama

        belge.meta = meta
        db.commit()
        return {"status": "success"}


@router.get("/file/{kimlik}")
def dosya_getir(kimlik: str):
    """Dosyayı tarayıcıda önizlemek için stream eder."""
    with get_session() as db:
        belge = db.get(Belge, kimlik)
        if not belge or not belge.depolama_yolu:
            raise HTTPException(status_code=404, detail="Dosya bulunamadı.")
        if not os.path.exists(belge.depolama_yolu):
            raise HTTPException(status_code=404, detail="Fiziksel dosya eksik.")

        import mimetypes
        import urllib.parse

        mime_type, _ = mimetypes.guess_type(belge.dosya_adi)
        if not mime_type:
            mime_type = "application/octet-stream"
            
        encoded_filename = urllib.parse.quote(belge.dosya_adi)

        return FileResponse(
            path=belge.depolama_yolu,
            media_type=mime_type,
            headers={"Content-Disposition": f"inline; filename*=utf-8''{encoded_filename}"}
        )


@router.post("/direct-upload")
def dogrudan_yukle(
    file: UploadFile = File(...),
    folder_id: str = Form(None)
):
    """Dosyayı vektörleştirme olmadan doğrudan arşive yükler."""
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
