---
doc: state
---
# 167 · The daemon stays within a resource budget — State

## Progress

- [x] Captured and promoted 2026-10-20; refined the same day (`--autonomous`, solo): ADR-001…007,
  FF-16701…16704, six stories with example maps and plans.
- [x] Built and reviewed 2026-10-20…21 (solo): 00, 01, 02, 03, 05; 04 stopped red on the budget.
- [x] 06 found by 04's soak (the runs walk), refined, built and accepted 2026-10-21…22 (ADR-008,
  FF-16705).
- [x] 07 found by profiling F-04 (the stat walk), refined, built and accepted 2026-10-22 (ADR-009,
  FF-16706); 04 then green and accepted.
- [x] Verified 2026-10-22 (`aof:verify 167`): 00…07 accepted; the milestone gate repaired and
  green.
  - [x] Whole-tree regression gate green at `7514acf1` (`REGRESSION.md`)

## Notes & decisions

Durable decisions live in ARCHITECTURE (ADR-001…009, FF-16701…16706). ADR-009 was amended at the
milestone gate: the tick arms its watches before it walks.

- The budget is 2% of a core idle and 10% viewer-open (00 Q1), declared once in
  `cost-meter.mjs` (FF-16702).
- The technical defaults taken at refine are recorded in each story's example map.
- Measured, and kept as the reason for ADR-009: one stat walk of an aof-sized tree costs ≈1.1
  CPU-s on Windows and ≈0.4 in Linux, against a 0.3 CPU-s per-tick idle budget.

Carried forward (open, non-blocking): F-02 and F-03 (06's verb-warning and heartbeat gaps), F-05
(03's skip-line wording), F-07 (02 has no mounted cadence case), F-08 (the desktop guard not
observed live), and F-11, F-12 and F-13 (Nits). Not in scope, named at refine: the desktop
supervisor's 3-second `mesh status --json` spawn is unmeasured (OUTCOME gap).

The build, review and gate blow-by-blow, and the feedback notes, graduated into `VERIFICATION.md`,
the stories' retrospectives and the milestone `RETROSPECTIVE.md` at accept (2026-10-22).

## Verification

- [x] `@executable` suite green: the whole-tree gate in `REGRESSION.md` (sharded, 15.3 min)
- [x] Fitness functions green (FF-16701…16706), each with a red probe (`VERIFICATION.md`)
- [x] Soak test under budget on the control node: 04's suite green on the Windows host, twice
