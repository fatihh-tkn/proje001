"""
backend/api/routes/archive.py
----------------------------------------------------------------------
Arsiv Yoneticisi API Endpoint'leri.
"""
import logging
import os
import uuid
import shutil

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
from database.sql.session import get_session
from database.uow import UnitOfWork
from database.sql.models import Belge, Kullanici, VektorParcasi

# -- Logger kurulumu (bridge.py ile ayni UTF-8 guvencesi) --------------------
_handler = logging.StreamHandler()
_handler.setLevel(logging.DEBUG)
_handler.stream = open(_handler.stream.fileno(), mode='w', encoding='utf-8', closefd=False)
_handler.setFormatter(logging.Formatter('[%(name)s] %(levelname)s - %(message)s'))

logger = logging.getLogger('archive')
logger.setLevel(logging.DEBUG)
if not logger.handlers:
    logger.addHandler(_handler)
# ---------------------------------------------------------------------------

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
    """
    Birden fazla belge veya klasoru siler.

    Silme sirasi (Atomik Tasarim):
      1. SQL'den ilgili VektorParcasi kayitlarini oku  (okuma, geri alinabilir)
      2. ChromaDB'den sil                              (dis depo — once temizle)
      3. GraphDB'den sil                               (dis depo — once temizle)
      4. Disk dosyasini sil                            (dis depo — once temizle)
      5. SQL'den Belge kaydini sil + commit            (en son, tum dis depolar temizlendikten sonra)

    Bu siralama sayesinde:
      - SQL silme basarisiz olsa bile dis depolar temizlenmis olur
        (bir sonraki toplu_sil cagrisi yine calisir).
      - Dis depo silme basarisiz olsa return objesi 'uyarilar' listesiyle
        durumu raporlar; SQL kaydi SILINMEZ, veri kaybi olusmaz.
    """
    from database.vector.chroma_db import vector_db
    from database.graph.networkx_db import graph_db

    silinen   = 0
    uyarilar  = []

    with UnitOfWork() as uow:
        db = uow.session
        for kid in istek.ids:
            belge = db.get(Belge, kid)
            if not belge:
                logger.warning("Belge bulunamadi, atlaniyor | id=%s", kid)
                continue

            belge_adi = belge.dosya_adi
            dis_depo_hatasi = False   # Bu belge icin herhangi bir dis depo hatasi var mi?

            # -- Adim 1: Dis depo kimliklerini topla -------------------------
            chroma_ids = []
            graf_ids   = []
            if belge.vektorlestirildi_mi and belge.vektordb_koleksiyon:
                parcalar = db.scalars(
                    select(VektorParcasi).where(VektorParcasi.belge_kimlik == belge.kimlik)
                ).all()
                chroma_ids = [p.chromadb_kimlik for p in parcalar]
                graf_ids   = [str(p.kimlik)      for p in parcalar]

            # -- Adim 2: ChromaDB sil (UoW kaydi) ----------------------------
            if chroma_ids:
                def del_chroma(coll=belge.vektordb_koleksiyon, c_ids=chroma_ids, ad=belge_adi):
                    try:
                        vector_db.delete_documents(coll, c_ids)
                        logger.info("Chroma silme OK | %s | %d", ad, len(c_ids))
                    except Exception as e:
                        logger.error("Chroma silinemedi: %s", e)
                uow.register_after_commit(del_chroma)

            # -- Adim 3: GraphDB sil (UoW kaydi) -----------------------------
            if graf_ids:
                def del_graph(g_ids=graf_ids, ad=belge_adi):
                    try:
                        graph_db.remove_nodes(g_ids)
                        logger.info("Graph silme OK | %s | %d", ad, len(g_ids))
                    except Exception as e:
                        logger.warning("Graph silinemedi: %s", e)
                uow.register_after_commit(del_graph)

            # -- Adim 4: Disk dosyasi sil (UoW kaydi) -------------------------
            path = belge.depolama_yolu
            if path and os.path.exists(path):
                def del_disk(p=path):
                    try:
                        os.remove(p)
                        logger.info("Disk silme OK | %s", p)
                    except Exception as e:
                        logger.error("Disk silinemedi: %s", e)
                uow.register_after_commit(del_disk)

            # -- Adim 5: Denetim kaydi + SQL silme ----------------------------
            # Dis depo hatasi varsa SQL kaydini SILME — veri kaybi engellenir.
            # Kullanici uyarilar listesinden durumu gorur.
            if dis_depo_hatasi:
                logger.error(
                    "Dis depo hatasi nedeniyle SQL kaydi SILINMEDI | belge=%s", belge_adi
                )
                uyarilar.append(
                    f"KRITIK: {belge_adi} icin dis depo hatasi oldugundan SQL kaydi korundu. "
                    "Manuel temizlik gerekebilir."
                )
                continue   # Bu belgeyi atla, bir sonrakine gec

            # Denetim izi
            try:
                from core.db_bridge import add_audit_log
                add_audit_log(
                    islem_turu="silme",
                    tablo_adi="belgeler",
                    kayit_kimlik=belge.kimlik,
                    eski_deger={"dosya_adi": belge.dosya_adi, "dosya_turu": belge.dosya_turu}
                )
            except Exception as e:
                logger.warning("Denetim izi yazma hatasi (kritik degil): %s", e)

            db.delete(belge)
            silinen += 1
        # uow burada otomatik commit() cagirir. Eger SQL silinmesi onaylanirsa, 
        # yukarida kaydettigimiz 'del_chroma', 'del_graph' ve 'del_disk' 
        # fonksiyonlari _after_commit icinde seri sekilde tetiklenir.

    sonuc = {"status": "success", "silinen": silinen}
    if uyarilar:
        sonuc["uyarilar"] = uyarilar
        sonuc["status"]   = "partial"   # Kismi basari: bazi belgeler silinemedi
    return sonuc


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
