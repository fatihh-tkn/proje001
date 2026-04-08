# UI Bileşenleri (Frontend Components)

Frontend mimarisi tamamen yeniden kullanılabilir, modüler **React Bileşenleri (Components)** ile oluşturulmuştur.

## CSS ve Tasarım Mimarisi (Glassmorphism)
Sistem "Glassmorphism" denilen cam efekti tasarımı üzerine kuruludur.
- Bileşenlerin CSS'i yerleşik `index.css` ve **Tailwind CSS** ile sağlanır.
- `bg-white/5` veya `backdrop-blur-md` ile saydamlaştırma efektleri kullanılır.
- Uygulamada katı koyu renkler (solid dark) yerine, degradeli arka planlar üzerinde yüzen şeffaf pencereler hissi verilmiştir.

## Temel Klasör Yapısı (`/src/components/`)
*   **`chatbar/`**: Sohbet girişleri, ikonlar ve geçmiş konuşma önizlemeleri.
*   **`viewers/`**: Dinamik içerik yükleyiciler. Dosyaların türlerine göre göründüğü alanlar.
*   **`workspace/`**: Sayfanın tam ortasındaki ana veri görüntüleme sahnesi. `DynamicViewer` ile bileşenler değiştirilir.
*   **`settings/`**: Ai botları, UI ayarları ve arka plan değişikliklerinin yapıldığı kontrol merkezidir.

Ayrıca projede çok sayıda Lucide React ikonu (örn: `FileText`, `BrainCircuit`) estetik amaçlı kullanılmaktadır.
