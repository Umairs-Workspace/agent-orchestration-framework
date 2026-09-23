---
type: story
number: 00
slug: the-loop-says-what-it-is-doing-and-counts-what-it-did
title: "The loop says what it is doing and counts what it did — a clock over the attempt series, narration through the one printer it already has, and a `--quiet` that silences nothing that matters"
parent: 126
depends: []
status: done
owner: product-owner
created: 2026-09-08
updated: 2026-09-09
adrs: [ADR-001, ADR-002]
reads:
  - wiki/work/126_milestone_the-declaration-is-the-unit/ARCHITECTURE.md#ADR-001
  - wiki/work/126_milestone_the-declaration-is-the-unit/ARCHITECTURE.md#ADR-002
  - wiki/work/69_milestone_loop-bounds/ARCHITECTURE.md#ADR-002
  - wiki/work/53_milestone_loop-artifact/ARCHITECTURE.md#ADR-005
  - wiki/work/53_milestone_loop-artifact/ARCHITECTURE.md#ADR-016
  - wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/stories/00_story_the-census-reports-its-denominator/runs/node-7297/20260907T233233272Z-0000.json
  - src/run-store.mjs
  - src/loop-bounds.mjs
  - src/effects/run-transitions.mjs
  - src/commands/drive.mjs
  - src/spine/face.mjs
  - test/arch/command/acd-console-log-confined.test.mjs
  - test/arch/loop/acd-loop-probe-contract.test.mjs
  - test/loop/loop-command-probe.test.mjs
  - test/loop/loop-command-stops.test.mjs
  - test/loop/warm-fix-loop.test.mjs
  - test/loop/loop-driven-row-carries-the-grade.test.mjs
  - test/loop/loop-progress-production.test.mjs
  - test/loop/work-loop-production-review-bound.test.mjs
files:
  - src/work/loop.mjs
  - src/commands/loop.mjs
  - test/work/four-deadlines.test.mjs
  - test/loop/loop-command-resume.test.mjs
  - test/loop/loop-command-narration.test.mjs
  - test/loop/index.mjs
  - test/arch/loop/acd-clock-counts-attempts.test.mjs
  - test/arch/loop/acd-loop-narrates-in-flight.test.mjs
  - test/arch/loop/index.mjs
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 00 · The loop says what it is doing and counts what it did

## User story

As **an operator who left `aof work loop` running and came back to it hours later**,
I want **the loop to have told me, while it ran, which ref it was driving at which cycle of which
cap — and, when I resume it after the machine slept, to be charged for the minutes it worked rather
than the hours the lid was closed**,
so that **a running loop is distinguishable from a hung process, and a declaration halted only by
downtime is resumable instead of permanently refused on a deadline nothing consumed**.

Two defects, one file pair, one story. The **clock** is `69/ADR-002`'s stated intent restored —
*"total across all attempts"*, running *"from the moment the attempt starts"* — measured against the
attempt series the `retryOf` lineage already records, so 29.8 minutes of work against a 120-minute
ceiling is admitted with 90 minutes to spare instead of billed as 11.49 hours. The **narration** is
the seam the module already owns, used while a phase is in flight rather than only at the exit: the
four in-flight lines that exist today prove it works, and what is missing is the line at the one
place a multi-hour wait begins. Both changes land as call sites in the shell and pure deciders in the
engine; neither adds a printer, a persisted key or a stop.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_the-clock-sums-attempts.feature` — a pure summer over the `retryOf` lineage; an
      attempt ends at its close if it settled, at its last observed liveness if it is reclaimed or
      `running` and stale, and at `now` only while it is demonstrably alive; `decideScheduleToClose`
      takes `elapsedMs`; the measured failure is admitted whether read as reclaimed or as the stale
      `running` record it was for eleven hours
- [x] `tasks/01_the-shell-charges-attempt-time-at-both-sites.feature` — both shell call sites pass
      the summed lineage; downtime is charged to nobody; `69/02` task 01's two-instant criterion is
      superseded here, with both of its observable claims preserved
- [x] `tasks/02_the-loop-narrates-in-flight.feature` — a `narrate` seam derived from the one injected
      printer; the act line lands before the drive; the four existing in-flight lines move onto it;
      no second printer, no PRINTERS row
- [x] `tasks/03_quiet-silences-in-flight-lines-only.feature` — `--quiet` in the schema, the spec and
      the argv; zero in-flight lines under it and a byte-identical terminal account; `--json` still
      never launches

## Notes

**Sequenced behind `124/01` by write set, not by taste — and the edge lives on the milestone.** That
story is `in-review` and declares both `src/work/loop.mjs` and `src/commands/loop.mjs`; two writers
on those two files is the collision the milestone `SPEC.md` names as the one it must not cause. A
story's `depends:` must resolve to a SIBLING (`aof work validate`: *"does not resolve to a
sibling"*, m65/00's rule), so the constraint is carried where the stream carries every
cross-milestone edge: `126`'s own `depends: [124]`, which holds this story until 124 is accepted.
Nothing here touches the cap seam 124/01 changed (`decideCycleCapExhaustion`, the plan hand-off) —
the clock lives at `decideScheduleToClose` and its two callers, the narration at `drivePhase` and
the three existing in-flight `report(` calls.

**The clock's origin is a run instant, not the declaration's.** `ARCHITECTURE.md` corrects the SPEC
here: neither call site passes `brief.loop.startedAt` today — one passes the `retryOf` root's
`createdAt`, the other the fresh run's own. The declaration envelope does not change for this story
at all; the ninth key is `126/02`'s.

**Two controls land with this story, not one** — `FF-12601` (the clock) and `FF-12602` (the narration).
The milestone's proposed partition drew them as two stories; the product owner merged them at the
break-down because the second could never wave before the first (same two files, same arch index),
so shipping the clock alone unblocked nothing.

**The collectors ADR-002 measured are named in `reads:` so the builder checks rather than trusts.**
No delivered suite asserts the loop's report lines as an exact array or by index — every collector
reads `.at(-1)` — but a new in-flight line before a `Driven …` row is exactly the kind of change that
turns a passing `.at(-1)` into a mystery if one collector was missed.
