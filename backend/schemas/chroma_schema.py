from pydantic import BaseModel
from typing import Any


class AddDocumentsRequest(BaseModel):
    collection: str
    documents: list[str]
    metadatas: list[dict[str, Any]] | None = None
    ids: list[str] | None = None


class QueryRequest(BaseModel):
    collection: str
    query_texts: list[str]
    n_results: int = 5


class DeleteCollectionRequest(BaseModel):
    collection: str

class DeleteDocumentsRequest(BaseModel):
    collection: str
    ids: list[str]
