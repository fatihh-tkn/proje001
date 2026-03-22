# SQL Katmanı (Ana Veritabanı)

Şu Anki Motor: **SQLite** (`app.db`)
Uyumluluk: **PostgreSQL** (Alembic & ORM via SQLAlchemy)

Bu klasör sistemin kalbidir ve **Single Source of Truth (Tek Doğru Kaynak)** prensibine göre çalışır.

### Kurallar:
- **Dokümanların Tek Kaynağı:** Vector veya Graph tarafına eklenecek her şeyin mutlaka `models.py` içinde tanımlanmış bir karşılığı (örn: `Document`, `DocumentChunk`, `KnowledgeEdge`) olmalıdır.
- **Güvenli Erişim:** API rotaları asla doğrudan SQLAlchemy Session'larına müdahale etmemeli, bunun yerine `repositories/` altındaki depo katmanı ile konuşmalıdır.
- **Göç (Migration):** Şemada bir değişiklik yapmak gerekliyse `models.py` düzenlenip Alembic (`alembic revision --autogenerate`) kullanılarak göç (migration) oluşturulmalıdır.
