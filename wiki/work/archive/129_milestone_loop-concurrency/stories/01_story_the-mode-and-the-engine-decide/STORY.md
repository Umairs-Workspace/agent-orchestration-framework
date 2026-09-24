---
type: story
number: 01
slug: the-mode-and-the-engine-decide
title: "The mode and the engine decide — work.loop.concurrency has one home, the engine routes on status, and refine_first is three phases the engine can name"
parent: 129
depends: []
status: done
owner: product-owner
created: 2026-09-12
updated: 2026-09-13
adrs: [ADR-001, ADR-006, ADR-008]
reads:
  - wiki/work/129_milestone_loop-concurrency/SPEC.md
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-001
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-006
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-008
  - wiki/work/69_milestone_loop-bounds/ARCHITECTURE.md#ADR-001
  - wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-009
  - src/loop-bounds.mjs
  - src/work/loop.mjs
  - src/loop-record.mjs
  - src/work-audit/declared-bounds.mjs
  - src/commands/loop.mjs
  - src/commands/next.mjs
  - src/ready-wave.mjs
  - test/loop/loop-bounds.test.mjs
  - test/loop/work-loop-phase-map.test.mjs
  - test/loop/work-loop-stop-set.test.mjs
  - test/loop/loop-record-projection.test.mjs
  - test/loop/loop-only-fail-redrives.test.mjs
  - test/arch/loop/acd-loop-probe-contract.test.mjs
  - test/arch/loop/acd-cap-exhaustion-returns-to-the-plan.test.mjs
  - test/mesh/assignment/mesh-assignment-loop-directive.test.mjs
  - test/arch/assignment/acd-assignment-resolves-to-a-loop-call.test.mjs
  - test/arch/loop/acd-loop-cap-single-home.test.mjs
  - test/arch/grade/acd-acceptance-horizon-single-predicate.test.mjs
  - test/arch/command/acd-prompt-bounds-name-their-home.test.mjs
  - test/arch/loop/acd-clock-counts-attempts.test.mjs
files:
  - src/loop-bounds.mjs
  - src/work/loop.mjs
  - src/loop-record.mjs
  - test/loop/loop-bounds.test.mjs
  - test/loop/work-loop-phase-map.test.mjs
  - test/loop/work-loop-stop-set.test.mjs
  - test/loop/loop-record-projection.test.mjs
  - test/loop/work-loops-resolved-ceilings.test.mjs
  - test/loop/loop-only-fail-redrives.test.mjs
  - test/arch/loop/acd-loop-probe-contract.test.mjs
  - test/arch/loop/acd-cap-exhaustion-returns-to-the-plan.test.mjs
  - test/mesh/assignment/mesh-assignment-loop-directive.test.mjs
  - test/arch/assignment/acd-assignment-resolves-to-a-loop-call.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 01 · The mode and the engine decide

## User story

As **the operator who sets one key and expects the loop to answer for it**,
I want **`work.loop.concurrency` to resolve in the bounds' one home as a MODE (`sequential` unset,
`refine_first` opt-in), and the pure engine to decide the three phases of `refine_first`, to route
an `in-review` story to the gate whatever the last phase was, and to decide a wave from the
`work:next` answer without holding a number of its own**,
so that **an unset key is byte-identical to today, a restarted loop never re-builds a story that is
already in review, and every concurrency decision is a pure function the suites can drive**.

What lands (ADR-001, ADR-006 §3, ADR-008 §5): `LOOP_CONCURRENCY_MODES`, `DEFAULT_LOOP_CONCURRENCY`,
`resolveLoopConcurrency`, `loopConcurrencyFromConfig` in `src/loop-bounds.mjs`, joined to BOTH
resolver maps so `rangeProbe` and FF-6111 answer for the key; `configBound` in `src/loop-record.mjs`
guards a non-numeric resolver answer; `decideLoopPhase` reads `next.status` and the additive inputs
`concurrency` / `unrefined`; `decideWave` (pure); three stop ids `lane-open-failed`,
`lane-merge-refused`, `lane-merge-conflict` in `LOOP_STOPS` and in `acd-loop-probe-contract`'s
literal. `src/work/loop.mjs` keeps its zero imports.

## Tasks

- [x] `tasks/00_the-mode-has-one-home.feature` — the key resolves in `src/loop-bounds.mjs` as a mode through both maps; unset and invalid answer `sequential`; the range probe admits exactly the two modes; a loop record citing it as a ceiling carries no string bound
- [x] `tasks/01_the-engine-routes-on-status.feature` — an `in-review` story with tasks decides `gate` whatever `lastPhase` says; every other status decides as today
- [x] `tasks/02_refine-first-is-three-phases.feature` — under `refine_first` a non-empty `unrefined` decides `drive refine` ahead of the head; a through-review `done` is a phase boundary; `sequential` is untouched
- [x] `tasks/03_the-wave-is-decided-purely.feature` — `decideWave({ wave, heldSet, live, setAside })` answers `{ dispatch, hold }` in wave order with no bound input; the three stop ids join the closed set

## Notes

- Pure and leaf-only: no story in the first wave imports another's subject. 04 composes these
  exports; it does not re-decide them.
- Six files deep-equal or count `LOOP_STOPS` against a literal (feasibility, 2026-09-13); all six are in
  `files:`. The engine may spell `"in-review"`, `"done"`, `"blocked"` but never `"not-started"`/`"in-progress"`
  as code literals — `acd-acceptance-horizon-single-predicate` reds a module carrying all five.
- Interim: until 04 honours a fresh `gate` act the shell halts `unexpected-engine-act` on it; 04 is
  the same wave's successor and closes it.
- No new suite: `test/loop/` is at its budget ceiling (72/72), so every case extends a suite
  already registered there — `decideWave` lands in `work-loop-phase-map.test.mjs` beside the
  decider it sits with. 04 is the story that raises the row, for its own suites.
