---
doc: retrospective
promotionFrom: 1
---
# 03 · A workflow detects an external edit and recovers on operator request — retrospective

## R1 · A new loop check never reached the shell, because the core binding copies cycle members by name

**Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** The build added `boardConflictHalt` to the loop cycle in `packages/work-loop/src/cycle.mjs`. `packages/core/src/application/bindings/commands/loop.mjs` builds the shell's cycle by copying named members, so the new check was dropped before it reached the running loop. Only a loop-level test caught it, in review round one.

**Why:** The cycle has two homes, the work-loop package's object and core's named copy of it, and nothing fails when a member is added to one and not the other.

**Lesson:** When a loop cycle member is added, add it to core's named copy in the same change, and prove it with a case that runs the assembled loop rather than the work-loop object.

**Refs:** STATE `## Feedback (for retro)` (209/03 review round one, Blocker 2).

## R2 · The board poll held the journal's write claim across its network reads

**Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** developer · **Raised by:** reviewer · **Promoted to:** none

**What happened:** The first poll took the board journal's write claim and then read the board. A second claimant is refused at once, so an operator's status change could have failed several times a minute. The reads now happen outside the claim.

**Why:** The claim was placed around the whole observation rather than around the journal write it protects.

**Lesson:** Take a refuse-at-once claim only around the local write it guards, never across a provider round trip.

**Refs:** STATE `## Feedback (for retro)` (209/03 review round one, Blocker 1).

## R3 · The declared write set was short by seven files

**Kind:** mistake · **Area:** process (planning) · **Stage:** refine · **Owner:** architect · **Raised by:** developer · **Promoted to:** none

**What happened:** The build changed the lazy store's forwarding, placement, the loop command, the wave, core's loop binding, the core command count and a wave suite, none of them declared. The undeclared wave change was where the conflict was first reported as the repairable `lane-open-failed`.

**Why:** The refine traced the stop through the store and the cycle but not through every door that refuses work: lanes, placement and the core assembly.

**Lesson:** When a new stop is refined, list every door that must refuse on it (status, loop phase, dispatch, lanes, placement) and each module that assembles one, and declare them.

**Refs:** STATE `## Feedback (for retro)` (209/03 write set, review Blocker 3).
