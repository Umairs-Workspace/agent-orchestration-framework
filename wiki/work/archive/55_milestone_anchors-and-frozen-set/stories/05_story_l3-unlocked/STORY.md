---
type: story
number: 05
slug: l3-unlocked
title: "L3 unlocked — the rung 53 declared and locked, opened by a computed gate rather than a flag"
parent: 55
status: done
owner: product-owner
created: 2026-08-26
updated: 2026-08-27
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 05 · L3 unlocked

## User story

As the operator who wants the loop to run unattended, and as the architect who refuses to let it
until that is honest,
I want L3 opened by a gate the system **computes** — a Loop-Ready score and a groundedness report
with nothing floating free and nothing stale —
so that unattended operation is something a workspace earns by having anchors, and never something a
person switches on by editing a JSON file.

Milestone 53 declared L3 and locked it structurally, and named this milestone's diff in advance:
*"widen `LOOP_LEVELS`, empty `LOCKED_LOOP_LEVELS`, and delete FF-5305's third leg."* It also rejected
the cheap unlock in terms — a config flag *"makes the most dangerous rung reachable by editing a JSON
file, with no diff a reviewer sees"*. That rejection binds this story: 55 must not deliver by config
what 53 refused to deliver by config.

The refusal `--level L3` produces today already carries `unlockedBy: 55` (`src/work-loop.mjs:400-405`).
This story is the milestone that number points at.

## Tasks

- [x] `tasks/00_the-ladder-widens.feature` — L3 becomes an executable level, the locked set empties, and the lock's now-false leg is deleted rather than narrowed until it passes
- [x] `tasks/01_the-gate-is-computed.feature` — admission is decided from the Loop-Ready score and the groundedness report at request time, and no config key, env var or flag can reach L3
- [x] `tasks/02_a-refusal-says-which-half.feature` — an ungrounded or under-scoring workspace is refused by name, with the failing checks or the floating components listed rather than a bare no
- [x] `tasks/03_the-check-joins-the-score.feature` — the anchor check is registered in the composed score, and a registry that cannot be read still yields not-applicable rather than a false pass

## Notes

- **This story owns `src/work-doctor-loop-ready.mjs`, not 55/01.** 55/01 builds the anchor check;
  this story registers it in `COMPOSED_CHECK_IDS` (`src/work-doctor-loop-ready.mjs:14-20`), because
  this is the story that gates on the result and must not inherit a half-registered score. The check
  id is declared in ADR-002 §3 so both stories can name it before either lands. ADR-007 §3.
- **The lock's third leg is DELETED, not weakened.** It asserts no `src/` module carries an executing
  branch keyed on `L3` — necessarily false the moment L3 executes. A control kept alive by narrowing
  its grep until it passes is milestone 66's *"green for the wrong reason"* verbatim, and 66 measured
  four of five audited guards failing exactly that way. Delete it and re-arm the rest.
- **Gating on the score alone would be worse than not gating.** The score composes 52's grounding
  check, which today can only report `exogenous-only` — the weakest ground there is. Unlocking on
  that would open unattended operation on precisely *"the configuration the self-evolving-agent
  literature has repeatedly measured failing"* (`53/SPEC §Objective`). Both halves, or nothing.
- **The gate is per-workspace, and that is the point.** Anchors existing in the *framework* says
  nothing about a *consumer's* repository, which is where an unattended loop would actually run.
  ADR-006 §2.
- **Composition, never import.** The gate reaches 52's checks through `invoke()` at the command
  boundary, exactly as the Loop-Ready score already does — it never imports a loop module and never
  re-derives a check (`53/ADR-007`). `src/work-loop.mjs` has 22 dependents and exactly **one**
  production dependent, `src/commands/loop.mjs` (`aof graph impact`, 2026-08-26); both are this
  story's alone.
- **Sequencing: this is the milestone's terminal story, and it is the only one that is not
  parallel-eligible from day one.** Its gate reads 55/01's report and 55/00's taxonomy. The contracts
  it codes against are frozen in ADR-001 and ADR-002, so authoring can start immediately; the green
  bar needs the other two landed.
- **Four milestones are waiting on this rung by name** — 57, 59, 61 and 63 all carry 55 in their
  `depends`, and 62/63 name the level in their own SPECs. Say so in the outcome.
