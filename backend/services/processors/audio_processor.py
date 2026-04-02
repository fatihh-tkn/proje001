"""
services/processors/audio_processor.py
────────────────────────────────────────────────────────────────────
Ses ve Video dosyaları için faster-whisper (Whisper V3) tabanlı
transkripsiyon motoru.

Desteklenen ses uzantıları : mp3, wav, ogg, m4a, flac, aac, opus
Desteklenen video uzantıları: mp4, avi, mov, mkv, webm

Video dosyaları için:
  - Orijinal video DOKUNULMAZ (arşivde saklanır)
  - Sadece ses kanalı ffmpeg ile geçici olarak ayıklanır
  - Whisper ses kanalını transkripte çevirir
  - Geçici ses dosyası temizlenir

Çıktı: dispatch() protokolüyle uyumlu chunk listesi
  [{
      "id":       <uuid>,
      "text":     <transkripsiyon metni>,
      "metadata": {
          "source":         <dosya adı>,
          "type":           "audio_transcript",
          "segment_index":  <int>,
          "start_time":     <float, saniye>,
          "end_time":       <float, saniye>,
          "start_time_fmt": "HH:MM:SS",
          "end_time_fmt":   "HH:MM:SS",
          "language":       <otomatik algılanan dil>,
          "confidence":     <float, 0-1>,
          "is_video":       <bool>,
          "page":           0,
          "chunk_index":    <int>,
      }
  }]
"""

from __future__ import annotations

import os
import uuid
import logging
import subprocess
import tempfile
import shutil
from pathlib import Path

logger = logging.getLogger("audio_processor")

# ── Desteklenen uzantılar ──────────────────────────────────────────
AUDIO_EXTS = {"mp3", "wav", "ogg", "m4a", "flac", "aac", "opus", "wma"}
VIDEO_EXTS = {"mp4", "avi", "mov", "mkv", "webm", "m4v", "wmv"}

# ── Chunk sabitleri ────────────────────────────────────────────────
MIN_WORDS_PER_CHUNK = 15   # Bu kelimeden az segment → bir sonrakiyle birleştir
MAX_WORDS_PER_CHUNK = 400  # Bu kelimeden fazla segment → ikiye böl
TARGET_WORDS        = 200  # İdeal chunk boyutu

# ── Model önbellek dizini ──────────────────────────────────────────
WHISPER_MODEL  = os.getenv("WHISPER_MODEL", "large-v3")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cuda")      # Varsayılan CUDA (GPU)
WHISPER_COMPUTE = os.getenv("WHISPER_COMPUTE", "float16") # GPU için optimize


