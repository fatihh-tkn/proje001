## 2026-04-27 - N+1 Query in `list_sessions` Endpoint
**Learning:** Found an extreme N+1 query loop in `backend/api/routes/settings.py` where fetching `limit=100` sessions could result in over 300 synchronous database calls (counting messages, fetching last messages, and summing tokens per session).
**Action:** When working with SQLAlchemy aggregations across lists, pre-fetch relationship data using `IN` clauses with `GROUP BY` and convert results into maps (O(1) lookups) before the loop to reduce queries down to exactly 1 + N(queries per entity block) overall.
## 2026-04-27 - N+1 Memory Bloat in `get_live_dashboard` endpoint
**Learning:** A significant memory bloat occurred in `backend/api/routes/auth.py` where thousands of `ApiLog` records were loaded directly into a Python list and iterated over just to count totals per user.
**Action:** When working with analytical endpoints spanning an entire day or broad time ranges, always use SQLAlchemy's `group_by` with `func.count` and `func.sum` directly at the database level rather than fetching scalar objects into memory.
