import uuid
from typing import Any

from database.vector.chroma_db import vector_db
from database.sql.session import get_session
from database.sql.models import Document
from database.sql.repositories.document_repo import DocumentRepository
from sqlalchemy import select

class MemoryEngine:
    """
    Vektör motoru bağlantısını temsil eden sınıf (Hafızaya Kazıma).
    Karantina alanından (React) onaylanan verileri önce SQLite'a yedekler 
    (İleride farklı vektör DB'ye geçmek için), ardından ilgili VectorDB servisine 
    sadece metadata olarak SQLite ID'sini verecek şekilde gönderir.
    """
    
    def save_to_memory(self, chunks: list[dict], collection_name: str = "yilgenci_collection"):
        """
        Gelen chunk listesini ChromaDB (veya aktif vektör DB) koleksiyonuna ekler.
        Eklerken SQLite'ta kalıcı Document referansı oluşturur ve sqlite_doc_id ekler.
        """
        if not chunks:
            return
            
        # 1. Dosya adını bul
        source_name = "Bilinmeyen Dosya"
        for chunk in chunks:
            meta = chunk.get("metadata", {})
            if isinstance(meta, dict) and "source" in meta:
                source_name = meta["source"]
                break
                
        # 2. SQLite'a kalıcı olarak kaydet (Repository Pattern)
        with get_session() as db:
            repo = DocumentRepository(db)
            stmt = select(Document).where(Document.filename == source_name).limit(1)
            doc = db.scalar(stmt)
            if not doc:
                doc = repo.create(
                    filename=source_name,
                    file_type="unknown",
                    access_role="public"
                )
            sqlite_doc_id = doc.id
            
        # 3. Chunkları Vektör DB için hazırla
        texts = []
        metadatas = []
        ids = []
        
        for chunk in chunks:
            # Text garantisi
            text = chunk.get("text", "")
            if not text.strip():
                continue
                
            # Benzersiz ID oluştur
            curr_id = chunk.get("id")
            if not curr_id or curr_id.startswith("chunk-") or curr_id == "error-chunk":
                curr_id = str(uuid.uuid4())
                
            meta = chunk.get("metadata", {})
            if not isinstance(meta, dict):
                meta = {}
            
            # Kritik SQLite Kancası
            meta["sqlite_doc_id"] = sqlite_doc_id
                
            # ChromaDB metadata'da None veya iç içe dictionary desteklemez, flat temizlik yapılabilir
            clean_meta = {}
            for k, v in meta.items():
                if v is not None and type(v) in [str, int, float, bool]:
                    clean_meta[k] = v
                else:
                    clean_meta[k] = str(v)

            texts.append(text)
            metadatas.append(clean_meta)
            ids.append(curr_id)

        if texts:
            # Vektör veri tabanına (özetlenen VectorDBProvider üzerinden) yaz
            vector_db.add_documents(
                collection_name=collection_name,
                documents=texts,
                metadatas=metadatas,
                ids=ids
            )
            
            # SQLite Document tablosunda vektörleştiğini işaretle
            with get_session() as db:
                repo_update = DocumentRepository(db)
                repo_update.mark_vectorized(
                    doc_id=sqlite_doc_id, 
                    chroma_collection=collection_name, 
                    chunk_count=len(texts)
                )

# Uygulama genelinde kullanılacak Motor (singleton benzeri)
memory_engine = MemoryEngine()
