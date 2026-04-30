"""
services/processors/
────────────────────────────────────────────────────────────────────
Dosya türüne göre özel chunk üretici modüller.
Her format kendi bağımsız dosyasında yaşar:

  pdf   → (services/processor.py)         — PDF / PPT→PDF slaytlar
  bpmn  → (services/bpmn_processor.py)    — BPMN iş akışı diyagramları
  image → processors/image_processor.py   — PNG / JPG / JPEG
  excel → processors/excel_processor.py   — XLSX / XLS / CSV
  text  → processors/text_processor.py    — TXT / MD / DOCX

Bridge'den dispatch için:
  from services.processors import dispatch
  chunks = dispatch(file_path, ext, use_vision, original_name)
"""

import os
import uuid


def dispatch(
    file_path: str,
    ext: str,
    use_vision: bool = False,
    original_name: str | None = None,
    task_id: str | None = None,
    whisper_model: str = "large-v3",
    whisper_device: str = "cuda"
) -> list[dict]:
    """
    Dosya uzantısına göre doğru parser'ı seçer ve chunk listesi döner.
    İçsel parser hataları yakalanır; boş liste yerine hata chunk'ı döner.
    """
    ext = ext.lower().lstrip(".")
    basename = original_name or os.path.basename(file_path)

    def _err_chunk(msg: str) -> list[dict]:
        return [{
            "id": f"error-{uuid.uuid4()}",
            "text": msg,
            "metadata": {"source": basename, "type": "error", "page": 0},
        }]

    try:
        if ext == "bpmn":
            from services.bpmn_processor import parse_bpmn
            return parse_bpmn(file_path, original_name=original_name)

        if ext in ("pdf",):
            from services.processor import analyze_pdf_with_vision
            return analyze_pdf_with_vision(file_path, use_vision=use_vision, original_name=original_name)

        if ext in ("pptx", "ppt"):
            from services.processors.pptx_processor import parse_pptx
            return parse_pptx(file_path, original_name=original_name, use_vision=use_vision)

        if ext in ("png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff"):
            from services.processors.image_processor import parse_image
            return parse_image(file_path, original_name=original_name)

        if ext in ("xlsx", "xls", "csv"):
            return [{
                "id":   f"archive-only-{uuid.uuid4()}",
                "text": (
                    f"[ARŞİV] {basename} dosyası yapay zeka ile işlenmemiştir. "
                    f"Bu dosya ({ext.upper()}) yalnızca görüntüleme ve arşivleme amacıyla kaydedilmiştir. "
                    f"İçeriği hakkında soru soramazsınız, ancak dosyayı arşivden açarak tabloları inceleyebilirsiniz."
                ),
                "metadata": {
                    "source":        basename,
                    "type":          "archive_only",
                    "ext":           ext,
                    "is_searchable": False,
                    "page":          0,
                    "chunk_index":   0,
                }
            }]

        if ext in ("txt", "md", "docx", "doc"):
            from services.processors.text_processor import parse_text
            return parse_text(file_path, original_name=original_name)

        if ext in ("mp3", "wav", "ogg", "m4a", "flac", "aac", "opus", "wma",
                   "mp4", "avi", "mov", "mkv", "webm", "m4v", "wmv"):
            from services.processors.audio_processor import parse_audio
            res = parse_audio(file_path, original_name=original_name, task_id=task_id,
                              model_name=whisper_model, whisper_device=whisper_device)
            if isinstance(res, dict):
                chunks_out = res.get("chunks", [])
            elif isinstance(res, list):
                chunks_out = res
            else:
                chunks_out = []
            if not chunks_out:
                chunks_out = _err_chunk(f"[{basename}] Ses/video dosyasından içerik çıkarılamadı.")
            return chunks_out

    except Exception as parser_err:
        import logging as _log
        _log.getLogger("dispatch").error(
            "Parser hatası [%s / .%s]: %s", basename, ext, parser_err, exc_info=True
        )
        return _err_chunk(f"[{basename}] Dosya işlenirken hata: {parser_err}")

    # Bilinmeyen format
    basename = original_name or os.path.basename(file_path)
    return [{
        "id":   f"unsupported-{uuid.uuid4()}",
        "text": f"[{basename}] Bu dosya türü ({ext}) henüz desteklenmiyor.",
        "metadata": {"source": basename, "type": "unsupported", "ext": ext}
    }]
