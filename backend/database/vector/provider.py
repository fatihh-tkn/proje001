from abc import ABC, abstractmethod
from typing import Any, List, Dict, Optional

class VectorDBProvider(ABC):
    """
    Vektör veritabanı işlemlerini soyutlayan arayüz (Repository Pattern).
    İleride ChromaDB yerine Milvus veya pgvector gibi başka bir motor
    kullanılmak istendiğinde, sadece bu arayüzü uygulayan yeni bir sınıf
    yazmak yeterli olacaktır.
    """

    @abstractmethod
    def list_collections(self) -> List[str]:
        pass

    @abstractmethod
    def add_documents(
        self,
        collection_name: str,
        documents: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None,
        ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    def query(
        self,
        collection_name: str,
        query_texts: List[str],
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    def delete_collection(self, name: str) -> Dict[str, str]:
        pass

    @abstractmethod
    def delete_documents(self, collection_name: str, ids: List[str]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_documents(self, collection_name: str, limit: int = 100) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_collection_info(self, name: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_documents_by_source(
        self,
        collection_name: str,
        source_file: str,
        limit: int = 500,
    ) -> List[Dict[str, Any]]:
        pass
