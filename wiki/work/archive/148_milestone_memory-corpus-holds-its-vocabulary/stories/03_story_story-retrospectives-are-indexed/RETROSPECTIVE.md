---
doc: retrospective
updated: 2026-10-06
---
# 03 · Story retrospectives are indexed — Retrospective

The build ran solo. One lesson.

## R1 — A recorded-query pair in a near-tie reordered when the pool grew

- **Kind:** near-miss · **Area:** process (testing) · **Stage:** build · **Owner:** developer · **Raised by:** developer
- **What happened:** When 299 story lessons joined the pool, FF-14801 lost 126's recorded query. It had ranked 36/ADR-002 fourth, in a near-tie with 68/ADR-002 and 53/ADR-004, all within 0.14. The new term statistics reordered the tie to sixth. No story lesson entered the top five. The pair was moved to the gist that 126's recall recorded for 36/ADR-002, and the reason is written beside it in the table. Verify re-ranked the original query and confirmed that reading.
- **Why:** A recorded query whose record sits in a near-tie is held only by the term statistics of the whole pool, and any change to the pool shifts them. ADR-005 rejected a rank-1 pass line for this reason, but rank five has the same edge.
- **Lesson:** When a pool change loses a pair, re-rank the original query and read who displaced the record. Move the pair only when no unrelated record entered the block, and write the reason in the table. A pair in a near-tie is a weak witness, so choose recorded-query pairs with a margin.
- **Refs:** m148/ADR-005 · `test/arch/memory/acd-memory-retrieval-eval.test.mjs` (the MOVED note)
