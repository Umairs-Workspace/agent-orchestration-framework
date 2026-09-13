---
type: story
number: 04
slug: the-wave-tick
title: "The wave tick — the BUILD phase fans the wave into lanes: mint in the lane, child drive, settle, grade and gate in the lane, commit, merge home, cleanup; the ladder is a subtraction from the shell"
parent: 129
depends: [1, 2, 3]
status: in-progress
owner: product-owner
created: 2026-09-12
updated: 2026-09-13
adrs: [ADR-001, ADR-002, ADR-003, ADR-004, ADR-005, ADR-006, ADR-007, ADR-008]
reads:
  - wiki/work/129_milestone_loop-concurrency/SPEC.md
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-001
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-003
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-004
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-006
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-007
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-008
  - wiki/work/127_milestone_backlog-and-archive/STATE.md
  - src/commands/loop.mjs
  - src/work/loop.mjs
  - src/loop-bounds.mjs
  - src/loop/child-drive.mjs
  - src/work/dispatch.mjs
  - src/commands/dispatch.mjs
  - src/mesh/worktree.mjs
  - src/mesh/worker-execution.mjs
  - src/effects/run-transitions.mjs
  - src/run-heartbeat-consumption.mjs
  - src/run-store.mjs
  - src/workspace.mjs
  - src/commands/grade.mjs
  - src/commands/resolve.mjs
  - src/mesh/declarations.mjs
  - src/bundle/hooks/run-heartbeat-enqueue.mjs
  - test/loop/loop-command-sequencing.test.mjs
  - test/loop/loop-command-resume.test.mjs
  - test/loop/loop-command-stops.test.mjs
  - test/loop/loop-driven-row-carries-the-grade.test.mjs
  - test/loop/loop-resumed-redrive-declares-its-grade.test.mjs
  - test/support/work-loop-story-fixtures.mjs
  - test/support/loop-grade-fixture.mjs
  - test/support/dispatch-lane-fixture.mjs
  - test/arch/loop/acd-loop-narrates-in-flight.test.mjs
  - test/arch/loop/acd-loop-probe-contract.test.mjs
  - test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/arch/run/acd-progress-ledger-consumed.test.mjs
  - test/arch/loop/acd-cap-exhaustion-returns-to-the-plan.test.mjs
  - test/arch/loop/acd-clock-counts-attempts.test.mjs
  - test/arch/mesh/acd-heartbeat-by-consumption.test.mjs
  - src/item-lock.mjs
  - src/effects/table.mjs
  - src/loop-progress.mjs
files:
  - src/commands/loop.mjs
  - src/loop/wave.mjs
  - src/loop/cycle.mjs
  - test/loop/loop-command-sequencing.test.mjs
  - test/loop/loop-command-resume.test.mjs
  - test/loop/loop-command-wave.test.mjs
  - test/loop/loop-command-reconcile.test.mjs
  - test/loop/index.mjs
  - test/support/loop/lane-fixture.mjs
  - test/arch/loop/acd-loop-narrates-in-flight.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/arch/run/acd-progress-ledger-consumed.test.mjs
  - test/arch/loop/acd-cap-exhaustion-returns-to-the-plan.test.mjs
  - test/arch/loop/acd-clock-counts-attempts.test.mjs
  - test/arch/loop/acd-loop-probe-contract.test.mjs
  - test/arch/mesh/acd-heartbeat-by-consumption.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 04 · The wave tick

## User story

As **the operator running `aof work loop <NN>` under `refine_first`**,
I want **the BUILD phase to walk `work:next --through-review`, ask `work:dispatch` to admit the
wave, and run every admitted member as a lane — opened at HEAD, its run minted IN the lane with the
loop's declaration, driven by a child process, settled, graded and gated in the lane's own
workspace against a baseline measured once per base commit, committed, merged home and cleaned up —
while a milestone-level wave run carries the loop's liveness, and a `--resume` reconciles the live
lanes before it walks**,
so that **two write-disjoint stories build at once with their own records and their own grades, a
held story is cut from the merged work, a lane's death or a conflict is one named row of the
account, and the supervisor still sees one loop**.

