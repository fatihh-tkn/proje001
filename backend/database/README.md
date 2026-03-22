# Veritabanı Mimarisi (Database Layer)

Bu klasör, uygulamanın tüm veri kalıcılığını (Persistence Layer) ve depolama motorlarını yönetir.

Sistemimiz **3 Katmanlı (Hybrid) Veritabanı Mimarisi** üzerine inşa edilmiştir:
1. **`sql/` (Ana Veritabanı):** Tüm uygulamanın nihai gerçeğidir (Single Source of Truth). Relational veriler burada yaşar.
2. **`vector/` (Vektör Motoru):** Yalnızca anlamsal aramalar (Semantic Search) için hesaplanmış sayısal matrisleri tutar. Çöpe atılabilir ve SQL'den tekrar yaratılabilir.
3. **`graph/` (Ağ Motoru):** Belgeler arasındaki çapraz bağları, RAG (Retrieval-Augmented Generation) sürecini zenginleştirmek için bellekte tutar. Durumsuzdur (Stateless).

### Katı Mimari Kurallar
- Asla Vektör veya Graf motoruna doğrudan bir kaynak veri yazılmaz.
- Veri daima önce `sql/` katmanına girmeli, ID almalı, ardından diğer motorlara dağıtılmalıdır.
- İş mantığı tarafı (`services/ai_service.py` vb.) sadece bu klasördeki "Provider/Repo" arayüzleriyle konuşur. Hangi Vektör motorunun veya Graf motorunun arka planda döndüğünü bilmez.
