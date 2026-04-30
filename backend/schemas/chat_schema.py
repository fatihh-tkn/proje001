from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=50_000)
    user_id: str | None = Field(default=None, max_length=128)
    # Sürüklenen dosya desteği – dosya adı (kaynak filtresi için)
    file_name: str | None = Field(default=None, max_length=512)
    # ChromaDB koleksiyon adı (opsiyonel)
    collection_name: str | None = Field(default=None, max_length=256)
    # Oturum ID'si (farklı sohbetleri ayırmak için)
    session_id: str = Field(default="default_chat", max_length=256)
    # Bilgisayar tanımlayıcıları
    ip: str | None = Field(default=None, max_length=64)
    mac: str | None = Field(default=None, max_length=64)
    # PC parmak izi (localStorage) ve sekme token'ı (sessionStorage)
    pc_id: str | None = Field(default=None, max_length=64)
    tab_id: str | None = Field(default=None, max_length=64)
    # Hızlı Aksiyon komutu (error_solve, summarize, bpmn_analyze, ...)
    command: str | None = Field(default=None, max_length=64)


class ChatResponse(BaseModel):
    reply: str
    success: bool = True
    rag_used: bool = False
    rag_sources: list[str] = []
    ui_action: dict | None = None
