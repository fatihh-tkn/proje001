"""
backend/api/routes/archive.py
----------------------------------------------------------------------
Arsiv Yoneticisi API Endpoint'leri.
Arka plan işlemleri (transkripsiyon, vektörizasyon, auto-link):
  → backend/services/archive_service.py
"""
import os
import uuid
import shutil

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Form, Header
from fastapi.responses import FileResponse
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from typing import List, Optional
from database.sql.session import get_session
from database.uow import UnitOfWork
from database.sql.models import Belge, Kullanici, VektorParcasi
from core.logger import get_logger
from services.archive_service import (
    AV_EXTS, AUDIO_EXTS, VIDEO_EXTS,
    run_transcription, run_vectorization,
    try_auto_link_by_number, try_batch_relink,
    _PENDING_RELINK, _RELINK_LOCK,
)

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
        k_map, c_map = _build_maps_for_belgeler(belgeler, db)
        return {"items": [_belge_to_dict(b, db, kullanici_map=k_map, chunk_count_map=c_map) for b in belgeler]}


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
        k_map, c_map = _build_maps_for_belgeler(belgeler, db)
        return {"items": [_belge_to_dict(b, db, kullanici_map=k_map, chunk_count_map=c_map) for b in belgeler]}


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


def _chunk_list(lst: list, size: int = 900):
    for i in range(0, len(lst), size):
        yield lst[i:i + size]

def _build_maps_for_belgeler(belgeler: List[Belge], db) -> tuple[dict, dict]:
    kullanici_map = {}
    chunk_count_map = {}

    if not belgeler:
        return kullanici_map, chunk_count_map

    k_ids = list({b.yukleyen_kimlik for b in belgeler if b.yukleyen_kimlik})
    for chunk in _chunk_list(k_ids):
        users = db.scalars(select(Kullanici).where(Kullanici.kimlik.in_(chunk))).all()
        for u in users:
            kullanici_map[u.kimlik] = u.tam_ad

    b_ids = list({b.kimlik for b in belgeler})
    for chunk in _chunk_list(b_ids):
        counts = db.execute(
            select(VektorParcasi.belge_kimlik, func.count(VektorParcasi.kimlik))
            .where(VektorParcasi.belge_kimlik.in_(chunk))
            .group_by(VektorParcasi.belge_kimlik)
        ).all()
        for b_id, count in counts:
            chunk_count_map[b_id] = count

    return kullanici_map, chunk_count_map

def _build_preview_map_for_belgeler(belgeler: List[Belge], db) -> dict:
    preview_map = {b.kimlik: [] for b in belgeler}
    if not belgeler:
        return preview_map

    b_ids = list({b.kimlik for b in belgeler})
    for chunk in _chunk_list(b_ids):
        subq = select(
            VektorParcasi.belge_kimlik,
            VektorParcasi.kimlik,
            VektorParcasi.chromadb_kimlik,
            func.row_number().over(
                partition_by=VektorParcasi.belge_kimlik,
                order_by=VektorParcasi.kimlik
            ).label("rn")
        ).where(VektorParcasi.belge_kimlik.in_(chunk)).subquery()

        previews = db.execute(
            select(subq.c.belge_kimlik, subq.c.kimlik, subq.c.chromadb_kimlik)
            .where(subq.c.rn <= 5)
        ).all()

        for b_id, p_id, p_chroma_id in previews:
            preview_map[b_id].append({"id": p_id, "chroma_id": p_chroma_id})

    return preview_map


