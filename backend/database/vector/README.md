# Vektör Motoru Katmanı

Mevcut Aktif Motor: **ChromaDB** (`chroma_db.py`)
Gelecek Alternatifler: **Milvus, pgvector** vb.

Bu katmanda yalnızca metinlerin "anlamsal / matematiksel" karşılıkları (Vektörler / Embedding Matrix) yer alır ve RAG akışında hızlı arama yapılmasını sağlar.

### Kurallar:
- **Çöpe Atılabilir (Disposable):** Bu katmandaki veriler **hiçlikten tekrar yaratılabilir** olmalıdır. Çünkü asıl dosya verileri SQL alanındadır. Chroma klasörünü tümüyle silmeniz hiçbir şey kaybettirmez.
- **SQLite Metadata Zorunluluğu:** Girdiğiniz her vektör chunk'ına ait metadata içerisinde kesinlikle SQL ID referansı eklenmiş olmalıdır (`sqlite_doc_id` vb.). Böylece bulduğu vektörün tablodaki orijinal formuna ve sahipliğine (`access_role`) güvenlik yetkileriyle erişebilirsiniz.
- **Yeni Motor Geçişi:** `provider.py` deki `VectorDBProvider` abstract class'ını devraldığınız sürece herhangi bir yeni vektör sistemi yaratabilirsiniz.
