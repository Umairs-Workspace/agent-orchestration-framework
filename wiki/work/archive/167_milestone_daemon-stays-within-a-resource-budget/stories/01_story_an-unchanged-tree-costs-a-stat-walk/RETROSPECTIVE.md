---
doc: retrospective
updated: 2026-10-22
promotionFrom: 1
---
# 01 · An unchanged work tree costs a stat walk — Retrospective

## R1 — the stat digest alone would have served a new folder stale

- **Kind:** near-miss · **Area:** architecture · **Stage:** build · **Owner:** architect · **Promoted to:** none
- **Raised by:** the 01 build

**What happened.** ADR-003 keyed the read memo on the stat digest. The digest sees only `.md` and
`.feature` files, so a folder made or renamed with no record doc in it would have left the digest
unchanged, and the memo would have answered with the old items. The build also keys on the tree's
directory shape and added a case beside E3.

**Why.** The digest was designed as the sync pass's change gate, where a folder with no record doc
is not yet a change. The memo reused it for a read whose answer a folder alone does change.

**Lesson.** When a fingerprint is reused as a cache key, list what the cached answer depends on and
check that the fingerprint moves for each of them.

**Refs:** STATE.md (167/01 build), ADR-003, 164/ADR-002.

## R2 — ADR-003's cost figure was wall time, not CPU

- **Kind:** mistake · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Promoted to:** none
- **Raised by:** the 04 build

**What happened.** ADR-003 put a walk of aof's tree at ≈240 ms. That was wall time with the stats
concurrent. 04 measured ≈1.1 CPU-s per walk on Windows, about 7% of a core at a 15 s tick.

**Why.** A daemon budget is CPU, and the figure was taken with a wall clock.

**Lesson.** When a decision rests on a cost, measure it in the budget's own unit (CPU-seconds for a
CPU budget), on the platform the budget holds on.

**Refs:** STATE.md (167/04 build), m160/12 R2.
