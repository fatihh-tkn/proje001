"""
processors/teknik_processor.py
────────────────────────────────────────────────────────────────────
Teknik resim kategorisi için unified processor.

Format → vision zinciri:
  PNG/JPG/...  → doğrudan image_processor.parse_image
  PDF          → ilk sayfa PNG render → image_processor.parse_image
  DXF/DWG      → (gelecek) ezdxf → render → vision
  diğer        → standart dispatch'e düşer
"""

from __future__ import annotations
import os
import tempfile
import shutil


IMAGE_EXTS = {"png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff"}
DWG_EXTS   = {"dwg", "dxf"}
STP_EXTS   = {"stp", "step", "awg"}  # AWG = AutoNest → STEP/ISO-10303 formatı


def _is_step_file(file_path: str) -> bool:
    """Dosyanın ilk byte'larını okuyarak gerçekten STEP (ISO-10303) olup olmadığını kontrol eder."""
    try:
        with open(file_path, "rb") as f:
            header = f.read(16)
        return header.startswith(b"ISO-10303-")
    except Exception:
        return False


def parse_teknik(file_path: str, original_name: str | None = None) -> list[dict]:
    """Teknik resim kategorisindeki herhangi bir formattaki dosyayı vision ile işler."""
    basename = original_name or os.path.basename(file_path)
    ext = basename.rsplit(".", 1)[-1].lower() if "." in basename else ""

    if ext in STP_EXTS:
        from services.processors.stp_processor import parse_stp
        return parse_stp(file_path, original_name=original_name)

    if ext in DWG_EXTS:
        # Bazı dosyalar .dwg uzantılı ama aslında STEP (ISO-10303) içeriyor
        if _is_step_file(file_path):
            from services.processors.stp_processor import parse_stp
            return parse_stp(file_path, original_name=original_name)
        from services.processors.dwg_processor import parse_dwg
        return parse_dwg(file_path, original_name=original_name)

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

    # Diğer formatlar standart dispatch'e
    from services.processors import dispatch as _dispatch
    chunks, _ = _dispatch(file_path, ext, original_name=original_name)
    return chunks


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
