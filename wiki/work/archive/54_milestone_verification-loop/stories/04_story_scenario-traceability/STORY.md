---
type: story
number: 04
slug: scenario-traceability
title: "Scenario traceability — the join validate has announced since m15, declared rather than inferred"
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
# 04 · Scenario traceability

## User story

As a reviewer asking whether a contract is actually tested,
I want aof to report which `@executable` scenarios no case names, and which emitted cases name no
scenario,
so that the traceability gap `validate` has printed a note about since milestone 15 becomes a
visible, checkable finding — without anyone inventing a join that does not exist.

<!-- `src/commands/validate.mjs:57` has shipped this line for six milestones: "Note:
     test-traceability (@executable → green test; @manual/@uat → VERIFICATION rows) is not yet
     checked here." This story fills it, and fills it OUTSIDE `validateWork`, so the 256-dependent
     god-node stays untouched. -->

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_the-join-is-declared.feature` — the lane asserts one thing: an emitted case's name **contains** an `@executable` scenario name from the item in scope. QA makes it true by naming the case after the scenario; aof never decides what a result means
- [x] `tasks/01_a-miss-is-reported-unjoined.feature` — a case naming no scenario is `case-unjoined`, a scenario named by no case is `scenario-unjoined`; both are advisory, both report at `warn`, and neither moves the verdict
- [x] `tasks/02_the-lane-reads-and-never-runs.feature` — the lane reads the last report as snapshot text exactly as the controls lane's leg B reads its runner texts; it stays a pure, horizon-scoped `work:doctor` lane that spawns nothing

## Notes

- **There is no join key both sides already carry, and refine measured it** — 4,744 distinct scenario
  names against 5,725 declared test names: **0 exact matches**, 1,203 containment hits (~25%). That is
  precisely the situation `68/ADR-005` legislates for: join on a key both sides hold, and report an
  unattributable result as unattributed. A fallback that guesses is worse than a gap.
- **A regex classifier over runner output is REFUSED, and this is the ruling the milestone most
  needed.** `68/03` retired exactly that instrument (*"the regex retired, and a classifier that
  reports what a result EMITS"*), and `acd-loop-probe-contract` already forbids its shape in the loop
  shell. The pairing here is `66/ADR-004`'s leg B one level down — the same CI-pinned instrument,
  never a classifier.
- **The loop does not need this to re-drive.** What re-drives a maker is *which cases failed and what
  they said*, which is strictly more actionable than a scenario name. The SPEC's rubric feedback is
  complete without the join — which is why this story is advisory, and why it can start in the first
  wave without waiting for the runner.
- **Both legs report at `warn`, deliberately.** Measured: ~75% of `@executable` scenarios would report
  `scenario-unjoined` on arrival. An `error` would be a wall of inherited red — the pathology chore 64
  exists to clean up.
- **Consumes ADR-004's `work.rubric.report` shape as a CONTRACT, not as code**, which is what lets it
  start before 54/01 lands. First wave, with 54/00 and 54/02.
- **A new lane leaf, not an edit to 66's.** `src/work-doctor-rubric.mjs` copies
  `work-doctor-freshness.mjs`'s one-lane shape; `src/work-doctor-controls.mjs` is **not touched**
  (`66/FF-6605` guards it), and `src/feature-parse.mjs` is read and not edited — it is the ONE feature
  parser (`66/ADR-003`) and a second is forbidden.
