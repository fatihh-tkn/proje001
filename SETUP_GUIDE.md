# Kurulum Rehberi

Projeyi yerel ortamınızda (localhost) ayağa kaldırmak için aşağıdaki adımları izleyin.

## 1. Backend Kurulumu (FastAPI)

Backend için Python 3.10 veya üzeri bir sürüm kullanmanız önerilir.

```bash
cd backend
python -m venv venv

# Sanal ortamı aktif edin:
# Windows için:
venv\Scripts\activate

# Bağımlılıkları yükleyin:
pip install -r requirements.txt

# Çevresel değişkenleri ayarlayın:
# .env.example dosyasının adını .env olarak değiştirip OpenAI API anahtarınızı girin.
```

Sunucuyu başlatmak için:
```bash
python main.py
# Sunucu 8000 portunda çalışmaya başlayacaktır.
```

## 2. Frontend Kurulumu (React + Vite)

Frontend için Node.js'in güncel bir sürümünün (LTS) kurulu olması gerekir.

```bash
# Ana dizinde
npm install

# Geliştirme sunucusunu başlatmak için:
npm run dev
# Frontend uygulaması genellikle 5173 veya 3000 portunda açılacaktır.
```

## 3. İlk Veritabanı Kurulumu
Backend tarafında ilk çalıştırmada SQLite tabloları otomatik oluşturulacaktır. Eksik yapay zeka ajanlarını (Prompt Botu, Action Botu) eklemek için aşağıdaki scripti çalıştırabilirsiniz:

```bash
# Proje kök dizininde
python add_bots.py
```
