---
type: story
number: 03
slug: staleness-silence-and-the-prune
title: "Staleness, silence and the prune — an anchor nobody refreshed, an instrument nobody heard from, a loop nobody consults"
parent: 59
status: done
owner: product-owner
created: 2026-08-29
updated: 2026-08-30
depends: [59/00]
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-004, wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-005, wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-008, wiki/work/55_milestone_anchors-and-frozen-set/ARCHITECTURE.md, wiki/work/52_milestone_loop-registry-and-graph/ARCHITECTURE.md#ADR-007, wiki/work/58_milestone_supervising-loops/ARCHITECTURE.md#ADR-005, src/work-loops-checks.mjs, src/work-loops.mjs, src/commands/loops-validate.mjs, src/commands/loops-groundedness.mjs]
files: [src/work-loops-checks.mjs, test/arch/acd-loop-checks-pure.test.mjs, test/arch/acd-audit-reports-what-it-read.test.mjs, test/work-loops-checks.test.mjs, test/work-loops-registry-census.test.mjs, test/instrument-staleness.test.mjs, scripts/test.mjs]
---
# 03 · Staleness, silence and the prune

## User story

As an operator whose dashboard has been green for weeks,
I want to be told which anchors have not been refreshed, which instruments have said nothing inside
their own declared cadence, which metrics have not moved, and which declared loops nobody consults,
so that a green board can no longer mean "nothing was measured" — because the report that names what
is missing is the one thing a rotting measurement cannot survive.

Milestone 55 can say an anchor's authority no longer resolves. It cannot say that a live-soak
observation is four months old, and an anchor whose last observation predates three releases grounds
nothing while resolving perfectly. The same shape recurs one level up: a watcher whose counter has not
changed in twenty cycles is not evidence of stability, and a declared loop with no consumer is graph
weight nobody is carrying deliberately.

This story adds those four judgments to the checks that already exist, in the module that already
holds them, and keeps that module the pure leaf it has been since milestone 52 — every clock reading
arrives on the call.

## Tasks

- [x] `tasks/00_an-unrefreshed-anchor-is-not-an-anchor.feature` — an anchor past its window is stale, an undated one is undated, and a loop grounded only through stale anchors degrades rather than disappearing
- [x] `tasks/01_an-instrument-that-has-said-nothing.feature` — an instrument with no reading inside its own declared cadence window is named, and the window comes from the record rather than a per-channel rule
- [x] `tasks/02_a-metric-that-has-not-moved.feature` — a counter unchanged across the declared number of cycles is named, and that number has one home
- [x] `tasks/03_a-loop-nobody-consults.feature` — a declared loop with no inbound consumer and no observed execution is a prune candidate, reported by name and never removed

## Notes

- **The checks stay a pure leaf, and this is the story that could most easily break that.** 52/ADR-007:
  `src/work-loops-checks.mjs` imports **nothing**. Every freshness comparison here takes a `now` and a
  window as arguments; the module holds no date literal and no duration literal. FF-5907 extends 52's
  own purity guard rather than adding a sibling beside it.
- **Three states, not two.** Stale, undated and fresh are different answers and the report gives all
  three. Collapsing undated into stale would make every anchor shipped before 59 red on arrival, which
  is the "wall of inherited red" 54/04 already refused once.
- **A stale anchor degrades a verdict; it does not delete one.** ADR-005 §2. A loop grounded only
  through stale anchors is not `unanchored` — the edge is declared and the authority resolves. The
  distinction between *never grounded* and *grounded a while ago* is the one an operator acts on.
- **Silence is one rule, not a rule per channel.** ADR-004 §2: an instrument that has produced no
  reading inside its own `cadence:` window. Keyed on a field every record already carries, so a new
  channel needs no new check.
- **Pruning reports and never removes.** ADR-004 §4. The audit's kind admits no actuator, and removing
  a node is an edit to a governed declaration. A prune candidate is a finding with a name on it.
- **`src/work-loops-checks.mjs` has 16 dependents and zero imports** (`aof graph impact`, 2026-08-29) —
  the pure leaf at the bottom of the loops cluster, with two production consumers. That is why this
  story can own it outright and why nothing outside `loops validate` and `loops groundedness` moves.
