# 148 · The memory corpus holds its vocabulary — Outcome

## Delivered

### Every lesson is reachable by the kind it states
Across the whole corpus — milestone and story retrospectives, live and archived — a lesson that states a kind is indexed under its enum word (m148/02, m148/03), a live lesson cannot be written outside the vocabulary (m148/04), and `memory status` shows what is left blank or non-enum per field (m148/05).

### Signing off an item reads no other item's state
The whole-tree suite asserts nothing about which items are archived, where a gate sits, the citations inside done records, or an archived milestone's ledger; a citation sweep reads only the documents of items that are not done (F-148-06).

## Assumptions

- **A lesson with no stated kind stays blank** — it is counted by `memory status` and never inferred, so its reach by kind depends on its author writing one.

## Gaps

### The retrieval eval reads the live corpus
- **Status:** open
- **Discharge condition:** FF-14801 runs over a corpus that a later item's lessons cannot change (a frozen fixture), or the operator rules that the eval may gate on the live pool.
FF-14801 ranks against records built from today's `wiki/work`, so a later item's new lessons can move a pair out of the block and fail that item's gate (m148/01; ADR-005 chose the live pool).

### Lessons that record what worked have no kind
- **Status:** open
- **Discharge condition:** a SPEC adds a kind for confirmed approaches, or rules them out of the vocabulary.
23 lessons record a confirmed approach or an insight, and none of the four kinds fits them, so they count as non-enum (F-148-04).
