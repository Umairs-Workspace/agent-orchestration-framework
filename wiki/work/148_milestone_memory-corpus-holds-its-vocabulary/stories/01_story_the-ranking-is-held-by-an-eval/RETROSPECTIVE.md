---
doc: retrospective
updated: 2026-10-06
---
# 01 · The ranking is held by an eval — Retrospective

The build ran solo. One lesson, and it is a recurrence.

## R1 — `--scope impacted` ran the whole suite on the control node

- **Kind:** mistake (recurring) · **Area:** process (testing) · **Stage:** build · **Owner:** developer · **Raised by:** developer
- **What happened:** `aof test --scope impacted --story 148/01` widened to every suite, because both of the story's declared test files were new. It ran on the control node, where the live daemon holds `:4182`, and was stopped by hand.
- **Why:** The impacted selection has no importer to start from for a file that does not exist yet, so it falls back to the whole tree. 129/03/R7 and 134/02/R1 record the same widening, and the brief still named `impacted` as the story lane.
- **Lesson:** A story lane is `node scripts/test.mjs --only <files>`, built from the story's declared test files and the suites that import its changed sources. Never use `--scope impacted` while the widening stays unbounded.
- **Refs:** m129/03/R7 · m134/02/R1
