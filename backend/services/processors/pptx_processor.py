"""
processors/pptx_processor.py
────────────────────────────────────────────────────────────────────
PPTX (PowerPoint) → RAG chunk üretici.

PDF'e çevirmeden DOĞRUDAN PPTX okuma:
  - Her slayt = 1 chunk
  - Başlık: Placeholder TITLE şekli (kesin tespit)
  - Gövde: Tüm metin şekilleri Y+sol koordinata göre sıralı
  - Notlar: Her slayttaki konuşmacı notları eklenir
  - Tablolar: Yapılandırılmış hücre metni
  - Özet: Tüm slayt başlıklarından içindekiler listesi
────────────────────────────────────────────────────────────────────
"""

import os
import uuid


# Chunk boyutu (çok uzun slayt için bölme, genelde gerekmez)
_CHUNK_SIZE = 3000
_MIN_TEXT   = 20   # Bu karakterden kısaysa slaytı atla


def parse_pptx(
    file_path: str,
    original_name: str | None = None,
) -> list[dict]:
    """
    PPTX dosyasını parse edip chunk listesi döner.
    Her slayt ayrı bir chunk olarak üretilir.
    """
    file_basename = original_name or os.path.basename(file_path)
    chunks: list[dict] = []

    try:
        from pptx import Presentation
        from pptx.util import Pt
        from pptx.enum.text import PP_ALIGN
        import pptx.enum.shapes as shape_types
    except ImportError:
        return [{
            "id":   f"error-{uuid.uuid4()}",
            "text": (
                f"[{file_basename}] python-pptx kurulu değil. "
                "Yüklemek için: pip install python-pptx"
            ),
            "metadata": {"source": file_basename, "error": "python-pptx missing"}
        }]

    try:
        prs         = Presentation(file_path)
        total_slides = len(prs.slides)
    except Exception as e:
        return [{
            "id":   f"error-{uuid.uuid4()}",
            "text": f"[{file_basename}] PPTX okunamadı: {e}",
            "metadata": {"source": file_basename, "error": str(e)}
        }]

    slide_titles: list[str] = []

    # ── Her slaytı işle ───────────────────────────────────────────────
    for slide_idx, slide in enumerate(prs.slides):
        title       = _get_title(slide)
        body_parts  = _get_body_texts(slide)
        table_texts = _get_table_texts(slide)
        notes_text  = _get_notes(slide)

        slide_titles.append(title or f"Slayt {slide_idx + 1}")

        # ── Chunk metni oluştur ───────────────────────────────────────
        header = f"[{file_basename} | Slayt {slide_idx+1}/{total_slides}]"
        lines  = [header]

        if title:
            lines.append(f"BAŞLIK: {title}")

        if body_parts:
            lines.append("\nİÇERİK:\n" + "\n".join(body_parts))

        if table_texts:
            lines.append("\nTABLO:\n" + "\n".join(table_texts))

        if notes_text:
            lines.append(f"\nKONUŞMACJ NOTLARI:\n{notes_text}")

        full_text = "\n".join(lines)

        # Çok kısa slaytları atla (sadece başlık bile olsa kaydet)
        if len(full_text.strip()) < _MIN_TEXT and not title:
            continue

        # Çok uzun slayt → böl (nadir durum)
        if len(full_text) > _CHUNK_SIZE:
            body_combined = "\n".join(body_parts) if body_parts else ""
            sub_chunks    = _split(body_combined)
            for idx, sub in enumerate(sub_chunks):
                t = f"{header}\nBAŞLIK: {title}\n\n{sub}"
                chunks.append(_make_chunk(t, slide_idx, idx + 1, file_basename, total_slides))
        else:
            chunks.append(_make_chunk(full_text, slide_idx, 1, file_basename, total_slides))

    # ── Özet chunk: içindekiler ───────────────────────────────────────
    non_empty = [f"  {i+1}. {t}" for i, t in enumerate(slide_titles) if t.strip()]
    if non_empty:
        summary = (
            f"SUNUM: {file_basename}\n"
            f"TOPLAM SLAYT: {total_slides}\n\n"
            "── SLAYT BAŞLIKLARI (İÇİNDEKİLER) ──\n"
            + "\n".join(non_empty)
        )
        chunks.insert(0, {
            "id":   str(uuid.uuid4()),
            "text": summary,
            "metadata": {
                "page":        0,
                "chunk_index": 0,
                "source":      file_basename,
                "type":        "pptx_summary",
                "total_pages": total_slides,
            }
        })

    if not chunks:
        chunks.append({
            "id":   f"empty-{uuid.uuid4()}",
            "text": f"[{file_basename}] Slayt içeriği bulunamadı.",
            "metadata": {"source": file_basename}
        })

    return chunks


