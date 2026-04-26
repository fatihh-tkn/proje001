"""
backend/api/routes/archive.py
----------------------------------------------------------------------
Arsiv Yoneticisi API Endpoint'leri.
"""
import logging
import os
import uuid
import shutil

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Form, Header
from fastapi.responses import FileResponse
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import List, Optional
from database.sql.session import get_session
from database.uow import UnitOfWork
from database.sql.models import Belge, Kullanici, VektorParcasi
from core.logger import get_logger

logger = get_logger("routes.archive")

router = APIRouter()

ARSIV_KLASORU = "./archive_uploads"
os.makedirs(ARSIV_KLASORU, exist_ok=True)


# ── Pydantic Şemaları ──────────────────────────────────────────────────────────

class KotaGuncelleRequest(BaseModel):
    dosya_limiti: Optional[int] = Field(default=None, ge=0)
    depolama_limiti_mb: Optional[float] = Field(default=None, ge=0)


class KlasorOlusturRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[str] = Field(default=None, max_length=128)


class BelgeTasiRequest(BaseModel):
    belge_kimlik: str = Field(..., max_length=128)
    hedef_klasor_kimlik: Optional[str] = Field(default=None, max_length=128)


class YenidenAdlandirRequest(BaseModel):
    kimlik: str = Field(..., max_length=128)
    yeni_ad: str = Field(..., min_length=1, max_length=255)


class TopluSilRequest(BaseModel):
    ids: List[str] = Field(..., min_length=1, max_length=200)


class MetaGuncelleRequest(BaseModel):
    kimlik: str = Field(..., max_length=128)
    etiketler: Optional[List[str]] = Field(default=None, max_length=50)
    aciklama: Optional[str] = Field(default=None, max_length=5000)


# ── API Endpoint'leri ──────────────────────────────────────────────────────────

@router.get("/system-documents")
def sistem_belgeleri():
    """Sadece sistem havuzundaki belgeleri döner (herkes erişebilir)."""
    from database.sql.repositories.document_repo import DocumentRepository
    with get_session() as db:
        repo = DocumentRepository(db)
        belgeler = repo.list_system_documents()
        return {"items": [_belge_to_dict(b, db) for b in belgeler]}


@router.get("/my-documents/{user_id}")
def kullanici_belgeleri(user_id: str):
    """Verilen kullanıcının kendi havuzundaki belgelerini döner."""
    from database.sql.repositories.document_repo import DocumentRepository
    with get_session() as db:
        kullanici = db.get(Kullanici, user_id)
        if not kullanici:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
        repo = DocumentRepository(db)
        belgeler = repo.list_user_documents(user_id)
        return {"items": [_belge_to_dict(b, db) for b in belgeler]}


@router.get("/quota/{user_id}")
def kullanici_kota(user_id: str):
    """Kullanıcının kota durumunu döner."""
    from database.sql.repositories.document_repo import DocumentRepository
    with get_session() as db:
        kullanici = db.get(Kullanici, user_id)
        if not kullanici:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
        repo = DocumentRepository(db)
        return repo.get_user_quota_info(user_id)


class ErisimGuncelleRequest(BaseModel):
    izin_verilen_kullanicilar: List[str]  # Erişime izin verilen kullanıcı ID listesi

@router.put("/access/{belge_id}")
def erisim_guncelle(belge_id: str, istek: ErisimGuncelleRequest):
    """Bir belgeye/klasöre erişebilecek kullanıcıları günceller (admin yetkisi gerekir)."""
    with get_session() as db:
        belge = db.get(Belge, belge_id)
        if not belge:
            raise HTTPException(status_code=404, detail="Belge bulunamadı.")
        mevcut_meta = dict(belge.meta or {})
        mevcut_meta["izin_verilen_kullanicilar"] = istek.izin_verilen_kullanicilar
        belge.meta = mevcut_meta
        db.commit()
        return {"status": "ok", "izin_verilen_kullanicilar": istek.izin_verilen_kullanicilar}

@router.get("/access/{belge_id}")
def erisim_getir(belge_id: str):
    """Bir belgenin erişim listesini ve tüm kullanıcıları döner."""
    with get_session() as db:
        belge = db.get(Belge, belge_id)
        if not belge:
            raise HTTPException(status_code=404, detail="Belge bulunamadı.")
        izinliler = (belge.meta or {}).get("izin_verilen_kullanicilar", [])
        tum_kullanicilar = db.scalars(
            select(Kullanici).where(Kullanici.super_kullanici_mi.is_(False))
        ).all()
        return {
            "belge_id": belge_id,
            "belge_adi": belge.dosya_adi,
            "havuz_turu": belge.havuz_turu,
            "yukleyen_kimlik": belge.yukleyen_kimlik,
            "izin_verilen_kullanicilar": izinliler,
            "tum_kullanicilar": [
                {"id": u.kimlik, "tam_ad": u.tam_ad, "eposta": u.eposta}
                for u in tum_kullanicilar
            ],
        }

