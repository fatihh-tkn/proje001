import os
import shutil
import uuid

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from services.processor import analyze_pdf_with_vision
from services.memory import memory_engine
from database.sql.session import get_session
from database.sql.models import Belge

router = APIRouter()

UPLOAD_DIR = "./temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- 1. KÖPRÜ: ÖĞÜTME VE KARANTİNA ---
@router.post("/upload-and-analyze")
def upload_and_analyze(file: UploadFile = File(...), use_vision: bool = Form(False)):
    try:
        # 1. Dosyayı geçici klasöre kaydet (UUID ile benzersiz isim → çakışma olmaz)
        unique_prefix = str(uuid.uuid4())[:8]
        safe_filename = file.filename.replace(" ", "_")
        file_path = f"{UPLOAD_DIR}/{unique_prefix}_{safe_filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 2. Görme motoruna dosyayı ver
        #    NOT: original_name olarak asıl dosya adını geçiriyoruz.
        #    processor.py bunu source metadata olarak kullanır → frontend ile eşleşir.
        chunks = analyze_pdf_with_vision(
            file_path,
            use_vision=use_vision,
            original_name=safe_filename   # ← ChromaDB'deki source bu olacak
        )

        # 3. Sonucu React'e geri gönder
        return {
            "status": "success",
            "message": "Dosya başarıyla analiz edildi, onay bekliyor.",
            "file_name": safe_filename,   # ← Frontend bu ismi source olarak kullanır
            "temp_path": file_path,       # ← Arşivleme aşaması için tam yolu gönderiyoruz
            "total_chunks": len(chunks),
            "chunks": chunks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- 2. KÖPRÜ: HAFIZAYA KAZIMA ---
@router.post("/save-to-db")
def save_to_db(data: dict):
    file_name = data.get("file_name", "Bilinmeyen Dosya")
    chunks_to_save = data.get("chunks", [])
    collection_name = data.get("collection_name", "yilgenci_collection")
    
    if not chunks_to_save:
        raise HTTPException(status_code=400, detail="Kaydedilecek veri yok!")
    
    # Gerçek Vektör Motorunu çalıştır ve ChromaDB'ye yaz
    memory_engine.save_to_memory(chunks_to_save, collection_name=collection_name)
    
    return {"status": "success", "message": f"{file_name} kalıcı hafızaya eklendi!"}

# --- 3. KÖPRÜ: ARŞİVLEME VE SQL KAYDI ---
@router.post("/archive-document")
def archive_document(data: dict):
    temp_path = data.get("temp_path")
    final_name = data.get("final_name", "isim_yok")
    chunk_count = data.get("chunk_count", 0)
    chroma_collection = data.get("chroma_collection", "yilgenci_collection")
    
    if not temp_path or not os.path.exists(temp_path):
        raise HTTPException(status_code=400, detail="Geçici dosya bulunamadı.")
    
    ARCHIVE_DIR = "./archive_uploads"
    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    
    # Yeni eşsiz ad (çakışmaları önlemek için)
    archive_filename = f"{uuid.uuid4().hex[:8]}_{final_name}"
    archive_path = os.path.join(ARCHIVE_DIR, archive_filename)
    
    # Dosyayı taşı
    shutil.move(temp_path, archive_path)
    
    file_ext = final_name.split(".")[-1] if "." in final_name else "unknown"
    
    try:
        with get_session() as db:
            # Yeni Türkçe şemadaki Belge modeli kullanılıyor
            yeni_belge = Belge(
                dosya_adi=final_name,
                dosya_turu=file_ext,
                dosya_boyutu_bayt=os.path.getsize(archive_path),
                depolama_yolu=archive_path,
                parca_sayisi=chunk_count,
                vektordb_koleksiyon=chroma_collection,
                vektorlestirildi_mi=True,
                durum="onaylandi"
            )
            db.add(yeni_belge)
            db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Veritabanı kaydı hatası: {str(e)}")
        
    return {
        "status": "success", 
        "archive_path": archive_path,
        "message": "Dosya başarıyla arşive taşındı ve SQL veritabanına kaydedildi."
    }
