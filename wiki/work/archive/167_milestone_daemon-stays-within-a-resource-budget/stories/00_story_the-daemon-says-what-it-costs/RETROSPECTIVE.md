---
doc: retrospective
updated: 2026-10-22
promotionFrom: 1
---
# 00 · The daemon says what it costs — Retrospective

## R1 — a scenario named the daemon that does not serve the route

- **Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect · **Promoted to:** none
- **Raised by:** the 00 build

**What happened.** E1 says "serve counters" count the board's `/api/work/list` polls. In
production `mesh ui` hosts the board server, so those polls are counted in the `ui` snapshot. The
build proved the rule, and two downstream stories (04's red probe, 05's guard) had to be told to
expect a board-poll storm under `ui`.

**Why.** The scenario was written from the milestone's motivating evidence (`serve` burning a core),
not from ADR-002's map of which process serves which route.

**Lesson.** When a scenario names a process, check it against the route-to-process map at refine,
and carry the right name into every sibling story that reads the same counters.

**Refs:** STATE.md `## Feedback (for retro)` (167/00 build), ADR-002.

## R2 — a sample taken after its base made the first window empty one run in two

- **Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Promoted to:** none
- **Raised by:** the 03 build

**What happened.** 00's snapshot writer sampled before it snapshotted. Whenever the clock moved a
millisecond between the two, the first window's base was "now" and `topCauses` came out empty. 00's
own launcher case was red one run in two. It was found and fixed in 03's build, not 00's.

**Why.** The window's base and its sample were two reads of a moving clock, and the green run did
not reveal the order dependence.

**Lesson.** Take a window's base before the reading it is measured against, and run a
clock-dependent case more than once before calling it green.

**Refs:** STATE.md (167/03 build), `packages/foundation/src/cost-meter.mjs`.