@router.put("/quota/{user_id}")
def kota_guncelle(user_id: str, istek: KotaGuncelleRequest):
    """Admin: Kullanıcı kotasını günceller. dosya_limiti / depolama_limiti_mb = None → sınırsız."""
    with get_session() as db:
        kullanici = db.get(Kullanici, user_id)
        if not kullanici:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
        kullanici.dosya_limiti = istek.dosya_limiti
        kullanici.depolama_limiti_mb = istek.depolama_limiti_mb
        db.commit()
        return {
            "status": "success",
            "kullanici_kimlik": user_id,
            "dosya_limiti": kullanici.dosya_limiti,
            "depolama_limiti_mb": kullanici.depolama_limiti_mb,
        }


def _belge_to_dict(b: Belge, db) -> dict:
    """Belge modelini API yanıtı dict'ine çevirir (ortak yardımcı)."""
    meta = b.meta or {}
    yukleyen_adi = "Bilinmiyor"
    if b.yukleyen_kimlik:
        k = db.get(Kullanici, b.yukleyen_kimlik)
        if k:
            yukleyen_adi = k.tam_ad
    parcalar = db.scalars(
        select(VektorParcasi).where(VektorParcasi.belge_kimlik == b.kimlik)
    ).all()
    return {
        "id": b.kimlik,
        "filename": b.dosya_adi,
        "file_type": b.dosya_turu,
        "file_size": b.dosya_boyutu_bayt,
        "created_at": b.olusturulma_tarihi,
        "updated_at": b.guncelleme_tarihi,
        "is_vectorized": b.vektorlestirildi_mi,
        "durum": b.durum,
        "uploader": yukleyen_adi,
        "havuz_turu": b.havuz_turu,
        "folder_id": meta.get("klasor_kimlik"),
        "total_chunks": len(parcalar),
        "storage_path": b.depolama_yolu,
        "erisim_politikasi": b.erisim_politikasi,
        "etiketler": meta.get("etiketler", []),
        "aciklama": meta.get("aciklama", ""),
        "izin_verilen_kullanicilar": meta.get("izin_verilen_kullanicilar", []),
        "meta": {
            "transcription_status": meta.get("transcription_status") or (
                "done" if b.vektorlestirildi_mi and (b.dosya_turu or "").lower()
                in {"mp3", "wav", "ogg", "m4a", "flac", "aac", "opus", "wma",
                    "mp4", "avi", "mov", "mkv", "webm", "m4v", "wmv"} else None
            ),
            "transcription_language": meta.get("transcription_language"),
            "transcription_chunk_count": meta.get("transcription_chunk_count"),
            "transcription_preview": meta.get("transcription_preview"),
        },
    }


@router.get("/list")
def arsiv_listele(user_id: str | None = None, x_user_id: str | None = Header(None, alias="User-Id")):
    """
    Belge ve klasörleri döner.
    Admin → hepsi. Normal kullanıcı → sistem belgeleri + kendi yükledikleri
    + erişim izni verilmiş belgeler.
    """
    effective_user_id = user_id or x_user_id

    with get_session() as db:
        # Kullanıcı admin mi?
        is_admin = False
        if effective_user_id:
            u = db.get(Kullanici, effective_user_id)
            if u and u.super_kullanici_mi:
                is_admin = True

        belgeler = db.scalars(select(Belge)).all()

        # Erişim filtresi
        if effective_user_id and not is_admin:
            def goruyabilir_mi(b: Belge) -> bool:
                izinliler = (b.meta or {}).get("izin_verilen_kullanicilar", None)

                if b.havuz_turu == "sistem":
                    # Sistem dosyası: erişim listesi tanımlanmamışsa herkese açık (varsayılan)
                    # Tanımlanmışsa sadece listede olan kullanıcılar erişebilir
                    if izinliler is None or len(izinliler) == 0:
                        return True
                    return effective_user_id in izinliler

                # Kullanıcı havuzu: sahibi her zaman erişebilir
                if b.yukleyen_kimlik == effective_user_id:
                    return True
                # Diğerleri sadece izin listesindeyse erişebilir (varsayılan kapalı)
                return effective_user_id in (izinliler or [])

            belgeler = [b for b in belgeler if goruyabilir_mi(b)]

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
                "havuz_turu": b.havuz_turu,
                "etiketler": meta.get("etiketler", []),
                "aciklama": meta.get("aciklama", ""),
                # Transkripsiyon verileri (ses/video için)
                "meta": {
                    "transcription_status": meta.get("transcription_status") or ("done" if b.vektorlestirildi_mi and (b.dosya_turu or "").lower() in {"mp3", "wav", "ogg", "m4a", "flac", "aac", "opus", "wma", "mp4", "avi", "mov", "mkv", "webm", "m4v", "wmv"} else None),
                    "transcription_language": meta.get("transcription_language"),
                    "transcription_chunk_count": meta.get("transcription_chunk_count"),
                    "transcription_preview": meta.get("transcription_preview"),
                    "transcription_full_text": meta.get("transcription_full_text"),
                    "transcription_error": meta.get("transcription_error"),
                },
            })

        return {"items": sonuclar}


