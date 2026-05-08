## 2026-04-27 - N+1 Query in `list_sessions` Endpoint
**Learning:** Found an extreme N+1 query loop in `backend/api/routes/settings.py` where fetching `limit=100` sessions could result in over 300 synchronous database calls (counting messages, fetching last messages, and summing tokens per session).
**Action:** When working with SQLAlchemy aggregations across lists, pre-fetch relationship data using `IN` clauses with `GROUP BY` and convert results into maps (O(1) lookups) before the loop to reduce queries down to exactly 1 + N(queries per entity block) overall.

## 2026-04-27 - Massive Memory Bloat in `get_live_dashboard` Endpoint
**Learning:** Found a major bottleneck in `backend/api/routes/auth.py` where all daily API logs were being fetched into memory via `list(db.scalars(...).all())` to manually compute sums and counts in Python. For active endpoints with many rows, this causes severe memory bloat and eventual out-of-memory crashes.
**Action:** Always offload large aggregations to the database engine using `func.count()`, `func.sum()`, and `GROUP BY`, especially when full row data isn't needed. Fetching directly as aggregated metrics reduces memory complexity from O(N) to O(1) in application memory.
