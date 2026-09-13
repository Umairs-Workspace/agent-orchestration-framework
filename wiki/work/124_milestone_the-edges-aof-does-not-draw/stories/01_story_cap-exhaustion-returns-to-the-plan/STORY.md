---
type: story
number: 01
slug: cap-exhaustion-returns-to-the-plan
title: "Cap exhaustion returns to the plan — the shell stops minting its own halt and asks the engine, which already knows how to dispatch refine"
parent: 124
depends: []
status: done
owner: product-owner
created: 2026-09-07
updated: 2026-09-08
adrs: [ADR-005, ADR-006]
reads:
  - wiki/work/124_milestone_the-edges-aof-does-not-draw/ARCHITECTURE.md#ADR-005
  - wiki/work/124_milestone_the-edges-aof-does-not-draw/ARCHITECTURE.md#ADR-006
  - wiki/work/124_milestone_the-edges-aof-does-not-draw/RESEARCH.md
  - src/commands/drive.mjs
  - src/work.mjs
  - src/loop-bounds.mjs
  - src/run-store.mjs
  - src/bundle/commands/continue.md
  - wiki/work/53_milestone_loop-artifact/ARCHITECTURE.md#ADR-003
files:
  - src/work/loop.mjs
  - src/commands/loop.mjs
  - test/loop/loop-cap-exhaustion-carries-the-record.test.mjs
  - test/loop/index.mjs
  - test/arch/loop/acd-cap-exhaustion-returns-to-the-plan.test.mjs
  - test/arch/loop/index.mjs
  - test/loop/loop-doctor-gate-scope-and-severity.test.mjs
  - test/loop/loop-driven-row-carries-the-grade.test.mjs
  - wiki/work/TECH_DEBT.md
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 01 · Cap exhaustion returns to the plan

## User story

As **an operator running `aof work loop` over a range**,
I want **a unit that exhausts its cycle cap to be handed back to the plan that produced it rather than
terminating the range**,
so that **a unit the loop cannot close becomes a re-planning prompt instead of an outage** — the loop
stops asking itself to fix a fault it cannot see, and the rest of the range keeps running.

The gap is narrower and stranger than the milestone's framing supposed, and the correction matters:
`work:loop` **already dispatches `refine`, live, today** — `decideLoopPhase` returns it for a milestone
with zero stories and for a story with no tasks, and `refine` is a fully driven phase. What is missing
is not the dispatch. It is that the cap which actually halts is a **second, outer counter the shell
keeps for itself**, checked after the act has already been decided; when it trips it returns without
ever re-asking the engine, so it never reaches the branch sitting one function away in the module it
just consulted.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_the-shell-asks-the-engine.feature` — the shell mints no `cap-exhausted` halt of its own;
      every one comes from a pure decider it consults at the cycle-cap branch
- [x] `tasks/01_the-return-is-the-existing-refine-phase.feature` — the hand-off is the existing
      `drive <plan> refine` act with a derived plan ref, no thirteenth `LOOP_STOPS` member
- [x] `tasks/02_the-escalation-is-bounded-twice.feature` — a unit is offered back at most once per
      invocation and set aside thereafter; a plan is re-entered at most `cap` times, with no new counter
- [x] `tasks/03_the-other-stops-are-unchanged.feature` — the remaining eleven stops still return
      immediately, and a plan ref outside the declared scope is still terminal

## Notes

**The one story in 124 that writes `src/commands/loop.mjs`.** The milestone's `SPEC.md` `## Dependencies`
and `STATE.md` both anticipate a sibling `depends:` edge here, because two outcomes were expected to
collide on this file. `124/ADR-004` dropped the other one, so **that constraint is discharged** and this
story is independent — the edge would itself have been the unwitnessed kind this milestone exists to name.

**`wiki/work/TECH_DEBT.md` is in the write set for a ledger entry, not a fix.** `124/ADR-006` rules that
the engine's own cap is dead in the live path — `nextDecision` passes no `cycle` at any of its 6 call
sites, so `boundedDrive`'s guard never fires and four decider branches are unreachable — and rules
deliberately **not** to half-wire it here, because one live branch beside three dead ones is worse than
four plainly dead. The entry to append is written out verbatim in that ADR. This story neither worsens
nor depends on the repair.

**Item 76's citations go stale in this file.** The ledger's existing entry cites `src/commands/loop.mjs:1266`
for the very halt this story changes; correcting that line reference is this file's single writer's to do
in the same pass.