@router.get("/detail/{doc_id}")
def arsiv_detay(doc_id: str):
    """Tek bir belgenin tüm meta verilerini (transkript dahil) döner."""
    with get_session() as db:
        b = db.get(Belge, doc_id)
        if not b:
            raise HTTPException(status_code=404, detail="Belge bulunamadı.")
        meta = b.meta or {}
        parcalar = db.scalars(
            select(VektorParcasi).where(VektorParcasi.belge_kimlik == b.kimlik)
        ).all()
        return {
            "id": b.kimlik,
            "filename": b.dosya_adi,
            "file_type": b.dosya_turu,
            "file_size": b.dosya_boyutu_bayt,
            "created_at": b.olusturulma_tarihi,
            "is_vectorized": b.vektorlestirildi_mi,
            "durum": b.durum,
            "storage_path": b.depolama_yolu,
            "total_chunks": len(parcalar),
            "etiketler": meta.get("etiketler", []),
            "aciklama": meta.get("aciklama", ""),
            "meta": {
                "transcription_status": meta.get("transcription_status") or ("done" if b.vektorlestirildi_mi and (b.dosya_turu or "").lower() in {"mp3", "wav", "ogg", "m4a", "flac", "aac", "opus", "wma", "mp4", "avi", "mov", "mkv", "webm", "m4v", "wmv"} else None),
                "transcription_language": meta.get("transcription_language"),
                "transcription_chunk_count": meta.get("transcription_chunk_count"),
                "transcription_preview": meta.get("transcription_preview"),
                "transcription_full_text": meta.get("transcription_full_text"),
                "transcription_error": meta.get("transcription_error"),
            },
        }


@router.get("/transcript/{doc_id}")
def arsiv_transkript(doc_id: str):
    """
    Bir ses/video belgesinin tam transkript metnini döner.
    - Önce meta['transcription_full_text'] alanına bakar (yeni dosyalar).
    - Bulamazsa VektorParcasi.icerik sütunlarını sırayla birleştirerek metni yeniden oluşturur (eski dosyalar).
    - transcription_status 'done' değilse henüz transkript yok hatası verir.
    """
    with get_session() as db:
        b = db.get(Belge, doc_id)
        if not b:
            raise HTTPException(status_code=404, detail="Belge bulunamadı.")

        meta = b.meta or {}
        status = meta.get("transcription_status")

        # Geriye dönük uyumluluk: Eski kayıtlarda 'transcription_status' olmayabilir
        is_av = (b.dosya_turu or "").lower() in {"mp3", "wav", "ogg", "m4a", "flac", "aac", "opus", "wma", "mp4", "avi", "mov", "mkv", "webm", "m4v", "wmv"}
        if not status and b.vektorlestirildi_mi and is_av:
            status = "done"

        if status != "done":
            return {
                "status": status or "none",
                "full_text": None,
                "language": meta.get("transcription_language"),
                "chunk_count": 0,
            }

        # Önce meta'da kayıtlı tam metnin varlığını kontrol et
        full_text = meta.get("transcription_full_text")

        if not full_text:
            # Eski dosyalar için: chunk'ların icerik alanlarından yeniden oluştur
            from sqlalchemy import asc
            parcalar = db.scalars(
                select(VektorParcasi)
                .where(VektorParcasi.belge_kimlik == doc_id)
                .order_by(asc(VektorParcasi.kimlik))
            ).all()

            if parcalar:
                full_text = " ".join(p.icerik for p in parcalar if p.icerik)
                # Elde edilen metni meta'ya kaydet (bir dahaki seferde hızlı gelsin)
                meta["transcription_full_text"] = full_text
                b.meta = meta
                db.commit()
            else:
                full_text = meta.get("transcription_preview", "")

        return {
            "status": "done",
            "full_text": full_text,
            "language": meta.get("transcription_language"),
            "chunk_count": meta.get("transcription_chunk_count", 0),
        }



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
    from database.vector.pgvector_db import vector_db
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
            # vektorlestirildi_mi false olsa bile SQL'de parcalar olabilir
            parcalar = db.scalars(
                select(VektorParcasi).where(VektorParcasi.belge_kimlik == belge.kimlik)
            ).all()
            chroma_ids = [p.chromadb_kimlik for p in parcalar if p.chromadb_kimlik]
            graf_ids   = [str(p.kimlik)      for p in parcalar]

            # -- Adim 2: ChromaDB sil (UoW kaydi) ----------------------------
            if chroma_ids and belge.vektordb_koleksiyon:
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

            # -- Adim 4: Disk dosyalari sil (UoW kaydi) -----------------------
            # Silinecek yolları topla: birincil dosya + PPTX orijinali + images dizini
            disk_paths_to_delete = []
            belge_meta_dict = dict(belge.meta or {})

            primary_path = belge.depolama_yolu
            if primary_path and os.path.exists(primary_path):
                disk_paths_to_delete.append(primary_path)

            # PPTX için: meta'da orijinal_yol (PDF'den farklıysa) ve images_yolu
            orijinal_yol = belge_meta_dict.get("orijinal_yol")
            if orijinal_yol and orijinal_yol != primary_path and os.path.exists(orijinal_yol):
                disk_paths_to_delete.append(orijinal_yol)

            images_yolu = belge_meta_dict.get("images_yolu")
            if images_yolu and os.path.isdir(images_yolu):
                disk_paths_to_delete.append(("dir", images_yolu))

            if disk_paths_to_delete:
                def del_disk(paths=disk_paths_to_delete):
                    for p in paths:
                        try:
                            if isinstance(p, tuple) and p[0] == "dir":
                                import shutil
                                shutil.rmtree(p[1])
                                logger.info("Disk dizin silme OK | %s", p[1])
                            else:
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