What lands (ADR-003, ADR-004, ADR-007, ADR-008 §3; composing 01/02/03's exports): `src/loop/cycle.mjs`
— `settleStoryCycle(phaseRun, bookkeeping, ctx, { crossToVerify })`, the per-story post-drive
ladder EXTRACTED from `runLoopBody` (grade delta, sampler, review gate, the four bookkeeping maps,
the verify cross) and parameterised by the workspace it grades in; `src/loop/wave.mjs` — the wave
run + heartbeat interval, `decideWave` → `work:dispatch`, the per-lane sequence, interrupt handling,
reconcile-on-resume; `runLoopBody` delegating by mode, passing `throughReview` in BUILD, honouring a
fresh `gate` act, committing its own writes at the end of REFINE; `readGradeBaseline({ baseCommit })`;
`driven` rows with `lane` / `baseCommit` / `merge` / `wave`; `narrate` and `report` as parameters
(FF-12602's scan extended over the family). `src/commands/loop.mjs` is expected to LOSE ~300 lines.

## Tasks

- [ ] `tasks/00_the-ladder-is-extracted.feature` — `settleStoryCycle` in `cycle.mjs`; `sequential` byte-identical (the standing loop suites green unchanged); the shell measured smaller
- [ ] `tasks/01_the-shell-walks-through-review-and-honours-a-gate.feature` — BUILD asks `work:next` with `throughReview`; a fresh `gate` act runs validate + doctor + the recorded grade → `verify` or a `continue` re-drive; REFINE ends with the loop's own writes committed
- [ ] `tasks/02_a-lane-runs-its-story.feature` — open at HEAD → resolve in the lane → mint there (same `brief.loop`, `brief.lane`) → child → settle in the lane → grade / validate / doctor / sampler in the lane workspace → commit → merge → cleanup; the primary's story docs untouched until the merge; the `driven` row names the lane and the merge
- [ ] `tasks/03_the-baseline-is-per-base-commit.feature` — one baseline per wave, measured in the first lane, keyed by sha, read back by `{ baseCommit }`; each lane's delta is its own; VERIFY reads the recorded grade and never re-grades
- [ ] `tasks/04_the-wave-run-carries-the-liveness.feature` — a milestone run with `brief.wave` minted before dispatch, heartbeated and consumed on the interval, settled `done` / `failed`; `decideSupervisedDeclarations` lists one row
- [ ] `tasks/05_held-members-dispatch-after-the-merge.feature` — re-ask after every merge; a held member admitted only once the colliding lane merged; refused members re-asked as lanes close; foreign `at-capacity` halts `lane-open-failed`
- [ ] `tasks/06_interrupt-deadline-and-reconcile.feature` — first signal drains and halts `operator-interrupt`, second aborts and settles `cancelled`; the parent deadline settles `timeout`; `--resume` reconciles stale / unmerged / merged / dirty lanes before walking

## Notes

- Feasibility rulings (2026-09-13) live as RULINGS paragraphs in each task feature; the shape they fix:
  the gate ladder, `DOCTOR_GATE_CODES`, `haltDecision` and the git helpers STAY in the shell and reach
  `settleStoryCycle` through its options bag — the post-drive block, retry ladder, drive/settle/row and
  grade helpers move down, every test-facing symbol re-exported; four shell-text controls red
  unavoidably and are in `files:` (re-pointed, never weakened); a merged lane's clean delta is its
  recorded grade (the progress ledger's last sample); the wave run is re-minted after every merge;
  the wave interval is a ratified departure from FF-6903, its scan extended; `transitionOptions`
  splits into lane workspace + primary lock; the fix file is `<meshRoot>/loop-fixes/<runId>.json`;
  the first lane's child waits for the baseline; `test/support/loop/` owes an exemption row; the
  fixture commits `.aof/aof.config.json` with the rubric. The family's net is +750–900 lines while
  the shell loses 300–900 — the review reads both.
- FF-12902 (05) makes `src/loop/child-drive.mjs` the ONLY family module reaching `node:child_process`
  or `runBounded`: the shell's git helpers (`gitOutput`, `readBuildBaseline`, `readChangeUnderReview`)
  stay in `src/commands/loop.mjs` and never move into `cycle.mjs` or `wave.mjs`.

- Raises the `test/loop` row by exactly its two new suites; `test/support` is at ceiling, so the
  fixture is born in the subject directory `test/support/loop/`.
- Tests inject the child (`ctx.spawnLaneDrive`) and git (`exec`) seams; no PTY, no real `claude`.
