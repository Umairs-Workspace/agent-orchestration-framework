---
doc: retrospective
updated: 2026-10-22
promotionFrom: 1
---
# 07 · An idle tick walks nothing — Retrospective

## R1 — the cost a budget is spent on was never a counted cause

- **Kind:** mistake · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Promoted to:** none
- **Raised by:** the F-04 profile

**What happened.** 00 closed a cause set that counted reads, requests and syncs but not the stat
walk. After 01–06 the daemon still idled at 6–7% of a core. The cause label could not say why, and
the answer took a CPU profile plus a preload counter: about three walks per tick, each already
over the idle budget on an aof-sized tree. 07 adds `stat-walk`.

**Why.** The set was drawn from the motivating log lines (disk reads, sync failures), not from what
the daemon's threads actually spend time on. A walk's cost lands on libuv's threadpool, which the
main-thread profiler does not sample either.

**Lesson.** When a daemon gets a cost meter, count every operation whose cost scales with the size
of the data it serves, not only the ones that produced the incident. Each per-tick walk or scan
needs a cause of its own.

**Refs:** STATE.md (F-04 profiled, 2026-10-22), ADR-001, ADR-009, VERIFICATION `@finding-F-04`.

## R2 — a fix sized against the wrong unit would have shipped red

- **Kind:** near-miss · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Promoted to:** none
- **Raised by:** the F-04 profile

**What happened.** The obvious fix was to share one digest per tick across the three sites. Measured
in CPU, one walk of an aof-sized tree (≈0.4 CPU-s in Linux, ≈1.1 on Windows) already spends the whole
0.3 CPU-s per-tick idle budget, so that fix could not have passed E1. The decision moved to a watch
before any code was written.

**Why.** 167/01/R2 was recalled and honoured: the walk's cost was measured as CPU per tick against the
budget's own unit, not as wall time.

**Lesson.** Before choosing between "do it less often" and "stop doing it", divide the operation's
CPU cost by the budget per period. When one occurrence spends the budget, only "stop doing it" can
pass.

**Refs:** ADR-009 (Alternatives), 167/01 R2.
