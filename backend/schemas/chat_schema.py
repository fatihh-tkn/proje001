from pydantic import BaseModel


class ChatMessage(BaseModel):
    message: str
    user_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    success: bool = True
