import chromadb
from chromadb.config import Settings as ChromaSettings

# ChromaDB istemcisini yalnızca bir kez oluştur (singleton pattern)
_chroma_client = None


def get_chroma_client() -> chromadb.Client:
    """
    Kalıcı (persistent) ChromaDB istemcisini döner.
    Veriler ./chroma_data klasörüne kaydedilir.
    """
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(
            path="./chroma_data",
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _chroma_client
