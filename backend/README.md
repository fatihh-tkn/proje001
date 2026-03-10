# Proje001 - Backend Mimari Kurulumu

Bu klasör, React ile yazılmış frontendinizin arka planı (backend) için hazırlandı. Yüksek performanslı, asenkron ve modern bir Python web framework'ü olan **FastAPI** kullanılarak tasarlandı.

## Dizin Yapısı
- `main.py`: Uygulamanın giriş noktası, FastAPI servisi ve CORS ayarlamaları burada.
- `core/config.py`: Tüm konfigürasyon (port, url, API gizli uçları vb.) `settings` nesnesinde merkezileşildi.
- `api/`: Endpoint rotalarınızı düzenlediğimiz klasör.
  - `api/main.py`: Tüm alt API rotalarının toplandığı ana router.
  - `api/routes/chat.py`: Frontend ile haberleşecek örnek Yapay Zeka (AI) mesajlaşma endpointi.
- `schemas/`: Pydantic modelleri ile, frontend'ten gelen / giden verinin (JSON) tiplerini kontrol eder ve doğrularız.
- `services/`: İş kurallarını (iş mantığı) burada tutarız ki rotalar (endpoints) şişmesin. Örneğin `ai_service.py` AI motoruna veya LangChain'e bağlanacak yeri simgeler.
- `requirements.txt`: Python paket bağımlılıkları listesi.

## Nasıl Çalıştırılır

1. Python ortamı (virtual environment) oluşturun:
   ```bash
   python -m venv venv
   ```
2. Ortamı aktif edin:
   ```bash
   # Windows için:
   venv\Scripts\activate
   # Mac/Linux için:
   source venv/bin/activate
   ```
3. Paketleri yükleyin:
   ```bash
   pip install -r requirements.txt
   ```
4. Uygulamayı başlatın:
   ```bash
   python main.py
   # Ya da alternatif olarak:
   uvicorn main:app --reload
   ```

## OpenAPI Swagger Dokümantasyonu
Backend çalışırken, otomatik üretilmiş API dokümantasyonuna erişebilirsiniz:
Tarayıcıda şuraya gidin: `http://localhost:8000/docs`
