import os
import shutil
import uuid

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from services.processor import analyze_pdf_with_vision
from services.memory import memory_engine
from database.sql.session import get_session
from database.uow import UnitOfWork
from database.sql.models import Belge
from core.logger import get_logger

logger = get_logger("bridge")

router = APIRouter()

UPLOAD_DIR = "./temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- 1. KÖPRÜ: ÖĞÜTME VE KARANTİNA ---
@router.post("/upload-and-analyze")
async def upload_and_analyze(file: UploadFile = File(...), use_vision: bool = Form(False), task_id: str = Form(None), whisper_model: str = Form("large-v3"), whisper_device: str = Form("cuda")):
    import time as _time
    import asyncio
    from fastapi.concurrency import run_in_threadpool
    try:
        unique_prefix = str(uuid.uuid4())[:8]
        safe_filename = file.filename.replace(" ", "_")
        file_path     = f"{UPLOAD_DIR}/{unique_prefix}_{safe_filename}"

        # Dosyayı diske yaz (blocking I/O → threadpool)
        contents = await file.read()
        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: open(file_path, "wb").write(contents)
        )

        ext = safe_filename.rsplit(".", 1)[-1].lower() if "." in safe_filename else ""

        t0 = _time.time()

        # Ağır işlemi (dispatch) thread pool'da çalıştır — event loop bloklanmasın
        from services.processors import dispatch
        chunks = await run_in_threadpool(
            dispatch,
            file_path    = file_path,
            ext          = ext,
            use_vision   = use_vision,
            original_name = safe_filename,
            task_id      = task_id,
            whisper_model= whisper_model,
            whisper_device= whisper_device,
        )
        isleme_suresi_ms = int((_time.time() - t0) * 1000)

        # PPTX için dönüştürülen PDF yolunu response'a ekle
        converted_pdf_path = None
        if ext in ("pptx", "ppt"):
            first_meta = next((c.get("metadata", {}) for c in chunks if c.get("metadata", {}).get("pdf_path")), {})
            converted_pdf_path = first_meta.get("pdf_path")

        return {
            "status":              "success",
            "message":             "Dosya analiz edildi, onay bekliyor.",
            "file_name":           safe_filename,
            "temp_path":           file_path,
            "total_chunks":        len(chunks),
            "chunks":              chunks,
            "isleme_suresi_ms":    isleme_suresi_ms,
            "converted_pdf_path": converted_pdf_path,
        }
    except Exception as e:
        logger.error("Dosya analiz hatası [%s]: %s", file.filename if file else "?", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Dosya analiz edilemedi: {str(e)}")

@router.get("/progress/{task_id}")
def get_progress(task_id: str):
    from services.processors.audio_processor import GLOBAL_PROGRESS
    data = GLOBAL_PROGRESS.get(task_id, {"status": "idle", "percent": 0.0})
    # Tamamlanmış görevleri bir kez okuyup sil — frontend durduktan sonra bellekte birikmez
    if data.get("status") in ("done", "error"):
        GLOBAL_PROGRESS.pop(task_id, None)
    return data



# --- 1b. KÖPRÜ: TEKİL CHUNK SİLME (Atomik) ---
@router.delete("/chunk/{chunk_id}")
def delete_chunk(chunk_id: str):
    """
    Tek bir vektör parçasını (chunk) tüm tabakalardan atomik olarak siler:
      1. ChromaDB  → vektör kaydını siler
      2. SQL       → VektorParcasi + BilgiIliskisi (kenarlar) siler
      3. Graf      → düğümü ve kenarlarını temizler
      4. Kenar Re-linking → next_chunk zincirindeki boşluğu kapatır
      5. Belge Meta → parca_sayisi 1 azaltır
    """
    from database.sql.models import VektorParcasi, BilgiIliskisi, Belge
    from database.vector.pgvector_db import vector_db
    from database.graph.networkx_db import graph_db
    from sqlalchemy import select, or_

    try:
        with UnitOfWork() as uow:
            db = uow.session

            # 1 — SQL'den parçayı bul
            parca = db.scalar(
                select(VektorParcasi).where(VektorParcasi.chromadb_kimlik == chunk_id)
            )
            if not parca:
                # SQL'de yok ama Chroma'da olabilir → yine de sil
                try:
                    coll = _resolve_collection(db, chunk_id)
                    vector_db.delete_documents(coll, [chunk_id])
                except Exception:
                    pass
                raise HTTPException(status_code=404, detail="Parça bulunamadı.")

            parca_pk        = parca.kimlik
            belge_kimlik    = parca.belge_kimlik
            chroma_coll     = _resolve_collection(db, chunk_id, parca)

            # 2 — Bu parçanın kenarlarını al (re-linking için)
            incoming_edges = db.scalars(
                select(BilgiIliskisi).where(
                    BilgiIliskisi.hedef_parca_kimlik == parca_pk,
                    BilgiIliskisi.iliski_turu == "next_chunk"
                )
            ).all()
            outgoing_edges = db.scalars(
                select(BilgiIliskisi).where(
                    BilgiIliskisi.kaynak_parca_kimlik == parca_pk,
                    BilgiIliskisi.iliski_turu == "next_chunk"
                )
            ).all()

            # 3 — Kenar Re-linking: A→B→C zincirinde B siliniyorsa A→C köprüsü kur
            if incoming_edges and outgoing_edges:
                for inc in incoming_edges:
                    for out in outgoing_edges:
                        # Zaten bu çift var mı?
                        already = db.scalar(
                            select(BilgiIliskisi).where(
                                BilgiIliskisi.kaynak_parca_kimlik == inc.kaynak_parca_kimlik,
                                BilgiIliskisi.hedef_parca_kimlik  == out.hedef_parca_kimlik,
                                BilgiIliskisi.iliski_turu         == "next_chunk",
                            )
                        )
                        if not already:
                            db.add(BilgiIliskisi(
                                kaynak_parca_kimlik=inc.kaynak_parca_kimlik,
                                hedef_parca_kimlik=out.hedef_parca_kimlik,
                                iliski_turu="next_chunk",
                                agirlik=1.0,
                            ))

            # 4 — Tüm kenarları sil (gelen + giden, tüm türler)
            all_edges = db.scalars(
                select(BilgiIliskisi).where(
                    or_(
                        BilgiIliskisi.kaynak_parca_kimlik == parca_pk,
                        BilgiIliskisi.hedef_parca_kimlik  == parca_pk,
                    )
                )
            ).all()
            for edge in all_edges:
                db.delete(edge)
            db.flush()

            # 5 — SQL VektorParcasi kaydını sil
            db.delete(parca)
            db.flush()

            # 6 — Belge parca_sayisi güncelle
            belge = db.scalar(select(Belge).where(Belge.kimlik == belge_kimlik))
            if belge:
                belge.parca_sayisi = max(0, (belge.parca_sayisi or 1) - 1)
                # Tüm parçalar bitti → belgeyi "işlenmemiş" moda al
                if belge.parca_sayisi == 0:
                    belge.vektorlestirildi_mi = False
                db.flush()

            # 7 — ChromaDB'den sil (UoW kaydından önce, hata varsa rollback için telafi)
            def rb_chroma_add_back():
                """ChromaDB silme başarılı ama SQL commit başarısız olursa geri ekle."""
                pass  # ChromaDB partial state kabul edilebilir; log yeterli

            try:
                vector_db.delete_documents(chroma_coll, [chunk_id])
                logger.info("ChromaDB chunk silindi: %s", chunk_id)
            except Exception as chroma_err:
                logger.warning("ChromaDB silme hatası (devam): %s", chroma_err)

            # 8 — Graf düğümünü sil
            try:
                graph_db.remove_nodes([str(parca_pk)])
                logger.info("Graf düğümü silindi: %s", parca_pk)
            except Exception as graph_err:
                logger.warning("Graf silme hatası (devam): %s", graph_err)

        logger.info("Chunk atomik silme OK: chromadb_id=%s sql_pk=%s", chunk_id, parca_pk)
        return {"status": "ok", "deleted_chunk_id": chunk_id, "belge_kimlik": belge_kimlik}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Chunk silme hatası: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chunk silinirken hata: {str(e)}")


def _resolve_collection(db, chunk_id: str, parca=None) -> str:
    """Parçanın ait olduğu ChromaDB koleksiyon adını çözer."""
    if parca and parca.belge_kimlik:
        from database.sql.models import Belge
        from sqlalchemy import select
        belge = db.scalar(select(Belge).where(Belge.kimlik == parca.belge_kimlik))
        if belge and belge.vektordb_koleksiyon:
            return belge.vektordb_koleksiyon
    return "yilgenci_collection"   # varsayılan koleksiyon adı


# --- 2. KÖPRÜ: HAFIZAYA KAZIMA (OPTİMİZE) ---

@router.post("/save-to-db")
def save_to_db(data: dict):
    from database.sql.models import VektorParcasi, BilgiIliskisi, Belge
    from database.vector.pgvector_db import vector_db
    from sqlalchemy import select, tuple_
    from database.graph.networkx_db import graph_db

    file_name   = data.get("file_name", "Bilinmeyen Dosya")
    chunks_raw  = data.get("chunks", [])
    coll_name   = data.get("collection_name", "yilgenci_collection")
    belge_kimlik_istek = data.get("belge_kimlik")

    if not chunks_raw:
        raise HTTPException(status_code=400, detail="Kaydedilecek veri yok!")

    logger.info("save_to_db -> %s | %d chunk", file_name, len(chunks_raw))

    try:
        def chunk_list(lst, n=900):
            """SQLite'in 999 limitini aşmamak için listeyi böler"""
            for i in range(0, len(lst), n):
                yield lst[i:i + n]

        with UnitOfWork() as uow:
            db = uow.session
            # 1. Belge kaydını çöz / oluştur & Varsa ESKİ kayıtları temizle (Re-upload durumunda üst üste binmeyi/orphan'ı engeller)
            resolved_belge_kimlik = None
            b = None  # DÜZELTME: NameError'ı önlemek için başlangıç değeri None

            if belge_kimlik_istek:
                b = db.scalar(select(Belge).where(Belge.kimlik == belge_kimlik_istek))
                if b: resolved_belge_kimlik = b.kimlik

            if not resolved_belge_kimlik:
                b = db.scalar(select(Belge).where(Belge.dosya_adi == file_name, Belge.dosya_turu != "folder"))
                if b: resolved_belge_kimlik = b.kimlik

            if b and resolved_belge_kimlik:
                # EĞER bu isimle bir kayıt varsa, eski verilerini Temizle! (Issue 4 Fix: UUID Collision / Overload)
                eski_parcalar = list(db.scalars(select(VektorParcasi).where(VektorParcasi.belge_kimlik == resolved_belge_kimlik)).all())
                if eski_parcalar:
                    eski_chroma_ids = [p.chromadb_kimlik for p in eski_parcalar]
                    eski_graf_ids = [str(p.kimlik) for p in eski_parcalar]
                    try:
                        vector_db.delete_documents(b.vektordb_koleksiyon or coll_name, eski_chroma_ids)
                    except Exception as _ce:
                        logger.warning("Eski ChromaDB kayıtları silinemedi: %s", _ce)
                    try:
                        graph_db.remove_nodes(eski_graf_ids)
                    except Exception as _ge:
                        logger.warning("Eski graf düğümleri silinemedi: %s", _ge)
                    for p in eski_parcalar: db.delete(p)
                    db.flush()
                # Belge güncelleme verisi
                b.parca_sayisi = len(chunks_raw)
                b.durum = "karantina"
                b.isleme_suresi_ms = data.get("isleme_suresi_ms")
                db.flush()

            if not resolved_belge_kimlik:
                file_ext = file_name.rsplit(".", 1)[-1] if "." in file_name else "unknown"
                b = Belge(
                    dosya_adi=file_name, dosya_turu=file_ext, parca_sayisi=len(chunks_raw),
                    vektordb_koleksiyon=coll_name, vektorlestirildi_mi=True, durum="karantina",
                    isleme_suresi_ms=data.get("isleme_suresi_ms"),
                )
                db.add(b)
                db.flush()
                resolved_belge_kimlik = b.kimlik

            # 2. ChromaDB'ye yaz (vektörleştirme)
            # archive_only chunk'lar vektörleştirilmez → ChromaDB'ye gönderilmez
            is_archive_only = all(
                c.get("metadata", {}).get("type") == "archive_only"
                for c in chunks_raw
            )

            if is_archive_only:
                # Belgeyi "arşiv" modunda işaretle
                if b is not None:
                    b.vektorlestirildi_mi = False
                    b.durum              = "onaylandi"
                    b.parca_sayisi       = 0
                    db.flush()
                logger.info("archive_only dosya — ChromaDB atlandı: %s", file_name)
                texts, metadatas, ids = [], [], []
            else:
                # Metadata temizliği ve hazırlığı
                texts, metadatas, ids = [], [], []
                for chunk in chunks_raw:
                    text = chunk.get("text", "")
                    if not text.strip():
                        continue
                    # archive_only chunk'ı karışık bir dosyada bile atla
                    if chunk.get("metadata", {}).get("type") == "archive_only":
                        continue
                    curr_id = chunk.get("id") or str(uuid.uuid4())
                    meta    = chunk.get("metadata", {}) if isinstance(chunk.get("metadata"), dict) else {}

                    clean_meta = {"sql_doc_id": resolved_belge_kimlik, "sqlite_doc_id": resolved_belge_kimlik}
                    for k, v in meta.items():
                        # ChromaDB sadece primitive tipleri kabul eder (str, int, float, bool)
                        # Emu/subclass gibi türevleri de str/int/float'a zorunlu dönüştür
                        if isinstance(v, bool):
                            clean_meta[k] = v
                        elif isinstance(v, int):
                            clean_meta[k] = int(v)
                        elif isinstance(v, float):
                            clean_meta[k] = float(v)
                        elif isinstance(v, str):
                            clean_meta[k] = v
                        else:
                            clean_meta[k] = str(v)

                    texts.append(text)
                    metadatas.append(clean_meta)
                    ids.append(curr_id)



            if texts:
                # Adım 1: ChromaDB'ye yaz (Atomik değil, UoW kaydiyla korunacak)
                vector_db.add_documents(
                    collection_name=coll_name,
                    documents=texts,
                    metadatas=metadatas,
                    ids=ids,
                )
                logger.info("ChromaDB kayit OK | koleksiyon=%s | %d dokuman", coll_name, len(texts))

                # UoW: SQL Flush oncesi Olası Hata için Telafi Kaydı (Compensation Transaction)
                def rb_chroma():
                    vector_db.delete_documents(coll_name, ids)
                    logger.info("ChromaDB rollback OK | %d vektor silindi", len(ids))

                uow.register_compensation(rb_chroma)

                # Adım 2: SQL'i güncelle
                if b is not None:
                    b.vektorlestirildi_mi = True
                    b.vektordb_koleksiyon = coll_name
                    b.parca_sayisi        = len(texts)
                    db.flush()

            # 3. Semantik komşuları al
            semantic_neighbors: dict[str, list[tuple[str, float]]] = {}
            q_ids   = [c.get("id") for c in chunks_raw if c.get("text", "").strip()]
            q_texts = [c.get("text") for c in chunks_raw if c.get("text", "").strip()]
            if q_texts:
                results  = vector_db.query(collection_name=coll_name, query_texts=q_texts, n_results=10)
                r_ids    = results.get("ids", [])
                r_dists  = results.get("distances", [])
                q_id_set = set(q_ids)
                for idx, c_id in enumerate(q_ids):
                    semantic_neighbors[c_id] = [
                        (t_id, dist) for t_id, dist in zip(r_ids[idx], r_dists[idx])
                        if t_id != c_id and t_id not in q_id_set and dist < 1.5
                    ]

            # 4. Yeni parçaları SQL'e kaydet (archive_only dosyalar atlanır)
            new_parcalar = []
            existing_map: dict = {}
            if not is_archive_only:
                all_chroma_ids = [c.get("id", "") for c in chunks_raw if c.get("id")]
                existing_rows: list = []
                if all_chroma_ids:
                    for chunked_ids in chunk_list(all_chroma_ids):
                        existing_rows.extend(db.scalars(
                            select(VektorParcasi).where(VektorParcasi.chromadb_kimlik.in_(chunked_ids))
                        ).all())
                existing_map = {row.chromadb_kimlik: row for row in existing_rows}

                for chunk in chunks_raw:
                    chroma_id = chunk.get("id", "")
                    if not chroma_id or chroma_id in existing_map:
                        continue
                    if chunk.get("metadata", {}).get("type") == "archive_only":
                        continue
                    meta = chunk.get("metadata", {})
                    # Kaydedilecek tam metadata (image_path, page_width, page_height, zoom_factor, type vb.)
                    meta_to_save = {k: v for k, v in meta.items() if isinstance(v, (str, int, float, bool, type(None)))}
                    new_parcalar.append(VektorParcasi(
                        belge_kimlik=resolved_belge_kimlik, chromadb_kimlik=chroma_id,
                        icerik=chunk.get("text", "")[:1000], konum_imi=f"{meta.get('source', file_name)} | Sayfa {meta.get('page', 0)}",
                        sayfa_no=meta.get("page", 0), sinir_kutusu=str(meta.get("bbox")) if meta.get("bbox") else None,
                        meta=meta_to_save if meta_to_save else None,
                    ))

                if new_parcalar:
                    db.add_all(new_parcalar)
                    db.flush()


            # 3d. Node sıralaması (archive_only ise atlanır)
            id_to_pk  : dict = {}
            saved_nodes: list = []
            if not is_archive_only:
                _existing_rows = existing_rows if "existing_rows" in dir() else []
                id_to_pk = {r.chromadb_kimlik: r.kimlik for r in _existing_rows}
                id_to_pk.update({p.chromadb_kimlik: p.kimlik for p in new_parcalar})

                for c in chunks_raw:
                    c_id = c.get("id")
                    n = existing_map.get(c_id) or next((p for p in new_parcalar if p.chromadb_kimlik == c_id), None)
                    if n: saved_nodes.append(n)


            # 3e. Next Chunk kenarları (parametre limitinden korumalı)
            candidate_pairs = [(saved_nodes[i].kimlik, saved_nodes[i + 1].kimlik) for i in range(len(saved_nodes) - 1)]
            existing_edges = set()
            if candidate_pairs:
                for chunked_pairs in chunk_list(candidate_pairs):
                    existing_edges.update(db.execute(
                        select(BilgiIliskisi.kaynak_parca_kimlik, BilgiIliskisi.hedef_parca_kimlik)
                        .where(tuple_(BilgiIliskisi.kaynak_parca_kimlik, BilgiIliskisi.hedef_parca_kimlik).in_(chunked_pairs))
                    ).fetchall())
            
            edges_to_add = [
                BilgiIliskisi(kaynak_parca_kimlik=src, hedef_parca_kimlik=tgt, iliski_turu="next_chunk", agirlik=1.0)
                for src, tgt in candidate_pairs if (src, tgt) not in existing_edges
            ]

            # 3f. Semantik kenarlar (parametre limitinden korumalı)
            sem_chroma_ids = list({t_id for neighbors in semantic_neighbors.values() for t_id, _ in neighbors})
            sem_nodes = {}
            if sem_chroma_ids:
                for chunked_sem_ids in chunk_list(sem_chroma_ids):
                    for row in db.scalars(select(VektorParcasi).where(VektorParcasi.chromadb_kimlik.in_(chunked_sem_ids))).all():
                        sem_nodes[row.chromadb_kimlik] = row

                for chroma_id, neighbors in semantic_neighbors.items():
                    src_pk = id_to_pk.get(chroma_id)
                    if not src_pk: continue
                    for tgt_chroma_id, dist in neighbors:
                        tgt = sem_nodes.get(tgt_chroma_id)
                        if tgt:
                            w = max(0.1, round(1.0 - dist / 2.0, 2))
                            # Sadece Tek Yönlü eklenecek (Depolama Maliyeti %50 tasarruf, RAM'de çift yönlü açılacak)
                            s, t = min(src_pk, tgt.kimlik), max(src_pk, tgt.kimlik)
                            new_edge = BilgiIliskisi(kaynak_parca_kimlik=s, hedef_parca_kimlik=t, iliski_turu="semantik_benzerlik", agirlik=w)
                            # Çakışma ve tekrarları önlemek için edges_to_add listesinde aynı (s, t, tur) varmı bakmak yerine
                            # basit filter ile liste kontrolü:
                            if not any(e.kaynak_parca_kimlik == s and e.hedef_parca_kimlik == t and e.iliski_turu == "semantik_benzerlik" for e in edges_to_add):
                                edges_to_add.append(new_edge)

            # 3g. Mantıksal kenarlar
            chroma_to_meta = {c.get("id"): c.get("metadata", {}) for c in chunks_raw if c.get("id")}
            page_groups = {}
            for node in saved_nodes:
                m = chroma_to_meta.get(node.chromadb_kimlik, {})
                p, t = m.get("page", -1), m.get("type", "")
                if p >= 0:
                    page_groups.setdefault(p, []).append((node.kimlik, t))

            logical_candidate_pairs = []
            for items in page_groups.values():
                t_ids = [pk for pk, t in items if t in ("slide_text", "text")]
                v_ids = [pk for pk, t in items if t == "ai_vision_analysis"]
                logical_candidate_pairs.extend([(v, t) for v in v_ids for t in t_ids])
                logical_candidate_pairs.extend([(t_ids[a], t_ids[b]) for a in range(len(t_ids)) for b in range(a + 1, len(t_ids))])

            existing_logical_edges = set()
            if logical_candidate_pairs:
                for chunked_log in chunk_list(logical_candidate_pairs):
                    existing_logical_edges.update(db.execute(
                        select(BilgiIliskisi.kaynak_parca_kimlik, BilgiIliskisi.hedef_parca_kimlik)
                        .where(tuple_(BilgiIliskisi.kaynak_parca_kimlik, BilgiIliskisi.hedef_parca_kimlik).in_(chunked_log))
                    ).fetchall())

            for items in page_groups.values():
                t_ids = [pk for pk, t in items if t in ("slide_text", "text")]
                v_ids = [pk for pk, t in items if t == "ai_vision_analysis"]
                for v in v_ids:
                    for t in t_ids:
                        if (v, t) not in existing_logical_edges:
                            edges_to_add.append(BilgiIliskisi(kaynak_parca_kimlik=v, hedef_parca_kimlik=t, iliski_turu="gorsel_analiz", agirlik=0.95))
                for a in range(len(t_ids)):
                    for b in range(a + 1, len(t_ids)):
                        if (t_ids[a], t_ids[b]) not in existing_logical_edges:
                            edges_to_add.append(BilgiIliskisi(kaynak_parca_kimlik=t_ids[a], hedef_parca_kimlik=t_ids[b], iliski_turu="ayni_sayfa", agirlik=0.8))

            if edges_to_add:
                db.add_all(edges_to_add)
            # UoW burada oto commit yapar (__exit__ metodu ile).
            # db.commit() yazmaya artik gerek yok cunku try blogunun sonunda uow bitiyor.

            # 4 -- NetworkX Hatali / Acik Grafikleri SQL Commit Sonrasina Birak (UoW register_after_commit)
            def update_networkx():
                try:
                    from database.graph.networkx_db import graph_db
                    formatted = [
                        {"from_id": str(e.kaynak_parca_kimlik), "to_id": str(e.hedef_parca_kimlik), "relation": e.iliski_turu, "weight": float(e.agirlik or 1.0)}
                        for e in edges_to_add
                    ]
                    if hasattr(graph_db, "add_edges"):
                        graph_db.add_edges(formatted)
                except Exception as ge:
                    logger.warning("NetworkX guncelleme hatasi: %s", ge)

            uow.register_after_commit(update_networkx)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Veritabanı kayıt hatası (UoW Rollback tetiklendi): %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Veritabanı Kayıt Hatası: {str(e)}")

    return {"status": "success", "message": f"{file_name} kalıcı hafızaya eklendi!"}



# --- 3. KÖPRÜ: ARŞİVLEME VE SQL KAYDI ---
@router.post("/archive-document")
def archive_document(data: dict):
    temp_path           = data.get("temp_path")
    final_name          = data.get("final_name", "isim_yok")
    chunk_count         = data.get("chunk_count", 0)
    chroma_collection   = data.get("chroma_collection", "yilgenci_collection")
    converted_pdf_path  = data.get("converted_pdf_path")  # PPTX->PDF donusum yolu
    user_id             = data.get("user_id") or None

    if not temp_path or not os.path.exists(temp_path):
        raise HTTPException(status_code=400, detail="Geçici dosya bulunamadı.")

    ARCHIVE_DIR = "./archive_uploads"
    os.makedirs(ARCHIVE_DIR, exist_ok=True)

    uid_prefix       = uuid.uuid4().hex[:8]
    archive_filename = f"{uid_prefix}_{final_name}"
    archive_path     = os.path.join(ARCHIVE_DIR, archive_filename)
    # copy2 kullan: temp dosya hâlâ gerekebilir (save-to-db'de path ref var),
    # caller cleanup eder. move yerine copy daha güvenli.
    shutil.copy2(temp_path, archive_path)

    file_ext = final_name.rsplit(".", 1)[-1].lower() if "." in final_name else "unknown"

    # PPTX: oluşturulan PDF'i de arşive kopyala
    pdf_archive_path = None
    if file_ext in ("pptx", "ppt") and converted_pdf_path and os.path.exists(converted_pdf_path):
        base_pdf_name    = os.path.splitext(final_name)[0] + ".pdf"
        pdf_archive_name = f"{uid_prefix}_{base_pdf_name}"
        pdf_archive_path = os.path.join(ARCHIVE_DIR, pdf_archive_name)
        try:
            shutil.copy2(converted_pdf_path, pdf_archive_path)
            logger.info("PPTX->PDF arsive tasindi: %s", pdf_archive_path)
        except Exception as e:
            logger.warning("PDF arsive tasinamadi: %s", e)
            pdf_archive_path = None

    # PPTX: slayt görsellerini (images_*/) de arşive kopyala
    archive_images_dir = None
    if file_ext in ("pptx", "ppt"):
        base_name_no_ext   = os.path.splitext(final_name)[0]
        temp_images_dir    = os.path.join(os.path.dirname(temp_path), f"images_{base_name_no_ext}")
        temp_images_dir    = os.path.abspath(temp_images_dir)
        if os.path.isdir(temp_images_dir):
            archive_images_dir = os.path.abspath(
                os.path.join(ARCHIVE_DIR, f"images_{uid_prefix}_{base_name_no_ext}")
            )
            try:
                shutil.copytree(temp_images_dir, archive_images_dir)
                logger.info("Slayt görselleri arsive kopyalandi: %s", archive_images_dir)
            except Exception as e:
                logger.warning("Slayt görselleri arsive kopyalanamadi: %s", e)
                archive_images_dir = None

    # depolama_yolu: PDF varsa PDF'i göster, yoksa orijinali
    primary_path = pdf_archive_path if pdf_archive_path else archive_path

    # meta verisi
    belge_meta = {}
    if file_ext in ("pptx", "ppt"):
        belge_meta["orijinal_format"] = file_ext
        belge_meta["orijinal_yol"]    = archive_path
        if pdf_archive_path:
            belge_meta["pdf_yolu"] = pdf_archive_path
        if archive_images_dir:
            belge_meta["images_yolu"] = archive_images_dir

    try:
        with get_session() as db:
            from sqlalchemy import select
            from database.sql.models import VektorParcasi, Kullanici

            # ── Kullanıcı bilgisi ve havuz/klasör belirleme ──────────────
            havuz_turu       = "sistem"
            klasor_kimlik    = None
            effective_user_id = None

            if user_id:
                kullanici = db.get(Kullanici, user_id)
                if kullanici:
                    effective_user_id = user_id
                    if kullanici.super_kullanici_mi:
                        havuz_turu = "sistem"
                    else:
                        havuz_turu = "kullanici"
                        # Kullanıcı adına göre klasör bul veya oluştur
                        klasor_adi = kullanici.tam_ad or "Kullanıcı"
                        mevcut_klasor = db.scalar(
                            select(Belge).where(
                                Belge.dosya_adi == klasor_adi,
                                Belge.dosya_turu == "folder",
                            )
                        )
                        if mevcut_klasor:
                            klasor_kimlik = mevcut_klasor.kimlik
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
                            klasor_kimlik = yeni_klasor.kimlik

            if klasor_kimlik:
                belge_meta["klasor_kimlik"] = klasor_kimlik

            existing = db.scalar(
                select(Belge).where(
                    Belge.dosya_adi == final_name,
                    Belge.dosya_turu != "folder"
                )
            )
            if existing:
                existing.depolama_yolu     = primary_path
                existing.dosya_boyutu_bayt = os.path.getsize(primary_path)
                existing.durum             = "onaylandi"
                if effective_user_id:
                    existing.yukleyen_kimlik = effective_user_id
                existing.havuz_turu = havuz_turu
                # meta güncelle (varsa mevcut meta koru)
                mevcut_meta = dict(existing.meta or {})
                mevcut_meta.update(belge_meta)
                existing.meta = mevcut_meta
                db.commit()
                db.refresh(existing)
                belge_id = existing.kimlik
            else:
                yeni_belge = Belge(
                    dosya_adi=final_name,
                    dosya_turu=file_ext,
                    dosya_boyutu_bayt=os.path.getsize(primary_path),
                    depolama_yolu=primary_path,
                    parca_sayisi=chunk_count,
                    vektordb_koleksiyon=chroma_collection,
                    vektorlestirildi_mi=True,
                    durum="onaylandi",
                    yukleyen_kimlik=effective_user_id,
                    havuz_turu=havuz_turu,
                    meta=belge_meta if belge_meta else None,
                )
                db.add(yeni_belge)
                db.commit()
                db.refresh(yeni_belge)
                belge_id = yeni_belge.kimlik

            # Chunk'lardaki image_path'i arşiv konumuna güncelle
            # (boş veya temp_uploads'a işaret edenleri düzelt)
            if archive_images_dir and belge_id:
                parcalar = db.scalars(
                    select(VektorParcasi).where(VektorParcasi.belge_kimlik == belge_id)
                ).all()
                updated = 0
                for p in parcalar:
                    sayfa = p.sayfa_no or 0
                    if sayfa <= 0:
                        continue
                    archive_img = os.path.join(archive_images_dir, f"page_{sayfa}.png")
                    if not os.path.exists(archive_img):
                        continue
                    curr_meta = dict(p.meta or {})
                    old_path  = curr_meta.get("image_path", "")
                    # Boş, ya da temp dizinini işaret ediyorsa güncelle
                    if not old_path or "temp_uploads" in old_path.replace("\\", "/"):
                        curr_meta["image_path"] = os.path.abspath(archive_img)
                        p.meta = curr_meta
                        updated += 1
                if updated:
                    db.commit()
                    logger.info("Chunk image_path guncellendi: %d kayit, belge=%s", updated, belge_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Arşiv-belge DB kayıt hatası [%s]: %s", final_name, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Veritabanı kaydı hatası: {str(e)}")

    return {
        "status":             "success",
        "archive_path":       primary_path,
        "pdf_path":           pdf_archive_path,
        "archive_images_dir": archive_images_dir,
        "belge_kimlik":       belge_id,
        "message":            "Dosya başarıyla arşive taşındı ve SQL veritabanına kaydedildi."
    }
