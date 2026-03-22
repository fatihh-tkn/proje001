import os
import fitz  # PyMuPDF
import uuid
import time
from datetime import datetime

from core.config import settings
from core.db_bridge import add_log_to_db

def chunk_text(text: str, chunk_size: int = 1500, overlap: int = 300) -> list[str]:
    chunks = []
    start = 0
    text_len = len(text)
    while start < text_len:
        end = start + chunk_size
        if end < text_len:
            last_space = max(
                text.rfind(' ', start, end),
                text.rfind('\n', start, end)
            )
            if last_space != -1 and last_space > start:
                end = last_space
        chunk_str = text[start:end].strip()
        if chunk_str:
            chunks.append(chunk_str)
        start = end - overlap
    return chunks

def ask_gemini_vision(image_path: str) -> str:
    """Gemini 1.5 Pro ile yüksek zekalı görsel okuma ve Dashboard entegrasyonu"""
    try:
        if not settings.GEMINI_API_KEY:
            return "[Uyarı: GEMINI_API_KEY yapılandırılmadığı için AI okuması yapılamadı.]"
            
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-pro')
        
        start_time = time.time()
        
        from PIL import Image
        img = Image.open(image_path)
        
        prompt = "Bu resimde bir yazılım/sistem ekranı, kullanım kılavuzu veya karmaşık bir form olabilir. Eğer oklar veya kutucuklarla işaretlenmiş alanlar varsa, hangi okun nereyi işaret ettiğini eşleştirerek detaylı bir şekilde açıkla. Ekrandaki tüm okunabilir metinleri yapılandırılmış formatta çıkar. Sadece içeriğe odaklan."
        
        response = model.generate_content([prompt, img])
        text_out = response.text
        
        duration = int((time.time() - start_time) * 1000)
        
        p_tokens = 258 + int(len(prompt)/4)
        c_tokens = int(len(text_out)/4)
        cost = (p_tokens / 1000) * 0.00125 + (c_tokens / 1000) * 0.005
        
        log_entry = {
            "id": f"log_vis_{int(time.time()*1000)}_{uuid.uuid4().hex[:4]}",
            "timestamp": datetime.utcnow().isoformat(),
            "provider": "Google",
            "model": "gemini-1.5-pro",
            "promptTokens": p_tokens,
            "completionTokens": c_tokens,
            "totalTokens": p_tokens + c_tokens,
            "duration": duration,
            "status": "success",
            "cost": cost,
            "projectId": "vision-chunker",
            "sessionId": f"doc_{uuid.uuid4().hex[:6]}",
            "role": "system",
            "error": None,
            "request": "Multimodal B-Yolu Görsel İşleme",
            "response": text_out[:100] + "...(kısaltıldı)", 
            "ip": "localhost",
            "mac": "backend-engine"
        }
        add_log_to_db(log_entry)
        
        return text_out
    except Exception as e:
        print("ask_gemini_vision Error:", str(e))
        return f"[Yapay Zeka Okuma Hatası: {str(e)}]"

