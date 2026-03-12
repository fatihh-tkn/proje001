from typing import Any

from fastapi import APIRouter, HTTPException

from schemas.chroma_schema import (
    AddDocumentsRequest,
    DeleteCollectionRequest,
    DeleteDocumentsRequest,
    QueryRequest,
)
from services.chroma_service import chroma_service

router = APIRouter()


@router.get("/collections", summary="Tüm koleksiyonları listele")
def list_collections() -> dict[str, list[str]]:
    """ChromaDB içindeki tüm koleksiyonların adlarını döner."""
    try:
        return {"collections": chroma_service.list_collections()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/collections/{name}", summary="Koleksiyon bilgisi")
def get_collection_info(name: str) -> dict[str, Any]:
    """Bir koleksiyonun kayıt sayısını ve adını döner."""
    try:
        return chroma_service.get_collection_info(name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents", summary="Koleksiyona doküman ekle")
def add_documents(body: AddDocumentsRequest) -> dict[str, Any]:
    """
    Belirtilen koleksiyona metin dokümanları ekler.
    Koleksiyon yoksa otomatik oluşturulur.
    """
    try:
        return chroma_service.add_documents(
            collection_name=body.collection,
            documents=body.documents,
            metadatas=body.metadatas,
            ids=body.ids,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query", summary="Koleksiyona sorgu at")
def query_collection(body: QueryRequest) -> dict[str, Any]:
    """Belirtilen koleksiyona doğal dil sorgusu atar ve en yakın sonuçları döner."""
    try:
        return chroma_service.query(
            collection_name=body.collection,
            query_texts=body.query_texts,
            n_results=body.n_results,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/collections", summary="Koleksiyonu sil")
def delete_collection(body: DeleteCollectionRequest) -> dict[str, str]:
    """Belirtilen koleksiyonu tamamen siler."""
    try:
        return chroma_service.delete_collection(body.collection)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/documents", summary="Belirli dokümanları sil")
def delete_documents(body: DeleteDocumentsRequest) -> dict[str, Any]:
    """Belirtilen ID'lere sahip olan dokümanları/vektörleri siler."""
    try:
        return chroma_service.delete_documents(body.collection, body.ids)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/collections/{name}/documents", summary="Koleksiyondaki vektör/dokümanları getir")
def get_documents_in_collection(name: str, limit: int = 100) -> dict[str, Any]:
    """Belirtilen koleksiyondaki vektör ve doküman içeriklerini döndürür."""
    try:
        return chroma_service.get_documents(name, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
