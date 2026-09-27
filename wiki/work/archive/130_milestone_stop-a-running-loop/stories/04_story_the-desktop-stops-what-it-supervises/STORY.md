---
type: story
number: 04
slug: the-desktop-stops-what-it-supervises
title: "The desktop stops what it supervises — one row per declaration from the map it already keeps, a Stop that is the request first and the tree kill last through a pure core ladder, and a declarations producer that drops a honoured loop so reconcile never restarts it"
parent: 130
depends: [1, 2]
status: done
owner: product-owner
created: 2026-09-13
updated: 2026-09-23
adrs: [ADR-004, ADR-001, ADR-002, ADR-006]
reads:
  - wiki/work/130_milestone_stop-a-running-loop/SPEC.md
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-004
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-001
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-002
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-006
  - wiki/work/130_milestone_stop-a-running-loop/DESIGN.md
  - wiki/work/126_milestone_the-declaration-is-the-unit/ARCHITECTURE.md#ADR-005
  - wiki/work/126_milestone_the-declaration-is-the-unit/ARCHITECTURE.md#ADR-006
  - wiki/work/36_milestone_mesh-desktop-app/ARCHITECTURE.md#ADR-002
  - wiki/work/36_milestone_mesh-desktop-app/DESIGN.md
  - src/loop/stop-request.mjs
  - src/loop/stop.mjs
  - src/mesh/declarations.mjs
  - src/work/loop.mjs
  - src/run-store.mjs
  - src/loop-argv.mjs
  - src/agent-session-driver.mjs
  - app/desktop/crates/core/src/supervision.rs
  - app/desktop/crates/core/src/status.rs
  - app/desktop/crates/core/src/poll.rs
  - app/desktop/crates/core/src/resolve.rs
  - app/desktop/crates/core/src/view_model.rs
  - app/desktop/crates/core/src/lib.rs
  - app/desktop/crates/app/src/supervisor.rs
  - app/desktop/crates/app/src/main.rs
  - app/desktop/ui/app.js
  - app/desktop/ui/index.html
  - app/desktop/ui/styles.css
  - app/desktop/ui/README.md
  - test/loop/work-loop-declarations.test.mjs
  - test/arch/loop/acd-declaration-predicate-is-composed.test.mjs
  - test/arch/loop/acd-clock-counts-attempts.test.mjs
  - test/arch/ui/acd-desktop-single-data-path.test.mjs
  - test/arch/ui/acd-desktop-supervises-a-supplied-set.test.mjs
  - test/arch/ui/acd-desktop-trusted-spawn.test.mjs
  - scripts/test.mjs
files:
  - app/desktop/crates/core/src/supervision.rs
  - app/desktop/crates/app/src/supervisor.rs
  - app/desktop/crates/app/src/main.rs
  - app/desktop/ui/app.js
  - src/mesh/declarations.mjs
  - src/work/loop.mjs
  - test/loop/work-loop-declarations.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 04 · The desktop stops what it supervises

## User story

As **the operator whose supervised loop is a child of the desktop app**,
I want **the window to list each declaration it supervises as a row beside the daemon rows (`loop
129`, the ramp pill, one Stop, no Start), the Stop to write the same request first — `aof work loop
<scope> --stop`, spawned as the app's other `aof` verbs are, with the hold the app already places
— then a grace, then `taskkill /PID <child> /T /F` as the hard fallback, all decided by a pure
`core` ladder cargo can test; and the declarations producer to drop a loop whose request was
honoured so the reconcile never relaunches what I just stopped, until `--resume` clears the mark**,
so that **a supervised loop is stopped the way every other loop is, the supervisor never fights the
operator by restarting it, and the one new ramp word (`stopping`) tells the truth while the
bracket closes**.

What lands (ADR-004): `IpcViewModel.loops: Vec<IpcLoopRow { id, label, signal }>` joined from the
signals map and a new `SupervisorState.declared` (the last ANSWERED declarations tick); the
`stop_loop(id)` Tauri command → `SupervisorCommand::Stop(id)`, branched on `is_reserved_id`;
`stop_step(presses, since_cancel_ms, grace_ms, exited) -> StopStep::{Request, Cancel, Wait, Kill,
Done}` and `stop_argv(child) -> Option<Vec<String>>` (`argv[0..3]` + `"--stop"`, `None` for a
reserved id) in `core/supervision.rs` with `STOP_GRACE_MS = 30_000` from the CANCEL's spawn; the
shell applying it (spawn via `form_argv_spawn`, `stopping`, the footer notice on a failed spawn,
`taskkill` then `child.wait()`, never `start_kill` for a declaration); `app.js` rendering the
DESIGN's second `.controlbar`; `supervisedDeclarations` reading `readStopRequest` per candidate
and handing `decideSupervisedDeclarations` an additive, default-absent `stopped: Set<loopRunId>`
of the honoured ones (the engine stays import-free).

## Tasks

- [x] `tasks/00_the-ladder-is-pure-and-in-core.feature` — `stop_step` over every input class; `stop_argv` from a declaration's own argv, `None` for a reserved id or a short argv; `STOP_GRACE_MS`; `reconcile` retains a held id (cargo, `#[cfg(test)]` in `supervision.rs`)
- [x] `tasks/01_the-rows-and-the-stop-command.feature` — `loops` on the view model from the map and the last answered declarations tick; `stop_loop(id)` → `Stop(id)`; a reserved id keeps today's path; a declaration takes hold + ladder; `stopping` on request, notice on a failed spawn, `taskkill` + wait on `Kill`, `stopped` after
- [x] `tasks/02_app-js-renders-the-loop-bar.feature` — one `.proc` row per view-model loop in a second `.controlbar`, absent when empty; `data-action="loop-stop"` through the one delegate; `stopping` rides the `running` dot; no Start control
- [x] `tasks/03_a-honoured-loop-yields-no-row.feature` — the producer reads the honoured marks and hands `stopped`; the engine skips a stopped `loopRunId` after the `supervised` guard; absent / empty / ill-typed `stopped` answers byte-identically; a `requested` mark drops nothing; `src/work/loop.mjs` gains no import

## Notes

- `app/desktop/crates/app` is EXCLUDED from cargo test; every decision lives in `core` and the
  shell only applies it (36/ADR-002's split, 126/ADR-006's rule).
- `SupervisedChild` is unchanged — the scope the spawn needs is `argv[2]` of the row's own
  admitted argv (`declarations.mjs` through `argvFor`), never re-parsed.
- The grace starts at the CANCEL's spawn, never the drain (a drain is an hour long by design).
- `test/loop/work-loop-declarations.test.mjs` is extended (ceiling); story 05 owns the register.
- The desktop is rebuilt with `node scripts/install-local.mjs --desktop` and restarted by the
  OPERATOR only (`.claude/rules/build-deploy-restart.md`); story 06 reads the live result.
