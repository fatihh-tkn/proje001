# Veri İşlemcileri (Processors)

`/backend/services/processors/` dizinindeki bileşenler, karmaşık dosyaları Yapay Zeka'nın okuyabileceği hale getiren araçlardır.

## İşlemciler Listesi

*   **AudioProcessor:** Ses ve video (".mp3", ".mp4", ".wav") dosyalarını alır, Whisper modeli yardımıyla metne (transkript) dönüştürür. Özellikle toplantı kayıtlarının yapay zeka ortamına aktarılması için kritiktir.
*   **ImageProcessor:** Faturalar, belgeler (JPG, PNG) gibi görsellerin üzerinden OCR (Optical Character Recognition) yöntemleriyle metin ayrıştırması yapar.
*   **ExcelProcessor / PPTXProcessor:** Yapısal kurumsal dosyaları hücre veya slayt bazlı analiz ederek anlamlı JSON nesnelerine çevirir.

Tüm bu işlemler arka planda asenkron olarak gerçekleşir ve sonuçlanan veriler Vektör Veritabanı'na yazılmak üzere bir sonraki servise aktarılır.