@router.get("/download/{kimlik}")
def dosya_indir(kimlik: str):
    """Dosyayı zorla indirme modunda (attachment) sunar.
    DownloadURL drag-out ve doğrudan indirme butonları bu endpoint'i kullanır."""
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
            headers={"Content-Disposition": f"attachment; filename*=utf-8''{encoded_filename}"}
        )


@router.post("/direct-upload")
async def dogrudan_yukle(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    folder_id: str = Form(None),
    user_id: str = Form(None),
):
    """
    Dosyayı doğrudan arşive yükler.
    - user_id verilmezse → sistem havuzuna eklenir.
    - user_id verilirse → kullanıcı havuzuna eklenir (kota kontrolü yapılır).
    AV ise transkripsiyon, metin ise vektörizasyon başlatır.
    """
    from database.sql.repositories.document_repo import DocumentRepository

    os.makedirs(ARSIV_KLASORU, exist_ok=True)

    # ── Havuz, kota ve klasör belirleme ──────────────────────────────────
    havuz_turu = "sistem"
    kullanici_klasor_id = None  # normal kullanıcı için otomatik klasör

    if user_id and user_id not in ("null", "undefined", ""):
        with get_session() as db:
            kullanici = db.get(Kullanici, user_id)
            if kullanici:
                if kullanici.super_kullanici_mi:
                    havuz_turu = "sistem"
                    # Admin: folder_id parametresi geçerliyse onu kullan, yoksa kök
                else:
                    havuz_turu = "kullanici"
                    # Kota kontrolü (dosya boyutu henüz bilinmiyor; 0 ile kontrol)
                    repo = DocumentRepository(db)
                    izin_var, red_nedeni = repo.check_user_can_upload(user_id, new_file_size_bytes=0)
                    if not izin_var:
                        raise HTTPException(status_code=403, detail=red_nedeni)

                    # Kullanıcı adına göre klasör bul veya oluştur
                    klasor_adi = kullanici.tam_ad or "Kullanıcı"
                    mevcut = db.scalar(
                        select(Belge).where(
                            Belge.dosya_adi == klasor_adi,
                            Belge.dosya_turu == "folder",
                        )
                    )
                    if mevcut:
                        kullanici_klasor_id = mevcut.kimlik
                    else:
                        yeni_klasor = Belge(
                            dosya_adi=klasor_adi,
                            dosya_turu="folder",
                            durum="folder",
                            havuz_turu="kullanici",
                            yukleyen_kimlik=user_id,
                            meta={},
                        )
                        db.add(yeni_klasor)
                        db.commit()
                        db.refresh(yeni_klasor)
                        kullanici_klasor_id = yeni_klasor.kimlik

    # ── Dosyayı diske yaz ─────────────────────────────────────────────
    benzersiz_ad = f"{uuid.uuid4().hex[:8]}_{file.filename}"
    arsiv_yolu = os.path.join(ARSIV_KLASORU, benzersiz_ad)

    with open(arsiv_yolu, "wb") as tampon:
        shutil.copyfileobj(file.file, tampon)

    dosya_boyutu = os.path.getsize(arsiv_yolu)
    dosya_uzantisi = (file.filename.split(".")[-1] if "." in file.filename else "unknown").lower()

    # Kullanıcı havuzunda kesin boyut kontrolü
    if havuz_turu == "kullanici" and user_id:
        with get_session() as db:
            repo = DocumentRepository(db)
            izin_var, red_nedeni = repo.check_user_can_upload(user_id, new_file_size_bytes=dosya_boyutu)
            if not izin_var:
                os.remove(arsiv_yolu)
                raise HTTPException(status_code=403, detail=red_nedeni)

    is_av = dosya_uzantisi in {"mp3", "wav", "ogg", "m4a", "flac", "aac", "opus", "wma", "mp4", "avi", "mov", "mkv", "webm", "m4v", "wmv"}
    is_text = dosya_uzantisi in {"pdf", "txt", "docx", "doc", "pptx", "ppt"}

    # Kullanıcı klasörü varsa onu kullan; admin için form'dan gelen folder_id geçerli
    effective_folder_id = kullanici_klasor_id or (folder_id if folder_id and folder_id != "null" else None)
    meta_dict = {"klasor_kimlik": effective_folder_id} if effective_folder_id else {}
    if is_av or is_text:
        meta_dict["transcription_status"] = "pending"

    effective_user_id = user_id if user_id and user_id not in ("null", "undefined", "") else None

    with get_session() as db:
        yeni_belge = Belge(
            dosya_adi=file.filename,
            dosya_turu=dosya_uzantisi,
            dosya_boyutu_bayt=dosya_boyutu,
            depolama_yolu=arsiv_yolu,
            yukleyen_kimlik=effective_user_id,
            vektorlestirildi_mi=False,
            durum="arsivde",
            meta=meta_dict,
            havuz_turu=havuz_turu,
        )
        db.add(yeni_belge)
        db.commit()
        db.refresh(yeni_belge)

    if is_av:
        background_tasks.add_task(_run_transcription, yeni_belge.kimlik)
    elif is_text:
        background_tasks.add_task(_run_vectorization, yeni_belge.kimlik)

    return {
        "status": "success",
        "id": yeni_belge.kimlik,
        "filename": file.filename,
        "havuz_turu": havuz_turu,
    }