# ── Yardımcı fonksiyonlar ────────────────────────────────────────────

def _get_title(slide) -> str:
    """Slayttaki Placeholder TITLE şeklinden başlığı çeker."""
    from pptx.util import Inches
    try:
        from pptx.enum.text import PP_ALIGN
    except ImportError:
        pass

    # Önce placeholder'lar arasında TITLE ara
    for ph in slide.placeholders:
        if ph.placeholder_format.idx == 0:  # idx=0 her zaman başlık
            if ph.has_text_frame:
                text = ph.text_frame.text.strip()
                if text:
                    return text

    # Bulamazsa en büyük font'u olan şekli başlık say
    max_size = 0
    best_text = ""
    for shape in slide.shapes:
        if shape.has_text_frame:
            for para in shape.text_frame.paragraphs:
                for run in para.runs:
                    size = run.font.size or 0
                    text = run.text.strip()
                    if size > max_size and text:
                        max_size = size
                        best_text = text

    return best_text


def _get_body_texts(slide) -> list[str]:
    """
    Tüm metin şekillerini (başlık hariç) toplar,
    slayttaki pozisyona göre (top + left) sıralar.
    """
    shapes_with_pos = []
    title_shape_id  = None

    # Başlık shape'ini bul (atlamak için)
    for ph in slide.placeholders:
        if ph.placeholder_format.idx == 0:
            title_shape_id = ph.shape_id
            break

    for shape in slide.shapes:
        if shape.shape_id == title_shape_id:
            continue
        if not shape.has_text_frame:
            continue
        text = shape.text_frame.text.strip()
        if not text:
            continue
        top  = shape.top  or 0
        left = shape.left or 0
        shapes_with_pos.append((top, left, text))

    shapes_with_pos.sort(key=lambda x: (x[0], x[1]))
    return [text for _, _, text in shapes_with_pos]


def _get_table_texts(slide) -> list[str]:
    """Slayttaki tabloları satır satır düz metne çevirir."""
    rows = []
    for shape in slide.shapes:
        if shape.has_table:
            for row in shape.table.rows:
                cells = [cell.text.strip() for cell in row.cells]
                rows.append(" | ".join(c for c in cells if c))
    return rows


def _get_notes(slide) -> str:
    """Slayttaki konuşmacı notlarını çeker."""
    try:
        notes_slide = slide.notes_slide
        tf          = notes_slide.notes_text_frame
        if tf:
            text = tf.text.strip()
            # İlk satır genellikle slayt adıdır, atla
            lines = [l for l in text.splitlines() if l.strip()]
            return "\n".join(lines) if lines else ""
    except Exception:
        pass
    return ""


def _make_chunk(text: str, slide_idx: int, chunk_idx: int, source: str, total: int) -> dict:
    return {
        "id":   str(uuid.uuid4()),
        "text": text,
        "metadata": {
            "page":        slide_idx + 1,
            "chunk_index": chunk_idx,
            "source":      source,
            "type":        "pptx_slide",
            "total_pages": total,
        }
    }


def _split(text: str) -> list[str]:
    """Çok uzun metin için basit bölme."""
    chunks, start = [], 0
    while start < len(text):
        end = start + _CHUNK_SIZE
        if end < len(text):
            pos = text.rfind("\n", start, end)
            if pos > start:
                end = pos
        part = text[start:end].strip()
        if part:
            chunks.append(part)
        start = end - 400
        if start >= len(text):
            break
    return chunks
