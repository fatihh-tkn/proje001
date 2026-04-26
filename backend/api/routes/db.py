from typing import Any

from fastapi import APIRouter, HTTPException

from schemas.chroma_schema import (
    AddDocumentsRequest,
    DeleteCollectionRequest,
    DeleteDocumentsRequest,
    QueryRequest,
)
from database.vector.pgvector_db import vector_db
from core.logger import get_logger

logger = get_logger("routes.db")
router = APIRouter()


@router.get("/collections", summary="Tüm koleksiyonları listele")
def list_collections() -> dict[str, list[str]]:
    """ChromaDB içindeki tüm koleksiyonların adlarını döner."""
    try:
        return {"collections": vector_db.list_collections()}
    except Exception as e:
        logger.error("Koleksiyon listesi alınamadı: %s", e, exc_info=True)
        raise HTTPException(status_code=503, detail="Vektör veritabanına erişilemiyor.")


@router.get("/collections/{name}", summary="Koleksiyon bilgisi")
def get_collection_info(name: str) -> dict[str, Any]:
    """Bir koleksiyonun kayıt sayısını ve adını döner."""
    try:
        return vector_db.get_collection_info(name)
    except Exception as e:
        logger.warning("Koleksiyon bilgisi alınamadı [%s]: %s", name, e)
        raise HTTPException(status_code=404, detail=f"Koleksiyon bulunamadı: {name}")


@router.post("/documents", summary="Koleksiyona doküman ekle")
def add_documents(body: AddDocumentsRequest) -> dict[str, Any]:
    """
    Belirtilen koleksiyona metin dokümanları ekler.
    Koleksiyon yoksa otomatik oluşturulur.
    """
    try:
        return vector_db.add_documents(
            collection_name=body.collection,
            documents=body.documents,
            metadatas=body.metadatas,
            ids=body.ids,
        )
    except Exception as e:
        logger.error("Doküman eklenemedi [%s]: %s", body.collection, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Dokümanlar vektör veritabanına eklenemedi.")


@router.post("/query", summary="Koleksiyona sorgu at")
def query_collection(body: QueryRequest) -> dict[str, Any]:
    """Belirtilen koleksiyona doğal dil sorgusu atar ve en yakın sonuçları döner."""
    try:
        return vector_db.query(
            collection_name=body.collection,
            query_texts=body.query_texts,
            n_results=body.n_results,
        )
    except Exception as e:
        logger.error("Koleksiyon sorgusu başarısız [%s]: %s", body.collection, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Vektör sorgusu gerçekleştirilemedi.")


@router.delete("/collections", summary="Koleksiyonu sil")
def delete_collection(body: DeleteCollectionRequest) -> dict[str, str]:
    """Belirtilen koleksiyonu tamamen siler."""
    try:
        return vector_db.delete_collection(body.collection)
    except Exception as e:
        logger.warning("Koleksiyon silinemedi [%s]: %s", body.collection, e)
        raise HTTPException(status_code=404, detail=f"Koleksiyon bulunamadı veya silinemedi: {body.collection}")


@router.delete("/documents", summary="Belirli dokümanları sil")
def delete_documents(body: DeleteDocumentsRequest) -> dict[str, Any]:
    """Belirtilen ID'lere sahip olan dokümanları/vektörleri siler."""
    try:
        return vector_db.delete_documents(body.collection, body.ids)
    except Exception as e:
        logger.warning("Dokümanlar silinemedi [%s]: %s", body.collection, e)
        raise HTTPException(status_code=404, detail="Belirtilen dokümanlar bulunamadı veya silinemedi.")


@router.get("/collections/{name}/content", summary="Koleksiyondaki vektör/dokümanları getir")
def get_documents_in_collection(name: str, limit: int = 100) -> dict[str, Any]:
    """Belirtilen koleksiyondaki vektör ve doküman içeriklerini döndürür."""
    try:
        return vector_db.get_documents(name, limit)
    except Exception as e:
        logger.error("Doküman içeriği alınamadı [%s]: %s", name, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Koleksiyon içeriği okunamadı: {name}")
