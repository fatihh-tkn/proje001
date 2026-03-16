from pydantic import BaseModel


class ChatMessage(BaseModel):
    message: str
    user_id: str | None = None
    # Sürüklenen dosya desteği – dosya adı (kaynak filtresi için)
    file_name: str | None = None
    # ChromaDB koleksiyon adı (opsiyonel)
    collection_name: str | None = None


class ChatResponse(BaseModel):
    reply: str
    success: bool = True
    rag_used: bool = False
    rag_sources: list[str] = []
