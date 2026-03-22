# Bilgi Grafiği Katmanı (Graph Database Layer)

Mevcut Aktif Motor: **NetworkX** (`networkx_db.py`)
Gelecek Alternatifler: **Memgraph, Neo4j, NebulaGraph** vb.

Belgeler, chunk'lar, kişiler ve ilişkiler arasındaki karmaşık ağ düğümlerini (edges & nodes) çözmek için kullanılır.

### Kurallar:
- **Stateless (Durumsuz) Mimari:** NetworkX'in şu anki versiyonu bellekte yaşar ve uygulama kapandığında yok olur. Veritabanına ait ilişkiler asla burada saklanmaz. `database/sql/models.py` içindeki `KnowledgeEdge` tablosu ana depodur.
- **FastAPI Lifespan (Önyükleme):** Uygulama/Server uvicorn üzerinden her başladığında SQL tablosundaki tüm `knowledge_edges` kayıtları çekilir ve buradaki `build_graph()` tetiklenerek in-memory harita güncellenir.
- **Güvenli Soyutlama:** `get_related_nodes` ya da `get_shortest_path` kullanıldığında, alt tarafta Memgraph Cypher'ı çalışsa da, Python belleğinde NetworkX döngüsü çalışsa da `services/ai_service.py` asla etkilenmemelidir. İletişim `provider.py` (GraphDBProvider) üzerinden yapılır.
