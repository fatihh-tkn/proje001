"""
database/repositories/document_repo.py
────────────────────────────────────────
Document, DocumentChunk ve KnowledgeEdge için veri erişim katmanı.

Bu repository aynı zamanda RAG arama akışının ilk adımıdır:
  1. ChromaDB → chunk_id'leri döner
  2. chunk_id_to_context()  → ilgili belge + komşu chunklara köprü kurar
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from database.sql.models import Belge, VektorParcasi, BilgiIliskisi

# Backward compatibility
Document = Belge
Node = VektorParcasi
Relation = BilgiIliskisi


class DocumentRepository:

    def __init__(self, db: Session):
        self.db = db

    # ── Belge işlemleri ───────────────────────────────────────────

    def create(
        self,
        filename: str,
        file_type: str,
        uploader_id: Optional[str] = None,
        file_size_bytes: Optional[int] = None,
        storage_path: Optional[str] = None,
        access_role: str = "herkese_acik",
        meta: Optional[dict] = None,
    ) -> Belge:
        doc = Belge(
            dosya_adi=filename,
            dosya_turu=file_type,
            yukleyen_kimlik=uploader_id,
            dosya_boyutu_bayt=file_size_bytes,
            depolama_yolu=storage_path,
            erisim_politikasi=access_role,
            meta=meta or {},
        )
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    def get(self, doc_id: str) -> Optional[Belge]:
        return self.db.get(Belge, doc_id)

    def list_all(self, access_role: Optional[str] = None, limit: int = 100) -> list[Belge]:
        stmt = select(Belge).order_by(desc(Belge.olusturulma_tarihi)).limit(limit)
        if access_role:
            stmt = stmt.where(Belge.erisim_politikasi == access_role)
        return list(self.db.scalars(stmt).all())

    def mark_vectorized(
        self,
        doc_id: str,
        chroma_collection: str,
        chunk_count: int,
    ) -> Optional[Belge]:
        doc = self.db.get(Belge, doc_id)
        if doc:
            doc.vektorlestirildi_mi = True
            doc.vektordb_koleksiyon = chroma_collection
            doc.parca_sayisi = chunk_count
            self.db.commit()
            self.db.refresh(doc)
        return doc

    def delete(self, doc_id: str) -> bool:
        doc = self.db.get(Belge, doc_id)
        if doc:
            self.db.delete(doc)
            self.db.commit()
            return True
        return False

    # ── Node (Düğüm) işlemleri ────────────────────────────────────

    def add_node(
        self,
        document_id: str,
        chroma_id: str,
        content: Optional[str] = None,
        location_marker: Optional[str] = None,
    ) -> VektorParcasi:
        node = VektorParcasi(
            belge_kimlik=document_id,
            chromadb_kimlik=chroma_id,
            icerik=content,
            konum_imi=location_marker,
        )
        self.db.add(node)
        self.db.commit()
        self.db.refresh(node)
        return node

    def bulk_add_nodes(self, nodes_data: list[dict]) -> int:
        """
        Toplu node ekleme. 
        nodes_data: [{"document_id": ..., "chroma_id": ..., "content": ..., "location_marker": ...}]
        Döner: eklenen kayıt sayısı
        """
        objects = []
        for n in nodes_data:
            objects.append(VektorParcasi(
                belge_kimlik=n.get("document_id") or n.get("belge_kimlik"),
                chromadb_kimlik=n.get("chroma_id") or n.get("chromadb_kimlik"),
                icerik=n.get("content") or n.get("icerik"),
                konum_imi=n.get("location_marker") or n.get("konum_imi")
            ))
        self.db.add_all(objects)
        self.db.commit()
        return len(objects)

    def get_node_by_chroma_id(self, chroma_id: str) -> Optional[VektorParcasi]:
        stmt = select(VektorParcasi).where(VektorParcasi.chromadb_kimlik == chroma_id)
        return self.db.scalar(stmt)

    def get_nodes_for_doc(self, doc_id: str) -> list[VektorParcasi]:
        stmt = (
            select(VektorParcasi)
            .where(VektorParcasi.belge_kimlik == doc_id)
            .order_by(VektorParcasi.kimlik)
        )
        return list(self.db.scalars(stmt).all())

    # ── RAG Bağlam Köprüsü ────────────────────────────────────────

    def node_ids_to_context(self, chroma_ids: list[str]) -> list[dict]:
        """
        ChromaDB'nin döndürdüğü chroma_id listesini alır.
        Her node için:
          - node metadata (location_marker, content)
          - üst belge bilgisi (isim, fiziksel dosya yolu)
          - bilgi grafiğindeki (relations tablosu) komşu node bilgileri ve metinleri
        Döner: RAG Pipeline + UI Action için kullanılacak saf JSON.
        """
        if not chroma_ids:
            return []

        # 1. Aşama: ChromaDB ID'sine karşılık gelen Node'ları ve Document'ları getir (JOIN simülasyonu)
        stmt = select(VektorParcasi).where(VektorParcasi.chromadb_kimlik.in_(chroma_ids))
        nodes = list(self.db.scalars(stmt).all())

        results = []
        for node in nodes:
            doc = self.db.get(Belge, node.belge_kimlik)

            # 2. Aşama: Relations tablosundan komşu düğümleri (nodes) bul
            edge_stmt = select(BilgiIliskisi).where(BilgiIliskisi.kaynak_parca_kimlik == node.kimlik).limit(5)
            edges = list(self.db.scalars(edge_stmt).all())
            
            # İlişkili node'ları bulup onların belgesini ve içeriğini de ekliyoruz
            related_nodes = []
            for edge in edges:
                target_node = self.db.get(VektorParcasi, edge.hedef_parca_kimlik)
                if target_node:
                    target_doc = self.db.get(Belge, target_node.belge_kimlik)
                    related_nodes.append({
                        "node_id": target_node.kimlik,
                        "content": target_node.icerik,
                        "location_marker": target_node.konum_imi,
                        "document_name": target_doc.dosya_adi if target_doc else None,
                        "file_path": target_doc.depolama_yolu if target_doc else None,
                        "relation_type": edge.iliski_turu,
                    })

            results.append({
                "chroma_id": node.chromadb_kimlik,
                "node_id": node.kimlik,
                "content": node.icerik,
                "location_marker": node.konum_imi,
                "document": {
                    "id": doc.kimlik if doc else None,
                    "filename": doc.dosya_adi if doc else None,
                    "file_path": doc.depolama_yolu if doc else None,
                    "file_type": doc.dosya_turu if doc else None,
                },
                "related_nodes": related_nodes,
            })
        return results

    # ── Bilgi Grafiği işlemleri ───────────────────────────────────

    def add_relation(
        self,
        source_node_id: int,
        target_node_id: int,
        relation_type: str,
        weight: Optional[float] = None,
        source: str = "auto",
    ) -> BilgiIliskisi:
        rel = BilgiIliskisi(
            kaynak_parca_kimlik=source_node_id,
            hedef_parca_kimlik=target_node_id,
            iliski_turu=relation_type,
            weight=weight,
            source=source,
        )
        self.db.add(rel)
        self.db.commit()
        self.db.refresh(rel)
        return rel

    def get_node_relations(self, node_id: int) -> list[BilgiIliskisi]:
        stmt = select(BilgiIliskisi).where(
            (BilgiIliskisi.kaynak_parca_kimlik == node_id) |
            (BilgiIliskisi.hedef_parca_kimlik == node_id)
        )
        return list(self.db.scalars(stmt).all())

