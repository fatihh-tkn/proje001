from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import MetaData, Table, select, func
from database.sql.session import engine
from database.sql.session import get_session
from database.sql.models import VektorParcasi, BilgiIliskisi

# Geriye dönük uyumluluk kısayolları
Node = VektorParcasi
Relation = BilgiIliskisi

router = APIRouter()

# Türkçe tablo adı → eski koddaki tablo adı eşleştirme sözlüğü (gösterim amaçlı)
TABLO_ACIKLAMALARI = {
    "kullanicilar":         "Kullanıcılar",
    "roller":               "Roller",
    "kullanici_roller":     "Kullanıcı - Rol Eşleştirmeleri",
    "sohbet_oturumlari":    "Sohbet Oturumları",
    "sohbet_mesajlari":     "Sohbet Mesajları",
    "belgeler":             "Belgeler (Arşiv)",
    "vektor_parcalari":     "Vektör Parçaları (Chunk'lar)",
    "bilgi_iliskileri":     "Bilgi Grafiği İlişkileri",
    "api_cagrilari":        "(ESKİ) API Kayıtları (Kullanımdan Kaldırılacak)",
    "api_loglari":          "(YENİ DOSYA) API Logları (logs.db WAL Modu)",
    "ai_modelleri":         "AI Model Tanımları",
    "bilgisayar_oturumlari": "Bağlı Bilgisayarlar",
    "sistem_ayarlari":      "Sistem Ayarları",
    "denetim_izleri":       "Denetim İzleri (Audit Log)",
}

@router.get("/tables", summary="Tüm SQL tablolarını listele (App.db + Logs.db birleşik)")
def get_tables():
    from database.sql.session import engine
    from database.logs.session import logs_engine

    # app.db
    metadata_app = MetaData()
    metadata_app.reflect(bind=engine)
    tables_app = list(metadata_app.tables.keys())

    # logs.db
    metadata_logs = MetaData()
    metadata_logs.reflect(bind=logs_engine)
    tables_logs = list(metadata_logs.tables.keys())

    all_tables = sorted(tables_app + tables_logs)
    enriched = [{"name": t, "aciklama": TABLO_ACIKLAMALARI.get(t, t)} for t in all_tables]
    return {"tables": all_tables, "tablo_bilgileri": enriched}

