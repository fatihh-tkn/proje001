import os
import fitz  # PyMuPDF
import uuid
import time
from datetime import datetime

from core.config import settings
from core.monitor_db import add_log_to_db

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

def analyze_pdf_with_vision(file_path: str, use_vision: bool = False) -> list[dict]:
    """
    Multimodal (Çok Modlu) & Koordinat Sensörlü PDF Analiz Motoru.
    """
    chunks = []
    
    try:
        doc = fitz.open(file_path)
        base_name = os.path.splitext(os.path.basename(file_path))[0]
        image_dir = os.path.join(os.path.dirname(file_path), f"images_{base_name}")
        os.makedirs(image_dir, exist_ok=True)
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            
            zoom_factor = 2
            pix = page.get_pixmap(matrix=fitz.Matrix(zoom_factor, zoom_factor))
            image_filename = f"page_{page_num + 1}.png"
            image_path = os.path.join(image_dir, image_filename)
            pix.save(image_path)
            
            page_rect = page.rect
            page_w, page_h = page_rect.width, page_rect.height
            
            ai_deep_text = ""
            if use_vision:
                ai_deep_text = ask_gemini_vision(image_path)
                
                if ai_deep_text and not ai_deep_text.startswith("[Uyarı"):
                    chunks.append({
                        "id": str(uuid.uuid4()),
                        "text": f"--- YAPAY ZEKA GÖRSEL ANALİZİ (SAYFA {page_num+1}) ---\n{ai_deep_text}",
                        "metadata": {
                            "page": page_num + 1,
                            "chunk_index": 0,
                            "source": os.path.basename(file_path),
                            "type": "ai_vision_analysis",
                            "image_path": image_path,
                            "zoom_factor": zoom_factor,
                            "page_width": float(page_w),
                            "page_height": float(page_h),
                            "bbox": f"0,0,{page_w},{page_h}"
                        }
                    })

            blocks = page.get_text("blocks")
            has_text = False
            
            for block_index, block in enumerate(blocks):
                if len(block) >= 7 and block[6] == 0:
                    text_content = block[4].strip()
                    if text_content:
                        has_text = True
                        x0, y0, x1, y1 = block[0], block[1], block[2], block[3]
                        
                        chunks.append({
                            "id": str(uuid.uuid4()),
                            "text": text_content,
                            "metadata": {
                                "page": page_num + 1,
                                "chunk_index": block_index + 1,
                                "source": os.path.basename(file_path),
                                "type": "multimodal_text_with_bbox",
                                "image_path": image_path,
                                "zoom_factor": zoom_factor,
                                "page_width": float(page_w),
                                "page_height": float(page_h),
                                "bbox": f"{x0},{y0},{x1},{y1}",
                            }
                        })
            
            if not has_text and not use_vision:
                chunks.append({
                    "id": str(uuid.uuid4()),
                    "text": "[Görsel İçerik / Taranmış Sayfa]",
                    "metadata": {
                        "page": page_num + 1,
                        "chunk_index": 1,
                        "source": os.path.basename(file_path),
                        "type": "multimodal_scanned_image",
                        "image_path": image_path,
                        "zoom_factor": zoom_factor,
                        "page_width": float(page_w),
                        "page_height": float(page_h),
                        "bbox": f"0,0,{page_w},{page_h}"
                    }
                })
                
        doc.close()
    except Exception as e:
        print(f"analyze_pdf_with_vision Error: {str(e)}")
        chunks.append({
            "id": f"error-{uuid.uuid4()}",
            "text": "Dosya okunamadı veya işlenemedi.",
            "metadata": {"error": str(e), "source": os.path.basename(file_path)}
        })
        
    return chunks
