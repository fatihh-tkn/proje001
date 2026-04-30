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

from sqlalchemy import select, desc, func
from sqlalchemy.orm import Session

from database.sql.models import Belge, VektorParcasi, BilgiIliskisi, Kullanici

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
        havuz_turu: str = "sistem",
    ) -> Belge:
        doc = Belge(
            dosya_adi=filename,
            dosya_turu=file_type,
            yukleyen_kimlik=uploader_id,
            dosya_boyutu_bayt=file_size_bytes,
            depolama_yolu=storage_path,
            erisim_politikasi=access_role,
            meta=meta or {},
            havuz_turu=havuz_turu,
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

    def list_system_documents(self, limit: int = 500) -> list[Belge]:
        """Sistem havuzundaki (admin) tüm belgeleri döner."""
        stmt = (
            select(Belge)
            .where(Belge.havuz_turu == "sistem")
            .order_by(desc(Belge.olusturulma_tarihi))
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def list_user_documents(self, user_id: str, limit: int = 500) -> list[Belge]:
        """Verilen kullanıcının kendi (kullanici) havuzundaki belgelerini döner."""
        stmt = (
            select(Belge)
            .where(Belge.havuz_turu == "kullanici")
            .where(Belge.yukleyen_kimlik == user_id)
            .order_by(desc(Belge.olusturulma_tarihi))
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_pool_doc_ids(self, user_id: Optional[str]) -> list[str]:
        """
        Kullanıcının RAG sorgulayabileceği belge kimliklerini döner.
        Kural:
          - Sistem belgesi → izin listesi boşsa herkese açık (varsayılan),
            liste doluysa sadece listede olan kullanıcıya açık.
          - Kullanıcı belgesi → sahibine + izin listesindeki kullanıcılara açık.
        """
        tum_sistem = self.db.scalars(
            select(Belge).where(Belge.havuz_turu == "sistem")
        ).all()

        sys_ids = [
            b.kimlik for b in tum_sistem
            if not user_id
            or not (b.meta or {}).get("izin_verilen_kullanicilar")  # boşsa herkese açık
            or user_id in (b.meta or {}).get("izin_verilen_kullanicilar", [])
        ]

        if not user_id:
            return sys_ids

        # Kullanıcının kendi yüklediği belgeler
        usr_stmt = (
            select(Belge.kimlik)
            .where(Belge.havuz_turu == "kullanici")
            .where(Belge.yukleyen_kimlik == user_id)
        )
        usr_ids = list(self.db.scalars(usr_stmt).all())

        # Başkasının yüklediği ama erişim izni verilmiş belgeler
        shared_belgeler = self.db.scalars(
            select(Belge).where(
                Belge.havuz_turu == "kullanici",
                Belge.yukleyen_kimlik != user_id,
            )
        ).all()
        shared_ids = [
            b.kimlik for b in shared_belgeler
            if user_id in (b.meta or {}).get("izin_verilen_kullanicilar", [])
        ]

        return sys_ids + usr_ids + shared_ids

    def get_user_quota_info(self, user_id: str) -> dict:
        """
        Kullanıcının kota durumunu döner.
        {
          "dosya_limiti": int | None,
          "depolama_limiti_mb": float | None,
          "kullanilan_dosya": int,
          "kullanilan_mb": float,
          "dolu_mu": bool,
        }
        """
        user = self.db.get(Kullanici, user_id)
        if not user:
            return {"hata": "Kullanıcı bulunamadı"}

        # Kullanılan dosya sayısı ve alan
        dosya_sayisi_row = self.db.execute(
            select(func.count(Belge.kimlik)).where(
                Belge.havuz_turu == "kullanici",
                Belge.yukleyen_kimlik == user_id,
            )
        ).scalar() or 0

        toplam_bayt_row = self.db.execute(
            select(func.coalesce(func.sum(Belge.dosya_boyutu_bayt), 0)).where(
                Belge.havuz_turu == "kullanici",
                Belge.yukleyen_kimlik == user_id,
            )
        ).scalar() or 0

        kullanilan_mb = round((toplam_bayt_row or 0) / (1024 * 1024), 2)

        dosya_dolu = (
            user.dosya_limiti is not None
            and dosya_sayisi_row >= user.dosya_limiti
        )
        mb_dolu = (
            user.depolama_limiti_mb is not None
            and kullanilan_mb >= user.depolama_limiti_mb
        )

        return {
            "kullanici_kimlik": user_id,
            "dosya_limiti": user.dosya_limiti,
            "depolama_limiti_mb": user.depolama_limiti_mb,
            "kullanilan_dosya": dosya_sayisi_row,
            "kullanilan_mb": kullanilan_mb,
            "dolu_mu": dosya_dolu or mb_dolu,
            "dosya_dolu_mu": dosya_dolu,
            "mb_dolu_mu": mb_dolu,
        }

    def check_user_can_upload(self, user_id: str, new_file_size_bytes: int = 0) -> tuple[bool, str]:
        """
        Kullanıcının yeni dosya yükleyip yükleyemeyeceğini kontrol eder.
        Döner: (izin_var_mi, red_nedeni)
        """
        info = self.get_user_quota_info(user_id)
        if "hata" in info:
            return False, info["hata"]

        if info["dosya_limiti"] is not None:
            if info["kullanilan_dosya"] >= info["dosya_limiti"]:
                return False, (
                    f"Dosya limitine ulaşıldı: {info['kullanilan_dosya']}/{info['dosya_limiti']} dosya."
                )

        if info["depolama_limiti_mb"] is not None:
            yeni_mb = round(new_file_size_bytes / (1024 * 1024), 2)
            if info["kullanilan_mb"] + yeni_mb > info["depolama_limiti_mb"]:
                return False, (
                    f"Depolama limitine ulaşıldı: "
                    f"{info['kullanilan_mb']} MB kullanımda, "
                    f"limit {info['depolama_limiti_mb']} MB."
                )

        return True, ""

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
        sayfa_no: Optional[int] = None,
        sinir_kutusu: Optional[str] = None
    ) -> VektorParcasi:
        node = VektorParcasi(
            belge_kimlik=document_id,
            chromadb_kimlik=chroma_id,
            icerik=content,
            konum_imi=location_marker,
            sayfa_no=sayfa_no,
            sinir_kutusu=sinir_kutusu
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
                konum_imi=n.get("location_marker") or n.get("konum_imi"),
                sayfa_no=n.get("sayfa_no") or n.get("page"),
                sinir_kutusu=n.get("sinir_kutusu") or n.get("bbox")
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

        from datetime import datetime, timezone

        # 1. Aşama: ChromaDB ID'sine karşılık gelen Node'ları ve Document'ları getir
        stmt = select(VektorParcasi).where(VektorParcasi.chromadb_kimlik.in_(chroma_ids))
        nodes = list(self.db.scalars(stmt).all())

        # GHOST VECTOR CLEANUP (İlişkisi Kopuk Veri Silinmesi)
        found_ids = {n.chromadb_kimlik for n in nodes}
        missing_ids = [cid for cid in chroma_ids if cid not in found_ids]
        if missing_ids:
            try:
                # Ghost vektorleri ChromaDB'den kalıcı olarak temizleyerek veri hatasını canlı onarıyoruz.
                from database.vector.pgvector_db import vector_db
                vector_db.delete_documents("yilgenci_collection", missing_ids)
                print(f"[RAG HEALER] {len(missing_ids)} adet hayalet vektör ChromaDB'den silindi: {missing_ids[:2]}...")
            except Exception as e:
                print(f"[RAG HEALER] Hayalet vektör silme işlemi başarısız: {e}")

        simdi = datetime.now(timezone.utc).isoformat()
        results = []
        for node in nodes:
            # Hit sayacını ve son sorgulanma tarihini güncelle
            node.tiklanma_sayisi = (node.tiklanma_sayisi or 0) + 1
            node.son_sorgulanma_tarihi = simdi

            doc = self.db.get(Belge, node.belge_kimlik)

            # Belgenin son sorgulama tarihini de güncelle
            if doc:
                doc.son_sorgulama_tarihi = simdi

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

            _meta = node.meta or {}
            results.append({
                "chroma_id": node.chromadb_kimlik,
                "node_id": node.kimlik,
                "content": node.icerik,
                "location_marker": node.konum_imi,
                "page": node.sayfa_no,
                "bbox": node.sinir_kutusu,
                "element_id": _meta.get("element_id"),
                "element_name": _meta.get("element_name"),
                "image_path": _meta.get("image_path"),
                "slide_w": _meta.get("slide_emu_w") or _meta.get("page_width"),
                "slide_h": _meta.get("slide_emu_h") or _meta.get("page_height"),
                "chunk_type": _meta.get("type"),
                "document": {
                    "id": doc.kimlik if doc else None,
                    "filename": doc.dosya_adi if doc else None,
                    "file_path": doc.depolama_yolu if doc else None,
                    "file_type": doc.dosya_turu if doc else None,
                    "pdf_path": (
                        (doc.meta or {}).get("pdf_yolu")
                        if doc and doc.meta
                        else doc.depolama_yolu if doc else None
                    ),
                },
                "related_nodes": related_nodes,
            })

        # Tüm hit sayaçlarını tek commit ile yaz
        self.db.commit()
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

