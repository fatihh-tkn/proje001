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
import os
import tempfile
import shutil


IMAGE_EXTS = {"png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff"}


def parse_teknik(file_path: str, original_name: str | None = None) -> list[dict]:
    """Teknik resim kategorisindeki dosyayı vision ile işler. Sadece görsel ve PDF desteklenir."""
    basename = original_name or os.path.basename(file_path)
    ext = basename.rsplit(".", 1)[-1].lower() if "." in basename else ""

    if ext in IMAGE_EXTS:
        from services.processors.image_processor import parse_image
        return parse_image(file_path, original_name=original_name)

    if ext == "pdf":
        tmp_dir = tempfile.mkdtemp()
        try:
            img_path = _pdf_first_page_to_png(file_path, tmp_dir)
            if img_path:
                from services.processors.image_processor import parse_image
                chunks = parse_image(img_path, original_name=original_name)
                for c in chunks:
                    c["metadata"]["source"] = basename
                    c["metadata"]["original_ext"] = "pdf"
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


def _pdf_first_page_to_png(pdf_path: str, out_dir: str) -> str | None:
    """PDF'in ilk sayfasını 200 DPI PNG olarak kaydeder. Başarısızsa None."""
    out_path = os.path.join(out_dir, "page_0.png")

    # PyMuPDF (fitz) — önce dene
    try:
        import fitz  # type: ignore
        doc = fitz.open(pdf_path)
        if not len(doc):
            doc.close()
            return None
        page = doc[0]
        mat = fitz.Matrix(200 / 72, 200 / 72)  # 200 DPI
        pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
        pix.save(out_path)
        doc.close()
        return out_path
    except Exception:
        pass

    # pdf2image — fallback
    try:
        from pdf2image import convert_from_path  # type: ignore
        images = convert_from_path(pdf_path, first_page=1, last_page=1, dpi=200)
        if images:
            images[0].save(out_path, "PNG")
            return out_path
    except Exception:
        pass

    return None
