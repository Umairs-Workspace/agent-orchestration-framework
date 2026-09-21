---
type: story
number: 01
slug: the-stop-request-has-one-home
title: "The stop request has one home — a ten-key file in the aof home keyed by loopRunId, 129/04's ladder, a requested → honoured → cleared lifecycle, and the ONE interrupt source the shell reads"
parent: 130
depends: []
status: in-review
owner: product-owner
created: 2026-09-13
updated: 2026-09-21
adrs: [ADR-001]
reads:
  - wiki/work/130_milestone_stop-a-running-loop/SPEC.md
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-001
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-005
  - wiki/work/129_milestone_loop-concurrency/stories/04_story_the-wave-tick/tasks/06_interrupt-deadline-and-reconcile.feature
  - src/loop-diag.mjs
  - src/workspace.mjs
  - src/fs.mjs
  - src/degrade.mjs
  - src/loop/child-drive.mjs
  - src/agent-session-driver.mjs
  - test/loop/loop-diag.test.mjs
  - test/loop/index.mjs
  - test/arch/loop/acd-loop-module-import-boundary.test.mjs
  - test/arch/audit/acd-no-new-silent-catch.test.mjs
files:
  - src/loop/stop-request.mjs
  - test/loop/loop-diag.test.mjs
schema: 1
aofVersion: 0.1.0
---
# 01 · The stop request has one home

## User story

As **the operator who must be able to stop a loop from a process that is not the loop's own**,
I want **one module, `src/loop/stop-request.mjs`, to own the stop request — its path under the aof
home (`<meshRoot>/loop-stops/<loopRunId>.json`, honouring `AOF_GLOBAL_HOME`, never in a checkout),
its ten-key record, 129/04's ladder (the first request drains, the second cancels), its lifecycle
(requested → honoured → cleared), and `createStopSource` — the ONE interrupt source that composes
the process's own SIGINT/SIGTERM with the file, aborts one `AbortSignal` at level 2, hands a third
signal back to node's default, and polls the file on an unref'd interval**,
so that **every reader of a stop — the shell, the verb, the presence read, the declarations
producer — reads one record through one module, and 129/04's injected signal seam has its
producer instead of a second one**.

What lands (ADR-001): `loopStopsDir`, `stopRequestPath`, `STOP_LEVELS` (`{ drain: 1, cancel: 2 }`
— the one map from level to word), `readStopRequest` (absence-tolerant, a corrupt file reads `null`
after `reportDegrade`), `requestLoopStop` (the ladder: create at level 1, escalate to 2, then
idempotent; an `honoured` request unchanged and said so), `markStopHonoured`, `clearStopRequest`,
`createStopSource({ loopRunId, dir, process, pollMs, now })` → `{ level, producer, request, signal,
poll, start, stop }`. Every write goes through `writeText` (temp + rename) after a recursive mkdir.
The literal `loop-stops` and the state words are spelled here and nowhere else under `src/`.

## Tasks

- [x] `tasks/00_the-request-lives-in-the-aof-home.feature` — the path, the ten-key record in frozen order, the absence-tolerant read, the degraded read of a corrupt file, and no write anywhere under a checkout
- [x] `tasks/01_the-ladder-is-first-drains-second-cancels.feature` — `requestLoopStop` creates at level 1, escalates once to level 2 with `escalatedAt`, is idempotent at 2, and leaves an honoured request unchanged; `markStopHonoured` and `clearStopRequest` close the lifecycle
- [x] `tasks/02_the-source-composes-signals-and-the-file.feature` — `createStopSource`: two process signals raise the level 1 → 2 through the source's own persistent listeners, the file's level does the same, `producer()` names whichever raised the level first, `signal` aborts once at 2, the third signal reaches node's default (the listeners are removed), the poll interval is unref'd and `stop()` clears it

## Notes

- The suite extends `test/loop/loop-diag.test.mjs` (the recorder's own suite — the loop's home-side
  files driven against an injected process double and a fake fs), because `test/loop/` is at its
  72/72 ceiling; no `index.mjs` edit. Story 05 owns every budget row.
- `src/loop/` is an exempt family (129/ADR-008); this is its second member. Nothing in this story
  touches `src/commands/loop.mjs` — 02 consumes the source; this story only produces it.
- The source reads the file's LEVEL, never its state: a request already `honoured` at level ≥ 1
  still halts a loop that reads it (the between-drives gap, ADR-002 §6).