def _belge_to_dict(b: Belge, db, kullanici_map: dict = None, chunk_count_map: dict = None) -> dict:
    """Belge modelini API yanıtı dict'ine çevirir (ortak yardımcı)."""
    meta = b.meta or {}
    yukleyen_adi = "Bilinmiyor"

    if kullanici_map is not None:
        if b.yukleyen_kimlik and b.yukleyen_kimlik in kullanici_map:
            yukleyen_adi = kullanici_map[b.yukleyen_kimlik]
    else:
        if b.yukleyen_kimlik:
            k = db.get(Kullanici, b.yukleyen_kimlik)
            if k:
                yukleyen_adi = k.tam_ad

    if chunk_count_map is not None:
        total_chunks = chunk_count_map.get(b.kimlik, 0)
    else:
        parcalar = db.scalars(
            select(VektorParcasi).where(VektorParcasi.belge_kimlik == b.kimlik)
        ).all()
        total_chunks = len(parcalar)

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
        "total_chunks": total_chunks,
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
            "transcription_language":    meta.get("transcription_language"),
            "transcription_chunk_count": meta.get("transcription_chunk_count"),
            "transcription_preview":     meta.get("transcription_preview"),
            "vision_analysis":           meta.get("vision_analysis"),
            "vision_error":              meta.get("vision_error"),
            "cad_turu":                  meta.get("cad_turu"),
            "bagli_dosyalar":            meta.get("bagli_dosyalar", {}),
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

        k_map, c_map = _build_maps_for_belgeler(belgeler, db)
        p_map = _build_preview_map_for_belgeler(belgeler, db)

        sonuclar = []
        for b in belgeler:
            meta = b.meta or {}
            belge_klasor_kimlik = meta.get("klasor_kimlik")

            yukleyen_adi = "Bilinmiyor"
            if b.yukleyen_kimlik and b.yukleyen_kimlik in k_map:
                yukleyen_adi = k_map[b.yukleyen_kimlik]

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
                "total_chunks": c_map.get(b.kimlik, 0),
                "chunks_preview": p_map.get(b.kimlik, []),
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
                    "vision_analysis": meta.get("vision_analysis"),
                    "vision_error": meta.get("vision_error"),
                    "cad_turu": meta.get("cad_turu"),
                    "bagli_dosyalar": meta.get("bagli_dosyalar", {}),
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
                "vision_analysis": meta.get("vision_analysis"),
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


@router.delete("/documents/{doc_id}")
def tek_belge_sil(doc_id: str):
    """Tek belgeyi siler — toplu_sil altyapısını kullanır."""
    return toplu_sil(TopluSilRequest(ids=[doc_id]))


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
    """Dosyayı tarayıcıda önizlemek için stream eder.
    PPT/PPTX için: meta.pdf_yolu varsa veya orijinal dosyanın yanında .pdf
    bulunuyorsa onu döndürür (frontend PDF Viewer kullandığı için).
    """
    with get_session() as db:
        belge = db.get(Belge, kimlik)
        if not belge or not belge.depolama_yolu:
            raise HTTPException(status_code=404, detail="Dosya bulunamadı.")
        if not os.path.exists(belge.depolama_yolu):
            raise HTTPException(status_code=404, detail="Fiziksel dosya eksik.")

        import mimetypes
        import urllib.parse

        serve_path = belge.depolama_yolu
        serve_name = belge.dosya_adi

        if (belge.dosya_turu or "").lower() in ("pptx", "ppt"):
            meta = belge.meta or {}
            candidate = meta.get("pdf_yolu") or ""
            if not candidate or not os.path.exists(candidate):
                derived = os.path.splitext(belge.depolama_yolu)[0] + ".pdf"
                if os.path.exists(derived):
                    candidate = derived
            if candidate and os.path.exists(candidate):
                serve_path = candidate
                serve_name = os.path.splitext(belge.dosya_adi)[0] + ".pdf"

        mime_type, _ = mimetypes.guess_type(serve_name)
        if not mime_type:
            mime_type = "application/octet-stream"

        encoded_filename = urllib.parse.quote(serve_name)

        return FileResponse(
            path=serve_path,
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
    kategori: str = Form(None),
    cad_turu: str = Form(None),
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
    is_image = dosya_uzantisi in {"png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff", "dwg", "dxf", "stp", "step", "awg"}

    # Kategori: form'dan gelen değere öncelik ver; yoksa uzantıdan çıkar
    _kat = (kategori or "").strip()
    if _kat and _kat not in ("null", "undefined"):
        belge_kategori = _kat
    elif is_av:
        belge_kategori = "toplantılar"
    elif is_image:
        belge_kategori = "teknik_resim"
    elif dosya_uzantisi == "bpmn":
        belge_kategori = "surecler"
    elif havuz_turu == "kullanici":
        belge_kategori = "kisisel"
    else:
        belge_kategori = "belgeler"

    # Kullanıcı klasörü varsa onu kullan; admin için form'dan gelen folder_id geçerli
    effective_folder_id = kullanici_klasor_id or (folder_id if folder_id and folder_id != "null" else None)
    meta_dict = {"klasor_kimlik": effective_folder_id} if effective_folder_id else {}
    if is_av or is_text or is_image:
        meta_dict["transcription_status"] = "pending"
    if cad_turu and cad_turu in ("cad", "nesting"):
        meta_dict["cad_turu"] = cad_turu

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
            kategori=belge_kategori,
        )
        db.add(yeni_belge)
        db.commit()
        db.refresh(yeni_belge)

    if is_av:
        background_tasks.add_task(_run_transcription, yeni_belge.kimlik)
    elif is_text or is_image:
        background_tasks.add_task(_run_vectorization, yeni_belge.kimlik)

    return {
        "status": "success",
        "id": yeni_belge.kimlik,
        "filename": file.filename,
        "havuz_turu": havuz_turu,
    }


