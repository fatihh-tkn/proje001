import uuid
import logging

from database.vector.pgvector_db import vector_db
from database.sql.session import get_session
from database.sql.models import Belge, VektorParcasi, BilgiIliskisi
from sqlalchemy import select

logger = logging.getLogger(__name__)

# SEMANTIC kenar için cosine distance eşiği (pgvector cosine_distance: 0=aynı, 2=zıt)
# 0.30 → yaklaşık similarity > 0.85
_SEMANTIC_DISTANCE_THRESHOLD = 0.30
_SEMANTIC_TOP_K = 6  # Her chunk için farklı belgelerden kaç komşu aranır


class MemoryEngine:
    """
    pgvector yazma katmanı.
    Her belge yüklenişinde:
      1. pgvector_db.add_documents() → VektorParcasi + embedding kaydeder.
      2. NEXT/PREV kenarlarını BilgiIliskisi'ne yazar.
      3. Belgeler arası SEMANTIC kenarlarını cosine distance ile hesaplar.
      4. NetworkX ChunkGraph'ı günceller (retrieval genişletmesi için).
    """

    def save_to_memory(self, chunks: list[dict], collection_name: str = "yilgenci_collection") -> None:
        if not chunks:
            return

        source_name = next(
            (c.get("metadata", {}).get("source") for c in chunks if c.get("metadata", {}).get("source")),
            "Bilinmeyen Dosya"
        )

        try:
            with get_session() as db:
                # ── 1. Belge kaydını bul veya oluştur ──────────────────────
                doc = db.scalar(select(Belge).where(Belge.dosya_adi == source_name).limit(1))
                if not doc:
                    file_ext = source_name.rsplit(".", 1)[-1] if "." in source_name else "unknown"
                    doc = Belge(
                        dosya_adi=source_name,
                        dosya_turu=file_ext,
                        durum="onaylandi",
                        vektorlestirildi_mi=False,
                    )
                    db.add(doc)
                    db.flush()

                sql_doc_id = doc.kimlik

                # ── 2. Metadata temizle + pgvector'a yaz (VektorParcasi da oluşur) ─
                texts, metadatas, ids = [], [], []
                for chunk in chunks:
                    text = chunk.get("text", "")
                    if not text.strip():
                        continue
                    curr_id = chunk.get("id") or str(uuid.uuid4())
                    meta = chunk.get("metadata", {}) if isinstance(chunk.get("metadata"), dict) else {}

                    clean_meta = {"sql_doc_id": sql_doc_id, "sqlite_doc_id": sql_doc_id}
                    for k, v in meta.items():
                        clean_meta[k] = v if isinstance(v, (str, int, float, bool)) else str(v)

                    texts.append(text)
                    metadatas.append(clean_meta)
                    ids.append(curr_id)

                if not texts:
                    db.commit()
                    return

                # pgvector_db VektorParcasi kaydını ve embedding'i yazar
                vector_db.add_documents(
                    collection_name=collection_name,
                    documents=texts,
                    metadatas=metadatas,
                    ids=ids,
                )

                # ── 3. Yeni chunk'ların VektorParcasi kayıtlarını çek ───────
                vp_by_chromadb: dict[str, VektorParcasi] = {}
                rows = db.scalars(
                    select(VektorParcasi).where(VektorParcasi.chromadb_kimlik.in_(ids))
                ).all()
                for vp in rows:
                    vp_by_chromadb[vp.chromadb_kimlik] = vp

                # ── 4. NEXT/PREV kenarları ──────────────────────────────────
                next_pairs: list[tuple[str, str]] = []

                for chunk, chromadb_id, meta in zip(chunks, ids, metadatas):
                    if not chunk.get("text", "").strip():
                        continue
                    next_chromadb = meta.get("next_id", "")
                    if next_chromadb and next_chromadb in vp_by_chromadb:
                        src_vp = vp_by_chromadb.get(chromadb_id)
                        tgt_vp = vp_by_chromadb.get(next_chromadb)
                        if src_vp and tgt_vp:
                            db.add(BilgiIliskisi(
                                kaynak_parca_kimlik=src_vp.kimlik,
                                hedef_parca_kimlik=tgt_vp.kimlik,
                                iliski_turu="NEXT",
                                agirlik=1.0,
                                kaynak="otomatik",
                            ))
                            next_pairs.append((chromadb_id, next_chromadb))

                db.flush()

                # ── 5. SEMANTIC kenarlar — pgvector cosine distance ─────────
                semantic_pairs: list[tuple[str, str, float]] = []

                for chromadb_id in ids:
                    src_vp = vp_by_chromadb.get(chromadb_id)
                    if not src_vp or src_vp.vektor_verisi is None:
                        continue

                    try:
                        # Farklı belgelerden en yakın chunk'ları bul
                        neighbors = db.scalars(
                            select(VektorParcasi)
                            .where(
                                VektorParcasi.vektor_verisi.is_not(None),
                                VektorParcasi.belge_kimlik != sql_doc_id,
                            )
                            .order_by(
                                VektorParcasi.vektor_verisi.cosine_distance(src_vp.vektor_verisi)
                            )
                            .limit(_SEMANTIC_TOP_K)
                        ).all()

                        for tgt_vp in neighbors:
                            # cosine_distance hesapla
                            dist_row = db.execute(
                                select(
                                    VektorParcasi.vektor_verisi.cosine_distance(src_vp.vektor_verisi)
                                ).where(VektorParcasi.kimlik == tgt_vp.kimlik)
                            ).scalar()

                            if dist_row is None or dist_row > _SEMANTIC_DISTANCE_THRESHOLD:
                                continue

                            similarity = round(1.0 - float(dist_row), 4)
                            db.add(BilgiIliskisi(
                                kaynak_parca_kimlik=src_vp.kimlik,
                                hedef_parca_kimlik=tgt_vp.kimlik,
                                iliski_turu="BENZER_ICERIK",
                                agirlik=similarity,
                                kaynak="otomatik",
                            ))
                            semantic_pairs.append((chromadb_id, tgt_vp.chromadb_kimlik, similarity))

                    except Exception as e:
                        logger.warning(f"[MemoryEngine] SEMANTIC edge hatası ({chromadb_id}): {e}")

                # ── 6. Belge kaydını güncelle ───────────────────────────────
                doc.vektorlestirildi_mi = True
                doc.vektordb_koleksiyon = collection_name
                doc.parca_sayisi = len(texts)

                db.commit()

            logger.info(
                f"[MemoryEngine] '{source_name}' — "
                f"{len(texts)} chunk, {len(next_pairs)} NEXT, {len(semantic_pairs)} SEMANTIC kenar."
            )

            # ── 7. NetworkX ChunkGraph güncelle ────────────────────────────
            try:
                from database.graph.networkx_db import chunk_graph
                chunk_graph.add_edges_batch(
                    next_pairs=next_pairs,
                    semantic_pairs=semantic_pairs,
                )
            except Exception as e:
                logger.warning(f"[MemoryEngine] ChunkGraph güncelleme hatası: {e}")

        except Exception as e:
            logger.error(f"[MemoryEngine] save_to_memory hatası: {e}")
            import traceback
            traceback.print_exc()


# Singleton motor
memory_engine = MemoryEngine()
