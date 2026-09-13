---
type: story
number: 00
slug: the-supervision-vocabulary
title: "The supervision vocabulary — a fifth kind that records a trade-off, and a layer the loader can corroborate"
parent: 58
status: done
owner: product-owner
created: 2026-08-28
updated: 2026-08-29
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/58_milestone_supervising-loops/ARCHITECTURE.md#ADR-002, wiki/work/58_milestone_supervising-loops/ARCHITECTURE.md#ADR-003, wiki/work/58_milestone_supervising-loops/ARCHITECTURE.md#ADR-004, wiki/work/58_milestone_supervising-loops/RESEARCH.md#Q2, wiki/work/55_milestone_anchors-and-frozen-set/ARCHITECTURE.md#ADR-001, wiki/work/57_milestone_paired-loops/ARCHITECTURE.md#ADR-001, src/work-loops.mjs, src/work-doctor-loop-ready.mjs, test/arch/acd-loop-vocabulary-closed.test.mjs, test/arch/acd-watcher-taxonomy-additive.test.mjs]
files: [src/work-loops.mjs, test/support/registry-fixture.mjs, test/arch/acd-arbiter-taxonomy-additive.test.mjs, test/arch/acd-registry-fixture-closed.test.mjs, test/arch/acd-loop-vocabulary-closed.test.mjs, test/arch/acd-registry-framework-owned.test.mjs, test/arch/acd-anchor-taxonomy-additive.test.mjs, test/arch/acd-watcher-taxonomy-additive.test.mjs, test/watcher-node.test.mjs, test/work-loops-record.test.mjs, test/work-loops-value.test.mjs, scripts/test.mjs]
---
# 00 · The supervision vocabulary

## User story

As an operator reading this system's loop registry,
I want the node that owns a standing trade-off to be its own kind — one that must say which conflict
it resolves, in what priority order, and how long an adjustment stands before reversion is considered,
and that has no vocabulary in which to say it also acts — and I want a loop to be able to declare
which timescale it runs at,
so that "who wins when these loops pull against each other, and which loop is slow enough to supervise
which" is a fact I can read off frontmatter instead of the answer whoever is at the keyboard would
give this evening.

Milestone 52 shipped three checks that this milestone's records must satisfy — reference ownership,
actuator arbitration and timescale separation — and none of them can be satisfied in the vocabulary
that exists today. There is no kind for a node whose whole purpose is to resolve a conflict without
being party to it, and there is no way for a loop to say it is the slow one when six of the seven
loops declare an event cadence with no clock in it at all.

This story adds the fifth kind, adds the layer axis, and freezes both. It ships no check — 58/02 owns
those — and no records — 58/01 owns those. What it ships is the grammar both are written in.

## Tasks

- [x] `tasks/00_a-fifth-kind.feature` — `arbiter` joins the kind vocabulary additively, and every record shipped before this milestone still parses with zero new findings
- [x] `tasks/01_what-an-arbiter-must-declare.feature` — the conflict it resolves, the priority order and the dwell are required, and a dwell is either a count of cycles or explicitly none
- [x] `tasks/02_an-arbiter-cannot-act.feature` — the keys by which a node could act or measure are not admitted for the kind, so an arbiter that claims to act is refused by the loader with no new code
- [x] `tasks/03_the-layer-a-loop-declares.feature` — a loop may declare its timescale layer, only a loop may, and the loader carries the ranks the checks compare rather than the checks deriving them

## Notes

- **Additive, or it is a regression.** 55/ADR-001 widened this enum from two kinds to three and 57's
  from three to four, both deleting nothing; this story does it a third time. The measurable form of
  "additive" is that the **fourteen** records in `src/bundle/loops/` today parse with **zero new
  findings** — task 00's compatibility scenario is that assertion, and `FF-5801` is its structural twin.
- **The absent `actuator` key is the load-bearing choice again, and it is wider here.** ADR-003: an
  arbiter admits neither `actuator` nor `measurement` nor `cadence` nor `ground`. A node that resolves
  a conflict between loops must not be able to declare that it also pulls one of the actuators it is
  arbitrating over. It costs nothing to enforce — the loader's existing
  `loop-key-not-admitted-for-kind` fires with no new code, which is why task 02 asserts the *existing*
  finding code rather than a new one.
- **`dwell:` deliberately does not admit `unknown`.** ADR-004 §3: the sentinel vocabulary exists for
  facts the repository does not supply, and a dwell is not a discovered fact but a policy its author
  chooses — "no dwell" already has a name. A malformed value is the loader's existing `loop-bad-value`,
  so `LOADER_FINDING_CODES` does not grow.
- **`layer:` is optional, and that is what keeps 52's behaviour intact.** ADR-002: with no `layer:`
  declared, the timescale check must produce exactly what it produces today. Task 03's compatibility
  scenario and `FF-5802` are the same claim from two directions.
- **The ranks live here, not in the checks.** `src/work-loops-checks.mjs` imports nothing and must
  keep importing nothing (52/ADR-007, extended by `FF-5804`). The layer→rank and cadence-trigger→scope
  -rank maps ride on the parsed fields the loader hands over, so the checks compare numbers they were
  given rather than deriving a duration from a trigger — the fabricated conversion ADR-002 refuses.
- **This story ships no check and no record.** The literals are frozen in ADR-002 §1/§2 and
  ADR-003 §1/§2/§5 precisely so 58/02 and 58/03 can be built in parallel against them — 52's and 57's
  practice both. Only the *landing* order is constrained: this story lands before 58/01, because a
  record declaring a kind the schema does not admit is `loop-unknown-key`.
- **`src/work-loops.mjs` has 4 production dependents, all of them `commands/loops-*`** (`aof graph
  impact`, 2026-08-28 · 12851 nodes / 31465 edges). Nothing outside the loops command family can be
  broken by this change.