# ── SES / VİDEO TRANSKRİPSİYON ENDPOINT'İ ────────────────────────────────────

def _run_transcription(doc_id: str):
    run_transcription(doc_id)


# ── METİN/PDF/DOCX VEKTÖRİZASYON ENDPOINT'İ ──────────────────────────────────
def _run_vectorization(doc_id: str):
    run_vectorization(doc_id)







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
            # Gerçekten aktif mi, yoksa takılı mı kaldı?
            from services.processors.process_progress import get as pg_get
            pg_state = pg_get(doc_id)
            if pg_state and not pg_state.get("done") and not pg_state.get("error"):
                return {"status": "already_running"}
            # Progress store'da aktif kayıt yok → önceki işlem çökmüş olabilir
            # Durumu sıfırlayıp yeniden başlat
            meta = dict(belge.meta or {})
            meta["transcription_status"] = "pending"
            meta.pop("transcription_error", None)
            belge.meta = meta
            db.commit()
        else:
            # Durumu "pending" yap
            meta = dict(belge.meta or {})
            meta["transcription_status"] = "pending"
            belge.meta = meta
            db.commit()

    background_tasks.add_task(_run_vectorization, doc_id)
    return {"status": "started", "message": "Belge vektörizasyonu başlatıldı.", "doc_id": doc_id}


