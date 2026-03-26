from abc import ABC, abstractmethod
from typing import Any, List, Dict, Optional
import networkx as nx

class GraphDBProvider(ABC):
    """
    Bilgi Grafiği (Knowledge Graph) işlemleri için soyutlanmış arayüz.
    Stateless (durumsuz) çalışır.
    İleride NetworkX yerine Memgraph veya Neo4j'ye geçildiğinde, 
    sadece bu arayüzü uygulayan yeni bir sınıf (Cypher sorguları ile) yazılacak.
    Mevcut sınıfların ve RAG akışının bu sınıfa dokunmasına gerek kalmayacak.
    """

    @abstractmethod
    def build_graph(self, edges: List[Dict[str, Any]]) -> None:
        """Uygulama kalkışında SQLite'tan alınan ilişkilerle grafiği çizer."""
        pass

    @abstractmethod
    def add_edges(self, edges: List[Dict[str, Any]]) -> None:
        """Sistemi sıfırdan kurmadan mevcut grafiğe yeni kenarlar ekler."""
        pass

    @abstractmethod
    def remove_nodes(self, node_ids: List[str]) -> None:
        """Graf içerisinden belirtilen düğümleri (ve onlara bağlı kenarları) siler."""
        pass

    @abstractmethod
    def get_related_nodes(self, node_id: str, max_depth: int = 1) -> List[Dict[str, Any]]:
        """Verilen ID'ye (belge veya chunk) komşu olan düğümleri döner."""
        pass

    @abstractmethod
    def get_shortest_path(self, source_id: str, target_id: str) -> List[str]:
        """İki düğüm arasındaki en kısa yolu bulur."""
        pass


