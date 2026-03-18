import os
import shutil
import uuid

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from services.processor import analyze_pdf_with_vision
from services.memory import memory_engine

router = APIRouter()

UPLOAD_DIR = "./temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- 1. KÖPRÜ: ÖĞÜTME VE KARANTİNA ---
@router.post("/upload-and-analyze")
async def upload_and_analyze(file: UploadFile = File(...), use_vision: bool = Form(False)):
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
            "total_chunks": len(chunks),
            "chunks": chunks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- 2. KÖPRÜ: HAFIZAYA KAZIMA ---
@router.post("/save-to-db")
async def save_to_db(data: dict):
    file_name = data.get("file_name", "Bilinmeyen Dosya")
    chunks_to_save = data.get("chunks", [])
    collection_name = data.get("collection_name", "yilgenci_collection")
    
    if not chunks_to_save:
        raise HTTPException(status_code=400, detail="Kaydedilecek veri yok!")
    
    # Gerçek Vektör Motorunu çalıştır ve ChromaDB'ye yaz
    memory_engine.save_to_memory(chunks_to_save, collection_name=collection_name)
    
    return {"status": "success", "message": f"{file_name} kalıcı hafızaya eklendi!"}