@router.get("/transcription-progress/{doc_id}")
def transkripsiyon_ilerleme(doc_id: str):
    """
    Ses transkripsiyon yüzdesini döner (AudioArchiveViewer polling).
    GLOBAL_PROGRESS[doc_id] = {"status": str, "percent": float}
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


class WatcherStatsRequest(BaseModel):
    paths: List[str] = Field(default_factory=list)


@router.get("/watcher-browse")
def watcher_browse(mode: str = "dir"):
    """Yerel OS dosya/klasör seçici açar, seçilen yolu döner."""
    try:
        try:
            import ctypes
            ctypes.windll.shcore.SetProcessDpiAwareness(2)
        except Exception:
            pass
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.wm_attributes("-topmost", 1)
        root.update()
        if mode == "file":
            path = filedialog.askopenfilename(title="Dosya Seç", parent=root)
        else:
            path = filedialog.askdirectory(title="Klasör Seç", parent=root)
        root.destroy()
        return {"path": path or ""}
    except Exception as exc:
        logger.warning("Dosya seçici açılamadı: %s", exc)
        return {"path": "", "error": str(exc)}


@router.post("/watcher-stats")
def watcher_stats(req: WatcherStatsRequest):
    """Kullanıcının verdiği dizin/dosya yollarının anlık istatistiklerini döner."""
    import time as _time

    dirs_out = []

    for raw_path in req.paths:
        raw_path = raw_path.strip()
        if not raw_path:
            continue

        path   = os.path.abspath(raw_path)
        label  = os.path.basename(path) or path
        exists = os.path.exists(path)

        if not exists:
            dirs_out.append({
                "key": raw_path, "label": label, "path": path,
                "exists": False, "is_file": False,
                "file_count": 0, "total_size": 0, "last_change": 0.0, "files": [],
            })
            continue

        # Tek dosya mı?
        if os.path.isfile(path):
            try:
                st = os.stat(path)
                dirs_out.append({
                    "key": raw_path, "label": label, "path": path,
                    "exists": True, "is_file": True,
                    "file_count": 1, "total_size": st.st_size,
                    "last_change": st.st_mtime,
                    "files": [{
                        "name":     label,
                        "ext":      os.path.splitext(label)[1].lower().lstrip("."),
                        "size":     st.st_size,
                        "modified": st.st_mtime,
                    }],
                })
            except OSError:
                pass
            continue

        # Dizin tarama
        total_size  = 0
        file_count  = 0
        last_change = 0.0
        all_files   = []

        for root, _, files in os.walk(path):
            for fname in files:
                fp = os.path.join(root, fname)
                try:
                    st = os.stat(fp)
                    total_size  += st.st_size
                    file_count  += 1
                    if st.st_mtime > last_change:
                        last_change = st.st_mtime
                    all_files.append({
                        "name":     fname,
                        "ext":      os.path.splitext(fname)[1].lower().lstrip("."),
                        "size":     st.st_size,
                        "modified": st.st_mtime,
                    })
                except OSError:
                    pass

        all_files.sort(key=lambda x: -x["modified"])

        dirs_out.append({
            "key":        raw_path, "label": label, "path": path,
            "exists":     True,     "is_file": False,
            "file_count": file_count,
            "total_size": total_size,
            "last_change": last_change,
            "files":      all_files[:200],
        })

    return {"dirs": dirs_out, "poll_ts": _time.time()}


@router.get("/check-vision-config")
def check_vision_config():
    """Vision AI model ayarının okunabilirliğini test eder (debug)."""
    from database.sql.models import SistemAyari, AIModeli
    from sqlalchemy import select
    try:
        with get_session() as db:
            rows = {r.anahtar: r.deger for r in db.scalars(select(SistemAyari)).all()}
            doc_model_id  = rows.get("doc_processing_model_id")
            vision_model_id = rows.get("vision_model_id")

            def _probe(mid, label):
                if not mid:
                    return {"key": label, "stored": None, "found": False, "has_key": False, "model_id": None, "provider": None}
                entry_id = str(mid).strip('"').strip("'")
                m = db.get(AIModeli, entry_id)
                if not m:
                    return {"key": label, "stored": entry_id, "found": False, "has_key": False, "model_id": None, "provider": None}
                from services.crypto_service import decrypt as _d
                api_key = _d(m.api_anahtari) if m.api_anahtari else ""
                effective_model = (m.model_id or m.ad or "").strip()
                return {
                    "key":      label,
                    "stored":   entry_id,
                    "found":    True,
                    "has_key":  bool(api_key),
                    "model_id": effective_model,
                    "provider": m.tedarikci,
                    "base_url": m.temel_url,
                }

            return {
                "doc_processing": _probe(doc_model_id, "doc_processing_model_id"),
                "vision_fallback": _probe(vision_model_id, "vision_model_id"),
                "doc_prompt_set": bool((rows.get("doc_processing_prompt") or "").strip()),
            }
    except Exception as e:
        return {"error": str(e)}


@router.get("/progress/{doc_id}")
async def dokuman_ilerleme_sse(doc_id: str):
    """Belge işleme ilerlemesini SSE akışı olarak döner."""
    import asyncio
    import json as _json
    from fastapi.responses import StreamingResponse as _SR
    from services.processors.process_progress import get as pg_get, clear as pg_clear

    async def generate():
        last_step = None
        elapsed   = 0.0
        limit     = 300.0   # 5 dk timeout
        interval  = 0.25

        while elapsed < limit:
            p = pg_get(doc_id)
            if p and p["step"] != last_step:
                last_step = p["step"]
                yield f"data: {_json.dumps(p, ensure_ascii=False)}\n\n"
                if p.get("done") or p.get("error"):
                    pg_clear(doc_id)
                    return
            await asyncio.sleep(interval)
            elapsed += interval

        yield 'data: {"step":"Zaman aşımı","done":true}\n\n'

    return _SR(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── DOSYA BAĞLANTISI ──────────────────────────────────────────────────────────

class LinkRequest(BaseModel):
    source_id: str
    target_id: str
    link_type: str   # 'cad' | 'nesting'

_VALID_LINK_TYPES = {"cad", "nesting"}
_REVERSE_LINK     = "cizim"   # target'tan source'a olan tersine bağlantı


@router.post("/relink-all")
def relink_all():
    """
    Kategori=teknik_resim olan, henüz bağlanmamış tüm belgeler için
    dosya adı + vision_data tabanlı otomatik eşleştirmeyi yeniden çalıştırır.
    Yeni kod deploy edildiğinde veya elle tetiklemek gerektiğinde kullanılır.
    """
    from sqlalchemy import select as _sel
    linked_count = 0
    skipped = 0
    try:
        with get_session() as db:
            belgeler = list(db.scalars(
                _sel(Belge).where(Belge.kategori == "teknik_resim")
            ).all())

        for b in belgeler:
            bagli = (b.meta or {}).get("bagli_dosyalar", {})
            if bagli.get("nesting") or bagli.get("cizim") or bagli.get("cad"):
                skipped += 1
                continue
            vd = (b.meta or {}).get("vision_analysis")
            if not vd:
                continue
            result = try_auto_link_by_number(b.kimlik, vd)
            if result:
                linked_count += 1

        return {"linked": linked_count, "skipped_already_linked": skipped}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/link")
def link_dosyalar(req: LinkRequest):
    """İki belge arasında çift yönlü bağlantı oluşturur ve meta'ya kaydeder."""
    if req.link_type not in _VALID_LINK_TYPES:
        raise HTTPException(status_code=400, detail="Geçersiz link_type")
    with get_session() as db:
        source = db.get(Belge, req.source_id)
        target = db.get(Belge, req.target_id)
        if not source or not target:
            raise HTTPException(status_code=404, detail="Belge bulunamadı")

        # source → target
        sm = dict(source.meta or {})
        sb = sm.setdefault("bagli_dosyalar", {})
        if req.link_type == "nesting":
            # Nesting listesine ekle (çoklu desteklenir)
            existing = sb.get("nesting")
            existing_list = existing if isinstance(existing, list) else ([existing] if existing else [])
            if req.target_id not in existing_list:
                sb["nesting"] = existing_list + [req.target_id]
        else:
            sb[req.link_type] = req.target_id
        source.meta = sm

        # target → source (tersine bağlantı)
        tm = dict(target.meta or {})
        tm.setdefault("bagli_dosyalar", {})[_REVERSE_LINK] = req.source_id
        target.meta = tm

        db.commit()
    return {"status": "ok"}


