---
type: story
number: 02
slug: fitness-in-the-gate
title: "Fitness in the gate — the SPEC's missing half, and a cost ladder that pays for the cheapest answer first"
parent: 54
status: done
owner: product-owner
created: 2026-08-22
updated: 2026-08-23
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 02 · Fitness in the gate

## User story

As the loop about to spend a review turn,
I want the fitness functions graded by the deterministic checks aof already owns, **before** any
model runs,
so that an item whose declared controls do not resolve is caught by a check costing milliseconds
instead of by an agent session costing minutes and tokens.

<!-- This is the SPEC's own headline, and refine measured that half of it does not exist:
     `GATE_ORDER` names `work:validate` and nothing else, and neither loop module mentions the
     doctor, the controls lane or a fitness function anywhere. The fitness half has never graded
     anything in the loop. -->

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_the-cost-ladder.feature` — `GATE_ORDER`'s five frozen rows in strictly increasing cost, each gate able to answer alone and short-circuiting every gate after it: a red `validate` never pays for the doctor, a red doctor never pays for the runner, a red runner never pays for a review turn
- [x] `tasks/01_the-doctor-gate-scope-and-severity.feature` — the gate invokes `work:doctor` at the **driven item's own scope**, reads `severity === "error"` only, never consults `loopReady`, and takes severity from `severityFor` rather than re-deriving it

## Notes

- **Needs no runner, so it is not blocked on anything.** This is the half of the milestone that can
  land on its own — it wires deterministic checks that already exist into a gate that already runs.
  First wave, with 54/00 and 54/04.
- **This story is a deliberate BEHAVIOUR CHANGE, and it is ruled rather than discovered.** It inserts
  a gate that can halt into a loop where no doctor gate exists today. The blast radius was measured
  at refine: across the **30 open items** on this tree, scoped `aof work doctor <ref>` returns an
  `error` for **exactly one — milestone 54 itself** (`verification-register-missing`, cleared by
  authoring the register at break-down). Every other open item returns zero, 69 and 70's twelve
  stories included. That is why it ships un-scoped-down rather than behind a flag.
- **Scope is what keeps it honest.** The gate runs at the driven item's scope, exactly as the loop
  already invokes `work:validate`. Without that, one un-authored register anywhere in `wiki/work`
  would stop every loop in the repo — the inherited-red pathology `70/ADR-007` refuses by name, and
  the one chore 64 exists to clean up.
- **Warns never gate.** `severityFor` escalates open items to `error` and downgrades `done` ones to
  `warn`. Stream-wide there are 397 findings and 396 of them are `warn` — dominated by
  `mtime-ahead-of-updated` and `doc-over-budget` on `done` items. A gate that read warns would block
  every loop in this repo on a stream-wide numbering artefact. `pending` controls are already `warn`,
  so 69 and 70's fifteen `control-unresolved` findings do not gate either.
- **Overlaps 54/03 on `src/commands/loop.mjs`'s continue-gate block, and they are SEQUENCED** — 02
  inserts the doctor gate, 03 makes the gate's record reach the re-drive. 54/03 depends on this story
  and rebases onto it by construction.
