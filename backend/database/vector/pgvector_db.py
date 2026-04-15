import json
from typing import Any, List, Dict, Optional
from sqlalchemy import select, text
from database.sql.session import get_session
from database.sql.models import VektorParcasi, Belge
from database.vector.provider import VectorDBProvider
from database.vector.embedding_manager import (
    get_embeddings,
    get_active_model_key,
    get_active_model_info,
    MAX_VECTOR_DIM,
)
import logging

logger = logging.getLogger(__name__)


class PgVectorDB(VectorDBProvider):
    def list_collections(self) -> List[str]:
        with get_session() as db:
            cols = db.scalars(select(Belge.vektordb_koleksiyon).distinct()).all()
            return [c for c in cols if c]

    def add_documents(
        self,
        collection_name: str,
        documents: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None,
        ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        
        if not documents:
            return {"added": 0, "collection": collection_name}
            
        auto_ids = ids or [f"doc_{i}" for i in range(len(documents))]
        meta_list = metadatas or [{} for _ in documents]
        embeddings = get_embeddings(documents)

        added_count = 0
        with get_session() as db:
            for i, doc_text in enumerate(documents):
                chroma_id = auto_ids[i]
                meta = meta_list[i]
                vec = embeddings[i]
                
                belge_kimlik = meta.get("sql_doc_id") or meta.get("sqlite_doc_id")
                
                parca = db.scalar(select(VektorParcasi).where(VektorParcasi.chromadb_kimlik == chroma_id))
                if parca:
                    parca.vektor_verisi = vec
                    if not parca.icerik:
                        parca.icerik = doc_text[:1000]
                    # meta yoksa güncelle
                    if not parca.meta:
                        meta_to_save = {k: v for k, v in meta.items() if isinstance(v, (str, int, float, bool, type(None)))}
                        if meta_to_save:
                            parca.meta = meta_to_save
                    db.add(parca)
                else:
                    if not belge_kimlik:
                        # memory.py'da metadata içerisinde gecmeyebilir diye logluyoruz ama atliyoruz
                        continue

                    # Tam metadata'yı JSON olarak kaydet (image_path, page_width, page_height, zoom_factor, type vb.)
                    meta_to_save = {k: v for k, v in meta.items() if isinstance(v, (str, int, float, bool, type(None)))}

                    yeni_parca = VektorParcasi(
                        belge_kimlik=belge_kimlik,
                        chromadb_kimlik=chroma_id,
                        icerik=doc_text[:1000],
                        konum_imi=f"Sayfa {meta.get('page', 0)}",
                        sayfa_no=meta.get("page", 0),
                        sinir_kutusu=str(meta.get("bbox", "")) if meta.get("bbox") else None,
                        meta=meta_to_save if meta_to_save else None,
                        embedding_modeli=get_active_model_key(),
                        vektor_verisi=vec
                    )
                    db.add(yeni_parca)
                added_count += 1
            db.commit()

        return {"added": added_count, "collection": collection_name}

    def query(
        self,
        collection_name: str,
        query_texts: List[str],
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        
        if not query_texts:
            return {"ids": [], "distances": [], "documents": [], "metadatas": []}

        q_embeddings = get_embeddings(query_texts)
        
        res_ids = []
        res_distances = []
        res_documents = []
        res_metadatas = []

        with get_session() as db:
            for q_emb in q_embeddings:
                stmt = select(VektorParcasi).where(VektorParcasi.vektor_verisi.is_not(None))
                
                if where and "sql_doc_id" in where:
                    stmt = stmt.where(VektorParcasi.belge_kimlik == where["sql_doc_id"])
                elif where and "sqlite_doc_id" in where:
                    stmt = stmt.where(VektorParcasi.belge_kimlik == where["sqlite_doc_id"])
                    
                # PostgreSQL vektör sıralaması
                stmt = stmt.order_by(VektorParcasi.vektor_verisi.cosine_distance(q_emb)).limit(n_results)
                
                rows = list(db.scalars(stmt).all())
                
                ids_row = []
                dist_row = []
                docs_row = []
                meta_row = []
                
                for r in rows:
                    ids_row.append(r.chromadb_kimlik)
                    dist_row.append(0.5) 
                    docs_row.append(r.icerik or "")
                    meta_row.append({"sql_doc_id": r.belge_kimlik, "sqlite_doc_id": r.belge_kimlik, "page": r.sayfa_no, "source": r.konum_imi})
                
                res_ids.append(ids_row)
                res_distances.append(dist_row)
                res_documents.append(docs_row)
                res_metadatas.append(meta_row)

        return {
            "ids": res_ids,
            "distances": res_distances,
            "documents": res_documents,
            "metadatas": res_metadatas
        }

    def hybrid_query(
        self,
        query_text: str,
        n_results: int = 10,
        doc_id_filter: str | None = None,
        use_reranker: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Hybrid Search: Vektör + Full-Text + RRF + Re-Ranking.

        Döner: [{kimlik, chromadb_kimlik, icerik, belge_kimlik, sayfa_no,
                 konum_imi, meta, rrf_score, rerank_score, in_vector, in_fts}, ...]
        """
        try:
            from database.vector.hybrid_search import hybrid_search
            return hybrid_search(
                query=query_text,
                n_results=n_results,
                doc_id_filter=doc_id_filter,
                use_reranker=use_reranker,
            )
        except Exception as e:
            logger.error(f"[PgVectorDB] hybrid_query hatası: {e}")
            # Fallback: klasik vektör araması
            results = self.query(
                collection_name="documents",
                query_texts=[query_text],
                n_results=n_results,
            )
            # Eski formatı yeni formata dönüştür
            fallback = []
            ids = results.get("ids", [[]])[0]
            docs = results.get("documents", [[]])[0]
            for i, cid in enumerate(ids):
                fallback.append({
                    "chromadb_kimlik": cid,
                    "icerik": docs[i] if i < len(docs) else "",
                    "rrf_score": 1.0 - (i * 0.05),
                    "in_vector": True,
                    "in_fts": False,
                })
            return fallback

    def delete_collection(self, name: str) -> Dict[str, str]:
        return {"deleted": name}

    def delete_documents(self, collection_name: str, ids: List[str]) -> Dict[str, Any]:
        with get_session() as db:
            to_delete = db.scalars(select(VektorParcasi).where(VektorParcasi.chromadb_kimlik.in_(ids))).all()
            for obj in to_delete:
                db.delete(obj)
            db.commit()
        return {"deleted_count": len(ids)}

    def get_documents(self, collection_name: str, limit: int = 100) -> Dict[str, Any]:
        with get_session() as db:
            rows = list(db.scalars(select(VektorParcasi).limit(limit)).all())
            return {
                "ids": [r.chromadb_kimlik for r in rows],
                "documents": [r.icerik for r in rows],
                "metadatas": [{"sql_doc_id": r.belge_kimlik} for r in rows]
            }

    def get_collection_info(self, name: str) -> Dict[str, Any]:
        return {"name": name, "count": 0} 

    def get_documents_by_source(
        self,
        collection_name: str,
        source_file: str,
        limit: int = 500,
    ) -> List[Dict[str, Any]]:
        # Orijinal chroma_db.py implementasyonu meta(source) üzerinden gidiyor. VektorParcasi.konum_imi içerisinde var.
        with get_session() as db:
            stmt = select(VektorParcasi).where(VektorParcasi.konum_imi.like(f"%{source_file}%")).limit(limit)
            rows = db.scalars(stmt).all()
            
            combined = []
            for r in rows:
                combined.append({"id": r.chromadb_kimlik, "text": r.icerik or "", "metadata": {"page": r.sayfa_no or 0, "source": source_file}})
                
            combined.sort(key=lambda x: int(x["metadata"].get("page", 0)))
            return combined

vector_db = PgVectorDB()