@router.delete("/link")
def unlink_dosyalar(source_id: str, link_type: str):
    """Bağlantıyı her iki taraftan da kaldırır."""
    if link_type not in _VALID_LINK_TYPES:
        raise HTTPException(status_code=400, detail="Geçersiz link_type")
    with get_session() as db:
        source = db.get(Belge, source_id)
        if not source:
            raise HTTPException(status_code=404, detail="Belge bulunamadı")

        sm = dict(source.meta or {})
        bagli = sm.get("bagli_dosyalar", {})
        target_id = bagli.pop(link_type, None)
        sm["bagli_dosyalar"] = bagli
        source.meta = sm

        if target_id:
            target = db.get(Belge, target_id)
            if target:
                tm = dict(target.meta or {})
                tm.get("bagli_dosyalar", {}).pop(_REVERSE_LINK, None)
                target.meta = tm

        db.commit()
    return {"status": "ok"}


@router.get("/dwg-texts/{doc_id}")
def dwg_text_preview(doc_id: str):
    """DWG/DXF dosyasından ham text entity'lerini döner (test amaçlı)."""
    import threading

    with get_session() as db:
        belge = db.get(Belge, doc_id)
        if not belge:
            raise HTTPException(status_code=404, detail="Belge bulunamadı")
        file_path = belge.depolama_yolu
        filename  = belge.dosya_adi

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dosya diskte bulunamadı")

    texts_holder: list = [None]
    error_holder:  list = [""]

    def _extract():
        try:
            import ezdxf
            from ezdxf import recover
            try:
                doc = recover.readfile(file_path)[0]
            except Exception:
                doc = ezdxf.readfile(file_path)

            texts = []
            seen: set[str] = set()
            for layout in doc.layouts:
                for entity in layout:
                    t_str = ""
                    try:
                        dtype = entity.dxftype()
                        if dtype == "TEXT":
                            t_str = (entity.dxf.get("text") or "").strip()
                        elif dtype == "MTEXT":
                            t_str = entity.plain_mtext().strip()
                        elif dtype in ("ATTDEF", "ATTRIB"):
                            t_str = (entity.dxf.get("text") or "").strip()
                    except Exception:
                        pass
                    if t_str and t_str not in seen:
                        seen.add(t_str)
                        texts.append(t_str)
            texts_holder[0] = texts
        except Exception as e:
            error_holder[0] = f"{type(e).__name__}: {e}"

    t = threading.Thread(target=_extract, daemon=True)
    t.start()
    t.join(timeout=15)

    if t.is_alive() or texts_holder[0] is None:
        return {
            "filename": filename,
            "status": "error",
            "error": error_holder[0] or "15s zaman aşımı",
            "texts": [],
            "count": 0,
        }

    return {
        "filename": filename,
        "status": "ok",
        "count": len(texts_holder[0]),
        "texts": texts_holder[0],
    }


# ── Teknik Döküman Ajanı ──────────────────────────────────────────────────────

class TeknikAjanRequest(BaseModel):
    doc_id: str = Field(..., max_length=128)
    action: str = Field(..., pattern="^(summarize|query|enrich|analyze)$")
    query: Optional[str] = Field(default=None, max_length=2000)


@router.post("/teknik-agent")
async def teknik_agent_calistir(body: TeknikAjanRequest):
    """
    Teknik Döküman Ajanı'nı çalıştırır.
    SSE (Server-Sent Events) akışıyla sonuçları iletir.
    """
    from fastapi.responses import StreamingResponse
    from services.teknik_dokuman_agent import run_action

    return StreamingResponse(
        run_action(
            doc_id=body.doc_id,
            action=body.action,
            query=body.query,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


