---
doc: state
---
# 148 · The memory corpus holds its vocabulary — State

## Progress

- [x] `01_story_the-ranking-is-held-by-an-eval`: built, reviewed and accepted 2026-10-06 (2 tasks)
- [x] `02_story_a-lessons-meta-line-is-normalised-on-read`: built, reviewed and accepted 2026-10-06 (3 tasks)
- [x] `03_story_story-retrospectives-are-indexed`: built, reviewed and accepted 2026-10-06 (1 task)
- [x] `04_story_a-live-lessons-meta-line-is-held`: built, reviewed and accepted 2026-10-06 (3 tasks)
- [x] `05_story_memory-status-reports-conformance-and-layers`: built, reviewed and accepted 2026-10-06 (2 tasks)

## Notes & decisions in flight

Compacted at accept, 2026-10-06. The durable decisions are ARCHITECTURE ADR-001 to ADR-008. The
operator's two refine answers are recorded there too: a Kind outside the four is indexed as written and
counted as non-enum, and a lesson's layer is procedural. The measured figures and every finding are in
VERIFICATION.

## Verification

- [x] `@executable` suite green — the whole-tree gate is green at `62449ab2` (REGRESSION.md)
- [x] Fitness functions green (FF-14801 to FF-14803), each with its red probe in VERIFICATION
- [x] `@manual` 148/04 task 02 recorded in VERIFICATION

## Feedback (for retro)

Archived at accept. The notes graduated to RETROSPECTIVE R1 to R3 and to each story's own
`RETROSPECTIVE.md`, and the full log is in git history before this commit.
