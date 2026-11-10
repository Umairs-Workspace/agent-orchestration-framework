---
doc: retrospective
updated: 2026-10-22
promotionFrom: 1
---
# 02 · An idle view costs almost nothing — Retrospective

## R1 — a field that moves on every read would have defeated every 304

- **Kind:** near-miss · **Area:** architecture · **Stage:** build · **Owner:** developer · **Promoted to:** none
- **Raised by:** the 02 build

**What happened.** ADR-004 made the `ETag` a hash of the body. The fleet's body carries
`diagnostics.generatedAt`, which moves on every read and which no view renders. Hashing it would
have made every poll a change. The build excludes it from the tag.

**Why.** "Hash the body" assumed the body is a pure function of the state it shows.

**Lesson.** Before tagging a response, list its fields that change without the state changing
(timestamps, request ids) and keep them out of the tag.

**Refs:** STATE.md (167/02 build), ADR-004.

## R2 — the near-miss recall was taken after the build

- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Promoted to:** none
- **Raised by:** the 02 build

**What happened.** The build's near-miss recall ran after the build, not before it. m21/R2 (a
watched Resync pins the board's poll at the base) was recalled late. Before that, the probe's
slowing beside a pinned watch poll had given the board two cadences.

**Why.** The recall was treated as a report step, not an input.

**Lesson.** Take the near-miss recall before the first edit; a lesson recalled after the build only
documents the miss.

**Refs:** STATE.md (167/02 build), m21/R2.
