import os
import fitz  # PyMuPDF
import uuid
import time
from datetime import datetime

from core.config import settings
from core.db_bridge import add_log_to_db

# PPT-PDF için minimum içerik eşiği (karakter)
_MIN_SLIDE_CHARS = 30
# Gerekirse daha büyük belgeler için bölme boyutu
_CHUNK_SIZE = 3000
_CHUNK_OVERLAP = 400

def chunk_text(text: str, chunk_size: int = _CHUNK_SIZE, overlap: int = _CHUNK_OVERLAP) -> list[str]:
    """Metni kelime sınırında bölüp örtüşmeli chunk'lara ayırır."""
    chunks = []
    start = 0
    text_len = len(text)
    while start < text_len:
        end = start + chunk_size
        if end < text_len:
            last_break = max(
                text.rfind('\n\n', start, end),  # Paragraf sınırı öncelikli
                text.rfind('\n', start, end),
                text.rfind(' ', start, end),
            )
            if last_break != -1 and last_break > start:
                end = last_break
        chunk_str = text[start:end].strip()
        if chunk_str:
            chunks.append(chunk_str)
        start = end - overlap
        if start >= text_len:
            break
    return chunks


def _extract_slide_blocks(page) -> tuple[str, str]:
    """
    Bir slayt sayfasından başlık + gövde metnini çıkarır.
    Blokları Y koordinatına göre sıralar → okuma düzenini korur.
    
    Dönüş: (title_text, body_text)
    """
    blocks = page.get_text("blocks")  # (x0, y0, x1, y1, text, block_no, block_type)
    text_blocks = [
        (b[1], b[4].strip())   # (y0, text)
        for b in blocks
        if len(b) >= 7 and b[6] == 0 and b[4].strip()
    ]
    # Y koordinatına göre sırala (yukarıdan aşağıya)
    text_blocks.sort(key=lambda x: x[0])

    if not text_blocks:
        return "", ""

    # İlk blok genellikle slayt başlığıdır
    title = text_blocks[0][1] if text_blocks else ""
    # Geri kalanlar gövde
    body_parts = [t for _, t in text_blocks[1:]]
    body = "\n\n".join(p for p in body_parts if len(p) > 5)

    return title, body

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
        
        prompt = """Bu görsel bir SAP veya kurumsal yazılım eğitim slaydıdır.

GÖREVIN:
1. Ekranda görünen TÜM metin içeriğini çıkar:
   - Form alanı etiketleri (örn: "Malzeme:", "Mal grubu:", "Birim:")
   - Sekme isimleri (örn: "Temel veriler 1", "SD: Satış org.")
   - Buton ve menü etiketleri
   - Açıklama kutuları ve ok işaretli notlar
   - Tablo başlıkları ve hücre değerleri
   - Sayfa başlığı ve alt başlık

2. Yapılandırılmış formatta çıkar:
   SLAYT BAŞLIĞI: [başlık]
   
   EKRAN ALANLARI:
   - [alan adı]: [açıklaması veya değeri]
   
   SEKMELER: [sekme listesi]
   
   AÇIKLAMA KUTULARI:
   - [açıklama metni] → İşaret ettiği alan: [alan adı]

Sadece görünür içeriği çıkar, yorum yapma."""
        
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
    PPT/PDF Slayt Analiz Motoru — Her slayt tek chunk.

    MİMARİ: 2 Katmanlı Chunk Yapısı
    ─────────────────────────────────────────────────────────────────
    Katman 1: Belge Özeti — Her slaydın BAŞLIĞINI toplar.
              "Bu belge X, Y, Z konularını içerir." bağlamını verir.
    Katman 2: Slayt Chunk'ları — Her slayt için 1 chunk.
              Başlık + Y-sıralı not kutuları bir arada tutulur.
              Çok uzun slaytlar (nadir) bölünür ama sayfa sınırına dokunulmaz.

    PPT→PDF için kritik kararlar:
      - Her slayt kendi doğal semantik birimidir → asla sayfa arası bölme
      - Metin blokları Y koordinatına göre sıralanır (okuma düzeni)
      - Başlık her zaman chunk'ın ilk satırı
      - Boş/çok kısa slaytlar başlıkları varsa korunur
    """
    file_basename = original_name if original_name else os.path.basename(file_path)
    chunks: list[dict] = []

    try:
        doc = fitz.open(file_path)
        total_pages = len(doc)
        base_name   = os.path.splitext(file_basename)[0]
        image_dir   = os.path.join(os.path.dirname(file_path), f"images_{base_name}")
        os.makedirs(image_dir, exist_ok=True)

        # ── 1. GEÇİŞ: Her sayfayı tara ────────────────────────────────────
        slide_titles: list[str] = []   # Özet için başlık listesi
        page_data:   list[dict] = []

        for page_num in range(total_pages):
            page = doc.load_page(page_num)

            # Sayfa görseli (ön izleme ve Vision AI için)
            zoom_factor    = 2
            pix            = page.get_pixmap(matrix=fitz.Matrix(zoom_factor, zoom_factor))
            image_filename = f"page_{page_num + 1}.png"
            image_path     = os.path.join(image_dir, image_filename)
            pix.save(image_path)

            page_rect      = page.rect
            page_w, page_h = page_rect.width, page_rect.height

            # Y-koordinatına göre sıralı metin blokları
            title, body = _extract_slide_blocks(page)
            slide_titles.append(title)

            page_data.append({
                "image_path": image_path,
                "page_w":     page_w,
                "page_h":     page_h,
                "title":      title,
                "body":       body,
            })

        # ── KATMAN 1: Belge Özeti — tüm slayt başlıklarından ──────────────
        non_empty_titles = [f"  {i+1}. {t}" for i, t in enumerate(slide_titles) if t.strip()]
        if non_empty_titles:
            summary_text = (
                f"BELGE ADI: {file_basename}\n"
                f"TOPLAM SAYFA/SLAYT: {total_pages}\n\n"
                "--- SLAYT BAŞLIKLARI (İÇİNDEKİLER) ---\n"
                + "\n".join(non_empty_titles)
            )[:3000]  # güvenlik sınırı
            chunks.append({
                "id": str(uuid.uuid4()),
                "text": summary_text,
                "metadata": {
                    "page":         0,
                    "chunk_index":  0,
                    "source":       file_basename,
                    "type":         "document_summary",
                    "image_path":   page_data[0]["image_path"] if page_data else "",
                    "zoom_factor":  zoom_factor,
                    "page_width":   float(page_data[0]["page_w"]) if page_data else 0,
                    "page_height":  float(page_data[0]["page_h"]) if page_data else 0,
                    "bbox":         "0,0,0,0",
                    "total_pages":  total_pages,
                }
            })

        # ── KATMAN 2: Slayt Chunk'ları ─────────────────────────────────────
        for page_num, pd in enumerate(page_data):
            image_path     = pd["image_path"]
            page_w         = pd["page_w"]
            page_h         = pd["page_h"]
            full_page_bbox = f"0,0,{page_w},{page_h}"
            title          = pd["title"]
            body           = pd["body"]

            # Vision AI — SAP ekran görüntüsü gibi görselleri de okur
            if use_vision:
                ai_text = ask_gemini_vision(image_path)
                if ai_text and not ai_text.startswith("[Uyarı"):
                    chunks.append({
                        "id": str(uuid.uuid4()),
                        "text": (
                            f"[{file_basename} | Slayt {page_num+1}/{total_pages} | AI Görsel Analizi]\n"
                            f"{ai_text}"
                        ),
                        "metadata": {
                            "page":        page_num + 1,
                            "chunk_index": 0,
                            "source":      file_basename,
                            "type":        "ai_vision_analysis",
                            "image_path":  image_path,
                            "zoom_factor": zoom_factor,
                            "page_width":  float(page_w),
                            "page_height": float(page_h),
                            "bbox":        full_page_bbox,
                            "total_pages": total_pages,
                        }
                    })

            # Metin chunk'ı — başlık + gövde birleşimi
            slide_header = f"[{file_basename} | Slayt {page_num+1}/{total_pages}]"

            if title or body:
                # Başlık + gövde birleştir
                full_text = slide_header
                if title:
                    full_text += f"\nBAŞLIK: {title}"
                if body:
                    full_text += f"\n\n{body}"

                if len(full_text.strip()) < _MIN_SLIDE_CHARS and not title:
                    # Gerçekten boş slayt (başlığı da yok) → atla
                    if not use_vision:
                        continue

                # Slayt metni _CHUNK_SIZE'dan kısa ise direkt tek chunk (PPT için tipik)
                if len(full_text) <= _CHUNK_SIZE:
                    chunks.append({
                        "id": str(uuid.uuid4()),
                        "text": full_text,
                        "metadata": {
                            "page":        page_num + 1,
                            "chunk_index": 1,
                            "source":      file_basename,
                            "type":        "slide_text",
                            "image_path":  image_path,
                            "zoom_factor": zoom_factor,
                            "page_width":  float(page_w),
                            "page_height": float(page_h),
                            "bbox":        full_page_bbox,
                            "total_pages": total_pages,
                        }
                    })
                else:
                    # Nadir: çok uzun slayt → bölme (başlık her parçada korunur)
                    sub_chunks = chunk_text(body)
                    for idx, sub in enumerate(sub_chunks):
                        chunks.append({
                            "id": str(uuid.uuid4()),
                            "text": f"{slide_header}\nBAŞLIK: {title}\n\n{sub}",
                            "metadata": {
                                "page":        page_num + 1,
                                "chunk_index": idx + 1,
                                "source":      file_basename,
                                "type":        "slide_text",
                                "image_path":  image_path,
                                "zoom_factor": zoom_factor,
                                "page_width":  float(page_w),
                                "page_height": float(page_h),
                                "bbox":        full_page_bbox,
                                "total_pages": total_pages,
                            }
                        })
            elif not use_vision:
                # Tamamen görsel slayt (başlık bile yok) — minimal placeholder
                chunks.append({
                    "id": str(uuid.uuid4()),
                    "text": f"{slide_header}\n[Görsel Slayt — Metin İçeriği Yok]",
                    "metadata": {
                        "page":        page_num + 1,
                        "chunk_index": 1,
                        "source":      file_basename,
                        "type":        "slide_visual_only",
                        "image_path":  image_path,
                        "zoom_factor": zoom_factor,
                        "page_width":  float(page_w),
                        "page_height": float(page_h),
                        "bbox":        full_page_bbox,
                        "total_pages": total_pages,
                    }
                })

    except Exception as e:
        print(f"analyze_pdf_with_vision Hata: {e}")
        import traceback; traceback.print_exc()
        chunks.append({
            "id":       f"error-{uuid.uuid4()}",
            "text":     "Dosya okunamadı veya işlenemedi.",
            "metadata": {"error": str(e), "source": os.path.basename(file_path)}
        })
    finally:
        if 'doc' in locals() and hasattr(doc, 'close'):
            doc.close()

    return chunks
