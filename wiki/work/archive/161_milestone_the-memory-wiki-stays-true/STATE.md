# 161 · State

## Closure

Accepted 2026-10-15 by `aof:verify 161`. Both stories are done. The whole-tree
regression gate is green at `b4487fdc` (REGRESSION.md, second row); the first run,
at `8255b60f`, was red, and its reds are VERIFICATION F-02..F-06, all closed.

- **Decisions graduated.** The technical defaults chosen at refine (fixed direct wiki
  scope, warning-only doctor codes, file-only resolution with no line-existence
  gate, workspace visibility under item scope) are ADR-001's. Story 02's
  documentation boundary is ADR-002's. Nothing else here is durable.
- **Lessons.** RETROSPECTIVE R1 (concurrent lane grades outran the 30-minute grade
  deadline) and 161/01's R1 (a new kernel module missed the package-boundary
  allow-list) are indexed. Story 02 built cleanly and carries no retrospective.
- **Carried follow-up.** None. The grade-deadline headroom in R1 is the operator's
  `work.loop.heartbeatMs` decision, not open work here.
