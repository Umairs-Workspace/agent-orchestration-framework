---
type: story
number: 01
slug: structural-checks
title: "The five structural checks — pathologies as algorithms, not opinions"
parent: 52
status: done
owner: product-owner
created: 2026-08-14
updated: 2026-08-14
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 52/01 · The five structural checks

## User story

As an **operator who has declared aof's control loops**, I want the graph's known pathologies
computed as **algorithms over the declaration** — ungrounded components, unpaired optimizers,
unowned references, contested actuators, timescale inversions — so that "is this improvement
machinery sound?" is answered by a program that can be argued with on its evidence, rather than by
whoever last read the diagram.

## Context

`src/work-loops-checks.mjs` (new): five **pure** `(model) => Finding[]` functions plus a Tarjan SCC
decomposition, and the frozen finding-code set that milestone 53's Loop-Ready score and milestone
55's groundedness report both key on.

Two design commitments carry this story, and both exist to stop the checks being discredited on
their first run:

**Ground before topology.** A cycle in a loop graph is not a pathology — an outer loop that sets an
inner loop's setpoint while the inner feeds data back is a textbook cascade. So the SCC check reports
*ungroundedness*, not cyclicity, and it never reports "grounded" unqualified: the only ground class
milestone 52 can issue is `exogenous`, the weakest one, and a component grounded solely by it says so
by name.

**Never invent a comparison.** RESEARCH measured that aof's cadences sit on incommensurable axes —
wall-clock periodic, per-item, per-milestone, and two loops with no bound at all. The timescale check
therefore emits an inversion **only** when both ends of a `target-setting` edge are periodic with
resolvable durations; everything else is `not-comparable`, naming which side is not on a clock. On the
day-one registry that means **zero inversions and N incomparable pairs** — which is the correct
output, and is itself the actionable backlog for milestone 58.

Purity is what makes this story parallel with 52/00: the checks take the model as plain data, so they
are built and tested against literal fixture models and never need the loader to exist.

ADR references: 52/ADR-005 (groundedness), 52/ADR-006 (cadence comparability, ratio 3),
52/ADR-007 §2–4 (the frozen code set, the five definitions, purity).

## Acceptance

- **Ungrounded SCC** — Tarjan decomposition over the union of all five edge types; a component is
  grounded iff a member is forward-reachable from a `ground:`-bearing node. Emits
  `loop-graph-ungrounded-component`, or `loop-graph-grounded-exogenous-only` with the ground class
  named — never a silent pass.
- **Unpaired optimizing loop** — a `kind: loop` node with `optimizing: true` and no *inbound*
  `monitoring` edge. A **self-edge does not pair a loop**: a loop watching itself is the same
  self-confirmation the arc exists to prevent, and it emits `loop-self-referential-edge`.
- **Unowned reference** — a `kind: loop` node with no *inbound* `target-setting` edge (self-edges
  again excluded). Reads the **edge**, never the `owner` field: a loop may have a named owner and a
  wholly unowned target.
- **Shared actuator, no arbiter** — two or more loops sharing an identical `actuator` entry with no
  **non-member** node declaring a `veto` edge to every member of that set. A contender may not
  arbitrate its own conflict.
- **Timescale** — over `target-setting` edges where **both** endpoints are registry-present
  `kind: loop` nodes (actor-sourced and dangling edges emit **nothing**, not `not-comparable`). The
  ratio is **directed** — source period ÷ endpoint period — so a target-setter that is *faster* than
  the loop it supervises is an inversion. Every other cadence-kind pair is `not-comparable` with the
  non-clock side named. No code path maps an event trigger to a duration.
- Every check is pure: no `node:fs`, no `node:child_process`, no clock, no dynamic import, no pointer
  resolution. The same model yields byte-identical findings across runs and across processes.
- Every emitted finding is `{ code, severity, path, message }` with `code` in this module's own
  frozen exported set — **lane-scoped and disjoint** from the loader's (the union is asserted
  test-side by FF-5209) — and `path` always a non-empty absolute. The path rule is **ternary**: a
  per-node finding anchors at the node's file, a whole-graph finding at the `loops/` directory, and an
  **edge** finding at the declaring (source) node's file.
- `summary.checks` keys are the frozen ids `grounding` · `pairing` · `reference-ownership` ·
  `actuator-arbitration` · `timescale` — milestone 53's Loop-Ready score composes them.
- `findCycle` in `src/work.mjs` is **not** reused or extended — it returns at most one cycle and is
  not a decomposition.

## Tasks

- [x] [00 — the SCC decomposition](tasks/00_scc-decomposition.feature)
- [x] [01 — the groundedness check](tasks/01_groundedness-check.feature)
- [x] [02 — unpaired optimizers and unowned references](tasks/02_unpaired-and-unowned.feature)
- [x] [03 — shared actuator without an arbiter](tasks/03_shared-actuator-arbitration.feature)
- [x] [04 — the timescale check and `not-comparable`](tasks/04_timescale-comparability.feature)
- [x] [05 — the frozen finding-code set](tasks/05_frozen-finding-codes.feature)

## Notes

The checks report; they never enforce. Exit codes, gates and teeth are milestones 53 and 55.
