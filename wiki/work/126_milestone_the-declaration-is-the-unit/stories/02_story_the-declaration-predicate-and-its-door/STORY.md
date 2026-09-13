---
type: story
number: 02
slug: the-declaration-predicate-and-its-door
title: "The declaration predicate and its door — one pure decider says which declarations should be running now, supervision is a ninth key that is off by default, and the answer rides the one data command"
parent: 126
depends: [00]
status: done
owner: product-owner
created: 2026-09-08
updated: 2026-09-10
adrs: [ADR-004, ADR-005]
reads:
  - wiki/work/126_milestone_the-declaration-is-the-unit/ARCHITECTURE.md#ADR-001
  - wiki/work/126_milestone_the-declaration-is-the-unit/ARCHITECTURE.md#ADR-004
  - wiki/work/126_milestone_the-declaration-is-the-unit/ARCHITECTURE.md#ADR-005
  - wiki/work/53_milestone_loop-artifact/ARCHITECTURE.md#ADR-004
  - wiki/work/63_milestone_event-driven-triggers/ARCHITECTURE.md#ADR-001
  - wiki/work/63_milestone_event-driven-triggers/ARCHITECTURE.md#ADR-003
  - wiki/work/36_milestone_mesh-desktop-app/ARCHITECTURE.md#ADR-004
  - src/work/loop.mjs
  - src/commands/loop.mjs
  - src/run-store.mjs
  - src/loop-bounds.mjs
  - src/work.mjs
  - src/mesh/presence.mjs
  - src/mesh/registry.mjs
  - src/workspace-identity.mjs
  - src/commands/run-start.mjs
  - src/commands/drive.mjs
  - src/commands/mesh/face-shared.mjs
  - src/effects/run-transitions.mjs
  - src/work-trigger/declaration.mjs
  - test/loop/loop-command-probe.test.mjs
  - test/mesh/fleet/mesh-status-fleet-render.test.mjs
  - test/arch/ui/acd-desktop-single-data-path.test.mjs
  - test/arch/mesh/acd-mesh-command-cli-bijection.test.mjs
  - test/arch/work/acd-work-command-cli-bijection.test.mjs
files:
  - src/work/loop.mjs
  - src/commands/loop.mjs
  - src/commands/mesh/identity.mjs
  - src/commands/trigger.mjs
  - src/loop-argv.mjs
  - src/run-store.mjs
  - test/support/work-loop-story-fixtures.mjs
  - test/loop/work-loop-declaration.test.mjs
  - test/loop/work-loop-declarations.test.mjs
  - test/loop/loop-command-resume.test.mjs
  - test/loop/trigger-command.test.mjs
  - test/loop/index.mjs
  - test/mesh/identity/mesh-status-declarations.test.mjs
  - test/mesh/identity/index.mjs
  - test/arch/loop/acd-declaration-predicate-is-composed.test.mjs
  - test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
  - test/arch/loop/acd-trigger-is-a-caller-not-a-coordinator.test.mjs
  - test/arch/loop/acd-trigger-is-non-vacuous-over-this-repo.test.mjs
  - test/arch/loop/index.mjs
  - test/arch/mesh/acd-declarations-ride-the-one-data-command.test.mjs
  - test/arch/mesh/index.mjs
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 02 · The declaration predicate and its door

## User story

As **an operator who declared a loop supervised and then lost the machine under it**,
I want **aof to answer, from the run records alone, which declarations should be running on this
node right now — listing the one that died, never the one that halted for a reason, and nothing I
did not opt in — and to hand that answer to whatever asks through the single data command the fleet
already reads**,
so that **a reclaim's verdict finally reaches something that can act on it, a bound that was hit is
never auto-retried into a crash loop, and no login silently spends tokens re-entering work I never
asked to have kept alive**.

The predicate classifies nothing itself. Died-versus-stopped-for-cause already has one home —
`isRetryable`, `shouldRetry`, `retryReadiness`, `isStale` — and the decider composes those with the
recovered declaration and `126/00`'s clock. `deadline-exhausted` is the one verdict it must
*recompute*, because nothing persists a halt and a level-triggered reconciler would otherwise
relaunch every tick. The opt-in is a ninth key on the declaration, set by `--supervised`, inherited on
`--resume`, defaulting to `false` — so the eight declarations already on disk read as unsupervised
for free. The door is `mesh status --json --declarations`: an additive key behind a flag on the one
admitted verb, each row carrying an argv composed at one home and the workspace's own `cwd`.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [x] `tasks/00_the-predicate-composes-the-store-s-verdicts.feature` — run records in, rows out; no
      failure-reason or state literal, no filesystem, no clock; every class of run answered; an
      exhausted lineage is not listed even when the store says ready
- [x] `tasks/01_supervision-is-a-ninth-key-off-by-default.feature` — `supervised` appended last,
      set by `--supervised`, inherited on `--resume`, projected as a sixth recoverable key; the
      usable-declaration requirement stays five; an unsupervised declaration yields no row
- [x] `tasks/02_the-argv-has-one-home.feature` — a zero-import leaf composes `["work","loop",…]`
      and spells every flag once; `trigger.mjs` imports it; every token is one `work:loop` declares
- [x] `tasks/03_the-answer-rides-mesh-status-behind-a-flag.feature` — the flagless document is
      byte-identical; `--declarations` adds exactly one key; each row carries its descriptor's
      `projectRoot` as `cwd`; skips are carried verbatim; disk is the authority

## Notes

**`depends: [00]` is structural.** This story writes `src/work/loop.mjs` and `src/commands/loop.mjs`
after `126/00` does, and the predicate's clock leg *is* `126/00`'s summer. Two other write-set
collisions are resolved by the ready-wave partition, not by an edge, because neither is a
dependency: `126/01` on `test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs` (that story
re-pins a hash; this one moves its eight-key assertion to nine) and `126/04` on
`test/arch/mesh/index.mjs` (each appends its own control).

**Three delivered suites move with the composer.** `argvFor`/`loopInputOf`/`LEVEL_FLAG` leave
`src/commands/trigger.mjs` for the new leaf because importing a registered command module from
`identity.mjs` closes the registry ring (TECH_DEBT item 26). The two `63` controls that pin the
composer and `test/loop/trigger-command.test.mjs` follow it in the same diff; `63`'s own invariants —
no spawn, no write, no timer in the trigger family — are untouched.

**Two more files entered the write set at the feasibility beat, each for one reason.**
`src/run-store.mjs` gains ONE additive pure export, `isRunning(record)`, beside `isStale` — the
predicate must tell a running record from a settled one and may spell no run-state literal, and the
store owns that vocabulary; the byte-pin `53/FF-5307` leg 2 holds on that file is re-pinned in this
story's diff with the reason beside it, exactly as `126/01` re-pins the renderer's. And
`test/support/work-loop-story-fixtures.mjs` carries a golden eight-key `buildLoopDeclaration`
expectation replayed by seven suites; it gains the ninth key here.

**The eight-key assertions become nine, in the open.** `test/loop/work-loop-declaration.test.mjs`
and `53/FF-5307` leg 1 both assert the envelope's exact key list. Those are tests, and tests are
code; the delivered `102/00` feature that first pinned eight is not edited, and this story's own
contract is where the ninth key is ruled.

**The answer's cost is measured and bounded.** 167 ms over 410 items and 105 records, paid only
under the flag; the supervisor asks every tenth tick. Disk is the authority for a local run
(TECH_DEBT item 19); the producer reads through `readRuns`, never the worker-streamed projection.
