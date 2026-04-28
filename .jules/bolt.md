## 2024-04-28 - [O(N) List Lookup in Graph Edge Generation]
**Learning:** Found a performance anti-pattern in `backend/api/routes/bridge.py` where deduplicating semantic edges for the knowledge graph used a list comprehension `if not any(...)` within nested loops iterating over chunk neighbors. This resulted in O(N^2) complexity and significant ingestion delays for large documents.
**Action:** Always use an auxiliary `set` for O(1) existence checks when adding unique elements to a list, especially during graph node/edge creation or bulk database inserts.
