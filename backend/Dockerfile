# backend/Dockerfile
FROM python:3.12-slim

# Sistem bağımlılıkları (psycopg2 ve AI/Ses kütüphaneleri için gerekebilecek temel kütüphaneler)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Gereksinimleri kopyala ve yükle
COPY requirements.txt .

# Venv yerine sistem genelinde (container yalıtılmış olduğu için) yükleriz
RUN pip install --no-cache-dir -r requirements.txt

# Uygulama kodlarını kopyala
COPY . .

# FastAPI 8000 portunu dinleyecek
EXPOSE 8000

# Server'ı başlat
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
