from pydantic import BaseModel


class ChatMessage(BaseModel):
    message: str
    user_id: str | None = None
    # Sürüklenen dosya desteği – dosya adı (kaynak filtresi için)
    file_name: str | None = None
    # ChromaDB koleksiyon adı (opsiyonel)
    collection_name: str | None = None
    # Oturum ID'si (farklı sohbetleri ayırmak için)
    session_id: str = "default_chat"
    # Bilgisayar tanımlayıcıları
    ip: str | None = None
    mac: str | None = None


class ChatResponse(BaseModel):
    reply: str
    success: bool = True
    rag_used: bool = False
    rag_sources: list[str] = []
    ui_action: dict | None = None
