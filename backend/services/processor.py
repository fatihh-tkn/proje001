import os
import fitz  # PyMuPDF
import uuid
import time
from datetime import datetime

from core.config import settings
from core.db_bridge import add_log_to_db

# PPT-PDF için minimum içerik eşiği (karakter)
_MIN_SLIDE_CHARS = 30
# Metin işleme için ideal varsayılanlar (Kelime bazlı)
_CHUNK_SIZE_WORDS = 300
_CHUNK_OVERLAP_WORDS = 50

def chunk_text(text: str, chunk_size: int = _CHUNK_SIZE_WORDS, overlap: int = _CHUNK_OVERLAP_WORDS) -> list[str]:
    """
    Metni kelime bazında bölüp, bağlamın kopmaması için örtüşmeli (overlap) chunk'lara ayırır.
    (Örn: Chunk Size: 300 kelime, Overlap: 50 kelime). Anlam kaymalarını engeller.
    """
    words = text.split()
    if not words:
        return []
    
    chunks = []
    start = 0
    total_words = len(words)
    
    while start < total_words:
        end = min(start + chunk_size, total_words)
        
        # Parçayı oluştur
        chunk_str = " ".join(words[start:end]).strip()
        if chunk_str:
            chunks.append(chunk_str)
            
        if end >= total_words:
            break
            
        # Sonraki parça için overlap kadar geri git
        start = end - overlap
        
    return chunks


def _extract_slide_blocks(page) -> tuple[str, str, str]:
    """
    Bir slayt sayfasından başlık + gövde metnini ve birleşik sınır kutusunu (bbox) çıkarır.
    Blokları Y koordinatına göre sıralar → okuma düzenini korur.
    
    Dönüş: (title_text, body_text, bounding_box_str)
    """
    blocks = page.get_text("blocks")  # (x0, y0, x1, y1, text, block_no, block_type)
    text_blocks = [
        (b[1], b[4].strip(), b[:4])   # (y0, text, (x0, y0, x1, y1))
        for b in blocks
        if len(b) >= 7 and b[6] == 0 and b[4].strip()
    ]
    # Y koordinatına göre sırala (yukarıdan aşağıya)
    text_blocks.sort(key=lambda x: x[0])

    if not text_blocks:
        return "", "", "0,0,0,0"

    # İlk blok genellikle slayt başlığıdır
    title = text_blocks[0][1] if text_blocks else ""
    # Geri kalanlar gövde
    body_parts = [t for _, t, _ in text_blocks[1:]]
    body = "\n\n".join(p for p in body_parts if len(p) > 5)

    # Genel sınır kutusunu (bounding box) hesapla (Tüm metinleri kaplayan kutu)
    min_x = min([bbox[0] for _, _, bbox in text_blocks])
    min_y = min([bbox[1] for _, _, bbox in text_blocks])
    max_x = max([bbox[2] for _, _, bbox in text_blocks])
    max_y = max([bbox[3] for _, _, bbox in text_blocks])
    bbox_str = f"{min_x:.1f},{min_y:.1f},{max_x:.1f},{max_y:.1f}"

    return title, body, bbox_str

# PDF içinde görsel analiz gerektiren eşikler
_MIN_IMAGE_AREA_RATIO = 0.05   # sayfa alanının %5'inden büyük görüntü → Vision
_MIN_TABLE_CELLS      = 6       # 6'dan fazla hücre içeren tablo → Vision
_PAGE_OVERLAP_CHARS   = 200     # sayfa sonu sarkma önleme (önceki sayfadan alınan son N karakter)


def _page_needs_vision(page) -> tuple[bool, str]:
    """
    Akıllı Yönlendirme (Smart Routing): Sayfada tablo veya büyük görüntü
    varsa True döner; bu sayfalar Vision AI'a yönlendirilir.
    Ayrıca tespit nedeni string olarak döner (log/debug için).
    """
    reasons = []

    # 1. Görüntü kontrolü — alan oranına göre
    page_area = page.rect.width * page.rect.height
    images    = page.get_images(full=True)
    for img_info in images:
        # PyMuPDF image info: (xref, smask, w, h, bpc, cs, alt, name, filter, referencer)
        if len(img_info) >= 4:
            img_w, img_h = img_info[2], img_info[3]
            if page_area > 0 and (img_w * img_h) / page_area > _MIN_IMAGE_AREA_RATIO:
                reasons.append(f"görüntü ({img_w}x{img_h}px)")
                break

    # 2. Tablo kontrolü — metin bloklarının grid benzeri durumu
    blocks = page.get_text("blocks")
    text_blocks = [b for b in blocks if len(b) >= 7 and b[6] == 0 and b[4].strip()]
    # Y ekseninde yakın gruplar tablo satırı işareti
    if len(text_blocks) >= _MIN_TABLE_CELLS:
        y_coords = sorted(set(round(b[1] / 10) * 10 for b in text_blocks))
        if len(y_coords) >= 3:  # ≥3 farklı satır seviyesi
            reasons.append(f"{len(text_blocks)} blok / tablo benzeri düzen")

    needs = bool(reasons)
    return needs, ", ".join(reasons) if reasons else "düz metin"


