import uuid

from database.vector.chroma_db import vector_db
from database.sql.session import get_session
from database.sql.models import Belge
from sqlalchemy import select


class MemoryEngine:
    """
    ChromaDB vektör motoruna yazma katmanı.
    SQL yan etkilerini de (Belge kaydı işaretleme) TEK session içinde halleder.
    """

    def save_to_memory(self, chunks: list[dict], collection_name: str = "yilgenci_collection") -> None:
        if not chunks:
            return

        # Dosya adını belirle
        source_name = next(
            (c.get("metadata", {}).get("source") for c in chunks if c.get("metadata", {}).get("source")),
            "Bilinmeyen Dosya"
        )

        # ── SQL: Belge oluştur/bul + vektörleştime işaretini güncelle (TEK session) ──
        sqlite_doc_id: str | None = None
        try:
            with get_session() as db:
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
                    db.flush()   # kimliği üret ama tamamlamadan ilerle

                sqlite_doc_id = doc.kimlik

                # ChromaDB için hazırlık: metadata temizliği
                texts, metadatas, ids = [], [], []
                for chunk in chunks:
                    text = chunk.get("text", "")
                    if not text.strip():
                        continue
                    curr_id = chunk.get("id") or str(uuid.uuid4())
                    meta    = chunk.get("metadata", {}) if isinstance(chunk.get("metadata"), dict) else {}

                    clean_meta = {"sqlite_doc_id": sqlite_doc_id}
                    for k, v in meta.items():
                        clean_meta[k] = v if isinstance(v, (str, int, float, bool)) else str(v)

                    texts.append(text)
                    metadatas.append(clean_meta)
                    ids.append(curr_id)

                if texts:
                    # ChromaDB yazma (session açıkken OK — ChromaDB ayrı süreç)
                    vector_db.add_documents(
                        collection_name=collection_name,
                        documents=texts,
                        metadatas=metadatas,
                        ids=ids,
                    )

                    # Belge kaydını güncelle
                    doc.vektorlestirildi_mi = True
                    doc.vektordb_koleksiyon = collection_name
                    doc.parca_sayisi        = len(texts)

                db.commit()

        except Exception as e:
            print(f"[MemoryEngine] save_to_memory hatası: {e}")
            import traceback; traceback.print_exc()


# Singleton motor
memory_engine = MemoryEngine()
