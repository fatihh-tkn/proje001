## 2026-04-27 - N+1 Query in `list_sessions` Endpoint
**Learning:** Found an extreme N+1 query loop in `backend/api/routes/settings.py` where fetching `limit=100` sessions could result in over 300 synchronous database calls (counting messages, fetching last messages, and summing tokens per session).
**Action:** When working with SQLAlchemy aggregations across lists, pre-fetch relationship data using `IN` clauses with `GROUP BY` and convert results into maps (O(1) lookups) before the loop to reduce queries down to exactly 1 + N(queries per entity block) overall.

## 2024-05-02 - Memory/Performance Bloat in `get_live_dashboard` Endpoint
**Learning:** The live dashboard endpoint was pulling all `ApiLog` records matching the current date into memory just to aggregate them (using `list(logs_db.scalars(...).all())` and summing `toplam_token` and lengths via a python `for` loop). This created huge memory bloat per request since all rows were fetched instead of using SQL aggregations.
**Action:** When calculating statistics or sums, offload the aggregation to the database using SQLAlchemy `group_by`, `func.count()`, and `func.sum()` instead of fetching rows into application memory.