def ask_gemini_vision(image_path: str, context: str = "") -> str:
    """Gemini 1.5 Pro ile görsel okuma — Markdown formatında çıktı üretir (Faz 3)."""
    try:
        if not settings.GEMINI_API_KEY:
            return "[Uyarı: GEMINI_API_KEY yapılandırılmadığı için AI okuması yapılamadı.]"

        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-pro')

        start_time = time.time()

        from PIL import Image, ImageEnhance, ImageFilter
        img = Image.open(image_path)
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.2)
        img = img.filter(ImageFilter.SHARPEN)

        context_block = (
            f"\nÖNCEKİ SAYFA/SLAYT BAĞLAMI (Anlam bütünlüğü için kullan):\n{context}\n"
            if context else ""
        )

        # ── Faz 3: Markdown yapılandırılmış çıktı prompt'u ─────────────────
        prompt = f"""\
GÖREV: Aşağıdaki belge sayfasını analiz et ve içeriği **Markdown formatında** yeniden yaz.
{context_block}
KURALLAR:
1. TÜR BELİRLEME: İlk satırda belge türünü belirt: `**Belge Türü:** <Tür>`
   (Örn: Eğitim Slaytı, Mimari Diyagram, Fatura, SAP Ekranı, Şartname, Form, Tablo...)

2. YAPI KURALLARI:
   - Ana başlıklar için `## Başlık`
   - Alt başlıklar için `### Alt Başlık`
   - Madde listeleri için `- Madde`
   - Tablolar için Markdown tablo formatı:
     | Sütun 1 | Sütun 2 |
     |---------|---------|
     | Değer 1 | Değer 2 |
   - Vurgulu terimler için `**terim**`
   - Akış/diyagram ilişkileri: `Adım A → Adım B → Adım C`

3. KOORDİNAT ETİKETLEME: Her önemli element için (y_üst, x_sol, y_alt, x_sağ) koordinatını
   (0-1000 arası normalize) şu formatta ekle: `<!-- bbox: y1,x1,y2,x2 -->`
   Veremiyorsan ekleme.

4. SADECE GÖRDÜĞÜNÜ YAZ: Çıkarım veya yorum yapma. Sayfa boşsa `[Görsel İçerik - Metin Yok]` yaz.

5. BAĞLAM KÖPRÜSÜ: Önceki sayfa bağlamı verildiyse, bu sayfanın öncekiyle nasıl bağlandığını
   tek cümle ile açıkla: `> 🔗 Önceki bağlantı: <açıklama>`"""

        response   = model.generate_content([prompt, img])
        text_out   = response.text
        duration   = int((time.time() - start_time) * 1000)
        p_tokens   = 258 + int(len(prompt) / 4)
        c_tokens   = int(len(text_out) / 4)
        cost       = (p_tokens / 1000) * 0.00125 + (c_tokens / 1000) * 0.005

        log_entry = {
            "id":               f"log_vis_{int(time.time()*1000)}_{uuid.uuid4().hex[:4]}",
            "timestamp":        datetime.utcnow().isoformat(),
            "provider":         "Google",
            "model":            "gemini-1.5-pro",
            "promptTokens":     p_tokens,
            "completionTokens": c_tokens,
            "totalTokens":      p_tokens + c_tokens,
            "duration":         duration,
            "status":           "success",
            "cost":             cost,
            "projectId":        "vision-chunker",
            "sessionId":        f"doc_{uuid.uuid4().hex[:6]}",
            "role":             "system",
            "error":            None,
            "request":          "SmartRoute Markdown Vision",
            "response":         text_out[:120] + "...(kısaltıldı)",
            "ip":               "localhost",
            "mac":              "backend-engine"
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
        
        # Meta verileri çıkart: Yazar/Konuşmacı, Tarih vb.
        doc_metadata = doc.metadata or {}
        author = doc_metadata.get("author", "Bilinmiyor") or "Bilinmiyor"
        creation_date = doc_metadata.get("creationDate", "") or ""
        # PDF tarih formatı genellikle D:YYYYMMDDHHmmSS.. şeklindedir,
        # arayüzde gösterilebilir hale getiriyoruz.
        if creation_date.startswith("D:"):
            creation_date = creation_date[2:10]  # Sadece YYYYMMDD
            
        # PNG klasörünü temp_uploads yanına koy (izin sorununu azaltır)
        image_dir   = os.path.join(os.path.dirname(file_path), f"images_{base_name}")
        try:
            os.makedirs(image_dir, exist_ok=True)
        except OSError as e:
            print(f"[processor] PNG klasörü oluşturulamadı ({e}), geçici dizine düşülüyor.")
            import tempfile
            image_dir = tempfile.mkdtemp(prefix="pdfimg_")

        # ── 1. GEÇİŞ: Her sayfayı tara ────────────────────────────────────
        slide_titles: list[str] = []   # Özet için başlık listesi
        page_data:   list[dict] = []

        for page_num in range(total_pages):
            page = doc.load_page(page_num)

            # Sayfa görseli (ön izleme ve Vision AI için)
            zoom_factor    = 2
            image_path     = ""
            try:
                pix            = page.get_pixmap(matrix=fitz.Matrix(zoom_factor, zoom_factor))
                image_filename = f"page_{page_num + 1}.png"
                image_path     = os.path.abspath(os.path.join(image_dir, image_filename))
                pix.save(image_path)
            except Exception as img_err:
                print(f"[processor] Sayfa {page_num+1} PNG kaydedilemedi: {img_err}")
                image_path = ""

            page_rect      = page.rect
            page_w, page_h = page_rect.width, page_rect.height

            # Y-koordinatına göre sıralı metin blokları ve bounding box
            title, body, body_bbox = _extract_slide_blocks(page)
            slide_titles.append(title)

            page_data.append({
                "image_path": image_path,
                "page_w":     page_w,
                "page_h":     page_h,
                "title":      title,
                "body":       body,
                "body_bbox":  body_bbox,
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
                    "author":       author,
                    "date":         creation_date,
                    "image_path":   page_data[0]["image_path"] if page_data else "",
                    "zoom_factor":  zoom_factor,
                    "page_width":   float(page_data[0]["page_w"]) if page_data else 0,
                    "page_height":  float(page_data[0]["page_h"]) if page_data else 0,
                    "bbox":         "0,0,0,0",
                    "total_pages":  total_pages,
                }
            })

        # ── KATMAN 2: Slayt Chunk'ları ─────────────────────────────────────
        vision_ai_results : dict[int, str] = {}
        vision_routing    : dict[int, str] = {}  # idx → routing_reason

        if use_vision:
            # ── Akıllı Yönlendirme: sadece tablo/görüntülü sayfalar ────────
            pages_needing_vision: list[tuple[int, dict]] = []
            for idx, pdi in enumerate(page_data):
                page_obj = doc.load_page(idx)
                needs, reason = _page_needs_vision(page_obj)
                vision_routing[idx] = reason
                if needs:
                    pages_needing_vision.append((idx, pdi))
                else:
                    # Düz metin sayfası → Vision AI atlanır, reason log'lanır
                    print(f"  [SmartRoute] Sayfa {idx+1}: '{reason}' → metin okuyucu")

            print(f"  [SmartRoute] Toplam {total_pages} sayfa, "
                  f"{len(pages_needing_vision)} tanesi Vision AI'a yönlendi.")

            from concurrent.futures import ThreadPoolExecutor, as_completed

            def fetch_vision(idx, pd_item):
                prev_context = ""
                if idx > 0:
                    prev_pd      = page_data[idx - 1]
                    prev_context = f"Başlık: {prev_pd['title']}"
                    if prev_pd['body']:
                        prev_context += f" | İçerik Özeti: {prev_pd['body'][:200]}"
                return ask_gemini_vision(pd_item["image_path"], context=prev_context)

            with ThreadPoolExecutor(max_workers=4) as executor:
                futures = {
                    executor.submit(fetch_vision, i, pd): i
                    for i, pd in pages_needing_vision
                }
                for future in as_completed(futures):
                    idx = futures[future]
                    try:
                        vision_ai_results[idx] = future.result()
                    except Exception as e:
                        vision_ai_results[idx] = f"[Hata: {str(e)}]"


        for page_num, pd in enumerate(page_data):
            image_path     = pd["image_path"]
            page_w         = pd["page_w"]
            page_h         = pd["page_h"]
            full_page_bbox = pd["body_bbox"] if pd["body_bbox"] != "0,0,0,0" else f"0,0,{page_w},{page_h}"
            title          = pd["title"]
            body           = pd["body"]

            # Vision AI — Markdown çıktısını chunk olarak ekle
            if use_vision and page_num in vision_ai_results:
                ai_text = vision_ai_results[page_num]
                routing_note = vision_routing.get(page_num, "")
                if ai_text and not ai_text.startswith("[Uyarı"):
                    chunks.append({
                        "id": str(uuid.uuid4()),
                        "text": (
                            f"## {file_basename} — Slayt {page_num+1}/{total_pages} (AI Görsel Analizi)\n"
                            f"_Yönlendirme nedeni: {routing_note}_\n\n"
                            f"{ai_text}"
                        ),
                        "metadata": {
                            "page":          page_num + 1,
                            "chunk_index":   0,
                            "source":        file_basename,
                            "type":          "ai_vision_analysis",
                            "author":        author,
                            "date":          creation_date,
                            "routing":       routing_note,
                            "image_path":    image_path,
                            "zoom_factor":   zoom_factor,
                            "page_width":    float(page_w),
                            "page_height":   float(page_h),
                            "bbox":          full_page_bbox,
                            "total_pages":   total_pages,
                        }
                    })

            # Metin chunk'ı — başlık + gövde birleşimi
            # Sayfa sonu sarkma önleme: bir önceki sayfanın son N karakterini öne ekle
            overlap_prefix = ""
            if page_num > 0 and page_data[page_num - 1]["body"]:
                tail = page_data[page_num - 1]["body"][-_PAGE_OVERLAP_CHARS:]
                overlap_prefix = f"<!-- önceki sayfa sonu → --> {tail.strip()} <!-- ← buraya kadar önceki sayfa -->\n\n"

            slide_header = f"[{file_basename} | Slayt {page_num+1}/{total_pages}]"

            if title or body:
                # Başlık + gövde birleştir
                full_text = slide_header
                if title:
                    full_text += f"\nBAŞLIK: {title}"
                if body:
                    full_text += f"\n\n{body}"

                if len(full_text.strip()) < _MIN_SLIDE_CHARS and not title:
                    if not use_vision:
                        continue

                # Markdown formatında başlık
                slide_md_header = f"## {file_basename} — Slayt {page_num+1}/{total_pages}"

                # Slayt metni _CHUNK_SIZE'dan kısa ise direkt tek chunk
                if len(full_text) <= _CHUNK_SIZE:
                    chunks.append({
                        "id": str(uuid.uuid4()),
                        "text": (
                            f"{slide_md_header}\n"
                            f"{overlap_prefix}"
                            f"{'### ' + title + chr(10) if title else ''}"
                            f"{body}"
                        ).strip(),
                        "metadata": {
                            "page":        page_num + 1,
                            "chunk_index": 1,
                            "source":      file_basename,
                            "type":        "slide_text",
                            "author":      author,
                            "date":        creation_date,
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
                            "text": (
                                f"{slide_md_header} (Parça {idx+1})\n"
                                f"{'### ' + title + chr(10) if title else ''}"
                                f"{sub}"
                            ).strip(),
                            "metadata": {
                                "page":        page_num + 1,
                                "chunk_index": idx + 1,
                                "source":      file_basename,
                                "type":        "slide_text",
                                "author":      author,
                                "date":        creation_date,
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
                        "author":      author,
                        "date":        creation_date,
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

    # prev_id / next_id — özet chunk (index 0) hariç, slayt chunk'ları arasında bağ
    slide_chunks = [c for c in chunks if c.get("metadata", {}).get("type") != "document_summary"]
    for i, chunk in enumerate(slide_chunks):
        chunk["metadata"]["prev_id"] = slide_chunks[i - 1]["id"] if i > 0 else ""
        chunk["metadata"]["next_id"] = slide_chunks[i + 1]["id"] if i < len(slide_chunks) - 1 else ""

    return chunks
