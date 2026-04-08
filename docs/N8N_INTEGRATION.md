# N8N Otomasyon Entegrasyonu

Bu sistem, sıradan bir arayüzden çıkarak harici ERP, CRM veya diğer servislerle haberleşmek için n8n (Nodmation) açık kaynak otomasyon aracına göbeğinden bağlıdır.

## İşleyiş Şekli
1. Kullanıcı arayüze "Günlük satış raporlarını e-postama gönder" yazar.
2. `Action Router` (Görevi niyet okumak olan Ajan) bu mesajın bir sohbet değil, eylem olduğunu algılar.
3. FastAPI'ye şu JSON'u iletir: `{"action": "n8n", "webhook": "rapor_gonder", "payload": {}}`
4. FastAPI arka planda, ortam değişkenlerinde tanımlı n8n Webhook URL'sine bir HTTP POST isteği gönderir.
5. n8n üzerindeki ilgili workflow (iş akışı) tetiklenir, SQL veritabanından veriyi çeker ve SMTP üzerinden e-posta gönderir.
6. n8n işlemin durumunu sisteme geri döndürebilir ve kullanıcıya arayüzden "İşlem Tamamlandı" geri bildirimi gelir.

Bu mimari sistemin yatayda sonsuz şekilde genişleyebilmesine ve SAP gibi sistemlere kolayca bağlanmasına olanak tanır.
