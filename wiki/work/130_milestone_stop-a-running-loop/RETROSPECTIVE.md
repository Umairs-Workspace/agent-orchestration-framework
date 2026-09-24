---
type: milestone
doc: retrospective
number: 130
slug: stop-a-running-loop
title: "Retrospective — stop a running loop"
created: 2026-09-24
updated: 2026-09-24
---
# 130 · Retrospective

Milestone-level lessons: the ones no single story's retrospective states. Story lessons live in
`stories/*/RETROSPECTIVE.md` (06's carries the live-run lessons). Findings are **referenced**, never
restated; they live in `VERIFICATION.md`.

## R1 — A standalone story accepted without the gate bills the next milestone door

- **Kind:** process · **Area:** gates · **Stage:** verify · **Owner:** the operator · **Raised by:** F-15, F-16, F-17

**What happened.** Four of the eight whole-tree reds at this door were 137's. 137 was a parentless
story, accepted on its own scoped lane, and it added four files without raising their budget rows. It
also pulled a module into the session driver's static reach and asserted a census as a literal. No
milestone gate runs for a standalone story, so the first milestone door after it took all of them.

**Why.** 127/R1 named this for lanes on a shared branch. A standalone story is the same shape with
no door of its own: story-scoped greens were enough to accept it.

**Lesson.** A standalone story that adds a file to a budgeted directory, or a module to `src/`, runs
the arch register (`test/arch/**`) in its own lane before `done`. It is minutes against the hour a
later door spends attributing it.

## R2 — The live story found what the suites could not, because the suites had no history

- **Kind:** defect · **Area:** verification · **Stage:** verify · **Owner:** architect · **Raised by:** F-01, F-02

**What happened.** Over 150 contract scenarios were green when 130/06 began. The first live `--stop`
hit a dead 2026-09-10 loop resurrected by an operator's `aof work resume`. The desktop could not stop
the only kind of loop anyone on this machine starts (a console one). Both defects live where the
system meets its own past: old run records, and 126's relaunch predicate for a foreground declaration.

**Lesson.** A milestone that changes how existing state is READ (the latest declaration, a
supervisor's relaunch rule) owes one fixture built from the real store's awkward cases: an old
lineage, a retry, a console-started supervised loop. Otherwise the `@manual` story is the first
place those cases are met.

## R3 — The refine's measured facts aged while a sibling milestone ran on the same shell

- **Kind:** process · **Area:** refine · **Stage:** build · **Owner:** architect · **Raised by:** 130/02 R1, 130/05 R2

**What happened.** 130 was refined on 2026-09-13 against the shell at `9f6be4be`. 129/04 then moved
the drive/settle trio and the wave into `src/loop/`, and 129/01 and 129/05 grew `LOOP_STOPS` and the
arch row. Every story built on 2026-09-21 met stale line numbers, counts and write sets. The deltas
held, so no contract failed, but four stories each widened `files:` and restated a literal.

**Lesson.** When a milestone's refine names another open milestone as owning the same file, re-run
the refine's measured-facts table at the build's start. It is one pass, and it turns four stories'
separate discoveries into one correction.

## R4 — The accept door graduates what the stories ratified, or the ADRs keep saying the old thing

- **Kind:** process · **Area:** records · **Stage:** verify · **Owner:** product-owner · **Raised by:** STATE `## Notes`

**What happened.** Five corrections were ratified "at Accept" across the build. They are `LOOP_STOPS`
fifteen not twelve, the drive-keyed rung memory, `STOP_STATES`, the row delta, and 03's eight-file
`ui/` diff. Until this door, the ADRs a later milestone recalls still carried the refine's wording.

**Lesson.** A "graduates at Accept" note is a debt with a named door. The verify that closes the
milestone walks STATE's `## Notes` for that phrase and edits the ADR text in place, marked as
graduated. Done here.
