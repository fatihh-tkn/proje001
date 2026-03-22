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
    "api_cagrilari":        "API Çağrı Logları",
    "ai_modelleri":         "AI Model Tanımları",
    "bilgisayar_oturumlari": "Bağlı Bilgisayarlar",
    "sistem_ayarlari":      "Sistem Ayarları",
    "denetim_izleri":       "Denetim İzleri (Audit Log)",
}

@router.get("/tables", summary="Tüm SQL tablolarını listele")
def get_tables():
    metadata = MetaData()
    metadata.reflect(bind=engine)
    tables = list(metadata.tables.keys())
    # Her tabloya açıklama ekle
    enriched = [{"name": t, "aciklama": TABLO_ACIKLAMALARI.get(t, t)} for t in tables]
    return {"tables": tables, "tablo_bilgileri": enriched}

@router.get("/tables/{table_name}", summary="Belirtilen SQL tablosunun verilerini getir")
def get_table_data(table_name: str, limit: int = Query(100, le=500), offset: int = 0):
    metadata = MetaData()
    metadata.reflect(bind=engine)
    if table_name not in metadata.tables:
        raise HTTPException(status_code=404, detail="Tablo bulunamadı")
        
    table = metadata.tables[table_name]
    with engine.connect() as conn:
        stmt = select(table).limit(limit).offset(offset)
        result = conn.execute(stmt)
        columns = [col for col in result.keys()]
        rows = [dict(zip(columns, row)) for row in result.fetchall()]
        
        count_stmt = select(func.count()).select_from(table)
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
            "type": r.iliski_turu,
            "weight": r.agirlik or 1.0,
            "kaynak": r.kaynak
        } for r in iliskiler]
        
    return {"nodes": node_res, "edges": rel_res}

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
