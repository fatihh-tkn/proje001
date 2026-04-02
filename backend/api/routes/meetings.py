import json
import shutil
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

from database.meetings.init_meetings_db import init_meetings_db, get_meetings_db, AUDIO_DIR, MEETINGS_DB_PATH

router = APIRouter()

ALLOWED_AUDIO = {".mp3", ".mp4", ".m4a", ".wav", ".ogg", ".webm", ".flac", ".aac"}


def _ensure_db():
    """meetings.db yoksa otomatik kur."""
    if not MEETINGS_DB_PATH.exists():
        init_meetings_db()


# ──────────────────────────────────────────
# 1) Ses dosyası yükleme + kayıt başlatma
# ──────────────────────────────────────────
@router.post("/upload")
async def upload_meeting(file: UploadFile = File(...)):
    _ensure_db()

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

    # DB'ye toplantı kaydı ekle
    conn = get_meetings_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO meetings (title, filename, audio_path, status) VALUES (?, ?, ?, 'processing')",
        (Path(file.filename).stem, dest.name, str(dest))
    )
    meeting_id = cur.lastrowid
    conn.commit()
    conn.close()

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
    _ensure_db()
    conn = get_meetings_db()
    cur = conn.cursor()
    rows = cur.execute(
        "SELECT id, title, filename, duration_s, status, created_at FROM meetings ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ──────────────────────────────────────────
# 3) Tek toplantı + segmentler
# ──────────────────────────────────────────
@router.get("/{meeting_id}")
def get_meeting(meeting_id: int):
    _ensure_db()
    conn = get_meetings_db()
    cur = conn.cursor()

    meeting = cur.execute("SELECT * FROM meetings WHERE id=?", (meeting_id,)).fetchone()
    if not meeting:
        conn.close()
        raise HTTPException(404, "Toplantı bulunamadı.")

    segments = cur.execute(
        "SELECT * FROM meeting_segments WHERE meeting_id=? ORDER BY start_ms", (meeting_id,)
    ).fetchall()

    summary_row = cur.execute(
        "SELECT * FROM meeting_summaries WHERE meeting_id=?", (meeting_id,)
    ).fetchone()

    conn.close()

    summary = None
    if summary_row:
        summary = dict(summary_row)
        summary["action_items"] = json.loads(summary.get("action_items") or "[]")
        summary["keywords"] = json.loads(summary.get("keywords") or "[]")

    return {
        "meeting": dict(meeting),
        "segments": [dict(s) for s in segments],
        "summary": summary
    }


# ──────────────────────────────────────────
# 4) Toplantı sil (ses + kayıt)
# ──────────────────────────────────────────
@router.delete("/{meeting_id}")
def delete_meeting(meeting_id: int):
    _ensure_db()
    conn = get_meetings_db()
    cur = conn.cursor()

    row = cur.execute("SELECT audio_path FROM meetings WHERE id=?", (meeting_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Toplantı bulunamadı.")

    # Ses dosyasını sil
    audio_path = Path(row["audio_path"])
    if audio_path.exists():
        audio_path.unlink()

    cur.execute("DELETE FROM meetings WHERE id=?", (meeting_id,))
    conn.commit()
    conn.close()

    return {"message": "Toplantı ve ses dosyası silindi."}


# ──────────────────────────────────────────
# 5) Ses dosyasını stream et
# ──────────────────────────────────────────
@router.get("/{meeting_id}/audio")
def stream_audio(meeting_id: int):
    _ensure_db()
    conn = get_meetings_db()
    row = conn.execute("SELECT audio_path, filename FROM meetings WHERE id=?", (meeting_id,)).fetchone()
    conn.close()

    if not row:
        raise HTTPException(404, "Toplantı bulunamadı.")

    path = Path(row["audio_path"])
    if not path.exists():
        raise HTTPException(404, "Ses dosyası bulunamadı.")

    return FileResponse(path, media_type="audio/mpeg", filename=row["filename"])
