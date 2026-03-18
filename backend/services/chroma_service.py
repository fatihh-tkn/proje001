from typing import Any

from chromadb import Collection

from core.chroma import get_chroma_client


class ChromaService:
    """
    ChromaDB koleksiyonları üzerinde CRUD işlemleri yapan servis katmanı.
    """

    def get_or_create_collection(self, name: str) -> Collection:
        """Koleksiyon yoksa oluşturur, varsa getirir."""
        client = get_chroma_client()
        return client.get_or_create_collection(name=name)

    def list_collections(self) -> list[str]:
        """Mevcut tüm koleksiyonların adlarını listeler."""
        client = get_chroma_client()
        return [col.name for col in client.list_collections()]

    def add_documents(
        self,
        collection_name: str,
        documents: list[str],
        metadatas: list[dict[str, Any]] | None = None,
        ids: list[str] | None = None,
    ) -> dict[str, Any]:
        """
        Koleksiyona metin dokümanları ekler.
        ids verilmezse otomatik üretilir.
        """
        collection = self.get_or_create_collection(collection_name)
        auto_ids = ids or [f"doc_{i}" for i in range(len(documents))]

        collection.add(
            documents=documents,
            metadatas=metadatas or [{} for _ in documents],
            ids=auto_ids,
        )
        return {"added": len(documents), "collection": collection_name}

    def query(
        self,
        collection_name: str,
        query_texts: list[str],
        n_results: int = 5,
        where: dict | None = None,
    ) -> dict[str, Any]:
        """Belirtilen koleksiyona doğal dil sorgusu atar."""
        collection = self.get_or_create_collection(collection_name)
        
        query_args = {
            "query_texts": query_texts,
            "n_results": n_results,
        }
        if where:
            query_args["where"] = where
            
        results = collection.query(**query_args)
        return results  # type: ignore[return-value]

    def delete_collection(self, name: str) -> dict[str, str]:
        """Koleksiyonu tamamen siler."""
        client = get_chroma_client()
        client.delete_collection(name=name)
        return {"deleted": name}
        
    def delete_documents(self, collection_name: str, ids: list[str]) -> dict[str, Any]:
        """Koleksiyondan ID'leri verilen elemanları siler."""
        collection = self.get_or_create_collection(collection_name)
        collection.delete(ids=ids)
        return {"deleted_count": len(ids)}

    def get_documents(self, collection_name: str, limit: int = 100) -> dict[str, Any]:
        """Verilen koleksiyondaki vektörlerin/dökümanların bir kısmını getirir."""
        collection = self.get_or_create_collection(collection_name)
        # ChromaDB .get() metodu veritabanındaki kayıtları ids, embeddings, metadatas, documents vs. döner
        results = collection.get(limit=limit, include=["metadatas", "documents"])
        return results

    def get_collection_info(self, name: str) -> dict[str, Any]:
        """Koleksiyonun kayıt sayısını ve adını döner."""
        collection = self.get_or_create_collection(name)
        return {"name": name, "count": collection.count()}

    def get_documents_by_source(
        self,
        collection_name: str,
        source_file: str,
        limit: int = 500,
    ) -> list[dict[str, Any]]:
        """
        Belirli bir kaynak dosyaya ait TÜM chunk'ları getirir.
        metadata.source == source_file olan kayıtları filtreler ve
        sayfa numarasına (page) göre sıralar.
        """
        collection = self.get_or_create_collection(collection_name)
        # ChromaDB where filtresi
        results = collection.get(
            where={"source": source_file},
            limit=limit,
            include=["documents", "metadatas"],
        )

        docs     = results.get("documents") or []
        metas    = results.get("metadatas") or []
        ids      = results.get("ids") or []

        combined = []
        for doc, meta, cid in zip(docs, metas, ids):
            combined.append({"id": cid, "text": doc, "metadata": meta or {}})

        # Sayfa numarasına göre sırala (yoksa 0 kabul et)
        combined.sort(key=lambda x: (
            int(x["metadata"].get("page", 0)),
            int(x["metadata"].get("chunk_index", 0)),
        ))
        return combined


chroma_service = ChromaService()

