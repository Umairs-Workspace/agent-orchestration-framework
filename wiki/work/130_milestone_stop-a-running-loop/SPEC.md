---
type: milestone
number: 130
slug: stop-a-running-loop
title: "Stop a running loop — one durable request, one verb, and the fleet and the desktop reach it"
status: done
owner: product-owner
created: 2026-09-13
updated: 2026-09-24
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 130 · Stop a running loop — one durable request, one verb, and the fleet and the desktop reach it

## Objective

**A running `aof work loop` can be stopped from nowhere but its own keyboard — and, measured on
2026-09-13, not even from there.** The shell registers `process.once("SIGINT")` and only sets a
flag; the loop halts `operator-interrupt` AFTER the in-flight drive completes
(`src/commands/loop.mjs:1583`, `:1833`) — an hour or more into a story session. The exit-reason
recorder's persistent per-signal listener swallowed every further Ctrl+C (eleven `signal SIGINT`
lines at 11:41Z in `loop-diag.129.2026-09-13T08-26-34-907Z.log`, pid alive until the driver's own
deadline at 11:45Z); that listener is repaired at `9f6be4be` and is not this milestone's work. The
repair reveals the gap's shape: a second Ctrl+C now kills the process outright, the loop's own halt
is still "wait for the drive", and on Windows nothing outside the loop's console can send that
signal at all. The fleet, the board and the desktop app have no "stop this loop" affordance; the
desktop owns only `--supervised` loops, and its Stop is a bare `child.start_kill()` of the direct
child.

The same log records a second defect the stop must close: when the in-flight drive ended on the
driver's `timeout`, the interrupt branch returned BEFORE `settleDriven`
(`src/commands/loop.mjs:1833-1838`) — 129/04's run is `running` to this hour with the driver's
observation discarded. A stop that leaves the run it stopped in flight is not a stop.

The mesh already has the precedent: assignment WITHDRAW kills the live session through the
driver's `onPtyLive(kill)` seam and settles its run `cancelled` (`src/mesh/worker-execution.mjs`);
`running>cancelled` is a legal edge and a clean cancel is `not-retryable`. 129/02 gave the driver
an `options.signal` that requests `{ failed, cancelled }` through the SAME stop bracket every other
stop takes, and the in-process drive already spreads `ctx.agentSessionDriverOptions` into the
driver — so a signal placed there reaches a live session with no new seam. 129/04's task 06 fixes
the interrupt semantics at the wave grain (first signal drains, second cancels) against an INJECTED
signal seam. The stop request this milestone adds IS that seam's producer; a second one is not
invented. The facts this rests on are measured in `## Measured facts` below.

**The outcome an outsider can verify:** with a loop driving a story in this checkout,
`aof work loop <scope> --stop` from any other terminal ends it within the driver's own stop
bracket — the session's tree is terminated first, the run settles `cancelled`, the loop halts
`operator-interrupt` naming the request — and `aof work loop <scope> --resume` brings it back; the
same request is one button on the fleet node card's line for that loop and one Stop on the
desktop's row for a supervised loop, and after either the desktop's next reconcile does NOT relaunch
it. A second `--stop` while the first is draining cancels the in-flight session now. Nothing changes
in the run store, the board, or `LoopState`.
## Scope

In scope:
- **The stop channel** — a durable stop REQUEST in the aof home, keyed by `loopRunId` beside the
  loop's other home-side files (`loop-fixes/`, `logs/`), honouring `AOF_GLOBAL_HOME`; the loop polls
  it between drives and during a drive. It is the producer of 129/04's injected signal seam and
  carries its ladder: the first request drains (no further dispatch, the in-flight drive finishes,
  halt `operator-interrupt`), a second cancels the in-flight session through the driver's
  `signal` (in-process drive) / stdin end (child drive), settles that run `cancelled`, and halts.
  The request has a lifecycle — requested → honoured → cleared by an explicit `--resume` — so a
  stopped loop is not relaunched by the supervisor and a stale request never stops the next resume.
- **The verb** — `--stop` on the existing `work:loop` command (`aof work loop <scope> --stop`):
  resolves the scope's latest declaration, writes or escalates the request, and reports what it
  found (`loopRunId`, live or not, drain or cancel). `--json`/`--dry-run` stay the read-only probe;
  the registered `run` mints and rewrites nothing in the project tree.
- **The stopped run settles** — the interrupt path carries the driver's observation into the
  settle instead of dropping it: a cancelled session settles `cancelled` (`failureReason: null`),
  a drive that ended on its own settles as it ended; the loop's account names the stop (its
  producer and the cancelled run) in the halt line and its `Details`.
- **The fleet** — the node card's current-work line names each live loop on the node
  (`loop 129 · continue 129/04 · cycle 1 of 3`) from an ADDITIVE presence key read by the same pass
  that reads `activeRuns`, with ONE Stop on this node's own card routed through the fleet server
  (a guarded `POST /api/mesh/…` in the shape of `/api/mesh/assign`) to the verb in that workspace.
  A remote node's loop line renders with no button.
