import os
import shutil
import uuid
import logging

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from services.processor import analyze_pdf_with_vision
from services.memory import memory_engine
from database.sql.session import get_session
from database.uow import UnitOfWork
from database.sql.models import Belge

# -- Logger kurulumu ----------------------------------------------------------
# Windows'ta terminaller farkli karakter setleri kullanabilir (cp1254 gibi).
# StreamHandler'a UTF-8 zorunlu yaparak UnicodeEncodeError'i sifirdan onleriz.
_handler = logging.StreamHandler()
_handler.setLevel(logging.DEBUG)
_handler.stream = open(_handler.stream.fileno(), mode='w', encoding='utf-8', closefd=False)
_handler.setFormatter(logging.Formatter('[%(name)s] %(levelname)s - %(message)s'))

logger = logging.getLogger('bridge')
logger.setLevel(logging.DEBUG)
if not logger.handlers:
    logger.addHandler(_handler)
# -----------------------------------------------------------------------------

router = APIRouter()

UPLOAD_DIR = "./temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- 1. KÖPRÜ: ÖĞÜTME VE KARANTİNA ---
@router.post("/upload-and-analyze")
def upload_and_analyze(file: UploadFile = File(...), use_vision: bool = Form(False)):
    import time as _time
    try:
        unique_prefix = str(uuid.uuid4())[:8]
        safe_filename = file.filename.replace(" ", "_")
        file_path     = f"{UPLOAD_DIR}/{unique_prefix}_{safe_filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        ext = safe_filename.rsplit(".", 1)[-1].lower() if "." in safe_filename else ""

        t0 = _time.time()
        from services.processors import dispatch
        chunks = dispatch(
            file_path    = file_path,
            ext          = ext,
            use_vision   = use_vision,
            original_name = safe_filename,
        )
        isleme_suresi_ms = int((_time.time() - t0) * 1000)

        return {
            "status":           "success",
            "message":          "Dosya analiz edildi, onay bekliyor.",
            "file_name":        safe_filename,
            "temp_path":        file_path,
            "total_chunks":     len(chunks),
            "chunks":           chunks,
            "isleme_suresi_ms": isleme_suresi_ms,
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))




# --- 2. KÖPRÜ: HAFIZAYA KAZIMA (OPTİMİZE) ---
@router.post("/save-to-db")
def save_to_db(data: dict):
    from database.sql.models import VektorParcasi, BilgiIliskisi, Belge
    from database.vector.chroma_db import vector_db
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
                    try: vector_db.delete_documents(b.vektordb_koleksiyon or coll_name, eski_chroma_ids)
                    except: pass
                    try: graph_db.remove_nodes(eski_graf_ids)
                    except: pass
                    for p in eski_parcalar: db.delete(p)
                    db.flush()
                # Belge güncelleme verisi
                b.parca_sayisi = len(chunks_raw)
                b.durum = "karantina"
                b.isleme_suresi_ms = data.get("isleme_suresi_ms")
                db.flush()

            if not resolved_belge_kimlik:
                file_ext = file_name.rsplit(".", 1)[-1] if "." in file_name else "unknown"
                yeni = Belge(
                    dosya_adi=file_name, dosya_turu=file_ext, parca_sayisi=len(chunks_raw),
                    vektordb_koleksiyon=coll_name, vektorlestirildi_mi=True, durum="karantina",
                    isleme_suresi_ms=data.get("isleme_suresi_ms"),
                )
                db.add(yeni)
                db.flush()
                resolved_belge_kimlik = yeni.kimlik

            # 2. ChromaDB'ye yaz (vektörleştirme)
            # Metadata temizliği ve hazırlığı
            texts, metadatas, ids = [], [], []
            for chunk in chunks_raw:
                text = chunk.get("text", "")
                if not text.strip():
                    continue
                curr_id = chunk.get("id") or str(uuid.uuid4())
                meta    = chunk.get("metadata", {}) if isinstance(chunk.get("metadata"), dict) else {}

                clean_meta = {"sqlite_doc_id": resolved_belge_kimlik}
                for k, v in meta.items():
                    # ChromaDB sadece primitive tipleri kabul eder (str, int, float, bool)
                    clean_meta[k] = v if isinstance(v, (str, int, float, bool)) else str(v)

                texts.append(text)
                metadatas.append(clean_meta)
                ids.append(curr_id)

            if texts:
                # Adim 1: ChromaDB'ye yaz (Atomik degil, UoW kaydiyla korunacak)
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

                # Adim 2: SQL'i guncelle (UoW tarafindan otomatik commit edilecek, hata verirse rb_chroma cagirilir)
                if b:
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

            # 4. Yeni parçaları SQL'e kaydet
            all_chroma_ids = [c.get("id", "") for c in chunks_raw if c.get("id")]
            existing_rows = []
            if all_chroma_ids:
                for chunked_ids in chunk_list(all_chroma_ids):
                    existing_rows.extend(db.scalars(
                        select(VektorParcasi).where(VektorParcasi.chromadb_kimlik.in_(chunked_ids))
                    ).all())
            existing_map = {row.chromadb_kimlik: row for row in existing_rows}

            new_parcalar = []
            for chunk in chunks_raw:
                chroma_id = chunk.get("id", "")
                if not chroma_id or chroma_id in existing_map:
                    continue
                meta = chunk.get("metadata", {})
                new_parcalar.append(VektorParcasi(
                    belge_kimlik=resolved_belge_kimlik, chromadb_kimlik=chroma_id,
                    icerik=chunk.get("text", "")[:1000], konum_imi=f"{meta.get('source', file_name)} | Sayfa {meta.get('page', 0)}",
                    sayfa_no=meta.get("page", 0), sinir_kutusu=str(meta.get("bbox")) if meta.get("bbox") else None
                ))

            if new_parcalar:
                db.add_all(new_parcalar)
                db.flush()

            # 3d. Node sıralaması
            id_to_pk = {r.chromadb_kimlik: r.kimlik for r in existing_rows}
            id_to_pk.update({p.chromadb_kimlik: p.kimlik for p in new_parcalar})
            
            saved_nodes = []
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

    except Exception as e:
        logger.exception("Veritabani kayit hatasi (UoW Rollback tetiklendi)")
        raise HTTPException(status_code=500, detail=f"Veritabanı Kayıt Hatası: {str(e)}")

    return {"status": "success", "message": f"{file_name} kalıcı hafızaya eklendi!"}