@router.get("/tables/{table_name}", summary="Belirtilen SQL tablosunun verilerini getir")
def get_table_data(table_name: str, limit: int = Query(100, le=500), offset: int = 0):
    from database.sql.session import engine
    from database.logs.session import logs_engine

    metadata_app = MetaData()
    metadata_app.reflect(bind=engine)

    metadata_logs = MetaData()
    metadata_logs.reflect(bind=logs_engine)

    db_engine = None
    table_obj = None

    if table_name in metadata_app.tables:
        db_engine = engine
        table_obj = metadata_app.tables[table_name]
    elif table_name in metadata_logs.tables:
        db_engine = logs_engine
        table_obj = metadata_logs.tables[table_name]
    else:
        raise HTTPException(status_code=404, detail="Tablo bulunamadı")
        
    with db_engine.connect() as conn:
        stmt = select(table_obj).limit(limit).offset(offset)
        result = conn.execute(stmt)
        columns = [col for col in result.keys()]
        rows = [dict(zip(columns, row)) for row in result.fetchall()]
        
        count_stmt = select(func.count()).select_from(table_obj)
        total = conn.execute(count_stmt).scalar()
        
    return {
        "table": table_name,
        "aciklama": TABLO_ACIKLAMALARI.get(table_name, table_name),
        "columns": columns,
        "rows": rows,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/graph", summary="Bilgi Grafiği - Parçalar ve İlişkiler")
def get_graph_data():
    with get_session() as db:
        parcalar = db.scalars(select(VektorParcasi)).all()
        iliskiler = db.scalars(select(BilgiIliskisi)).all()
        
        node_res = [{
            "id": p.kimlik,
            "chroma_id": p.chromadb_kimlik,
            "content": p.icerik or "",
            "location": p.konum_imi or "Bilinmiyor",
            "document_id": p.belge_kimlik,
            "sayfa": p.sayfa_no
        } for p in parcalar]
        
        rel_res = [{
            "id": r.kimlik,
            "source": r.kaynak_parca_kimlik,
            "target": r.hedef_parca_kimlik,
            "relation": r.iliski_turu,
            "weight": r.agirlik or 1.0,
            "kaynak": r.kaynak
        } for r in iliskiler]
        
    return {"nodes": node_res, "edges": rel_res}

@router.get("/file-graph-stats", summary="Belirli bir dosyanın ağ (grafik) bağlantılarını analiz et")
def get_file_graph_stats(filename: str = Query(..., description="Dosya adı")):
    """
    Verilen dosya adıyla eşleşen SQL kayıtlarını birden fazla stratejiyle arar:
    1. belgeler.dosya_adi (tam eşleşme)
    2. belgeler.dosya_adi (LIKE, kısmi)
    3. vektor_parcalari.konum_imi (LIKE)
    4. vektor_parcalari.chromadb_kimlik (LIKE)
    """
    from database.sql.models import Belge
    from sqlalchemy import or_

    with get_session() as db:
        parcalar = []

        # Strateji 1: Belge tablosunda tam isim eşleşmesi
        belge = db.scalars(
            select(Belge).where(Belge.dosya_adi == filename)
        ).first()

        # Strateji 2: Belge tablosunda kısmi eşleşme (UUID prefix'li kayıtlar için)
        if not belge:
            belge = db.scalars(
                select(Belge).where(Belge.dosya_adi.like(f"%{filename}%"))
            ).first()

        if belge:
            parcalar = db.scalars(
                select(VektorParcasi).where(VektorParcasi.belge_kimlik == belge.kimlik)
            ).all()

        # Strateji 3: Konum imi veya chromadb_kimlik içinde dosya adı geçiyor mu?
        if not parcalar:
            parcalar = db.scalars(
                select(VektorParcasi).where(
                    or_(
                        VektorParcasi.konum_imi.like(f"%{filename}%"),
                        VektorParcasi.chromadb_kimlik.like(f"%{filename}%"),
                    )
                )
            ).all()

        if not parcalar:
            return {
                "connected_files": [],
                "total_internal_links": 0,
                "total_external_links": 0,
                "found_by": "none"
            }

        parca_kimlikleri = set(p.kimlik for p in parcalar)

        # Bu parçaların dahil olduğu tüm ilişkileri çek
        iliskiler = db.scalars(
            select(BilgiIliskisi).where(
                or_(
                    BilgiIliskisi.kaynak_parca_kimlik.in_(parca_kimlikleri),
                    BilgiIliskisi.hedef_parca_kimlik.in_(parca_kimlikleri),
                )
            )
        ).all()

        internal_count = 0
        external_stats: dict[str, int] = {}
        diger_parca_ids: set[int] = set()

        for r in iliskiler:
            src_in = r.kaynak_parca_kimlik in parca_kimlikleri
            tgt_in = r.hedef_parca_kimlik in parca_kimlikleri
            if src_in and tgt_in:
                internal_count += 1
            else:
                if not src_in:
                    diger_parca_ids.add(r.kaynak_parca_kimlik)
                if not tgt_in:
                    diger_parca_ids.add(r.hedef_parca_kimlik)

        if diger_parca_ids:
            diger_parcalar = db.scalars(
                select(VektorParcasi).where(VektorParcasi.kimlik.in_(list(diger_parca_ids)))
            ).all()
            diger_belge_id_map: dict[int, str] = {p.kimlik: p.belge_kimlik for p in diger_parcalar}

            unique_belge_ids = set(diger_belge_id_map.values())
            belgeler = db.scalars(
                select(Belge).where(Belge.kimlik.in_(list(unique_belge_ids)))
            ).all()
            belge_isim_map: dict[str, str] = {b.kimlik: b.dosya_adi for b in belgeler}

            for r in iliskiler:
                src_in = r.kaynak_parca_kimlik in parca_kimlikleri
                tgt_in = r.hedef_parca_kimlik in parca_kimlikleri
                if not (src_in and tgt_in):
                    diger_p_id = r.kaynak_parca_kimlik if not src_in else r.hedef_parca_kimlik
                    belge_id   = diger_belge_id_map.get(diger_p_id)
                    b_name     = belge_isim_map.get(belge_id, "Bilinmeyen Düğüm") if belge_id else "Bilinmeyen Düğüm"
                    external_stats[b_name] = external_stats.get(b_name, 0) + 1

        conn_files = sorted(
            [{"filename": k, "links": v} for k, v in external_stats.items()],
            key=lambda x: x["links"],
            reverse=True,
        )

        return {
            "total_internal_links": internal_count,
            "total_external_links": sum(external_stats.values()),
            "connected_files": conn_files,
        }

@router.get("/schema", summary="SQL tablolarının tam şemasını ve ilişkilerini getir")
def get_schema():
    metadata = MetaData()
    metadata.reflect(bind=engine)
    
    tables_data = []
    for table_name, table in metadata.tables.items():
        columns = [{
            "name": c.name,
            "type": str(c.type),
            "primary_key": c.primary_key,
            "nullable": c.nullable
        } for c in table.columns]
        fks = []
        for fk in table.foreign_keys:
            fks.append({
                "source_col": fk.parent.name,
                "target_table": fk.column.table.name,
                "target_col": fk.column.name
            })
            
        tables_data.append({
            "name": table_name,
            "aciklama": TABLO_ACIKLAMALARI.get(table_name, table_name),
            "columns": columns,
            "foreign_keys": fks
        })
    return {"tables": tables_data}


@router.post("/repair-integrity", summary="Orphan VektorParcasi kayıtlarını onar (belge_kimlik eksik/kopuk)")
def repair_integrity():
    """
    Task 4: belge_kimlik NULL veya Belge tablosunda karşılığı olmayan VektorParcasi
    kayıtlarını bulur ve konum_imi / chromadb_kimlik'ten dosya adını çıkararak
    ilgili Belge'ye bağlar — yoksa yeni Belge açar.
    """
    from database.sql.models import Belge
    from sqlalchemy import or_

    repaired = 0
    created_belgeler = 0

    with get_session() as db:
        # Tüm parçaları çek
        parcalar = db.scalars(select(VektorParcasi)).all()

        # Tüm mevcut belge id'lerini set olarak tut
        mevcut_belge_ids = set(
            b.kimlik for b in db.scalars(select(Belge)).all()
        )

        # belge_kimlik'i geçersiz olan parçaları bul
        orphans = [p for p in parcalar if not p.belge_kimlik or p.belge_kimlik not in mevcut_belge_ids]

        print(f"[repair-integrity] {len(orphans)} orphan parça bulundu / toplam {len(parcalar)}")

        for parca in orphans:
            # konum_imi'den dosya adını çıkarmaya çalış: "dosya.pdf | Sayfa 1" formatı
            dosya_adi_guess = None
            if parca.konum_imi and "|" in parca.konum_imi:
                dosya_adi_guess = parca.konum_imi.split("|")[0].strip()
            elif parca.chromadb_kimlik:
                # chromadb_kimlik bazen "dosyaadi_chunk_0" formatında
                parts = parca.chromadb_kimlik.rsplit("_chunk_", 1)
                if len(parts) == 2:
                    dosya_adi_guess = parts[0]

            if not dosya_adi_guess:
                dosya_adi_guess = "bilinmeyen_dosya"

            # Bu dosya adıyla Belge var mı?
            belge = db.scalars(
                select(Belge).where(
                    or_(
                        Belge.dosya_adi == dosya_adi_guess,
                        Belge.dosya_adi.like(f"%{dosya_adi_guess}%"),
                    )
                )
            ).first()

            if not belge:
                ext = dosya_adi_guess.rsplit(".", 1)[-1] if "." in dosya_adi_guess else "unknown"
                belge = Belge(
                    dosya_adi=dosya_adi_guess,
                    dosya_turu=ext,
                    parca_sayisi=0,
                    vektorlestirildi_mi=True,
                    durum="onaylandi",
                )
                db.add(belge)
                db.flush()
                created_belgeler += 1

            parca.belge_kimlik = belge.kimlik
            repaired += 1

        db.commit()
        print(f"[repair-integrity] ✅ {repaired} parça onarıldı, {created_belgeler} yeni Belge oluşturuldu")

    return {
        "status": "ok",
        "repaired_chunks": repaired,
        "created_belgeler": created_belgeler,
    }


@router.post("/documents/{doc_id}/approve", summary="Karantinadaki belgeyi onayla")
def approve_document(doc_id: str):
    from database.sql.models import Belge
    with get_session() as db:
        b = db.scalar(select(Belge).where(Belge.kimlik == doc_id))
        if not b:
            raise HTTPException(status_code=404, detail="Belge bulunamadı")
        b.durum = "onaylandi"
        db.commit()
    return {"status": "success", "message": "Belge onaylandı"}

@router.get("/documents", summary="Belge listesini SQL'den getir (Dosya İşleme UI için)")
def get_documents():
    """
    belgeler tablosundan gerçek zamanlı dosya listesi döner.
    Her kayıt için ilişkili vektor_parcalari sayısını da hesaplar.
    Frontend'deki localStorage bağımlılığının yerine geçer.
    """
    from database.sql.models import Belge
    from sqlalchemy import desc

    with get_session() as db:
        belgeler = db.scalars(
            select(Belge)
            .where(Belge.dosya_turu != "folder")   # klasör kayıtlarını dışla
            .order_by(desc(Belge.olusturulma_tarihi))
        ).all()

        results = []
        for b in belgeler:
            # Gerçek parça sayısını VektorParcasi tablosundan say
            gercek_parca = db.scalar(
                select(func.count(VektorParcasi.kimlik))
                .where(VektorParcasi.belge_kimlik == b.kimlik)
            ) or 0

            results.append({
                "id":           b.kimlik,
                "file":         b.dosya_adi,
                "file_type":    b.dosya_turu,
                "chunks":       gercek_parca,
                "date":         b.olusturulma_tarihi,
                "active":       b.vektorlestirildi_mi,
                "status":       b.durum,
                "storage_path": b.depolama_yolu,
                "collection":   b.vektordb_koleksiyon,
            })

    return {"records": results, "total": len(results)}