def _fmt_seconds(seconds: float) -> str:
    """Saniyeyi HH:MM:SS formatına çevirir."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def _get_ffmpeg_path() -> str:
    """Sistemdeki veya WinGet kurulumundaki ffmpeg yolunu garantili döndürür."""
    if shutil.which("ffmpeg"):
        return "ffmpeg"
    # Windows WinGet varsayılan kurulum yolu yedeği (fallback)
    fallback = os.path.expanduser(r"~\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin\ffmpeg.exe")
    if os.path.exists(fallback):
        return fallback
    return "ffmpeg"


def _extract_audio_from_video(video_path: str) -> str:
    """
    Video dosyasından ses kanalını WAV formatında geçici dosyaya çıkarır.
    ffmpeg PATH'te olmalı.
    Döner: geçici ses dosyasının yolu (çağıran silmelidir).
    """
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp_path = tmp.name
    tmp.close()

    ffmpeg_exe = _get_ffmpeg_path()

    cmd = [
        ffmpeg_exe,
        "-y",              # üzerine yaz
        "-i", video_path,  # giriş
        "-vn",             # video kanalını atla
        "-acodec", "pcm_s16le",  # WAV codec
        "-ar", "16000",    # 16kHz örnekleme (Whisper standardı)
        "-ac", "1",        # mono
        tmp_path,
    ]

    logger.info("Video ses ayıklama başlıyor: %s", video_path)
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        shell=True,
    )

    if result.returncode != 0:
        # ffmpeg yoksa veya hata varsa
        raise RuntimeError(
            f"ffmpeg ses ayıklama hatası (returncode={result.returncode}):\n"
            f"{result.stderr[-500:]}"
        )

    logger.info("Ses ayıklandı: %s (%d bytes)", tmp_path, os.path.getsize(tmp_path))
    return tmp_path


def _get_whisper_model():
    """
    faster-whisper modelini yükler (singleton — tekrar çağrılınca önbellekten döner).
    """
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise ImportError(
            "faster-whisper paketi bulunamadı. "
            "Kurmak için: pip install faster-whisper"
        )

    cache_dir = os.getenv("WHISPER_CACHE_DIR", None)

    logger.info(
        "Whisper modeli yüklenme denemesi: model=%s device=%s compute=%s",
        WHISPER_MODEL, WHISPER_DEVICE, WHISPER_COMPUTE,
    )

    try:
        model = WhisperModel(
            WHISPER_MODEL,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE,
            download_root=cache_dir,
        )
    except Exception as e:
        logger.warning(f"Cihaz ({WHISPER_DEVICE}) ile başlatılamadı. Hata: {str(e)[:150]}")
        logger.warning("Güvenlik önlemi (Fallback) devrede: CPU moduna geçiliyor.")
        model = WhisperModel(
            WHISPER_MODEL,
            device="cpu",
            compute_type="int8",
            download_root=cache_dir,
        )

    return model


def _merge_segments(segments: list[dict]) -> list[dict]:
    """
    Çok kısa segmentleri komşularıyla birleştirir,
    çok uzun segmentleri böler.
    Döner: optimize edilmiş segment listesi.
    """
    if not segments:
        return []

    merged = []
    buffer = None

    for seg in segments:
        words = seg["text"].split()
        if buffer is None:
            buffer = seg.copy()
        else:
            buf_words = buffer["text"].split()
            # Yetersiz kelime → birleştir
            if len(buf_words) < MIN_WORDS_PER_CHUNK:
                buffer["text"] += " " + seg["text"]
                buffer["end"]   = seg["end"]
            # Yeterli doluluk → kaydet, yeni başla
            else:
                merged.append(buffer)
                buffer = seg.copy()

    if buffer:
        merged.append(buffer)

    # Aşırı uzun segmentleri böl
    result = []
    for seg in merged:
        words = seg["text"].split()
        if len(words) <= MAX_WORDS_PER_CHUNK:
            result.append(seg)
        else:
            # Kelime bazlı bölme
            duration = seg["end"] - seg["start"]
            total_words = len(words)
            chunks_needed = (total_words + TARGET_WORDS - 1) // TARGET_WORDS
            per_chunk = total_words // chunks_needed
            for i in range(chunks_needed):
                chunk_words = words[i * per_chunk: (i + 1) * per_chunk]
                frac_start = (i * per_chunk) / total_words
                frac_end   = ((i + 1) * per_chunk) / total_words
                result.append({
                    "text":  " ".join(chunk_words),
                    "start": seg["start"] + frac_start * duration,
                    "end":   seg["start"] + frac_end   * duration,
                })

    return result


def parse_audio(
    file_path: str,
    original_name: str | None = None,
) -> list[dict]:
    """
    Ana giriş noktası. dispatch() tarafından çağrılır.

    Ses + Video dosyaları için çalışır:
      - Video → önce ses ayıkla, sonra transkripsiyon yap
      - Ses   → direkt transkripsiyon

    Döner: dispatch protokolüne uygun chunk listesi.
    """
    basename = original_name or os.path.basename(file_path)
    ext = Path(file_path).suffix.lstrip(".").lower()
    is_video = ext in VIDEO_EXTS

    audio_path   = file_path  # varsayılan: ses dosyası
    temp_audio   = None       # video'dan ayıklanan geçici ses

    try:
        # 1. Video ise ses kanalını ayıkla
        if is_video:
            logger.info("Video dosyası algılandı, ses ayıklama başlıyor...")
            try:
                temp_audio = _extract_audio_from_video(file_path)
                audio_path = temp_audio
            except RuntimeError as e:
                # ffmpeg yoksa → hata chunk döndür
                logger.error("ffmpeg hatası: %s", e)
                return [{
                    "id":   f"ffmpeg-error-{uuid.uuid4()}",
                    "text": (
                        f"[{basename}] Video dosyasından ses ayıklanamadı. "
                        f"Sunucuda ffmpeg yüklü olup olmadığını kontrol edin. "
                        f"Hata: {str(e)[:200]}"
                    ),
                    "metadata": {
                        "source": basename,
                        "type":   "error",
                        "ext":    ext,
                        "error":  "ffmpeg_not_found",
                        "page":   0,
                    }
                }]

        # 2. Whisper modelini yükle
        try:
            model = _get_whisper_model()
        except ImportError as e:
            logger.error("faster-whisper eksik: %s", e)
            return [{
                "id":   f"import-error-{uuid.uuid4()}",
                "text": (
                    f"[{basename}] Transkripsiyon modülü yüklü değil. "
                    f"Yüklemek için: pip install faster-whisper"
                ),
                "metadata": {
                    "source": basename,
                    "type":   "error",
                    "ext":    ext,
                    "error":  "faster_whisper_not_installed",
                    "page":   0,
                }
            }]

        # 3. Transkripsiyon
        logger.info("Whisper transkripsiyon başlıyor: %s", audio_path)
        segments_gen, info = model.transcribe(
            audio_path,
            beam_size=5,
            language=None,        # Otomatik dil algılama
            word_timestamps=True, # Kelime bazlı zaman damgaları
            vad_filter=True,      # Sessiz kısımları atla
            vad_parameters={
                "min_silence_duration_ms": 500,
            },
        )

        detected_lang = info.language
        lang_prob     = round(info.language_probability, 3)
        logger.info(
            "Dil algılandı: %s (olasılık: %.2f%%)",
            detected_lang.upper(), lang_prob * 100
        )

        # Generator'ı listeye dönüştür
        raw_segments = []
        for seg in segments_gen:
            raw_segments.append({
                "text":  seg.text.strip(),
                "start": seg.start,
                "end":   seg.end,
            })

        if not raw_segments:
            logger.warning("Transkripsiyon boş döndü: %s", basename)
            return [{
                "id":   f"empty-transcript-{uuid.uuid4()}",
                "text": f"[{basename}] Dosyada konuşma bulunamadı veya ses çok sessiz.",
                "metadata": {
                    "source":   basename,
                    "type":     "audio_transcript",
                    "language": detected_lang,
                    "is_video": is_video,
                    "page":     0,
                }
            }]

        # 4. Segmentleri optimize et (birleştir / böl)
        optimized = _merge_segments(raw_segments)

        # 5. Chunk listesi oluştur
        chunks = []
        for idx, seg in enumerate(optimized):
            chunk_id = str(uuid.uuid4())
            start    = seg["start"]
            end      = seg["end"]

            chunks.append({
                "id":   chunk_id,
                "text": seg["text"],
                "metadata": {
                    "source":          basename,
                    "type":            "audio_transcript",
                    "segment_index":   idx,
                    "start_time":      round(start, 2),
                    "end_time":        round(end, 2),
                    "start_time_fmt":  _fmt_seconds(start),
                    "end_time_fmt":    _fmt_seconds(end),
                    "language":        detected_lang,
                    "lang_probability": lang_prob,
                    "is_video":        is_video,
                    "is_searchable":   True,
                    "page":            0,
                    "chunk_index":     idx,
                }
            })

        logger.info(
            "Transkripsiyon tamamlandı: %s | %d segment | dil: %s",
            basename, len(chunks), detected_lang.upper()
        )
        return chunks

    finally:
        # Geçici ses dosyasını temizle (video'dan ayıklandıysa)
        if temp_audio and os.path.exists(temp_audio):
            try:
                os.remove(temp_audio)
                logger.debug("Geçici ses dosyası silindi: %s", temp_audio)
            except Exception as e:
                logger.warning("Geçici ses silinemedi: %s", e)
