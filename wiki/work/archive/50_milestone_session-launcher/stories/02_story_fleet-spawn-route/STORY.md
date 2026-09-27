---
type: story
number: 02
slug: fleet-spawn-route
title: "The fleet-face spawn route — POST /api/mesh/session"
status: done
parent: 50
depends: [50/01]
created: 2026-08-14
updated: 2026-08-14T20:30:00+01:00
schema: 1
aofVersion: 0.1.0
---
# 50/02 · The fleet-face spawn route — POST /api/mesh/session

## User Story

As an **operator on the terminals home**, I need a named spawn route on the fleet face that accepts
my node + workspace selection and dispatches a session-spawn directive, so that I can start a session
from the grid without leaving the page.

## Context

The fleet face's write surface is bounded ON PURPOSE and fitness-locked. This milestone adds the
fleet's SECOND named write route (`POST /api/mesh/session`) to that allowlist. The route validates
the request, resolves the workspace through the same `queryGlobalMeshStatus` seam the assign route
uses, mints a `sessionId`, and dispatches the `session-spawn` directive frame to the target node. It
writes NO file, spawns NO process, and performs NO shell-out — the mutation is entirely on the worker
side.

ADR references: 50/ADR-001 (route shape), 50/ADR-002 (directive dispatch).

## Acceptance

- `POST /api/mesh/session` with `{ nodeId, workspaceId }` dispatches a session-spawn directive and
  returns `200 { ok: true, sessionId, nodeId, workspaceId }`.
- Same-origin + `application/json` CSRF guard (same shape as `/api/mesh/assign`).
- Coded error responses for: missing fields, unknown workspace, workspace not local, target not
  connected, control identity unknown.
- Other methods on this path return 405.
- The fitness function (`acd-mesh-ui-write-isolation`) is updated to enumerate BOTH named write
  routes (`assign` + `session`) and to fire on any third unenumerated route.
- `mesh-ui-serve.mjs` still performs zero fs-write and zero shell-out (the structural assertions
  remain green unchanged).

## Tasks

- [ ] [00 — the spawn route handler](tasks/00_spawn-route-handler.feature)
- [ ] [01 — fitness function update](tasks/01_fitness-function-update.feature)
- [ ] [02 — honest failure responses](tasks/02_honest-failure-responses.feature)
