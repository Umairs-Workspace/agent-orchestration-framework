---
type: story
number: 04
slug: a-loop-starts-through-the-supervisor
title: "A loop starts through the supervisor — `aof work loop <scope> --hand-off-start` writes a start request, and the desktop app starts a fresh supervised loop on its next poll"
parent: 191
status: in-review
owner: product-owner
created: 2026-11-11
updated: 2026-11-15
adrs: [ADR-005]
schema: 1
aofVersion: 0.1.0
reads:
  - packages/mesh/src/workspace-identity.mjs
  - wiki/work/191_milestone_discord-remote-control/SPEC.md
  - wiki/work/191_milestone_discord-remote-control/ARCHITECTURE.md#ADR-005
  - wiki/work/archive/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-009
  - packages/work-loop/src/engine.mjs
  - packages/core/src/application/bindings/loop/stop-request.mjs
files:
  - packages/work-loop/src/stop-request.mjs
  - packages/work-loop/src/stop.mjs
  - packages/work-loop/src/argv.mjs
  - packages/work-loop/src/commands/loop.mjs
  - packages/mesh/src/declarations.mjs
  - packages/core/src/application/bindings/loop/stop.mjs
  - packages/core/src/application/bindings/commands/loop.mjs
  - packages/core/src/application/bindings/mesh/declarations.mjs
  - scripts/workspace-runtime-audit.json
  - test/loop/loop-command-resume.test.mjs
  - test/loop/work-loop-declarations.test.mjs
  - test/arch/loop/acd-loop-stop-request-single-home.test.mjs
  - test/fixtures/application/command-inventory.json
---
# 191/04 · A loop starts through the supervisor

## User story

As **an operator away from the desk**,
I want **to start a loop on a scope that has never run, without a terminal**,
so that **the loop runs in the desktop app's own environment, supervised and relaunched after a
restart, exactly as one I started at the desk would be, and the bot never starts a process**.

What lands (ADR-005): `requestLoopStart`, `readStartRequests` and `clearStartRequest` beside the
resume request. `work:loop`'s `startHandOff` input with CLI flag `--hand-off-start` and its three
refusals. `SUPERVISED_FLAG` in the argv leaf. One start row per request from
`supervisedDeclarations`. The clear at a fresh supervised launch. FF-19105 is a leg beside FF-13001.

## Tasks

- [x] 00 [a start request is written, or refused by name](tasks/00_a-start-request-is-written-or-refused-by-name.feature)
- [x] 01 [the supervisor is handed a fresh supervised start](tasks/01_the-supervisor-is-handed-a-fresh-supervised-start.feature)
- [x] 02 [the started loop spends the request](tasks/02_the-started-loop-spends-the-request.feature)
- [x] 03 [a start resolves the workspace the mesh already knows](tasks/03_a-start-resolves-the-workspace-the-mesh-already-knows.feature) (`@bug`, F-14)

## Notes

- No Discord here. `/loop start` is 06's, and it only invokes this verb.
- No Rust change: the desktop app spawns the argv a row carries (126/ADR-005).
- `acd-trigger-is-a-caller-not-a-coordinator` asserts every `--flag` a caller composes is one
  `work:loop` declares. `--supervised` already is, so that control is read, not edited.
- **F-14 (outsider check, 2026-11-15):** `handOffStart` read the raw `config.mesh.workspaceId`, so a
  published project with no pinned id was refused, and the refusal named `aof mesh identity`, which
  cannot pin one. Task 03 resolves the id through `resolveWorkspaceId`
  (`packages/mesh/src/workspace-identity.mjs`), reached the way this package already reaches mesh
  collaborators (injected through its core binding, never a new direct cross-package import).
