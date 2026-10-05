---
doc: state
---
# 148 · The memory corpus holds its vocabulary — State

## Progress

- [ ] `01_story_the-ranking-is-held-by-an-eval`: refined, contract authored (2 tasks)
- [ ] `02_story_a-lessons-meta-line-is-normalised-on-read`: refined, contract authored (3 tasks)
- [ ] `03_story_story-retrospectives-are-indexed`: refined, contract authored (1 task)
- [ ] `04_story_a-live-lessons-meta-line-is-held`: refined, contract authored (3 tasks)
- [ ] `05_story_memory-status-reports-conformance-and-layers`: refined, contract authored (2 tasks)

## Notes & decisions in flight

- **Refined 2026-10-04** (`aof:refine 148 --autonomous`, solo). ADR-001 to ADR-008, FF-14801 to
  FF-14803 declared `pending`. Graph built `2026-10-04T15:28:59Z`, code only.
- **Business questions, answered by the operator at the end review (2026-10-04):**
  - 148/02 Q1: a Kind outside the four is indexed as written and counted as non-enum. No synonym
    table.
  - 148/05 Q1: status names a lesson's layer as procedural.
- **Default decisions taken** (non-critical, in the ADRs, open to objection at review):
  - `tags` is a new array field under index version 2, departing from m39/ADR-001's reuse (ADR-003).
  - The vocabulary lives in `@aof/work/memory-vocabulary`, because validate cannot import
    `@aof/knowledge` (ADR-001).
  - Owner must be present but is not held to a list. The prompt prescribes "the role/lane" (ADR-002 §4).
  - A qualifier after the word is legal on a live lesson: `near-miss (recurring)` conforms (ADR-007).
  - The archived advisory is a doctor `warn` lane, one finding per file (ADR-007).
  - The eval guards the base ranking only. The graph re-rank reads a git-ignored artifact (ADR-005).
  - Staleness of a pre-version-2 store is reported by each backend, nested under `index` (ADR-003),
    and it moved from 05 to 02 during refine because only the backends hold the store's version.
  - 02's block-line rule moved to 05 when 02's map went over the four-rule limit.
- **Live non-conformers**: 26 lessons in 14 live retrospectives fail the hold today. 04 re-classifies
  them, keeping the written word as the qualifier. The list is re-measured at build, because
  134 to 136 may be archived first (134/01/R2).
- **Observation, not a question**: 23 lessons record what worked ("confirmed approach", "insight",
  "confirmation"), and no kind fits them. The SPEC holds the vocabulary as prescribed, so they count
  as non-enum. A fifth kind would be a SPEC change for a later item.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green (FF-14801 to FF-14803), each with its red probe in VERIFICATION
- [ ] `@manual` 148/04 task 02 recorded in VERIFICATION
