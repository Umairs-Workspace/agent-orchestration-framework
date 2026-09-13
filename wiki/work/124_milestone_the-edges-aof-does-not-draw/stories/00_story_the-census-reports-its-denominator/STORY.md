---
type: story
number: 00
slug: the-census-reports-its-denominator
title: "The census reports its denominator — one home for the contract set, a coverage predicate ready-wave adopts, and a fourth advisory lane that names its own blind spot"
parent: 124
depends: []
status: done
owner: product-owner
created: 2026-09-07
updated: 2026-09-08
adrs: [ADR-001, ADR-002, ADR-003]
reads:
  - wiki/work/124_milestone_the-edges-aof-does-not-draw/ARCHITECTURE.md#ADR-001
  - wiki/work/124_milestone_the-edges-aof-does-not-draw/ARCHITECTURE.md#ADR-002
  - wiki/work/124_milestone_the-edges-aof-does-not-draw/ARCHITECTURE.md#ADR-003
  - wiki/work/124_milestone_the-edges-aof-does-not-draw/RESEARCH.md
  - src/work.mjs
  - src/commands/doctor.mjs
  - src/commands/loop.mjs
  - src/commands/next.mjs
  - src/work/doctor-controls.mjs
  - src/work/doctor-loop-record.mjs
  - src/work/doctor-rubric.mjs
  - src/work-audit/census.mjs
  - src/work-audit/evidence.mjs
  - test/arch/loop/acd-loop-record-never-gates.test.mjs
  - test/work/doctor-loop-record-lane.test.mjs
  - test/arch/audit/acd-controls-never-execute.test.mjs
files:
  - src/story-contract.mjs
  - src/ready-wave.mjs
  - src/work/doctor.mjs
  - src/work/doctor-depends.mjs
  - test/work/story-context-contract.test.mjs
  - test/work/doctor-depends-lane.test.mjs
  - test/work/index.mjs
  - test/arch/work/acd-census-reports-its-denominator.test.mjs
  - test/arch/work/acd-advisory-lane-never-gates.test.mjs
  - test/arch/work/index.mjs
  - test/arch/planning/acd-contract-set-has-one-home.test.mjs
  - test/arch/planning/index.mjs
  - test/arch/audit/acd-controls-never-execute.test.mjs
  - scripts/test-rubric.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 00 · The census reports its denominator

## User story

As **an operator reading `aof work doctor` over this work stream**,
I want **each `depends:` edge that no declared contract witnesses to be named, together with a single
honest statement of how many edges the check could not evaluate at all and why**,
so that **I can act on a wait that has no cause without mistaking a narrow check for a complete one** —
the difference between "there are two suspect edges here" and "there are two suspect edges among the
48 I could read, and 182 I could not".

The denominator is the point, not a caveat on it. Measured over this stream at refine: **230 resolved
`depends:` edges, 48 evaluable, 14 unwitnessed** — so a lane that printed only the 14 would be
reporting on 21% of the graph in a voice that reads as if it covered all of it. `124` permanently
unevaluable (the dependent or dependency is not a story, and only `STORY.md` carries contract fields)
and `57` unevaluable for now (stories predating a convention two weeks old at measurement time) are
two different facts with two different remedies, and the lane separates them.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_the-contract-set-has-one-home.feature` — the coverage predicate and the declared-set
      resolution live once in `src/story-contract.mjs`; directory intent is authored, never probed
- [x] `tasks/01_ready-wave-adopts-the-predicate.feature` — the wave's collision check calls the shared
      predicate, and the adoption is a strict tightening that can never widen a wave
- [x] `tasks/02_the-lane-names-each-unwitnessed-edge.feature` — a fourth advisory doctor lane reports
      `depends-edge-unwitnessed` per edge, at `warn`, and never renders the verdict "phantom"
- [x] `tasks/03_the-lane-reports-its-denominator.feature` — exactly one `depends-edges-unchecked`
      finding per run, carrying the two exclusion reasons separately, with the four counts an identity
- [x] `tasks/04_an-advisory-lane-cannot-gate.feature` — the class ratchet: every registered lane with
      its own frozen code array is disjoint from `CONTROL_FINDING_CODES` and names no `error`

## Notes

**This story fixes a live defect on the way past, and that is deliberate (ADR-003).** `ready-wave`'s
collision check is exact-string, so a story declaring `files: [src/commands/]` and a sibling declaring
`src/commands/test.mjs` are currently waved into the *same* parallel wave. The coverage predicate this
story lands is what fixes it, which is why the predicate is a shared home rather than a private helper
in the new lane.

**The `phantom` word does not ship.** The check cannot separate a false edge from legitimate capability
ordering — `96/03 → 96/01` is a real, deliberate edge with genuinely disjoint sets — so the finding
says *unwitnessed*, not *phantom*, per `54/ADR-006`'s reported-unjoined discipline.

**Largest of the three stories in 124, and independent of both siblings.** Nothing here writes
`src/commands/loop.mjs` or the bundle.