- **The desktop** — the supervised declarations the app already reconciles become rows in its
  window (id, scope, signal) with a Stop that is the same request first (`aof work loop <scope>
  --stop`, spawned as its other `aof` verbs are), a hold so no tick relaunches it, and the OS tree
  kill (`taskkill /PID <child> /T /F` — what the driver itself uses) as the hard fallback for a
  loop that does not answer within a grace; the declarations producer drops a loop whose request
  was honoured until an explicit resume clears it, so `reconcile` never restarts a loop the
  operator just stopped.
- **Records and controls** — `running>cancelled` is the edge used; the run store is byte-pinned
  and unchanged; `LoopState` keeps ten keys and `brief.loop` nine; `LOOP_STOPS` is not extended
  (`operator-interrupt` is the stop, the producer names the request); `ui/` is re-pinned with the
  zero-board-change measurement (nothing under `ui/src/board/` moves); `src/board-ui.mjs` is
  untouched and `work:loop` stays board-deferred.

Out of scope:
- **A loop on another machine** — the request is a file in THIS machine's aof home; the Mac and
  WSL workers' loops are stopped on their own consoles. The fleet renders their loop lines without
  a button; a cross-node stop is a mesh directive and a later item.
- **The board** — 53/ADR-004 froze the board against a loop face and FF-5307 pins `src/board-ui.mjs`
  and the `ui/` tree to it; the board's run row gets no button. The verb and the fleet reach the
  same loop.
- **Stopping one lane of a wave** — 129/04's per-child cancel is the wave tick's; the stop is per
  loop. A "cancel this lane" affordance is that milestone's to add if it wants one.
- **Resuming from a UI** — resume stays `aof work loop <scope> --resume` (and the supervisor's
  relaunch for a declaration whose request was cleared). A Resume button is a separate decision.
- **A new daemon, registry, or store** — the request is a file; the readers are the loop, the
  verb, the declarations producer and the presence read; nothing polls on their behalf.

## Stories

<!-- The stories that compose this milestone. Each is its own NN_story_<slug> item with parent: NN.
     Populated at the Break-down stage (refine); "to be broken down" until then. The milestone is
     accepted when all its stories are. -->

- [x] `01_story_the-stop-request-has-one-home` — `src/loop/stop-request.mjs`: the ten-key file under `<meshRoot>/loop-stops/`, 129/04's ladder, requested → honoured → cleared, and `createStopSource` — the one interrupt source (ADR-001)
- [x] `02_story_the-verb-and-the-shell-honour-it` — `--stop` on `work:loop` through `src/loop/stop.mjs`'s `stopLoop`; the shell reads the source, settles first, a cancel settles `cancelled`, the halt names the request, `--resume` clears (ADR-002, ADR-003)
- [x] `03_story_the-fleet-sees-and-stops-it` — `presence.loops[]` additive and read beside `activeRuns`, `localNodeId` on the status body, `POST /api/mesh/loop-stop` in assign's shape, one line + one button on this node's card (ADR-005)
- [x] `04_story_the-desktop-stops-what-it-supervises` — rows from the map it keeps, a Stop that is the request first and the tree kill last through a pure `core` ladder, and a producer that drops a honoured loop so reconcile never restarts it (ADR-004)
- [x] `05_story_the-register` — FF-13001–FF-13007 in three files under `test/arch/loop/`, the row 55 → 58, the red probes in VERIFICATION (all ADRs)
- [x] `06_story_the-live-stop` — `@manual`: a real loop on this machine stopped from the verb, the fleet and the desktop, read at the source (ADR-006 §5)

## Dependencies

- **129 (loop concurrency), stories 02 and 03 accepted (`b8e6b63c`, `be793cc0`)** — the driver's
  `signal` option and `spawnLaneDrive`'s cancel channel are what the request drives; both are in.
