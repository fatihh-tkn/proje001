## 2026-04-27 - N+1 Query in `list_sessions` Endpoint
**Learning:** Found an extreme N+1 query loop in `backend/api/routes/settings.py` where fetching `limit=100` sessions could result in over 300 synchronous database calls (counting messages, fetching last messages, and summing tokens per session).
**Action:** When working with SQLAlchemy aggregations across lists, pre-fetch relationship data using `IN` clauses with `GROUP BY` and convert results into maps (O(1) lookups) before the loop to reduce queries down to exactly 1 + N(queries per entity block) overall.

## 2026-04-27 - N+1 Query in `arsiv_listele` Endpoint
**Learning:** The `/api/v1/archive/list` endpoint had a severe N+1 query vulnerability because it iterated over every document in the result set to fetch `db.scalars(select(VektorParcasi).where(VektorParcasi.belge_kimlik == b.kimlik)).all()` in order to count chunks and preview the first 5 chunks.
**Action:** When resolving N+1 queries by fetching relationships with an `IN` clause, avoid pulling unbounded related rows into memory. Instead, use aggregate queries (like `func.count()`) mapped to dictionaries for O(1) lookups and use `row_number() over (partition by ...)` subqueries to maintain database-level limits per partition safely.