# --- 3. KÖPRÜ: ARŞİVLEME VE SQL KAYDI ---
@router.post("/archive-document")
def archive_document(data: dict):
    temp_path       = data.get("temp_path")
    final_name      = data.get("final_name", "isim_yok")
    chunk_count     = data.get("chunk_count", 0)
    chroma_collection = data.get("chroma_collection", "yilgenci_collection")
    
    if not temp_path or not os.path.exists(temp_path):
        raise HTTPException(status_code=400, detail="Geçici dosya bulunamadı.")
    
    ARCHIVE_DIR = "./archive_uploads"
    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    
    archive_filename = f"{uuid.uuid4().hex[:8]}_{final_name}"
    archive_path     = os.path.join(ARCHIVE_DIR, archive_filename)
    shutil.move(temp_path, archive_path)
    
    file_ext = final_name.rsplit(".", 1)[-1] if "." in final_name else "unknown"
    
    try:
        with get_session() as db:
            # Aynı adlı belge zaten save-to-db tarafından oluşturulmuş olabilir
            from sqlalchemy import select
            existing = db.scalar(
                select(Belge).where(
                    Belge.dosya_adi == final_name,
                    Belge.dosya_turu != "folder"
                )
            )
            if existing:
                # Sadece fiziksel yolu ve boyutu güncelle
                existing.depolama_yolu      = archive_path
                existing.dosya_boyutu_bayt  = os.path.getsize(archive_path)
                existing.durum              = "onaylandi"
                db.commit()
                db.refresh(existing)
                belge_id = existing.kimlik
            else:
                yeni_belge = Belge(
                    dosya_adi=final_name,
                    dosya_turu=file_ext,
                    dosya_boyutu_bayt=os.path.getsize(archive_path),
                    depolama_yolu=archive_path,
                    parca_sayisi=chunk_count,
                    vektordb_koleksiyon=chroma_collection,
                    vektorlestirildi_mi=True,
                    durum="onaylandi"
                )
                db.add(yeni_belge)
                db.commit()
                db.refresh(yeni_belge)
                belge_id = yeni_belge.kimlik
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Veritabanı kaydı hatası: {str(e)}")
        
    return {
        "status": "success",
        "archive_path": archive_path,
        "belge_kimlik": belge_id,
        "message": "Dosya başarıyla arşive taşındı ve SQL veritabanına kaydedildi."
    }