- **129/04 (the wave tick) is `in-progress` and its last run is `running` (killed 2026-09-13,
  awaiting `--resume`'s reclaim).** It owns `src/commands/loop.mjs` too, and its task 06 defines the
  injected signal seam this milestone produces for. Sequencing rule: the story that edits the
  shell (`src/commands/loop.mjs`) and 129/04 are not driven in this checkout at the same time —
  two sessions in one checkout trample each other (129 SPEC). Whichever lands second takes the
  other's shape: if 129/04 lands first the request feeds its seam; if this lands first, 129/04's
  task 06 consumes `src/loop/`'s source instead of inventing one.
- **`9f6be4be`** — the loop-diag signal repair; the second Ctrl+C now exits the process, which is
  the behaviour this milestone's second request supersedes with a settled cancel.

## Measured facts

<!-- Moved out of `## Objective` at 127's accept (2026-09-16): the objective rides every phase brief whole, and at 8,083 chars it exceeded the 8,000-char brief ceiling, so 130's refine brief carried no objective at all (126/R1, 127/VERIFICATION). Nothing below is changed. -->

Measured on 2026-09-13 at `9f6be4be`:

| fact | value | source |
|---|---|---|
| how the shell sees an interrupt | `process.once("SIGINT"\|"SIGTERM")` sets `interrupted`; read at the top of the tick (`:1607`) and after the drive returns (`:1833`) | `src/commands/loop.mjs:1580-1584` |
| what the interrupt branch does with the drive's outcome | returns the halt without `settleDriven` — the run stays `running`, the observation is dropped | `src/commands/loop.mjs:1833-1838`; 129/04's run record |
| signals a Windows process can receive from outside | none — no cross-process SIGINT; the desktop's Stop is `child.start_kill()` on the direct child, the Job Object reaps the tree only on Quit | `app/desktop/crates/app/src/supervisor.rs:254-258`, `:659` |
| the driver's cancel seam | `options.signal` → `stopForOutcome({ failed, cancelled })` through the full bracket; an abort before the spawn is `cancelled` with `processStarted: false` | `src/agent-session-driver.mjs:938-946`, `:1253-1269` |
| how the loop's in-process drive reaches the driver | `work:drive-<phase>` spreads `ctx.agentSessionDriverOptions` as `baseOptions` into `driverOptions` | `src/commands/drive.mjs:263`, `:289-290` |
| the child drive's cancel channel (129/04 lanes) | `spawnLaneDrive({ signal })` → stdin end → `graceMs` → kill; outcome `aborted` | `src/loop/child-drive.mjs:77-144` |
| the run edges and the cancel's readiness | `running>cancelled` legal; a clean cancel records `failureReason: null` → `not-retryable` | `src/run-store.mjs:271-277`, `:437-447` |
| the mesh's control-side stop | withdraw kills through `onPtyLive(kill)` and settles the run `cancelled`, never `failed` | `src/mesh/worker-execution.mjs:1476-1542` |
| the supervisor's relaunch predicate | one row per `brief.loop.scope` when `supervised`; a running-and-fresh run is retained, a stale or retryable-failed one is relaunched (`--resume`) within the workspace's own ceiling | `src/work/loop.mjs:1450-1535`, `src/mesh/declarations.mjs` |
| the desktop's own Stop | `SupervisorCommand::Stop(id)` places a HOLD and flips `desired`; exposed as Tauri commands for the two daemons only; declaration controllers exist but `get_view_model` never lists them | `supervisor.rs:180-230`, `:385-395`; `main.rs:82-137` |
| the desktop's poll | `mesh status --json`, `--declarations` every N ticks; the reconcile is a pure plan over rows + live controllers | `app/desktop/crates/core/src/poll.rs:12-48`, `supervision.rs:264-297` |
| what the fleet's node card knows of a loop | `running N runs` from `presence.activeRuns` — run ids, a frozen `string[]` | `ui/src/fleet/runs.mjs:119-126`, `acd-active-runs-frozen-string-array` |
| the presence record | a frozen ordered schema with an ADDITIVE precedent (`sessions` m38, `buildId` m42) — absent-benign, key always present | `src/mesh/presence.mjs:296-330` |
| the fleet's one write route and its guard | `POST /api/mesh/assign` — same-origin + `application/json`, only named fields lifted off the body | `src/mesh/ui-serve.mjs:431-476` |
| what is frozen | `src/board-ui.mjs`, `src/run-store.mjs`, `src/commands/run-status.mjs` byte-pinned; `ui/` hashed under the zero-board-change contract (53/ADR-004: the loop has NO face on the board); `LoopState` ten keys; `brief.loop` nine; `LOOP_STOPS` frozen with `operator-interrupt` a member; `work:loop` board-deferred (no `/api/work/loop`) | FF-5307, FF-5304, `acd-work-command-route-coverage.test.mjs:211-225` |
| the loop family and `ui/` | FF-5202 forbids the `loops-*` REGISTRY tokens in `ui/`; `work:loop` (the shell) is not in that set | `test/arch/loop/acd-loop-module-import-boundary.test.mjs:29` |
| budgets at ceiling | `src/` 92/92, `src/commands/` 68/68, `src/mesh/` 34/34, `ui/src/fleet/` 20/20 files; `Fleet.tsx` 1549/1560 lines; `TerminalControl.tsx` at 840; `src/loop/` exempt (1 file; 129/04 adds `wave.mjs`, `cycle.mjs`) | `acd-source-directory-budget`, `acd-ui-directory-budget`, `acd-ui-surface-file-budget` |
| the aof home's loop-side files | `<meshRoot>/logs/loop-diag.<scope>.<stamp>.log`; `<meshRoot>/loop-fixes/<runId>.json` (129/ADR-005 §3) — never in a checkout | `src/loop-diag.mjs:12-15`, 129 ARCHITECTURE |
