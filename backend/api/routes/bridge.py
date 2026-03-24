import os
import shutil
import uuid

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from services.processor import analyze_pdf_with_vision
from services.memory import memory_engine
from database.sql.session import get_session
from database.sql.models import Belge

router = APIRouter()

UPLOAD_DIR = "./temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- 1. KÖPRÜ: ÖĞÜTME VE KARANTİNA ---
@router.post("/upload-and-analyze")
def upload_and_analyze(file: UploadFile = File(...), use_vision: bool = Form(False)):
    try:
        unique_prefix = str(uuid.uuid4())[:8]
        safe_filename = file.filename.replace(" ", "_")
        file_path     = f"{UPLOAD_DIR}/{unique_prefix}_{safe_filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        ext = safe_filename.rsplit(".", 1)[-1].lower() if "." in safe_filename else ""

        # Tüm format yönlendirmesi dispatcher'da
        from services.processors import dispatch
        chunks = dispatch(
            file_path    = file_path,
            ext          = ext,
            use_vision   = use_vision,
            original_name = safe_filename,
        )

        return {
            "status":       "success",
            "message":      "Dosya analiz edildi, onay bekliyor.",
            "file_name":    safe_filename,
            "temp_path":    file_path,
            "total_chunks": len(chunks),
            "chunks":       chunks,
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

    file_name   = data.get("file_name", "Bilinmeyen Dosya")
    chunks_raw  = data.get("chunks", [])
    coll_name   = data.get("collection_name", "yilgenci_collection")
    belge_kimlik = data.get("belge_kimlik")

    if not chunks_raw:
        raise HTTPException(status_code=400, detail="Kaydedilecek veri yok!")

    print(f"[save_to_db] ▶ {file_name} | {len(chunks_raw)} chunk")

    # 1 ── ChromaDB'ye yaz (vektörleştirme)
    memory_engine.save_to_memory(chunks_raw, collection_name=coll_name)
    print(f"[save_to_db] ChromaDB ✓")

    # 2 ── Semantik komşuları TEK toplu sorguda al (cross-doc için n_results yüksek)
    semantic_neighbors: dict[str, list[tuple[str, float]]] = {}
    q_ids   = [c.get("id") for c in chunks_raw if c.get("text", "").strip()]
    q_texts = [c.get("text") for c in chunks_raw if c.get("text", "").strip()]
    try:
        if q_texts:
            # n_results=10: hem aynı dokümandaki hem diğer dokümanlardan komşular yakalanabilsin
            results  = vector_db.query(collection_name=coll_name, query_texts=q_texts, n_results=10)
            r_ids    = results.get("ids", [])
            r_dists  = results.get("distances", [])
            q_id_set = set(q_ids)
            for idx, c_id in enumerate(q_ids):
                semantic_neighbors[c_id] = [
                    (t_id, dist)
                    for t_id, dist in zip(r_ids[idx], r_dists[idx])
                    # Sadece kendi kendine bağlantı önle; eş-toplu diğer chunk'lar dahil edilmesin
                    # Ama cross-doc komşular için mesafe 1.5'e kadar kabul et
                    if t_id != c_id and t_id not in q_id_set and dist < 1.5
                ]
        print(f"[save_to_db] Semantik ✓ — {sum(len(v) for v in semantic_neighbors.values())} komşu")
    except Exception as e:
        print(f"[save_to_db] Semantik sorgu hatası: {e}")

    # 3 ── SQL: tüm işlemler TEK session içinde
    try:
        with get_session() as db:

            # 3a. Belge kaydını çöz / oluştur (maks 2 sorgu)
            resolved_belge_kimlik = None
            if belge_kimlik:
                b = db.scalar(select(Belge).where(Belge.kimlik == belge_kimlik))
                resolved_belge_kimlik = b.kimlik if b else None

            if not resolved_belge_kimlik:
                b = db.scalar(select(Belge).where(
                    Belge.dosya_adi == file_name,
                    Belge.dosya_turu != "folder"
                ))
                if b:
                    resolved_belge_kimlik = b.kimlik

            # Güvenlik netı: Eşleşme yoksa her zaman yeni Belge oluştur
            if not resolved_belge_kimlik:
                file_ext = file_name.rsplit(".", 1)[-1] if "." in file_name else "unknown"
                yeni = Belge(
                    dosya_adi=file_name,
                    dosya_turu=file_ext,
                    parca_sayisi=len(chunks_raw),
                    vektordb_koleksiyon=coll_name,
                    vektorlestirildi_mi=True,
                    durum="onaylandi"
                )
                db.add(yeni)
                db.flush()  # PK üreti
                resolved_belge_kimlik = yeni.kimlik
                print(f"[save_to_db] Belge oluşturuldu: {file_name}")

            # Güvenlik kontrolü: Bu noktada resolved_belge_kimlik asla None olmamalı
            if not resolved_belge_kimlik:
                raise ValueError(f"Belge kimliği çözülemedi: {file_name}")

            # 3b. Mevcut VektorParcasi'larını TEK sorguda çek (N+1 → 1)
            all_chroma_ids = [c.get("id", "") for c in chunks_raw]
            existing_rows  = db.scalars(
                select(VektorParcasi).where(VektorParcasi.chromadb_kimlik.in_(all_chroma_ids))
            ).all()
            existing_map   = {row.chromadb_kimlik: row for row in existing_rows}

            # 3c. Yeni parçaları toplu oluştur
            new_parcalar = []
            for chunk in chunks_raw:
                chroma_id = chunk.get("id", "")
                if chroma_id in existing_map:
                    continue
                meta     = chunk.get("metadata", {})
                page     = meta.get("page", 0)
                source   = meta.get("source", file_name)
                new_parcalar.append(VektorParcasi(
                    belge_kimlik=resolved_belge_kimlik,
                    chromadb_kimlik=chroma_id,
                    icerik=chunk.get("text", "")[:500],
                    konum_imi=f"{source} | Sayfa {page}",
                    sayfa_no=page,
                ))

            if new_parcalar:
                db.add_all(new_parcalar)
                db.flush()  # tek flush ile tüm kimlikler üretilir

            # 3d. Hem eskiyi hem yeniyi birleştir → sıralı node listesi
            id_to_pk: dict[str, int] = {r.chromadb_kimlik: r.kimlik for r in existing_rows}
            id_to_pk.update({p.chromadb_kimlik: p.kimlik for p in new_parcalar})

            # Orijinal sırayı koru
            saved_nodes = [
                existing_map.get(c.get("id")) or next(
                    (p for p in new_parcalar if p.chromadb_kimlik == c.get("id")), None
                )
                for c in chunks_raw
            ]
            saved_nodes = [n for n in saved_nodes if n is not None]

            # 3e. Ardışık "next_chunk" kenarları — mevcut çiftleri TEK sorguda kontrol et
            candidate_pairs = [
                (saved_nodes[i].kimlik, saved_nodes[i + 1].kimlik)
                for i in range(len(saved_nodes) - 1)
            ]
            if candidate_pairs:
                existing_edges = set(
                    db.execute(
                        select(BilgiIliskisi.kaynak_parca_kimlik, BilgiIliskisi.hedef_parca_kimlik)
                        .where(
                            tuple_(BilgiIliskisi.kaynak_parca_kimlik, BilgiIliskisi.hedef_parca_kimlik)
                            .in_(candidate_pairs)
                        )
                    ).fetchall()
                )
                edges_to_add = [
                    BilgiIliskisi(
                        kaynak_parca_kimlik=src_pk,
                        hedef_parca_kimlik=tgt_pk,
                        iliski_turu="next_chunk",
                        agirlik=1.0,
                        kaynak="otomatik",
                    )
                    for (src_pk, tgt_pk) in candidate_pairs
                    if (src_pk, tgt_pk) not in existing_edges
                ]
            else:
                edges_to_add = []

            # 3f. Semantik kenarlar — hedef node'ları TEK sorguda çek
            sem_chroma_ids = {
                t_id
                for neighbors in semantic_neighbors.values()
                for t_id, _ in neighbors
            }
            if sem_chroma_ids:
                sem_nodes = {
                    row.chromadb_kimlik: row
                    for row in db.scalars(
                        select(VektorParcasi).where(VektorParcasi.chromadb_kimlik.in_(sem_chroma_ids))
                    ).all()
                }
                for chroma_id, neighbors in semantic_neighbors.items():
                    src_pk = id_to_pk.get(chroma_id)
                    if src_pk is None:
                        continue
                    for tgt_chroma_id, dist in neighbors:
                        tgt = sem_nodes.get(tgt_chroma_id)
                        if tgt:
                            weight = max(0.1, round(1.0 - dist / 2.0, 2))
                            # İleri yön (yeni dok → eski dok)
                            edges_to_add.append(BilgiIliskisi(
                                kaynak_parca_kimlik=src_pk,
                                hedef_parca_kimlik=tgt.kimlik,
                                iliski_turu="semantik_benzerlik",
                                agirlik=weight,
                                kaynak="otomatik",
                            ))
                            # Ters yön (eski dok → yeni dok) — çift yönlü kenar
                            edges_to_add.append(BilgiIliskisi(
                                kaynak_parca_kimlik=tgt.kimlik,
                                hedef_parca_kimlik=src_pk,
                                iliski_turu="semantik_benzerlik",
                                agirlik=weight,
                                kaynak="otomatik",
                            ))
            print(f"[save_to_db] {len(edges_to_add)} toplam kenar (next_chunk + semantik)")

            if edges_to_add:
                db.add_all(edges_to_add)

            db.commit()
            print(f"[save_to_db] ✅ {len(new_parcalar)} yeni parça, {len(edges_to_add)} ilişki → SQL")

            # 4 ── NetworkX bellek-içi grafiği güncelle (sunucu yeniden başlatılmadan çalışsın)
            try:
                from database.graph.networkx_db import graph_db
                from sqlalchemy import select as _sel
                all_edges = db.scalars(_sel(BilgiIliskisi)).all()
                formatted = [
                    {
                        "from_id": str(e.kaynak_parca_kimlik),
                        "to_id":   str(e.hedef_parca_kimlik),
                        "relation": e.iliski_turu,
                        "weight":  float(e.agirlik or 1.0),
                    }
                    for e in all_edges
                ]
                graph_db.build_graph(formatted)
                print(f"[save_to_db] NetworkX güncellendi: {len(formatted)} kenar")
            except Exception as ge:
                print(f"[save_to_db] NetworkX güncelleme hatası: {ge}")

    except Exception as e:
        import traceback
        print(f"[save_to_db] ❌ SQL hatası: {e}")
        traceback.print_exc()

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
