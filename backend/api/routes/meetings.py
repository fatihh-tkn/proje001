import json
import shutil
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select

from database.sql.session import get_session
from database.sql.models import Toplanti, ToplantiSegmenti, ToplantiOzeti

router = APIRouter()

ALLOWED_AUDIO = {".mp3", ".mp4", ".m4a", ".wav", ".ogg", ".webm", ".flac", ".aac"}
AUDIO_DIR = Path(__file__).parent.parent.parent / "database" / "meetings" / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)


# ──────────────────────────────────────────
# 1) Ses dosyası yükleme + kayıt başlatma
# ──────────────────────────────────────────
@router.post("/upload")
async def upload_meeting(file: UploadFile = File(...)):

    if not file.filename:
        raise HTTPException(400, "Dosya adı boş.")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_AUDIO:
        raise HTTPException(400, f"Desteklenmeyen format: {suffix}. İzinli: {', '.join(ALLOWED_AUDIO)}")

    # Kaydet
    safe_name = Path(file.filename).name
    dest = AUDIO_DIR / safe_name

    # Aynı isimde varsa numara ekle
    counter = 1
    while dest.exists():
        dest = AUDIO_DIR / f"{Path(file.filename).stem}_{counter}{suffix}"
        counter += 1

    content = await file.read()
    dest.write_bytes(content)

    # DB'ye toplantı kaydı ekle (SQLAlchemy PostgreSQL üzerinden)
    with get_session() as db:
        yeni_toplanti = Toplanti(
            baslik=Path(file.filename).stem,
            dosya_adi=dest.name,
            ses_yolu=str(dest),
            durum="processing"
        )
        db.add(yeni_toplanti)
        db.commit()
        db.refresh(yeni_toplanti)
        meeting_id = yeni_toplanti.kimlik

    # Asenkron transkripsiyon başlat (arka planda, stub — Whisper entegrasyonu sonraki adım)
    # asyncio.create_task(_transcribe(meeting_id, dest))

    return {
        "id": meeting_id,
        "title": Path(file.filename).stem,
        "filename": dest.name,
        "status": "processing",
        "message": "Yükleme başarılı. Transkripsiyon kuyruğa alındı."
    }


# ──────────────────────────────────────────
# 2) Tüm toplantıları listele
# ──────────────────────────────────────────
@router.get("/list")
def list_meetings():
    from database.sql.models import Belge
    
    AUDIO_TYPES = {"mp3", "wav", "ogg", "m4a", "flac", "aac"}
    VIDEO_TYPES = {"mp4", "avi", "mov", "webm"}
    SES_VIDEO_TYPES = AUDIO_TYPES | VIDEO_TYPES

    with get_session() as db:
        # 1) Toplantılar tablosundan kayıtlı olanlar
        toplantilar = db.scalars(
            select(Toplanti).order_by(Toplanti.olusturulma_tarihi.desc())
        ).all()
        
        results = [
            {
                "id": t.kimlik,
                "title": t.baslik,
                "filename": t.dosya_adi,
                "duration_s": t.sure_saniye,
                "status": t.durum,
                "created_at": t.olusturulma_tarihi,
                "source": "meetings"
            } for t in toplantilar
        ]
        
        # 2) belgeler tablosundaki ses/video dosyalarını da ekle
        #    (Toplantılar tablosunda henüz kayıt yoksa buradan beslenecek)
        belgeler = db.scalars(
            select(Belge)
            .where(Belge.dosya_turu.in_(list(SES_VIDEO_TYPES)))
            .order_by(Belge.olusturulma_tarihi.desc())
        ).all()
        
        # Belge ID setini oluştur (çakışma önleme)
        mevcut_dosyalar = {t.dosya_adi for t in toplantilar}
        
        for b in belgeler:
            if b.dosya_adi not in mevcut_dosyalar:
                meta = b.meta or {}
                results.append({
                    "id": b.kimlik,          # UUID string
                    "title": b.dosya_adi,
                    "filename": b.dosya_adi,
                    "duration_s": 0,
                    "status": meta.get("transcription_status") or b.durum or "done",
                    "created_at": b.olusturulma_tarihi,
                    "source": "archive"
                })
        
        return results


# ──────────────────────────────────────────
# 3) Tek toplantı + segmentler
# ──────────────────────────────────────────
@router.get("/{meeting_id}")
def get_meeting(meeting_id: int):
    with get_session() as db:
        toplanti = db.scalar(select(Toplanti).where(Toplanti.kimlik == meeting_id))
        
        if not toplanti:
            raise HTTPException(404, "Toplantı bulunamadı.")

        segments = db.scalars(
            select(ToplantiSegmenti)
            .where(ToplantiSegmenti.toplanti_kimlik == meeting_id)
            .order_by(ToplantiSegmenti.baslangic_ms)
        ).all()

        summary_row = db.scalar(select(ToplantiOzeti).where(ToplantiOzeti.toplanti_kimlik == meeting_id))

        return {
            "id": toplanti.kimlik,
            "title": toplanti.baslik,
            "filename": toplanti.dosya_adi,
            "duration_s": toplanti.sure_saniye,
            "status": toplanti.durum,
            "created_at": toplanti.olusturulma_tarihi,
            "segments": [
                {
                    "id": s.kimlik,
                    "speaker": s.konusmaci,
                    "start_ms": s.baslangic_ms,
                    "end_ms": s.bitis_ms,
                    "text": s.metin
                } for s in segments
            ],
            "summary": summary_row.ozet if summary_row else "",
            "action_items": summary_row.aksiyon_maddeleri if summary_row and summary_row.aksiyon_maddeleri else [],
            "keywords": summary_row.anahtar_kelimeler if summary_row and summary_row.anahtar_kelimeler else []
        }


# ──────────────────────────────────────────
# 4) Ses tabanlı silme
# ──────────────────────────────────────────
@router.delete("/{meeting_id}")
def delete_meeting(meeting_id: int):
    with get_session() as db:
        toplanti = db.scalar(select(Toplanti).where(Toplanti.kimlik == meeting_id))
        if not toplanti:
            raise HTTPException(404, "Bulunamadı.")

        import os
        if toplanti.ses_yolu and os.path.exists(toplanti.ses_yolu):
            try:
                os.remove(toplanti.ses_yolu)
            except Exception as e:
                print(f"Ses dosyası silinemedi: {e}")

        # Cascade sildiği için segmentler ve summary'ler de silinecek
        db.delete(toplanti)
        db.commit()

        return {"status": "ok", "message": "Toplantı (ve ses dosyası) silindi."}


# ──────────────────────────────────────────
# 5) Player için medya yayını
# ──────────────────────────────────────────
@router.get("/audio/{meeting_id}")
def stream_audio(meeting_id: int):
    with get_session() as db:
        toplanti = db.scalar(select(Toplanti).where(Toplanti.kimlik == meeting_id))
        if not toplanti:
            raise HTTPException(404, "Kayıt yok.")
            
        return FileResponse(toplanti.ses_yolu, media_type="audio/mpeg")
