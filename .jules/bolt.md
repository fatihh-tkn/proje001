## 2026-04-27 - N+1 Query in `list_sessions` Endpoint
**Learning:** Found an extreme N+1 query loop in `backend/api/routes/settings.py` where fetching `limit=100` sessions could result in over 300 synchronous database calls (counting messages, fetching last messages, and summing tokens per session).
**Action:** When working with SQLAlchemy aggregations across lists, pre-fetch relationship data using `IN` clauses with `GROUP BY` and convert results into maps (O(1) lookups) before the loop to reduce queries down to exactly 1 + N(queries per entity block) overall.

## 2024-04-30 - N+1 Query & Memory Bloat in SQLAlchemy Serialization
**Learning:** Using `len(db.scalars(select(NestedTable)...).all())` during loop-based serialization scales exponentially worse for heavy one-to-many relationships (like Document -> VectorChunks), causing excessive memory overhead and severe N+1 SQL queries.
**Action:** Always pre-fetch grouped counts via `.group_by()` in dictionary maps (`dict(db.execute(...).all())`), batch SQL `IN` queries (with limits like SQLite's 900 params), and use `db.scalar(func.count(...))` instead of pulling array bodies simply to calculate length.