# ── SES / VİDEO TRANSKRİPSİYON ENDPOINT'İ ────────────────────────────────────

AUDIO_EXTS = {"mp3", "wav", "ogg", "m4a", "flac", "aac", "opus", "wma"}
VIDEO_EXTS = {"mp4", "avi", "mov", "mkv", "webm", "m4v", "wmv"}
AV_EXTS    = AUDIO_EXTS | VIDEO_EXTS


def _run_transcription(doc_id: str):
    """
    Arka planda çalışan transkripsiyon işlevi.
    - Belgeyi DB'den alır
    - audio_processor ile Whisper transkripsiyon yapar
    - Chunk'ları ChromaDB + SQL'e kaydeder
    - meta.transcription_status = "done" günceller
    - Video dosyaları: orijinal video arşivde kalır, sadece ses işlenir
    """
    import uuid as _uuid
    from services.processors.audio_processor import parse_audio, GLOBAL_PROGRESS
    from database.vector.pgvector_db import vector_db
    from database.sql.models import VektorParcasi, BilgiIliskisi
    from sqlalchemy import select

    logger.info("Transkripsiyon başlıyor: doc_id=%s", doc_id)

    try:
        with get_session() as db:
            belge = db.get(Belge, doc_id)
            if not belge:
                logger.error("Belge bulunamadı: %s", doc_id)
                return

            # Orijinal bilgileri oturum kapanmadan önce çek
            b_depo = belge.depolama_yolu
            b_ad = belge.dosya_adi

            if not b_depo or not os.path.exists(b_depo):
                logger.error("Dosya diskde yok: %s", b_depo)
                _set_transcription_status(doc_id, "failed", "Dosya diskde bulunamadı.")
                return

            # Durumu "processing" olarak işaretle
            meta = dict(belge.meta or {})
            meta["transcription_status"] = "processing"
            belge.meta = meta
            db.commit()

        # Transkripsiyon (uzun sürebilir — session dışında)
        result = parse_audio(
            file_path=b_depo,
            original_name=b_ad,
            task_id=doc_id,
        )

        chunks         = result.get("chunks", [])
        formatted_text = result.get("formatted_text", "")
        raw_text       = result.get("raw_text", "")

        if not chunks:
            _set_transcription_status(doc_id, "failed", "Transkripsiyon boş döndü.")
            return

        # Hata chunk'ı mı?
        if len(chunks) == 1 and chunks[0].get("metadata", {}).get("type") == "error":
            err_text = chunks[0]["text"]
            logger.error("Transkripsiyon hatası: %s", err_text)
            _set_transcription_status(doc_id, "failed", err_text[:300])
            return

        # ChromaDB'ye kaydet
        coll_name  = "yilgenci_collection"
        texts      = [c["text"] for c in chunks]
        metadatas  = []
        ids        = []
        for c in chunks:
            cid  = c.get("id") or str(_uuid.uuid4())
            meta = c.get("metadata", {})
            clean = {"sql_doc_id": doc_id, "sqlite_doc_id": doc_id}
            for k, v in meta.items():
                clean[k] = v if isinstance(v, (str, int, float, bool)) else str(v)
            metadatas.append(clean)
            ids.append(cid)

        vector_db.add_documents(
            collection_name=coll_name,
            documents=texts,
            metadatas=metadatas,
            ids=ids,
        )
        logger.info("ChromaDB'ye %d chunk yazıldı.", len(ids))

        # SQL'e kaydet
        with get_session() as db:
            belge = db.get(Belge, doc_id)
            if not belge:
                return

            # Eski parçaları temizle (yeniden transkripsiyon durumunda)
            eski = list(db.scalars(
                select(VektorParcasi).where(VektorParcasi.belge_kimlik == doc_id)
            ).all())
            if eski:
                for p in eski:
                    db.delete(p)
                db.flush()

            # Yeni parçaları ekle (icerik'e zaman damgası prefix eklenir)
            yeni_parcalar = []
            for i, c in enumerate(chunks):
                m = c.get("metadata", {})
                start_fmt = m.get("start_time_fmt", "")
                end_fmt   = m.get("end_time_fmt", "")
                ts_prefix = f"[{start_fmt} - {end_fmt}] " if start_fmt else ""
                p = VektorParcasi(
                    belge_kimlik=doc_id,
                    chromadb_kimlik=ids[i],
                    icerik=(ts_prefix + c["text"])[:1000],
                    konum_imi=(
                        f"{m.get('source', b_ad)} | "
                        f"{start_fmt} - {end_fmt}"
                    ),
                )
                yeni_parcalar.append(p)

            db.add_all(yeni_parcalar)
            db.flush()

            # next_chunk kenarları
            db.flush()  # PK'leri al
            for i in range(len(yeni_parcalar) - 1):
                db.add(BilgiIliskisi(
                    kaynak_parca_kimlik=yeni_parcalar[i].kimlik,
                    hedef_parca_kimlik=yeni_parcalar[i + 1].kimlik,
                    iliski_turu="next_chunk",
                    agirlik=1.0,
                ))

            # Belge meta güncellemesi
            meta = dict(belge.meta or {})
            meta["transcription_status"]       = "done"
            meta["transcription_chunk_count"]  = len(chunks)
            meta["transcription_language"]     = (chunks[0].get("metadata", {}).get("language", "?") if chunks else "?")
            meta.pop("transcription_error", None)

            # Zaman damgalı tam metin (chunk'lara bölünmeden önceki format)
            meta["transcription_full_text"] = formatted_text or raw_text
            # Düz ham metin (zaman damgasız) — ayrıca saklanır
            meta["transcription_raw_text"]  = raw_text
            meta["transcription_preview"]   = raw_text[:600]

            belge.meta              = meta
            belge.vektorlestirildi_mi = True
            belge.vektordb_koleksiyon = coll_name
            belge.parca_sayisi        = len(chunks)
            db.commit()

        logger.info("Transkripsiyon tamamlandı: doc_id=%s, %d chunk", doc_id, len(chunks))

    except Exception as e:
        logger.exception("Transkripsiyon işlem hatası: %s", e)
        _set_transcription_status(doc_id, "failed", str(e)[:300])