def analyze_pdf_with_vision(file_path: str, use_vision: bool = False, original_name: str | None = None) -> list[dict]:
    """
    Multimodal (Çok Modlu) & Koordinat Sensörlü PDF Analiz Motoru.

    MİMARİ: 2 Katmanlı Chunk Yapısı
    ───────────────────────────────────────────────────────────────────────
    Katman 1: Belge Özeti (chunk_index=0) — her belgeden 1 adet
              İlk 2 sayfa + son sayfa metni birleştirilerek oluşturulur.
              Her sorguda otomatik olarak bağlam sağlar (modül adı, kapsam).
    Katman 2: Sayfa Chunk'ları (chunk_index=page_num) — sayfadan 1 adet
              Sayfanın tüm blokları + belge başlığı birleştirilerek kaydedilir.
              Semantik arama bu chunk'larda yapılır.

    original_name: Diskdeki dosya adı UUID içerdiğinden, ChromaDB source metadata'sı
                   ve frontend filtrelemesi için orijinal dosya adı kullanılır.
    """
    # source metadata için kullanılacak isim: orijinal > disk basename
    file_basename = original_name if original_name else os.path.basename(file_path)
    chunks = []

    try:
        doc = fitz.open(file_path)
        total_pages = len(doc)
        base_name = os.path.splitext(file_basename)[0]
        image_dir = os.path.join(os.path.dirname(file_path), f"images_{base_name}")
        os.makedirs(image_dir, exist_ok=True)

        # Belge özeti için tüm sayfa metinlerini geçici olarak topla
        page_texts_for_summary: list[str] = []
        page_data: list[dict] = []  # Her sayfa için (texts, image_path, page_w, page_h)

        # ── 1. GEÇİŞ: Tüm sayfaları tara, resim oluştur, metinleri topla ──────
        for page_num in range(total_pages):
            page = doc.load_page(page_num)


            zoom_factor = 2
            pix = page.get_pixmap(matrix=fitz.Matrix(zoom_factor, zoom_factor))
            image_filename = f"page_{page_num + 1}.png"
            image_path = os.path.join(image_dir, image_filename)
            pix.save(image_path)

            page_rect = page.rect
            page_w, page_h = page_rect.width, page_rect.height

            blocks = page.get_text("blocks")
            page_texts: list[str] = []
            for block in blocks:
                if len(block) >= 7 and block[6] == 0:
                    txt = block[4].strip()
                    if txt:
                        page_texts.append(txt)

            combined = "\n".join(page_texts)
            page_texts_for_summary.append(combined)
            page_data.append({
                "image_path": image_path,
                "page_w": page_w,
                "page_h": page_h,
                "texts": page_texts,
                "combined": combined,
            })

        # ── KATMAN 1: Belge Özeti Chunk'ı ───────────────────────────────────
        # İlk 2 sayfa + son sayfa → belgenin kapsamını/başlığını özetler
        summary_parts: list[str] = []
        summary_page_indices = list(dict.fromkeys(
            [0, 1, total_pages - 1]
        ))  # Tekrar olmasın (1 sayfalı PDF için)
        for idx in summary_page_indices:
            if idx < total_pages and page_texts_for_summary[idx].strip():
                summary_parts.append(
                    f"=== Sayfa {idx + 1} ===\n{page_texts_for_summary[idx][:1500]}"
                )

        if summary_parts:
            summary_text = (
                f"BELGE ADI: {file_basename}\n"
                f"TOPLAM SAYFA: {total_pages}\n\n"
                "--- BELGE GENEL BAĞLAMI ---\n"
                + "\n\n".join(summary_parts)
            )
            # Özet chunk'ın image_path'i belgenin ilk sayfası
            summary_image = page_data[0]["image_path"] if page_data else ""
            chunks.append({
                "id": str(uuid.uuid4()),
                "text": summary_text,
                "metadata": {
                    "page": 0,              # 0 → Belge özeti
                    "chunk_index": 0,
                    "source": file_basename,
                    "type": "document_summary",
                    "image_path": summary_image,
                    "zoom_factor": 2,
                    "page_width": float(page_data[0]["page_w"]) if page_data else 0,
                    "page_height": float(page_data[0]["page_h"]) if page_data else 0,
                    "bbox": "0,0,0,0",
                    "total_pages": total_pages,
                }
            })

        # ── KATMAN 2: Sayfa Chunk'ları ───────────────────────────────────────
        for page_num, pd in enumerate(page_data):
            image_path = pd["image_path"]
            page_w = pd["page_w"]
            page_h = pd["page_h"]
            full_page_bbox = f"0,0,{page_w},{page_h}"

            # Vision (Derin Görsel AI Okuma)
            if use_vision:
                ai_deep_text = ask_gemini_vision(image_path)
                if ai_deep_text and not ai_deep_text.startswith("[Uyarı"):
                    chunks.append({
                        "id": str(uuid.uuid4()),
                        "text": (
                            f"[{file_basename} | Sayfa {page_num+1}/{total_pages} | AI Görsel Analizi]\n"
                            f"{ai_deep_text}"
                        ),
                        "metadata": {
                            "page": page_num + 1,
                            "chunk_index": 0,
                            "source": file_basename,
                            "type": "ai_vision_analysis",
                            "image_path": image_path,
                            "zoom_factor": 2,
                            "page_width": float(page_w),
                            "page_height": float(page_h),
                            "bbox": full_page_bbox,
                            "total_pages": total_pages,
                        }
                    })

            if pd["texts"]:
                # Sayfanın metnini belge başlığı ile birleştir → bağlam korunur
                page_header = (
                    f"[{file_basename} | Sayfa {page_num+1}/{total_pages}]\n"
                )
                combined_text = page_header + pd["combined"]
                chunks.append({
                    "id": str(uuid.uuid4()),
                    "text": combined_text,
                    "metadata": {
                        "page": page_num + 1,
                        "chunk_index": 1,
                        "source": file_basename,
                        "type": "multimodal_text_with_bbox",
                        "image_path": image_path,
                        "zoom_factor": 2,
                        "page_width": float(page_w),
                        "page_height": float(page_h),
                        "bbox": full_page_bbox,
                        "total_pages": total_pages,
                    }
                })
            elif not use_vision:
                chunks.append({
                    "id": str(uuid.uuid4()),
                    "text": f"[{file_basename} | Sayfa {page_num+1}/{total_pages}]\n[Görsel İçerik / Taranmış Sayfa]",
                    "metadata": {
                        "page": page_num + 1,
                        "chunk_index": 1,
                        "source": file_basename,
                        "type": "multimodal_scanned_image",
                        "image_path": image_path,
                        "zoom_factor": 2,
                        "page_width": float(page_w),
                        "page_height": float(page_h),
                        "bbox": full_page_bbox,
                        "total_pages": total_pages,
                    }
                })

        # ───────────────────────────────────────────────────────────────────

    except Exception as e:
        print(f"analyze_pdf_with_vision Error: {str(e)}")
        chunks.append({
            "id": f"error-{uuid.uuid4()}",
            "text": "Dosya okunamadı veya işlenemedi.",
            "metadata": {"error": str(e), "source": os.path.basename(file_path)}
        })
    finally:
        if 'doc' in locals() and hasattr(doc, 'close'):
            doc.close()

    return chunks