class NetworkXGraphDB(GraphDBProvider):
    """
    Lazy SQL-Backed Graf Motoru.

    ── ESKİ MİMARİ (Kaldırıldı) ───────────────────────────────────────────────
    Uygulama başlangıcında TÜM ilişkileri RAM'e yükle → 1M+ kenarda dakikalar sürer.

    ── YENİ MİMARİ (Lazy Sub-graph) ───────────────────────────────────────────
    Graf tamamen stateless'tır. Herhangi bir düğüm sorgulandığında, yalnızca o
    düğümün istenen derinlikteki komşuları SQL'den anlık çekilir ve küçük bir
    geçici NetworkX nesnesi üzerinde BFS yapılır. İşlem bittikten sonra obje
    çöpe gider (GC). RAM ve startup süresi sıfıra yakın kalır.

    ► add_edges / remove_nodes: Gerçek zamanlı bridge.py güncellemeleri için
      hâlâ çağrılır ancak artık sadece konsol logu bırakır. SQL zaten
      tek hakikat kaynağıdır.
    """

    def __init__(self):
        # Global in-memory graph KALDIRILDI.
        # Sadece son eklenen kenarların sayısını loglama için tutuyoruz.
        self._edge_count_hint: int = 0

    # ── build_graph → No-Op ─────────────────────────────────────────────────
    def build_graph(self, edges: List[Dict[str, Any]]) -> None:
        """Artık kullanılmıyor. Geriye dönük uyumluluk için bırakıldı."""
        self._edge_count_hint = len(edges)
        print(f"[GRAPH] Lazy mod aktif — startup yüklemesi yok. {self._edge_count_hint} kenar SQL'de hazır.")

    # ── add_edges → Log only ─────────────────────────────────────────────────
    def add_edges(self, edges: List[Dict[str, Any]]) -> None:
        """Yeni kenarlar SQL'e bridge.py tarafından zaten yazılıyor. Burada ek eylem gerekmez."""
        self._edge_count_hint += len(edges)

    # ── remove_nodes → Log only ─────────────────────────────────────────────
    def remove_nodes(self, node_ids: List[str]) -> None:
        """Düğümler SQL'den zaten silindi. RAM'de tutulmadığından ek eylem gerekmez."""
        pass

    # ── get_related_nodes → Lazy SQL BFS ───────────────────────────────────
    def get_related_nodes(self, node_id: str, max_depth: int = 2) -> List[Dict[str, Any]]:
        """
        Sadece bu düğüm için SQL'den alt-graf (sub-graph) çeker.
        Geçici bir NetworkX nesnesi üzerinde BFS yapar ve yok eder.
        """
        try:
            from database.sql.session import get_session
            from database.sql.models import BilgiIliskisi
            from sqlalchemy import select, or_

            # BFS sınır kümesi: keşfedilecek düğümler
            frontier = {str(node_id)}
            visited: set[str] = set()
            all_edges: list[tuple[str, str, str, float]] = []

            for _ in range(max_depth):
                if not frontier:
                    break
                new_frontier: set[str] = set()
                # Bu turdaki tüm kenarları tek sorguda SQL'den çek
                try:
                    ids_as_ints = [int(n) for n in frontier if n.isdigit()]
                except ValueError:
                    ids_as_ints = []

                if not ids_as_ints:
                    break

                with get_session() as db:
                    stmt = select(BilgiIliskisi).where(
                        or_(
                            BilgiIliskisi.kaynak_parca_kimlik.in_(ids_as_ints),
                            BilgiIliskisi.hedef_parca_kimlik.in_(ids_as_ints),
                        )
                    ).limit(200)  # Derinlik başına max 200 kenar
                    rows = list(db.scalars(stmt).all())

                for row in rows:
                    src = str(row.kaynak_parca_kimlik)
                    tgt = str(row.hedef_parca_kimlik)
                    rel = row.iliski_turu or "bagli"
                    w   = float(row.agirlik or 1.0)
                    all_edges.append((src, tgt, rel, w))
                    # Henüz ziyaret edilmemiş komşuları bir sonraki tura ekle
                    if src not in visited: new_frontier.add(src)
                    if tgt not in visited: new_frontier.add(tgt)

                visited.update(frontier)
                frontier = new_frontier - visited

            if not all_edges:
                return []

            # Geçici sub-graph oluştur, BFS çalıştır, sil
            G = nx.DiGraph()
            for src, tgt, rel, w in all_edges:
                G.add_edge(src, tgt, relation=rel, weight=w)
                if rel in ("semantik_benzerlik", "ayni_sayfa"):
                    G.add_edge(tgt, src, relation=rel, weight=w)

            related = []
            if str(node_id) in G:
                bfs_edges = nx.bfs_edges(G, str(node_id), depth_limit=max_depth)
                for u, v in bfs_edges:
                    data = G.get_edge_data(u, v) or {}
                    related.append({
                        "source": u,
                        "target": v,
                        "relation": data.get("relation"),
                        "weight":   data.get("weight"),
                    })
            return related

        except Exception as e:
            print(f"[GRAPH-LAZY] get_related_nodes hatası: {e}")
            return []

    # ── get_shortest_path → Lazy SQL Sub-graph ──────────────────────────────
    def get_shortest_path(self, source_id: str, target_id: str) -> List[str]:
        """Her iki düğümü birleştiren alt-grafiği SQL'den çeker ve en kısa yolu bulur."""
        try:
            # Her iki başlangıç noktasından 3 derinlikte komşular çek
            neighbors_src = self.get_related_nodes(source_id, max_depth=3)
            neighbors_tgt = self.get_related_nodes(target_id, max_depth=3)

            G = nx.DiGraph()
            for item in neighbors_src + neighbors_tgt:
                G.add_edge(item["source"], item["target"],
                           relation=item.get("relation"), weight=item.get("weight", 1.0))
            return nx.shortest_path(G, source=str(source_id), target=str(target_id))
        except (nx.NetworkXNoPath, nx.NodeNotFound, Exception):
            return []


# Tüm uygulamanın kullanacağı tek noktadan servis bağlamı
graph_db = NetworkXGraphDB()