# ── METİN/PDF/DOCX VEKTÖRİZASYON ENDPOINT'İ ──────────────────────────────────
def _run_vectorization(doc_id: str):
    import uuid as _uuid
    from services.processors import dispatch
    from database.vector.pgvector_db import vector_db
    from database.sql.models import VektorParcasi, BilgiIliskisi
    from sqlalchemy import select

    logger.info("Vektörizasyon başlıyor: doc_id=%s", doc_id)

    try:
        with get_session() as db:
            belge = db.get(Belge, doc_id)
            if not belge:
                logger.error("Belge bulunamadı: %s", doc_id)
                return

            b_depo = belge.depolama_yolu
            b_ad = belge.dosya_adi

            if not b_depo or not os.path.exists(b_depo):
                logger.error("Dosya diskde yok: %s", b_depo)
                _set_transcription_status(doc_id, "failed", "Dosya diskde bulunamadı.")
                return

            meta = dict(belge.meta or {})
            meta["transcription_status"] = "processing"
            belge.meta = meta
            db.commit()

        # Metin parçalama (Text/PDF/Docx/PPTX)
        chunks = dispatch(file_path=b_depo, ext=belge.dosya_turu, use_vision=False, original_name=b_ad)

        # PPTX dosyalarını sistemde PDF olarak koruma
        if belge.dosya_turu in ("pptx", "ppt"):
            basename = os.path.splitext(os.path.basename(b_depo))[0]
            expected_pdf = os.path.join(os.path.dirname(b_depo), f"{basename}.pdf")
            if os.path.exists(expected_pdf):
                meta["orijinal_format"] = belge.dosya_turu
                meta["orijinal_yol"] = b_depo
                
                belge.dosya_adi = os.path.splitext(b_ad)[0] + ".pdf"
                belge.dosya_turu = "pdf"
                belge.depolama_yolu = expected_pdf
                belge.dosya_boyutu_bayt = os.path.getsize(expected_pdf)


        if not chunks:
            _set_transcription_status(doc_id, "failed", "Vektörizasyon boş döndü.")
            return

        # Hata kontrolü
        if len(chunks) == 1 and "error" in chunks[0].get("metadata", {}):
            err_text = chunks[0]["text"]
            logger.error("Vektörizasyon hatası: %s", err_text)
            _set_transcription_status(doc_id, "failed", err_text[:300])
            return

        # ChromaDB'ye kaydet
        coll_name  = "yilgenci_collection"
        texts      = [c["text"] for c in chunks]
        metadatas  = []
        ids        = []
        for c in chunks:
            cid  = c.get("id") or str(_uuid.uuid4())
            meta_data = c.get("metadata", {})
            clean = {"sql_doc_id": doc_id, "sqlite_doc_id": doc_id}
            for k, v in meta_data.items():
                clean[k] = v if isinstance(v, (str, int, float, bool)) else str(v)
            metadatas.append(clean)
            ids.append(cid)

        vector_db.add_documents(
            collection_name=coll_name,
            documents=texts,
            metadatas=metadatas,
            ids=ids,
        )
        logger.info("ChromaDB'ye %d text chunk yazıldı.", len(ids))

        # SQL'e kaydet
        with get_session() as db:
            belge = db.get(Belge, doc_id)
            if not belge:
                return

            eski = list(db.scalars(
                select(VektorParcasi).where(VektorParcasi.belge_kimlik == doc_id)
            ).all())
            if eski:
                for p in eski:
                    db.delete(p)
                db.flush()

            yeni_parcalar = []
            for i, c in enumerate(chunks):
                p = VektorParcasi(
                    belge_kimlik=doc_id,
                    chromadb_kimlik=ids[i],
                    icerik=c["text"][:1000],
                    konum_imi=f"Sayfa/Parça {c.get('metadata', {}).get('page', i+1)}",
                )
                yeni_parcalar.append(p)

            db.add_all(yeni_parcalar)
            db.flush()

            for i in range(len(yeni_parcalar) - 1):
                db.add(BilgiIliskisi(
                    kaynak_parca_kimlik=yeni_parcalar[i].kimlik,
                    hedef_parca_kimlik=yeni_parcalar[i + 1].kimlik,
                    iliski_turu="next_chunk",
                    agirlik=1.0,
                ))

            meta = dict(belge.meta or {})
            meta["transcription_status"] = "done"
            meta["transcription_chunk_count"] = len(chunks)
            meta.pop("transcription_error", None)

            belge.meta              = meta
            belge.vektorlestirildi_mi = True
            belge.vektordb_koleksiyon = coll_name
            belge.parca_sayisi        = len(chunks)
            db.commit()

        logger.info("Vektörizasyon tamamlandı: doc_id=%s, %d chunk", doc_id, len(chunks))

    except Exception as e:
        logger.exception("Vektörizasyon işlem hatası: %s", e)
        _set_transcription_status(doc_id, "failed", str(e)[:300])


