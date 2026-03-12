from services.chroma_service import chroma_service
import uuid

class MemoryEngine:
    """
    Vektör motoru bağlantısını temsil eden sınıf (Hafızaya Kazıma).
    Karantina alanından (React) onaylanan verileri ChromaDB'ye veya asıl vektör motoruna gönderir.
    """
    
    def save_to_memory(self, chunks: list[dict], collection_name: str = "yilgenci_collection"):
        """
        Gelen chunk listesini ChromaDB koleksiyonuna ekler.
        """
        if not chunks:
            return
            
        texts = []
        metadatas = []
        ids = []
        
        for i, chunk in enumerate(chunks):
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
            # Vektör veri tabanına yaz
            chroma_service.add_documents(
                collection_name=collection_name,
                documents=texts,
                metadatas=metadatas,
                ids=ids
            )

# Uygulama genelinde kullanılacak Motor (singleton benzeri)
memory_engine = MemoryEngine()
