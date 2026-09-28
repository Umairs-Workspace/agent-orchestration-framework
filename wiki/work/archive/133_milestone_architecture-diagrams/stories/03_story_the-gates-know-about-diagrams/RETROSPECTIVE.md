---
doc: retrospective
updated: 2026-09-23
---
# 03 · The gates know about diagrams — Retrospective

## R1 — "one free slot" was counted from a table whose allowances are all zero

- **Kind:** mistake · **Area:** planning · **Stage:** refine · **Owner:** architect
- **Raised by:** the 03 build (and again at 04)

**What happened.** ADR-010 counted a free slot in `test/work`, `test/ui` and `test/arch/ui`. Every
budget row's ceiling equals its count (allowance 0), so no layer had headroom. Rows rose
58 → 59, 57 → 58 and 34 → 35 at build, and 04's declared write set missed the budget file.

**Lesson.** Read headroom from the budget table's `ceiling - count`, never from `ls`. Under the
allowance-0 rule every new test file is a row raise, so it belongs in the story's `files:`.

## R2 — a `*_FINDING_CODES` suffix would have changed the lane's severity class

- **Kind:** near-miss · **Area:** implementation · **Stage:** build · **Owner:** developer
- **Raised by:** the 03 build, against FF-12402

**What happened.** The lane's codes were almost exported as `*_FINDING_CODES`. That suffix marks the
advisory class, so FF-12402 would have required `warn`-only, while this lane gates by status. They
are exported as `DIAGRAM_LANE_CODES`.

**Lesson.** An export's name can carry meaning to a control. Grep the controls for a suffix before
reusing it.