def _set_transcription_status(doc_id: str, status: str, error_msg: str = ""):
    """Transkripsiyon durumunu DB'de günceller."""
    try:
        with get_session() as db:
            belge = db.get(Belge, doc_id)
            if belge:
                meta = dict(belge.meta or {})
                meta["transcription_status"] = status
                if error_msg:
                    meta["transcription_error"] = error_msg
                belge.meta = meta
                db.commit()
    except Exception as e:
        logger.error("Durum güncelleme hatası: %s", e)


@router.post("/transcribe/{doc_id}")
async def transkripsiyon_baslat(doc_id: str, background_tasks: BackgroundTasks):
    """
    Ses veya video dosyasını Whisper ile arka planda transkripte çevirir.

    Video dosyaları için:
      - Orijinal video arşivde saklanmaya devam eder (silinmez)
      - Sadece ses kanalı geçici olarak ayıklanır
      - Whisper transkripsiyon yapar
      - Geçici ses dosyası temizlenir

    Yanıt hemen döner (202 Accepted), işlem arka planda sürer.
    Durumu polling ile kontrol etmek için: GET /api/archive/list
    meta.transcription_status: "pending" | "processing" | "done" | "failed"
    """
    with get_session() as db:
        belge = db.get(Belge, doc_id)
        if not belge:
            raise HTTPException(status_code=404, detail="Belge bulunamadı.")

        ext = (belge.dosya_turu or "").lower().lstrip(".")
        if ext not in AV_EXTS:
            raise HTTPException(
                status_code=400,
                detail=f"Bu dosya türü ({ext}) transkripsiyon için desteklenmiyor. "
                       f"Desteklenenler: {', '.join(sorted(AV_EXTS))}"
            )

        if not belge.depolama_yolu or not os.path.exists(belge.depolama_yolu):
            raise HTTPException(status_code=404, detail="Dosya diskde bulunamadı.")

        # Zaten işleniyor mu?
        mevcut_durum = (belge.meta or {}).get("transcription_status")
        if mevcut_durum == "processing":
            return {
                "status":  "already_running",
                "message": "Transkripsiyon zaten devam etmekte.",
                "doc_id":  doc_id,
            }

        # Durumu "pending" yap
        meta = dict(belge.meta or {})
        meta["transcription_status"] = "pending"
        belge.meta = meta
        db.commit()

    # Arka planda başlat
    background_tasks.add_task(_run_transcription, doc_id)

    is_video = ext in VIDEO_EXTS
    return {
        "status":  "started",
        "message": (
            f"{'Video' if is_video else 'Ses'} transkripsiyon başlatıldı. "
            "İşlem arka planda devam ediyor."
        ),
        "doc_id":  doc_id,
        "is_video": is_video,
        "note":    "Videolar için: orijinal video arşivde saklanır, sadece ses işlenir."
    }

