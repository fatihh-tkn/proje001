from typing import Any
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Tüm API hata yanıtları için standart format."""
    success: bool = False
    error_code: str
    message: str
    detail: Any = None
