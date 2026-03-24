"""
processors/text_processor.py
────────────────────────────────────────────────────────────────────
TXT / MD / DOCX / DOC → RAG chunk üretici.

Strateji:
  - TXT / MD → direkt oku, chunk_text() ile böl
  - DOCX     → python-docx ile paragraf + tablo çıkar, chunk_text() ile böl
  - DOC      → python-docx (eski format desteği kısıtlı, hata mesajı döner)

Her chunk'a kaynak dosya adı + chunk sırası eklenir.
"""

import os
import uuid

_CHUNK_SIZE    = 3000
_CHUNK_OVERLAP = 400


def parse_text(
    file_path: str,
    original_name: str | None = None,
) -> list[dict]:
    file_basename = original_name or os.path.basename(file_path)
    ext = file_basename.rsplit(".", 1)[-1].lower() if "." in file_basename else ""

    try:
        if ext in ("docx", "doc"):
            raw_text = _read_docx(file_path)
        else:  # txt, md ve diğerleri
            raw_text = _read_plain(file_path)
    except Exception as e:
        return [{
            "id":   f"error-{uuid.uuid4()}",
            "text": f"[{file_basename}] Dosya okunamadı: {e}",
            "metadata": {"source": file_basename, "error": str(e)}
        }]

    if not raw_text.strip():
        return [{
            "id":   f"empty-{uuid.uuid4()}",
            "text": f"[{file_basename}] Dosya boş veya içerik bulunamadı.",
            "metadata": {"source": file_basename, "type": "text_empty"}
        }]

    # Metin parçalara bölünüyor
    sub_chunks  = _chunk_text(raw_text)
    total       = len(sub_chunks)
    chunks      = []

    for idx, part in enumerate(sub_chunks):
        chunks.append({
            "id":   str(uuid.uuid4()),
            "text": f"[{file_basename} | Parça {idx+1}/{total}]\n\n{part}",
            "metadata": {
                "page":        idx + 1,
                "chunk_index": idx + 1,
                "source":      file_basename,
                "type":        f"text_{ext}",
                "total_pages": total,
            }
        })

    return chunks


# ── Yardımcı okuyucular ───────────────────────────────────────────────

def _read_plain(file_path: str) -> str:
    """TXT / MD → ham metin"""
    encodings = ["utf-8-sig", "utf-8", "latin-1", "cp1254"]
    for enc in encodings:
        try:
            with open(file_path, encoding=enc) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
    # Son çare: hataları yoksay
    with open(file_path, encoding="utf-8", errors="replace") as f:
        return f.read()


def _read_docx(file_path: str) -> str:
    """DOCX → birleşik metin (paragraflar + tablolar)"""
    try:
        import docx
    except ImportError:
        raise ImportError(
            "python-docx kurulu değil. "
            "Yüklemek için: pip install python-docx"
        )

    doc    = docx.Document(file_path)
    parts  = []

    # Paragraflar
    for para in doc.paragraphs:
        t = para.text.strip()
        if t:
            # Başlık stillerini belirt
            if para.style.name.startswith("Heading"):
                parts.append(f"\n## {t}")
            else:
                parts.append(t)

    # Tablolar
    for table in doc.tables:
        rows = []
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells]
            rows.append(" | ".join(cells))
        if rows:
            parts.append("\nTABLO:\n" + "\n".join(rows))

    return "\n\n".join(parts)


def _chunk_text(text: str) -> list[str]:
    """Paragraf sınırını koruyarak chunk'lara böl"""
    chunks = []
    start  = 0
    length = len(text)

    while start < length:
        end = start + _CHUNK_SIZE
        if end < length:
            # Paragraf > satır > boşluk önceliğiyle kes
            for sep in ("\n\n", "\n", " "):
                pos = text.rfind(sep, start, end)
                if pos != -1 and pos > start:
                    end = pos
                    break
        part = text[start:end].strip()
        if part:
            chunks.append(part)
        start = end - _CHUNK_OVERLAP
        if start >= length:
            break

    return chunks
