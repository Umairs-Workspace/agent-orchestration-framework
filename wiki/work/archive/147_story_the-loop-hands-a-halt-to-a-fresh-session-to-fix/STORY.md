---
type: story
number: 147
slug: the-loop-hands-a-halt-to-a-fresh-session-to-fix
title: "The loop hands a halt to a fresh session to fix, then resumes"
status: done
owner: product-owner
created: 2026-10-03
updated: 2026-10-04
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/archive/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-002
  - wiki/work/archive/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-005
  - wiki/work/archive/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-008
  - wiki/work/143_milestone_the-loop-starts-from-the-backlog-on-chosen-models/ARCHITECTURE.md#ADR-004
  - packages/work-loop/src/wave.mjs
  - packages/work-loop/src/dispatch.mjs
  - packages/work-loop/src/diagnostics.mjs
  - packages/execution/src/worktrees.mjs
  - packages/execution/src/session-model.mjs
  - packages/execution/src/heartbeats.mjs
  - packages/core/assets/hooks/run-heartbeat-enqueue.mjs
  - packages/core/assets/commands/continue.md
  - packages/core/src/application/bindings/loop/child-drive.mjs
  - packages/core/src/application/bindings/commands/loop.mjs
  - test/arch/loop/acd-loop-family-boundary.test.mjs
  - test/arch/grade/acd-gate-propagation-never-discards.test.mjs
  - packages/work-loop/test/services.test.mjs
files:
  - packages/work-loop/src/engine.mjs
  - packages/work-loop/src/commands/loop.mjs
  - packages/work-loop/src/commands/drive.mjs
  - packages/work-loop/src/commands.mjs
  - packages/work-loop/src/child-drive.mjs
  - packages/contracts/src/loop-bounds.mjs
  - packages/mesh/src/worktrees.mjs
  - packages/core/src/aof-gitignore.mjs
  - packages/core/src/work/update.mjs
  - packages/core/src/application/bindings/work/init.mjs
  - packages/core/src/application/bindings/commands/drive.mjs
  - packages/core/src/application/bindings/command-core.mjs
  - packages/core/assets/commands/repair.md
  - packages/core/assets/manifest.json
  - .aof/aof.lock.json
  - .claude/commands/aof/repair.md
  - .codex/skills/aof-repair/SKILL.md
  - .opencode/commands/aof/repair.md
  - wiki/work/.gitignore
  - wiki/work/.gitattributes
  - docs/acd.md
  - packages/work-loop/test/work-loop-stop-set.suite.mjs
  - test/loop/loop-command-stops.test.mjs
  - test/loop/drive-command-phase-drivers.test.mjs
  - test/work/lifecycle/work-dispatch-lanes.test.mjs
  - test/bundle/claude-settings-merge.test.mjs
  - test/bundle/bundle-asset-manifest-complete.test.mjs
  - test/arch/work/acd-work-command-cli-bijection.test.mjs
  - test/arch/work/acd-work-command-route-coverage.test.mjs
  - packages/core/src/application/bindings/commands/loop.mjs
  - packages/core/src/application/bindings/loop/child-drive.mjs
  - packages/core/assets/bundle.json
  - packages/execution/src/run-transitions.mjs
  - packages/work/src/effects.mjs
  - packages/work-loop/test/services.test.mjs
  - test/loop/loop-bounds.test.mjs
  - test/arch/loop/acd-loop-concurrency-single-home.test.mjs
  - packages/work-loop/src/cycle.mjs
  - packages/core/src/application/bindings/loop/cycle.mjs
  - packages/core/test/application.test.mjs
  - test/loop/loop-command-wave.test.mjs
  - test/loop/loop-command-probe.test.mjs
  - test/loop/loop-fix-transport-shape.test.mjs
  - test/arch/loop/acd-cap-exhaustion-returns-to-the-plan.test.mjs
  - test/arch/loop/acd-loop-narrates-in-flight.test.mjs
  - test/command/command-core-contract.test.mjs
  - test/command/application-assembly.test.mjs
  - test/mesh/worker/mesh-worker-commit-diff.test.mjs
  - test/fixtures/application/command-inventory.json
  - scripts/workspace-runtime-audit.json
  - wiki/work/archive/142_milestone_yarn-workspace-modularization/plans/09-test-ledger.json
  - packages/core/test/bundle.suite.mjs
---
# 147 · The loop hands a halt to a fresh session to fix, then resumes

## User story

