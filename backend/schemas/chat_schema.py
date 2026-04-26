from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=50_000)
    user_id: str | None = Field(default=None, max_length=128)
    file_name: str | None = Field(default=None, max_length=512)
    collection_name: str | None = Field(default=None, max_length=256)
    session_id: str = Field(default="default_chat", max_length=256)
    ip: str | None = Field(default=None, max_length=64)
    mac: str | None = Field(default=None, max_length=64)


class ChatResponse(BaseModel):
    reply: str
    success: bool = True
    rag_used: bool = False
    rag_sources: list[str] = []
    ui_action: dict | None = None