@router.post("/vectorize/{doc_id}")
async def vektorizasyon_baslat(doc_id: str, background_tasks: BackgroundTasks):
    """
    Belgeleri (PDF, DOCX, txt) arka planda vektörize eder.
    """
    with get_session() as db:
        belge = db.get(Belge, doc_id)
        if not belge:
            raise HTTPException(status_code=404, detail="Belge bulunamadı.")
            
        ext = (belge.dosya_turu or "").lower().lstrip(".")
        if ext in AV_EXTS:
            raise HTTPException(status_code=400, detail="Ses ve video dosyaları için /transcribe uç noktasını kullanın.")
            
        mevcut_durum = (belge.meta or {}).get("transcription_status")
        if mevcut_durum == "processing":
            return {"status": "already_running"}

        # Durumu "pending" yap
        meta = dict(belge.meta or {})
        meta["transcription_status"] = "pending"
        belge.meta = meta
        db.commit()

    background_tasks.add_task(_run_vectorization, doc_id)
    return {"status": "started", "message": "Belge vektörizasyonu başlatıldı.", "doc_id": doc_id}


@router.get("/progress/{doc_id}")
def transkripsiyon_ilerleme(doc_id: str):
    """
    Transkripsiyon işleminin anlık ilerleme yüzdesini döner.
    GLOBAL_PROGRESS[doc_id] = {"status": str, "percent": float}
    İşlem bitmişse veya başlamamışsa percent=0 döner.
    """
    from services.processors.audio_processor import GLOBAL_PROGRESS
    prog = GLOBAL_PROGRESS.get(doc_id, {})
    return {
        "doc_id":  doc_id,
        "percent": round(prog.get("percent", 0.0), 1),
        "label":   prog.get("status", "bekliyor"),
    }


@router.delete("/transcribe/{doc_id}")
def transkripsiyon_iptal(doc_id: str):
    """
    Devam eden transkripsiyon işlemini iptal eder.
    - CANCEL_FLAGS[doc_id] = True → audio_processor'daki döngü durur
    - GLOBAL_PROGRESS temizlenir
    - meta.transcription_status = 'failed' (iptal edildi mesajıyla)
    """
    from services.processors.audio_processor import CANCEL_FLAGS, GLOBAL_PROGRESS
    with get_session() as db:
        belge = db.get(Belge, doc_id)
        if not belge:
            raise HTTPException(status_code=404, detail="Belge bulunamadı.")
        status = (belge.meta or {}).get("transcription_status")
        if status not in ("processing", "pending"):
            return {"status": "not_running", "message": "İşlenmekte olan bir transkripsiyon yok."}
        # İptal bayrağını set et
        CANCEL_FLAGS[doc_id] = True
        GLOBAL_PROGRESS.pop(doc_id, None)
        # DB'yi hemen güncelle
        meta = dict(belge.meta or {})
        meta["transcription_status"] = "failed"
        meta["transcription_error"]  = "Kullanıcı tarafından iptal edildi."
        belge.meta = meta
        db.commit()
    return {"status": "cancelled", "doc_id": doc_id}
