# API Referans Dokümanı (FastAPI)

Backend sunucusu API katmanı `/api/v1` prefix'i üzerinden çoklu rotalarla (routers) yönetilir. Rotalar işlev alanlarına göre bölünmüştür, bu sayede modüler bir yapı elde edilir:

### Ana Rotalar (Routers)

*   **`/chat`**: Kullanıcı sohbet arayüzünün yapay zeka ajanları ile veri alışverişi.
*   **`/files`**: Dosya yükleme (upload) fonksiyonları. İşlemcileri (Processors) tetikleyen ana ağ geçididir.
*   **`/orchestrator`**: Sistem loglarının çekilmesi, AI botlarının aktif/pasif edilmesi gibi yönetim fonksiyonları.
*   **`/db`** ve **`/sql`**: Veritabanının arayüzden okunmasını (SQL Explorer) ve denetlenmesini sağlayan analiz endpoint'leri.
*   **`/n8n`**: Harici n8n sunucusuna webhook verileri ileten veya n8n'den gelen verileri alabilen köprü uç noktaları.

FastAPI varsayılan olarak Swagger UI sunar. Uygulama çalışırken tam endpoint detaylarına `http://localhost:8000/docs` adresinden ulaşabilirsiniz.
