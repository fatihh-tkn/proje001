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
    def get_related_nodes(self, node_id: str, max_depth: int = 1) -> List[Dict[str, Any]]:
        """Verilen ID'ye (belge veya chunk) komşu olan düğümleri döner."""
        pass

    @abstractmethod
    def get_shortest_path(self, source_id: str, target_id: str) -> List[str]:
        """İki düğüm arasındaki en kısa yolu bulur."""
        pass


class NetworkXGraphDB(GraphDBProvider):
    """
    Şu anki in-memory (RAM) tabanlı hafif bilgi grafiği motoru.
    Her FastAPI startup'ında veriler SQLite'taki 'knowledge_edges' tablosundan 
    okunup buraya yüklenir. Graph asla primary (ana) db değildir.
    """

    def __init__(self):
        self.graph = nx.DiGraph()

    def build_graph(self, edges: List[Dict[str, Any]]) -> None:
        self.graph.clear()
        for edge in edges:
            source = edge.get("from_id")
            target = edge.get("to_id")
            rel = edge.get("relation")
            weight = edge.get("weight", 1.0)
            if source and target:
                self.graph.add_edge(source, target, relation=rel, weight=weight)

    def get_related_nodes(self, node_id: str, max_depth: int = 1) -> List[Dict[str, Any]]:
        if node_id not in self.graph:
            return []
        
        related = []
        try:
            # Verilen depth limitine kadar BFS ile etraftaki node'ları tara
            bfs_edges = nx.bfs_edges(self.graph, node_id, depth_limit=max_depth)
            for u, v in bfs_edges:
                data = self.graph.get_edge_data(u, v)
                related.append({
                    "source": u,
                    "target": v,
                    "relation": data.get("relation"),
                    "weight": data.get("weight")
                })
        except Exception as e:
            print(f"Graph related nodes arama hatasi: {e}")
            
        return related

    def get_shortest_path(self, source_id: str, target_id: str) -> List[str]:
        try:
            return nx.shortest_path(self.graph, source=source_id, target=target_id)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return []


# Tüm uygulamanın kullanacağı tek noktadan servis bağlamı
graph_db = NetworkXGraphDB()
