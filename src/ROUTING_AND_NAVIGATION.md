# Yönlendirme ve Dinamik Açılışlar (UI Navigation)

Bu React projesi tek sayfalıklı bir uygulamadır (Single Page Application - SPA). Kullanıcı bir menüye tıkladığında URL tamamen değişip sayfa yenilenmez.

## Dynamic Viewer Mimarisi
Ekranda bulunan çalışma alanı (`workspace`) `DynamicViewer.jsx` isminde bir orkestratör bileşen ile yönetilir. Frontend genel durumunda (örneğin Context veya Redux yardımıyla) "aktif modül" bir değişken olarak tutulur. `DynamicViewer` şu işlevi görür:

*   Değer `database` ise -> SQLite SQL görüntüleyici ekranını açar.
*   Değer `orchestrator` ise -> Yapay Zeka ayar sayfasını (`AiOrchestratorViewer`) ekrana çizer.
*   Değer `chat` ise -> Sohbet arayüzünü gösterir.

## Yapay Zeka ile Arayüz Navigasyonu
Bu sistemin en kritik özelliği; arayüzdeki sayfa değişimlerinin yapay zekanın kararına bağlanabilmesidir.
* Kullanıcı sohbete "Ayarları aç" yazdığında sistem NLP (Doğal Dil İşleme) üzerinden bu cümleyi Backend'deki **Action Router**'a gönderir.
* Backend `target: "settings"` yanıtını döner.
* React anında merkez bileşeni günceller ve sayfa yenilenmeden kullanıcı kendini Ayarlar ekranında bulur.

Bu sayede menülerle dolu karmaşık arayüzler yerine "sohbet odaklı komuta" konsepti (Chat-Driven UI) sağlanmıştır.
