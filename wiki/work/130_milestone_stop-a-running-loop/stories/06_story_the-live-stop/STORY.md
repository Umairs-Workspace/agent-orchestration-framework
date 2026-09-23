---
type: story
number: 06
slug: the-live-stop
title: "The live stop — a real loop on this machine stopped from the verb, the fleet and the desktop, read at the source: the session's tree terminated, the run cancelled, the halt naming the request, no relaunch, and --resume bringing it back"
parent: 130
depends: [5]
status: in-progress
owner: product-owner
created: 2026-09-13
updated: 2026-09-23
adrs: [ADR-006, ADR-002, ADR-003, ADR-004, ADR-005]
reads:
  - wiki/work/130_milestone_stop-a-running-loop/SPEC.md
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-006
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-002
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-003
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-004
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md#ADR-005
  - wiki/work/130_milestone_stop-a-running-loop/DESIGN.md
  - .claude/rules/build-deploy-restart.md
  - scripts/install-local.mjs
  - src/loop/stop-request.mjs
  - src/loop/stop.mjs
  - src/commands/loop.mjs
  - src/loop-diag.mjs
files:
  - wiki/work/130_milestone_stop-a-running-loop/STATE.md
schema: 1
aofVersion: 0.1.0
---
# 06 · The live stop

## User story

As **the operator who framed this milestone from a loop that eleven Ctrl+Cs could not stop**,
I want **the SPEC's outcome read at the source on this machine after the payload is installed and
the desktop app restarted: a live loop in this checkout stopped by `aof work loop <scope> --stop`
from another terminal — the session's tree terminated first (the driver's bracket in the diag
log), the run record `cancelled` with `failureReason: null`, the halt line naming the request, the
desktop not relaunching it across two declarations ticks, and `aof work loop <scope> --resume`
bringing it back with the request cleared; then the same loop stopped from the fleet card's button
and from the desktop's row; and a second `--stop` while a first is draining cancelling the session
now**,
so that **the milestone is accepted on what happened, not on what the suites say should happen —
green tests are not a running system**.

What lands: nothing in `src/`; the observations in `STATE.md` (the diag log's stop bracket lines,
the record's bytes, the halt line, the fleet's `stopping` → `cancelling` → gone, the desktop's
`stopping` → `stopped` → gone, the `Cleared stop request` line on resume), each procedure and
result recorded for `aof:verify 130`.

## Tasks

- [ ] `tasks/00_the-live-stop-read-at-the-source.feature` — `@manual`: the verb path (drain, then cancel), the record, the diag bracket, the halt line, the resume; the fleet path; the desktop path and the no-relaunch check over two declarations ticks; the payload install and the operator's restart named as preconditions

## Notes

- Preconditions: `node scripts/install-local.mjs --desktop` (the Rust app changed in 04) and the
  operator's own restart of the desktop app (`aof mesh desktop run` after a graceful Quit) —
  never a daemon started by an agent, never a force-kill.
- The loop used for the live run is a real one on a real item (a `--supervised` loop for the
  desktop leg); the story records which, and its `loopRunId`.
- ADR-004 §6: a foreground `--supervised` loop already yields a row the desktop starts a controller
  for — 126's design, not a regression to record.
