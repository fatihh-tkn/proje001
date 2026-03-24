"""
processors/image_processor.py
────────────────────────────────────────────────────────────────────
PNG / JPG / JPEG → RAG chunk üretici.

Strateji:
  1. Gemini Vision API (GEMINI_API_KEY varsa) → tam metin çıkarma
  2. API yoksa → dosya adı + boyut metadata chunk'ı (en azından kayıt olur)

Her görsel = 1 chunk (görseller zaten tek bir anlam birimi).
"""

import os
import uuid


def parse_image(
    file_path: str,
    original_name: str | None = None,
) -> list[dict]:
    """
    Görsel dosyayı okuyup chunk listesi döner.
    """
    file_basename = original_name or os.path.basename(file_path)
    ext = file_basename.rsplit(".", 1)[-1].lower() if "." in file_basename else "img"

    # ── Gemini Vision ile oku ─────────────────────────────────────────
    ai_text = _read_with_vision(file_path)

    if ai_text:
        text = (
            f"[{file_basename} | Görsel Analizi]\n"
            f"DOSYA TÜRÜ: {ext.upper()} görseli\n\n"
            f"{ai_text}"
        )
        chunk_type = "image_vision"
    else:
        # Vision yoksa en azından dosya adını kaydet
        size_kb  = round(os.path.getsize(file_path) / 1024, 1)
        text = (
            f"[{file_basename} | Görsel]\n"
            f"DOSYA TÜRÜ: {ext.upper()}\n"
            f"BOYUT: {size_kb} KB\n"
            "[Not: Gemini Vision API anahtarı olmadığından içerik okunamadı. "
            "Dosya kaydedildi, görsel önizleme mevcut.]"
        )
        chunk_type = "image_metadata_only"

    return [{
        "id":   str(uuid.uuid4()),
        "text": text,
        "metadata": {
            "page":        1,
            "chunk_index": 1,
            "source":      file_basename,
            "type":        chunk_type,
            "image_path":  file_path,
            "total_pages": 1,
        }
    }]


def _read_with_vision(image_path: str) -> str | None:
    """Gemini Vision ile görsel okur. Başarısızsa None döner."""
    try:
        from core.config import settings
        if not settings.GEMINI_API_KEY:
            return None

        import google.generativeai as genai
        from PIL import Image

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model  = genai.GenerativeModel("gemini-1.5-pro")
        img    = Image.open(image_path)

        prompt = """Bu görsel bir SAP veya kurumsal yazılım ekranı, form, grafik veya belgeden alınmış olabilir.

GÖREVIN:
1. Görünen TÜM metinleri çıkar:
   - Başlıklar, etiketler, alan adları
   - Tablo verileri (satır/sütun)
   - Buton/menü metinleri
   - Açıklama notları
2. Yapılandırılmış formatta yaz:
   BAŞLIK: [varsa başlık]
   İÇERİK:
   [metin/tablo...]

Sadece görünür içeriği çıkar."""

        response = model.generate_content([prompt, img])
        return response.text.strip() if response.text else None

    except Exception as e:
        print(f"[image_processor] Vision okuma hatası: {e}")
        return None
