# Proje Mimarisi

Bu proje, modern yazılım prensiplerine uygun olarak **Ayrık Mimari (Decoupled Architecture)** ile inşa edilmiştir.

## Genel Yapı

Sistem iki anahtar bileşenden oluşur:
1. **Frontend (Kullanıcı Arayüzü Uygulaması):** İstemci tarafında çalışan, arayüz yönetiminden sorumlu katman.
2. **Backend (Sunucu Uygulaması):** Veri işleme, yapay zeka modelleriyle iletişim, RAG altyapısı ve veritabanı yönetiminden sorumlu katman.

### A. Frontend Katmanı (React + Vite)
Bileşen tabanlı bir yapıya sahiptir. Durum yönetimi (state management) ile kullanıcı etkileşimleri kontrol edilir.
- **Tasarım Dili:** Kurumsal "Glassmorphism" estetği.
- **Dinamik Sekmeler:** Uygulama içinde sayfalar tam ekran yenilenmeden, sekmeler halinde yüklenir (`DynamicViewer`).

### B. Backend Katmanı (Python FastAPI)
Performans odaklı ve asenkron (async) çalışma prensibine dayanır.
- **Orchestrator:** Gelen taleplerin doğrudan bir büyük dil modeline (LLM) gitmesi yerine, amaca uygun botlara yönlendirilmesini sağlar.
- **Processors:** Yüklenen heterojen dosyaları (ses, resim, pdf, excel) standardize edilmiş metin formatlarına veya vektörlere dönüştürür.

### C. Veri Akışı ve RAG (Retrieval-Augmented Generation)
1. Kullanıcı sisteme dosya yükler.
2. Dosya türüne göre uygun `Processor` çalışır.
3. Çıkarılan içerik, anlamsal olarak aranabilmesi için Vektör Veritabanına (ChromaDB) gömülür (embedding).
4. Kullanıcı soru sorduğunda, sistem önce ChromaDB'den ilgili parçaları bulur.
5. Bulunan içerikler, LLM prompt'una bağlam (context) olarak eklenerek halüsinasyonsuz ve doğru yanıt üretilir.
