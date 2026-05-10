## 2026-04-27 - N+1 Query in `list_sessions` Endpoint
**Learning:** Found an extreme N+1 query loop in `backend/api/routes/settings.py` where fetching `limit=100` sessions could result in over 300 synchronous database calls (counting messages, fetching last messages, and summing tokens per session).
**Action:** When working with SQLAlchemy aggregations across lists, pre-fetch relationship data using `IN` clauses with `GROUP BY` and convert results into maps (O(1) lookups) before the loop to reduce queries down to exactly 1 + N(queries per entity block) overall.
## 2026-05-15 - Unbounded Previews causing DB Memory Bloat & N+1 Queries
**Learning:** In the `archive.py` (`arsiv_listele` endpoint), iterating over documents to fetch relationships inside a loop, while also doing unbounded fetches of array elements just to compute their `.all()[:5]` or `len()`, results in severe N+1 memory and IO bloat.
**Action:** Use batched O(1) map mechanisms instead. Group aggregate fields (like counts) using `func.count() + group_by` and use SQL Window Functions like `func.row_number().over()` for retrieving constrained N-item previews per entity without fetching all child records into memory.
