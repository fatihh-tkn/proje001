import os
import fitz  # PyMuPDF

def analyze_pdf_with_vision(file_path: str) -> list[dict]:
    """
    Belirtilen PDF dosyasını PyMuPDF ile analiz eder.
    Her sayfadan metinleri çıkarıp chunk'lar halinde listeler.
    Görme motoru (OCR ve Koordinat taraması) için temel işlevi simüle eder.
    """
    chunks = []
    
    try:
        doc = fitz.open(file_path)
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text()
            
            # Tüm sayfalardaki blokları simüle etmek için dummy bbox bilgisi de eklenebilir.
            if text.strip():
                chunks.append({
                    "id": f"chunk-{page_num + 1}",
                    "text": text.strip(),
                    "metadata": {
                        "page": page_num + 1,
                        "source": os.path.basename(file_path),
                        "type": "pdf_text"
                    }
                })
        doc.close()
    except Exception as e:
        print(f"analyze_pdf_with_vision Error: {str(e)}")
        # Hata durumunda boş dönmemek adına formatlı mesaj ekliyoruz
        chunks.append({
            "id": "error-chunk",
            "text": "Dosya okunamadı veya işlenemedi.",
            "metadata": {"error": str(e), "source": os.path.basename(file_path)}
        })
        
    return chunks
