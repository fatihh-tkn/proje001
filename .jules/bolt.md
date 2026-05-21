## 2026-04-27 - N+1 Query in `list_sessions` Endpoint
**Learning:** Found an extreme N+1 query loop in `backend/api/routes/settings.py` where fetching `limit=100` sessions could result in over 300 synchronous database calls (counting messages, fetching last messages, and summing tokens per session).
**Action:** When working with SQLAlchemy aggregations across lists, pre-fetch relationship data using `IN` clauses with `GROUP BY` and convert results into maps (O(1) lookups) before the loop to reduce queries down to exactly 1 + N(queries per entity block) overall.
## 2026-04-27 - Unnecessary re-renders from expensive array operations
**Learning:** In React components like `TeknikResimViewer`, recalculating filtered arrays and derived aggregate counts (`filter()`, `length`) directly in the render body creates performance bottlenecks, especially when typing in search bars or during drag-and-drop interactions, as it causes massive O(N) recalculations on every keystroke/mouse move.
**Action:** Always wrap expensive derived states (like filtered lists, grouping, mapping, or aggregations) in `useMemo` so that they only recalculate when their dependencies change.
