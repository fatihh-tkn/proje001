from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=50_000)
    user_id: str | None = Field(default=None, max_length=128)
    # Sürüklenen dosya desteği – dosya adı (kaynak filtresi için)
    file_name: str | None = Field(default=None, max_length=512)
    # Çoklu dosya bağlamı (frontend birden fazla dosya attığında)
    file_names: list[str] | None = Field(default=None)
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
    # Hızlı Aksiyon komutu (error_solve, clarification_continue, ...)
    command: str | None = Field(default=None, max_length=64)
    # Clarification devam turu — önceki Q&A geçmişi (stateless, frontend taşır)
    qa_history: list[dict] | None = Field(default=None)
    # Opsiyonel ekran görüntüsü (base64); vision destekli modellerde analiz edilir
    screenshot_base64: str | None = Field(default=None)
    # Kullanıcının submit ettiği tur (1-indexed). Backend tur sayacını
    # buradan okur — qa_history uzunluğundan değil (multi-question/round).
    round_number: int | None = Field(default=None, ge=1, le=10)
    # "Yeterli, çöz" butonuna basıldığında True — backend ask_more atlayıp
    # mevcut bilgilerle çözüm üretir.
    force_solve: bool = Field(default=False)
    # ChatBar'dan seçilen model adı — kilitli olmayan ajanlar bu modeli kullanır
    model_override: str | None = Field(default=None, max_length=128)


class ChatResponse(BaseModel):
    reply: str
    success: bool = True
    rag_used: bool = False
    rag_sources: list[str] = []
    ui_action: dict | None = None
