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
    from database.sql.models import Belge
    with get_session() as db:
        parcalar = db.scalars(select(VektorParcasi)).all()
        iliskiler = db.scalars(select(BilgiIliskisi)).all()
        belgeler = db.scalars(select(Belge)).all()
        
        belge_tur_map = {b.kimlik: b.dosya_turu for b in belgeler}
        
        node_res = [{
            "id": p.kimlik,
            "chroma_id": p.chromadb_kimlik,
            "content": p.icerik or "",
            "location": p.konum_imi or "Bilinmiyor",
            "document_id": p.belge_kimlik,
            "sayfa": p.sayfa_no,
            "file_type": belge_tur_map.get(p.belge_kimlik, "unknown")
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

@router.get("/schema", summary="SQL tablolarinin tam semasini ve iliskilerini getir (app.db + logs.db dinamik)")
def get_schema():
    """
    Her iki veritabanini (app.db + logs.db) SQLAlchemy MetaData.reflect() ile
    anlik olarak tarar. models.py'ye yeni bir tablo eklendiginde bu endpoint
    hicbir degisiklik gerektirmeksizin yeni tabloyu otomatik dondurur.

    Donen JSON yapisi:
      {
        "tables": [
          {
            "name": "belgeler",
            "aciklama": "Belgeler (Arsiv)",
            "db": "app",            # Hangi fiziksel DB dosyasinda oldugu
            "columns": [
              {"name": "kimlik", "type": "VARCHAR(36)", "primary_key": true, "nullable": false}
            ],
            "foreign_keys": [
              {"source_col": "yukleyen_kimlik", "target_table": "kullanicilar", "target_col": "kimlik"}
            ],
            "row_count": 42          # Yaklasik satir sayisi (hiz icin COUNT(*))
          }
        ]
      }
    """
    from database.sql.session import engine as app_engine
    from database.logs.session import logs_engine
    from sqlalchemy import text

    def _reflect_db(eng, db_label: str) -> list[dict]:
        """Verilen engine'i yansit, tablo bilgilerini standart formata donustur."""
        meta = MetaData()
        meta.reflect(bind=eng)

        results = []
        with eng.connect() as conn:
            for table_name, table in meta.tables.items():
                # -- Sutun bilgileri --
                columns = [
                    {
                        "name": c.name,
                        "type": str(c.type),
                        "primary_key": bool(c.primary_key),
                        "nullable": bool(c.nullable),
                    }
                    for c in table.columns
                ]

                # -- Yabanci anahtar (FK) baglantilar --
                fks = [
                    {
                        "source_col":   fk.parent.name,
                        "target_table": fk.column.table.name,
                        "target_col":   fk.column.name,
                    }
                    for fk in table.foreign_keys
                ]

                # -- Satir sayisi (COUNT(*) -- buyuk tablolarda performansi etkilemez) --
                try:
                    row_count = conn.execute(
                        text(f'SELECT COUNT(*) FROM "{table_name}"')
                    ).scalar() or 0
                except Exception:
                    row_count = -1   # Erisim hatasi varsa -1 dondur

                results.append(
                    {
                        "name":        table_name,
                        "aciklama":    TABLO_ACIKLAMALARI.get(table_name, table_name),
                        "db":          db_label,
                        "columns":     columns,
                        "foreign_keys": fks,
                        "row_count":   row_count,
                    }
                )
        return results

    app_tables  = _reflect_db(app_engine,  db_label="app")
    logs_tables = _reflect_db(logs_engine, db_label="logs")

    # Tablolari birlestir; isme gore sort et (UI'da deterministic siralama)
    all_tables = sorted(app_tables + logs_tables, key=lambda t: t["name"])

    return {"tables": all_tables, "total": len(all_tables)}


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

        # Gerçek parça sayısını VektorParcasi tablosundan tek seferde say
        gercek_parcalar_raw = db.execute(
            select(VektorParcasi.belge_kimlik, func.count(VektorParcasi.kimlik))
            .group_by(VektorParcasi.belge_kimlik)
        ).all()
        gercek_parcalar_dict = {row[0]: row[1] for row in gercek_parcalar_raw}

        results = []
        for b in belgeler:
            gercek_parca = gercek_parcalar_dict.get(b.kimlik, 0)

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


@router.post(
    "/sync-chunk-counts",
    summary="parca_sayisi drift duzeltici — belgeler tablosunu VektorParcasi COUNT ile senkronize et",
)
def sync_chunk_counts():
    """
    Sorun 4 Duzeltme: Karantina/Onay gecisi sirasinda parca_sayisi yanlis
    kaydedilebilir (esli yukleme, coklu islemci yarisi, vb.).

    Bu endpoint:
      1. Tum Belge satirlarini tarar.
      2. Her belge icin VektorParcasi tablosundan gercek COUNT'u hesaplar.
      3. Belgedeki parca_sayisi ile uyusmuyorsa gunceller.
      4. Kac satirin duzeltildigini ve ne kadar saptigi raporlar.
    """
    from database.sql.models import Belge

    guncellenen = 0
    atlanmis    = 0
    detaylar    = []

    with get_session() as db:
        belgeler = db.scalars(
            select(Belge).where(Belge.dosya_turu != "folder")
        ).all()

        # Gerçek parça sayısını VektorParcasi tablosundan tek seferde say
        gercek_parcalar_raw = db.execute(
            select(VektorParcasi.belge_kimlik, func.count(VektorParcasi.kimlik))
            .group_by(VektorParcasi.belge_kimlik)
        ).all()
        gercek_parcalar_dict = {row[0]: row[1] for row in gercek_parcalar_raw}

        for b in belgeler:
            gercek = gercek_parcalar_dict.get(b.kimlik, 0)

            if b.parca_sayisi != gercek:
                detaylar.append({
                    "belge_id":  b.kimlik,
                    "dosya_adi": b.dosya_adi,
                    "eski":      b.parca_sayisi,
                    "yeni":      gercek,
                })
                b.parca_sayisi = gercek
                guncellenen += 1
            else:
                atlanmis += 1

        if guncellenen > 0:
            db.commit()

    return {
        "status":      "success",
        "guncellenen": guncellenen,
        "atlanmis":    atlanmis,
        "detaylar":    detaylar,
        "mesaj": (
            f"{guncellenen} belgenin parca_sayisi guncellendi, "
            f"{atlanmis} belge zaten senkronizeydi."
        ),
    }


@router.get(
    "/integrity-report",
    summary="Veri butunlugu raporu — sadece okuma, duzeltme yapmaz",
)
def integrity_report():
    """
    Sistemdeki veri senkron sorunlarini raporlar.
    Hicbir veri degistirmez; izleme paneli ve uyari sistemi icin kullanilir.

    Kontrol edilen durumlar:
      A) parca_sayisi uyumsuzlugu  — Belge.parca_sayisi != COUNT(VektorParcasi)
      B) Hayalet parcalar          — VektorParcasi.belge_kimlik gecersiz (FK eksik)
      C) Vektorsuz gosterilen dosyalar — vektorlestirildi_mi=True ama parca yok
    """
    from database.sql.models import Belge
    from sqlalchemy import not_, exists

    rapor = {
        "A_parca_sayisi_uyumsuzlugu": [],
        "B_hayalet_parcalar":         [],
        "C_vektorsuz_gosterilen":     [],
    }

    with get_session() as db:
        # -- A: parca_sayisi uyumsuzlugu ------------------------------------
        belgeler = db.scalars(
            select(Belge).where(Belge.dosya_turu != "folder")
        ).all()

        # Gerçek parça sayısını VektorParcasi tablosundan tek seferde say
        gercek_parcalar_raw = db.execute(
            select(VektorParcasi.belge_kimlik, func.count(VektorParcasi.kimlik))
            .group_by(VektorParcasi.belge_kimlik)
        ).all()
        gercek_parcalar_dict = {row[0]: row[1] for row in gercek_parcalar_raw}

        for b in belgeler:
            gercek = gercek_parcalar_dict.get(b.kimlik, 0)

            if b.parca_sayisi != gercek:
                rapor["A_parca_sayisi_uyumsuzlugu"].append({
                    "belge_id":  b.kimlik,
                    "dosya_adi": b.dosya_adi,
                    "kayitli":   b.parca_sayisi,
                    "gercek":    gercek,
                    "sapma":     gercek - b.parca_sayisi,
                })

            # -- C: vektorlestirildi_mi=True ama hic parcasi yok ------------
            if b.vektorlestirildi_mi and gercek == 0:
                rapor["C_vektorsuz_gosterilen"].append({
                    "belge_id":  b.kimlik,
                    "dosya_adi": b.dosya_adi,
                })

        # -- B: Hayalet parcalar (belge_kimlik gecersiz FK) -------------------
        gecersiz_parcalar = db.scalars(
            select(VektorParcasi).where(
                not_(
                    exists().where(Belge.kimlik == VektorParcasi.belge_kimlik)
                )
            )
        ).all()

        rapor["B_hayalet_parcalar"] = [
            {
                "parca_id":      p.kimlik,
                "chroma_id":     p.chromadb_kimlik,
                "belge_kimlik":  p.belge_kimlik,
            }
            for p in gecersiz_parcalar
        ]

    rapor["ozet"] = {
        "A_uyumsuz_belge_sayisi":    len(rapor["A_parca_sayisi_uyumsuzlugu"]),
        "B_hayalet_parca_sayisi":    len(rapor["B_hayalet_parcalar"]),
        "C_vektorsuz_belge_sayisi":  len(rapor["C_vektorsuz_gosterilen"]),
        "genel_durum":               "temiz" if all(
            len(v) == 0 for v in rapor.values() if isinstance(v, list)
        ) else "sorunlu",
    }
    return rapor

@router.get("/documents/{doc_id}/chunks", summary="Belirli bir belgenin tüm vektör parçacıklarını getir")
def get_document_chunks(doc_id: str):
    """
    Belirli bir dosyaya (Belgeye) ait tüm vektör parçacıklarını 
    hızlıca SQL üzerinden (vektor_parcalari tablosundan) döner.
    Bu, frontend'de tüm vektörleri ChromaDB'den çekmeyi engeller.
    """
    with get_session() as db:
        parcalar = db.scalars(
            select(VektorParcasi).where(VektorParcasi.belge_kimlik == doc_id)
        ).all()
        
        results = []
        for p in parcalar:
            results.append({
                "id": p.chromadb_kimlik,
                "text": p.icerik,
                "page": p.sayfa_no or 1,
                "x": 0,
                "y": 0,
            })
            
    return {"chunks": results, "total": len(results)}
