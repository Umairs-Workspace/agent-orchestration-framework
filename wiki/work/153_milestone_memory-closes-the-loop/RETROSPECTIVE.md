---
type: milestone
doc: retrospective
number: 153
slug: memory-closes-the-loop
title: "Retrospective — memory closes the loop"
created: 2026-10-11
updated: 2026-10-11
promotionFrom: 1
---
# 153 · Retrospective

These are milestone-level lessons. Story lessons sit beside their stories (01, 03). Findings are referenced, not restated (`VERIFICATION.md`).

## R1 — A new file is a budget change, and `files:` must declare the census it moves

- **Kind:** mistake (recurring) · **Area:** process · **Stage:** refine · **Owner:** architect · **Raised by:** developer (153/02, 03, 05 builds) · **Recurs:** 146/R1 · **Promoted to:** none

**What happened.** Three of five stories had to touch paths their `files:` did not declare. Every one was a census or budget control that a new source or test file forces: `acd-source-directory-budget` rows (four, six and two rises), the FF-15301 consumer census, the doctor-lane roster in `acd-controls-never-execute`, FF-12405's verb vocabulary, and a cited `memory.mjs` line range in a loop asset. Each build recorded the omission as feedback and moved on.

**Why.** Refine derives `files:` from the code a story changes, not from the controls that count it. Before writing this lesson, `aof work memory recurrence` matched it to 146/R1 (score 0.252, threshold 0.23).

**Lesson.** At refine, for every new file a story will add, name the census rows and roster controls that count its directory, and put those files in `files:`. This is 146/R1 again, so the prevention needs to move out of prose. Until it does, `Promoted to` stays `none`.

**Refs:** `VERIFICATION.md` F-04; STATE `## Feedback (for retro)`.

## R2 — A branch that stacks milestones carries their reds to every close

- **Kind:** blocker · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** aof:verify 153 · **Promoted to:** none

**What happened.** The first whole-tree gate on `148-memory-corpus-vocabulary` ran at this close, after 153, 154, 156 and an MCP branch had merged into it. It was red on about 46 cases. Measured at `9070395b` (before 153) and `98e0c98a` (after 153), only six of those were 153's. 36 were already red before 153 started, and four came in after it. Several were not stale tests but regressions of delivered contracts: 143/03's provenance words and its `fable` example, 143/03's door and lend rules, and 69/06's stall reset (VERIFICATION F-09). The close fixed them inline, and the third gate run was green.

**Why.** Each lane gated on its own story selection, and nothing ran the whole tree when another milestone's work merged into the shared branch. So reds accumulated with no owner.

**Lesson.** When milestones share a branch, run the whole-tree gate after each one merges, and fix its reds before the next merges in. Otherwise a contract regression hides among stale-test reds, and the next milestone's close spends its gate runs on attribution and repair.

**Refs:** `VERIFICATION.md` F-01, F-03; `REGRESSION.md`.
