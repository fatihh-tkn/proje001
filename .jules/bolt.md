## 2026-04-27 - N+1 Query in `list_sessions` Endpoint
**Learning:** Found an extreme N+1 query loop in `backend/api/routes/settings.py` where fetching `limit=100` sessions could result in over 300 synchronous database calls (counting messages, fetching last messages, and summing tokens per session).
**Action:** When working with SQLAlchemy aggregations across lists, pre-fetch relationship data using `IN` clauses with `GROUP BY` and convert results into maps (O(1) lookups) before the loop to reduce queries down to exactly 1 + N(queries per entity block) overall.

## 2026-04-27 - N+1 Query in `arsiv_listele` Endpoint
**Learning:** The `/list` and related user/system document endpoints in `archive.py` executed repetitive single-record database calls inside a loop (`db.scalars(...).all()`) to find chunks and usernames for every document in the result set, creating an N+1 query issue that dramatically increased response times.
**Action:** Always batch fetch related models using SQLAlchemy `IN` clauses and `group_by` aggregates or partitioned `row_number()` windows to populate lookup dictionaries prior to looping through large sequences of parent rows.
