---
type: story
number: 00
slug: the-control-node-hosts-a-launched-session
title: "The control node hosts a launched session — a start aimed at the control's own node opens its PTY there, through the worker's own handler"
parent: 191
status: not-started
owner: product-owner
created: 2026-11-11
updated: 2026-11-12
adrs: [ADR-001]
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/191_milestone_discord-remote-control/SPEC.md
  - wiki/work/191_milestone_discord-remote-control/ARCHITECTURE.md#ADR-001
  - wiki/work/191_milestone_discord-remote-control/RESEARCH.md#Q4
  - wiki/work/archive/50_milestone_session-launcher/ARCHITECTURE.md#ADR-004
  - packages/mesh/src/session-spawn-handler.mjs
  - packages/mesh/src/session-spawn-directive.mjs
  - packages/mesh/src/worker-stream-client.mjs
  - packages/core/src/application/bindings/mesh/session-spawn-handler.mjs
  - packages/core/src/application/bindings/mesh/terminal-input.mjs
  - test/mesh/ui/mesh-ui-session-route.test.mjs
  - test/arch/session/index.mjs
files:
  - packages/mesh/src/launcher.mjs
  - test/mesh/launcher/mesh-launcher-session-wire-complete.test.mjs
  - packages/mesh/src/terminal-input.mjs
  - test/mesh/session/mesh-session-spawn-handler.test.mjs
  - test/mesh/terminal/mesh-terminal-input-path.test.mjs
  - packages/mesh/test/relay.test.mjs
  - test/arch/session/acd-launched-session-from-discord.test.mjs
  - test/arch/session/index.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
---
# 191/00 · The control node hosts a launched session

## User story

As **an operator whose projects live on the control node**, which on this laptop is the only node,
I want **a session started for a project to open on the control node itself, as it would on a
worker**,
so that **starting a session works on a single-node mesh and for every project the Discord channel
serves, all of which are checked out on the control**.

What lands (ADR-001): the control branch of the launcher builds a session-spawn handler from the
worker's factory, wired to the control's local terminal ingress and its loopback push. The router in
`terminal-input.mjs` hands a `session-spawn` or `terminal-input` frame for the control's own node to
it. FF-19101 founds `acd-launched-session-from-discord.test.mjs`.

## Tasks

- [ ] 00 [a spawn for the control's own node opens a local session](tasks/00_a-spawn-for-the-controls-own-node-opens-a-local-session.feature)
- [ ] 01 [the router sends each frame to exactly one place](tasks/01_the-router-sends-each-frame-to-exactly-one-place.feature)
- [ ] 02 [FF-19101 holds one handler for both roles](tasks/02_ff-19101-holds-one-handler-for-both-roles.feature)

## Notes

- `session-end` routing (ADR-001 §2's third lane) lands with 03, which adds the kind. This story
  routes the two lanes that exist today.
- The fleet route needs no change: its frame for the control now lands (ADR-001 §5). The route
  suite's locked scenarios must stay green, which is why it is in `reads:`, not `files:`.
- `test/arch/session` moves 39 → 40 in the budget row, with its reason: one file for the three
  launched-session controls, FF-19101–19103 (ARCHITECTURE Fitness functions).
