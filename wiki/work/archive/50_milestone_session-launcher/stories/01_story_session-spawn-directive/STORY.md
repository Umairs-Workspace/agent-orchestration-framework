---
type: story
number: 01
slug: session-spawn-directive
title: "The session-spawn directive — the wire kind and its receive lane"
status: done
parent: 50
depends: []
created: 2026-08-14
updated: 2026-08-14T01:52:47.0694568+01:00
schema: 1
aofVersion: 0.1.0
---
# 50/01 · The session-spawn directive — the wire kind and its receive lane

## User Story

As the **fleet face**, I need a way to tell a worker to open a bare session, so that the spawn route
can dispatch across the control stream to the chosen node.

## Context

The control stream dispatches down-frames to workers by `kind`. The existing `kind:"directive"` is
assignment-bound (carries `assignmentId`, `itemRef`, `command`). A bare session spawn carries none of
those. This story adds a sibling `kind:"session-spawn"` with its own frame builder and receive lane,
following the established pattern (one `if` branch per kind in `handleTransportMessage`).

ADR reference: 50/ADR-002 (the directive kind for session spawn).

## Acceptance

- A `kind:"session-spawn"` frame is dispatched through `sendDirective` and received by a registered
  `onSessionSpawn` handler on the worker-stream-client.
- The frame carries `{ kind, to, sessionId, workspaceId, assistant, itemRef, at }`.
- An unregistered handler drops the frame silently (never-crash discipline).
- A `session-spawn-ack` up-frame kind exists for the worker to report spawn outcome.
- The kind literals and frame builders live in ONE leaf module.

## Tasks

- [x] [00 — the kind literal and frame builder](tasks/00_session-spawn-frame-builder.feature)
- [x] [01 — the worker-stream-client receive lane](tasks/01_worker-receive-lane.feature)

## Accept decision

Accepted 2026-08-14 — all executable scenarios and Examples rows are green; architect `CONFORMS`,
QA `GREEN`, and `aof work validate 50/01` passes. Evidence: `../../VERIFICATION.md`.