As **the operator running `aof work loop` over a milestone**,
I want **a halt to be handed, with its code and details, to a new Claude session whose only job is
to repair that cause, after which the loop resumes on its own**,
so that **a halt about the loop's own bookkeeping — a lane that will not merge or will not reopen —
no longer stops the milestone until I notice it, read the diagnostics and fix it by hand**.

## Tasks

- [x] `tasks/00_the-loop-hands-a-lane-halt-to-a-repair-session.feature` — the three lane stops are
  handed over, every other stop is not, and `--no-repair` / `work.loop.repair` turn it off
- [x] `tasks/01_one-repair-then-the-loop-resumes-or-stops.feature` — the repair run, the in-process
  resume on the recorded choices, and the one-per-halt bound
- [x] `tasks/02_the-repair-session-is-a-fourth-drive-phase.feature` — `work:drive-repair` and the
  `/aof:repair` bundle command's prose
- [x] `tasks/03_the-two-known-causes-no-longer-halt-the-loop.feature` — heartbeat queues never
  committed, `STATE.md` merged by union, the seven tracked queues untracked
- [x] `tasks/04_a-real-loop-repairs-a-lane-halt-and-finishes.feature` — `@manual`, a live repair in
  a scratch project

## Notes

- **The operator's words (2026-10-03):** "if the loop detects an error, pass the error/details to a
  new claude terminal to fix".
- **The two halts that motivate it**, both in a downstream project's milestone 03 on 2026-10-03,
  both about the loop's own records rather than the code built:
  - `lane-merge-conflict` at 03/03 (`dispatch:merge-home:conflict`). Every lane appends its build
    notes to the one milestone `STATE.md`, so two lanes in a wave conflict at merge-home.
  - `lane-open-failed` (`assignment-gate-propagation-dirty-worktree`), after
    `dispatch-lane-uncommitted-work`. The lane commit's `git add -A` captured a live
    `runs/.heartbeats.ndjson`. This repository tracks seven such files from earlier lane commits.
- **Settled at refine (2026-10-04, EXAMPLES.md Q1–Q4):** only the three lane halts are handed
  over, and every other stop still ends the loop. A halt gets one repair. Repair is on for every
  loop unless `--no-repair` or `work.loop.repair: false` turns it off. Both source fixes are part
  of this story. Q5–Q8 (where the session runs, how its outcome is recorded, how the loop resumes,
  how `STATE.md` merges) take the defaults in PLAN.md.
- **Boundary drawn from the source.** `aof graph build .` timed out (`graphify-timeout`, 120 s),
  so no graph informed `reads:`/`files:`. The sets come from reading the halt producers
  (`wave.mjs`), merge-home (`dispatch.mjs`), the one commit verb (`mesh/worktrees.mjs`) and the
  launch (`runLoopLaunch`). Each test lands in the existing suite that owns its subject, so no
  directory budget rises.
- **Build (2026-10-04), the declared write set was short by 22 files**, all appended above. Three
  are behaviour: `run-transitions.mjs` + `effects.mjs` (the repair mint's `run.started` moved the
  primary's `STORY.md` to in-progress, a file the lane also changes, so a hand merge was refused; the
  event now carries the run's loop phase and both status reactors skip a `repair` run), and
  `cycle.mjs`, where review moved the repair mechanism (`repairLaneHalt`) out of the shell. The rest
  are wiring (two core bindings, `bundle.json`) and pins that name a count or a list literally: the
  command catalog and inventory, the drive phases, the loop flags and bound keys, the commit verb's
  git sequence, the shell's line ratchet, two digest ledgers.
- **Account shape (build decision).** A halt whose repair did not end done is RE-PRINTED by the
  launch with the repair's facts appended to the body's Details (`repair=<id>; repairOutcome=<state>`,
  `repaired=<id>`, `repair=refused:<code>`), so the account's last line still names the stop, the
  ref and the resume command. The body's own line stays byte-identical to today's.
- **Review (2026-10-04, one round, lenses performed inline, no Blocker).** Structural: the repair
  mechanism left the shell (2,350 to 2,219 lines, ratchet raised with its reason); `workDirFor` now
  holds the one work-dir default init and update share (fixed at the close; recall R2, m06, shaped
  it). Two Nits recorded: `brief.loop` is the full declaration, a superset of task 01's three keys;
  the repair-off rows prove the halt line is the state's own render with no repair fact, not a
  literal pre-story capture. Task 04 (`@manual`) is open for `aof:verify`.
- **Process (for retro).** `scripts/check.mjs` runs the whole suite; it was run here by mistake
  (isolated home, killed at 10 min). Focused `--only` sets are the story lane on this machine.
