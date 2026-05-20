## 2026-04-27 - N+1 Query in `list_sessions` Endpoint
**Learning:** Found an extreme N+1 query loop in `backend/api/routes/settings.py` where fetching `limit=100` sessions could result in over 300 synchronous database calls (counting messages, fetching last messages, and summing tokens per session).
**Action:** When working with SQLAlchemy aggregations across lists, pre-fetch relationship data using `IN` clauses with `GROUP BY` and convert results into maps (O(1) lookups) before the loop to reduce queries down to exactly 1 + N(queries per entity block) overall.

## 2026-04-27 - N+1 Query & Chunk Memory Bloat in Archive Endpoints
**Learning:** Found a severe memory and database load issue in `archive.py` where listing N documents triggered N iterative `db.scalars(select(VektorParcasi)).all()` calls. This fetched entire arrays of chunks into Python memory simply to call `len()` and take a `[:5]` preview.
**Action:** Always replace `len(db.scalars().all())` with a proper SQL `func.count()`. For N+1 aggregations in lists, map aggregated `func.count()` results and `row_number() over (partition by ...)` preview bounds via batched `IN` queries into O(1) dictionary lookups *before* iterating over the main entities.
