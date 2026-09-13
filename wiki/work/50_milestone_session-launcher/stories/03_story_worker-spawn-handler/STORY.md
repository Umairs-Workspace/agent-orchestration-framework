---
type: story
number: 03
slug: worker-spawn-handler
title: "The worker-side spawn handler — PTY open + session registration"
status: done
parent: 50
depends: [50/01]
created: 2026-08-14
updated: 2026-08-14T20:30:00+01:00
schema: 1
aofVersion: 0.1.0
---
# 50/03 · The worker-side spawn handler — PTY open + session registration

## User Story

As the **worker node**, I need to open a bare PTY in a given workspace when the control dispatches a
session-spawn directive, and register that session with a routable id so it appears in the grid like
any other session.

## Context

The worker already spawns interactive PTYs for assignments through `mesh-worker-execution.mjs`
(47 dependents, explicitly NOT touched). A bare session spawn reuses the SAME terminal-providers seam
but carries no lifecycle phase, no work item, no run record, and no state machine. The handler is a
new leaf module (`mesh-session-spawn-handler.mjs`) that registers via `client.onSessionSpawn`.

Registration is through the SAME m48 session API (`startSession`/`pingSession`/`endSession`) every
other session uses. The session appears in the presence record, is picked up by the index, and
renders in the grid — no second class of session.

ADR references: 50/ADR-003 (worker-side PTY spawn), 50/ADR-004 (session registration).

## Acceptance

- On receiving a `session-spawn` directive, the worker opens a PTY in the workspace's checkout root
  (or a worktree if `itemRef` is provided).
- `startSession` is called immediately with the control-minted `sessionId` as the fourth key
  component.
- PTY output is bridged to the control via `sendTerminalFrame`.
- `pingSession` fires on a 30s cadence for the PTY's lifetime.
- On PTY exit: `endSession` removes the record, `sendTerminalFrame` with `end: true` signals the
  control.
- If the workspace is unavailable or the PTY fails to spawn: a `session-spawn-ack` with
  `{ ok: false, code }` is sent, and no session is registered.
- `mesh-worker-execution.mjs` is NOT edited.

## Tasks

- [ ] [00 — the spawn handler module](tasks/00_spawn-handler-module.feature)
- [ ] [01 — session registration lifecycle](tasks/01_session-registration-lifecycle.feature)
- [ ] [02 — PTY output bridging](tasks/02_pty-output-bridging.feature)
- [ ] [03 — failure and cleanup](tasks/03_failure-and-cleanup.feature)
