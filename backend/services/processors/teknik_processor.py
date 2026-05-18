"""
processors/teknik_processor.py
────────────────────────────────────────────────────────────────────
Teknik resim kategorisi için unified processor.

Format → vision zinciri:
  PNG/JPG/...  → doğrudan image_processor.parse_image
  PDF          → ilk sayfa PNG render → image_processor.parse_image
  diğer        → standart dispatch'e düşer
"""

from __future__ import annotations
import json
import os
import tempfile
import shutil


IMAGE_EXTS = {"png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff"}


def _get_pipeline_settings() -> dict:
    """DB'den pipeline ayarlarını okur. Hata durumunda varsayılanları döner."""
    defaults = {"output_folder": "", "watch_folder": "", "parallel_workers": 2, "pdf_dpi": 200}
    try:
        from database.sql.session import get_session
        from database.sql.models import SistemAyari
        from sqlalchemy import select
        with get_session() as db:
            rows = {r.anahtar: r.deger for r in db.scalars(
                select(SistemAyari).where(SistemAyari.anahtar.in_([
                    "doc_output_folder", "doc_watch_folder",
                    "doc_parallel_workers", "doc_pdf_dpi",
                ]))
            ).all()}
        return {
            "output_folder":    rows.get("doc_output_folder") or "",
            "watch_folder":     rows.get("doc_watch_folder") or "",
            "parallel_workers": int(rows.get("doc_parallel_workers") or 2),
            "pdf_dpi":          int(rows.get("doc_pdf_dpi") or 200),
        }
    except Exception:
        return defaults


def _save_to_output_folder(chunks: list[dict], original_name: str, output_folder: str) -> None:
    """vision_data içeren chunk'ı, belirtilen klasöre <dosyaadi>_analiz.json olarak kaydeder."""
    if not output_folder:
        return
    try:
        if not os.path.isdir(output_folder):
            os.makedirs(output_folder, exist_ok=True)
        for chunk in chunks:
            vision_data = chunk.get("metadata", {}).get("vision_data")
            if vision_data:
                stem = os.path.splitext(original_name or "output")[0]
                out_path = os.path.join(output_folder, f"{stem}_analiz.json")
                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump(vision_data, f, ensure_ascii=False, indent=2)
                break
    except Exception:
        pass


def parse_teknik(file_path: str, original_name: str | None = None) -> list[dict]:
    """Teknik resim kategorisindeki dosyayı vision ile işler. Sadece görsel ve PDF desteklenir."""
    basename = original_name or os.path.basename(file_path)
    ext = basename.rsplit(".", 1)[-1].lower() if "." in basename else ""

    pipeline = _get_pipeline_settings()
    output_folder = pipeline["output_folder"]
    pdf_dpi = pipeline["pdf_dpi"]

    if ext in IMAGE_EXTS:
        from services.processors.image_processor import parse_image
        chunks = parse_image(file_path, original_name=original_name)
        _save_to_output_folder(chunks, basename, output_folder)
        return chunks

    if ext == "pdf":
        tmp_dir = tempfile.mkdtemp()
        try:
            img_path = _pdf_first_page_to_png(file_path, tmp_dir, dpi=pdf_dpi)
            if img_path:
                from services.processors.image_processor import parse_image
                chunks = parse_image(img_path, original_name=original_name)
                for c in chunks:
                    c["metadata"]["source"] = basename
                    c["metadata"]["original_ext"] = "pdf"
                _save_to_output_folder(chunks, basename, output_folder)
                return chunks
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

        # Fallback: düz metin PDF işleme
        from services.processor import analyze_pdf_with_vision
        chunks, _ = analyze_pdf_with_vision(file_path, use_vision=False, original_name=original_name)
        return chunks

    # Desteklenmeyen format
    import uuid
    return [{
        "id": str(uuid.uuid4()),
        "text": f"[{basename}]\nDesteklenmeyen format: {ext}. Teknik resim olarak PNG, JPEG veya PDF yükleyin.",
        "metadata": {
            "page": 1, "chunk_index": 1,
            "source": basename, "type": "unsupported",
            "total_pages": 1,
        },
    }]


def _pdf_first_page_to_png(pdf_path: str, out_dir: str, dpi: int = 200) -> str | None:
    """PDF'in ilk sayfasını belirtilen DPI'da PNG olarak kaydeder. Başarısızsa None."""
    out_path = os.path.join(out_dir, "page_0.png")

    # PyMuPDF (fitz) — önce dene
    try:
        import fitz  # type: ignore
        doc = fitz.open(pdf_path)
        if not len(doc):
            doc.close()
            return None
        page = doc[0]
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
        pix.save(out_path)
        doc.close()
        return out_path
    except Exception:
        pass

    # pdf2image — fallback
    try:
        from pdf2image import convert_from_path  # type: ignore
        images = convert_from_path(pdf_path, first_page=1, last_page=1, dpi=dpi)
        if images:
            images[0].save(out_path, "PNG")
            return out_path
    except Exception:
        pass

    return None
