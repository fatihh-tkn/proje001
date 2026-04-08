# Veritabanı ve Hafıza Şeması

Bu projede yüksek performanslı bilgi geri getirme (RAG) sistemi ve veri tutarlılığı için iki tür veritabanı eşzamanlı olarak kullanılır.

## 1. İlişkisel Veritabanı (SQLite / SQLAlchemy)
Kullanıcı metadataları, sohbet geçmişleri, sistem logları ve bot ayarlarını saklar.
*   **app.db**: Uygulama verilerinin ana kaynağı.
    *   `AIAgent`: Sistemdeki yapay zeka botlarının yapılandırmaları (prompt, model, ikonlar).
    *   `BilgiIliskisi`: Bilgiler arası bağlam ağları (Kenar - Edge yapıları).
*   **logs.db**: Güvenlik ve performans için tutulan ayrı sistem günlükleri dosyası. Eski loglar otomatik silinecek şekilde rotasyona tabidir.

## 2. Vektör Veritabanı (ChromaDB)
Metinsel veya görsel verilerin makine sayısına (matris/vektör) çevrilmiş hallerini depolar. Uzun süreli yapay zeka hafızasıdır.
*   **chunk**: Dosyalar ChromaDB'ye atılmadan önce anlam bütünlüğünü bozmayacak ufak parçalara (chunk) ayrılır.
*   **embedding**: Parçalandıktan sonra her bir "chunk" için sayısal diziler üretilir. Bu sayede bir arama yapıldığında harf eşleşmesine değil, "anlam benzerliğine" bakılır.

Her dosya uygulamaya eklendiğinde önce metadata'sı SQLite'a kaydedilir, asıl yapay zeka tarafından okunacak içeriği ise Vektör Veritabanına aktarılır.
