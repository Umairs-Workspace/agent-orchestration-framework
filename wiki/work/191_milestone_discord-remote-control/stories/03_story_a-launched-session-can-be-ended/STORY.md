---
type: story
number: 03
slug: a-launched-session-can-be-ended
title: "A launched session can be ended — `aof mesh session end` sends a `session-end` directive, the node halts only a session it launched, and presence confirms it"
parent: 191
depends: [02]
status: in-review
owner: product-owner
created: 2026-11-11
updated: 2026-11-12
adrs: [ADR-004]
schema: 1
aofVersion: 0.1.0
reads:
  - packages/mesh/src/commands/session.mjs
  - wiki/work/191_milestone_discord-remote-control/SPEC.md
  - wiki/work/191_milestone_discord-remote-control/ARCHITECTURE.md#ADR-004
  - wiki/work/191_milestone_discord-remote-control/ARCHITECTURE.md#ADR-001
  - wiki/work/191_milestone_discord-remote-control/RESEARCH.md#Q3
  - wiki/work/archive/50_milestone_session-launcher/ARCHITECTURE.md#ADR-004
  - packages/mesh/src/session.mjs
  - packages/mesh/src/commands/terminal-resume.mjs
files:
  - packages/mesh/src/session-spawn-directive.mjs
  - packages/mesh/src/worker-stream-client.mjs
  - packages/mesh/src/terminal-input.mjs
  - packages/mesh/src/session-spawn-handler.mjs
  - packages/mesh/src/launcher.mjs
  - packages/mesh/src/commands/session.mjs
  - packages/mesh/src/commands/contribution.mjs
  - packages/core/src/application/bindings/commands/mesh/session.mjs
  - packages/core/src/application/bindings/commands/mesh/contribution.mjs
  - packages/mesh/test/mesh-session-spawn-directive.suite.mjs
  - test/mesh/session/mesh-session-spawn-handler.test.mjs
  - test/mesh/session/mesh-session-verbs.test.mjs
  - test/mesh/terminal/mesh-terminal-input-path.test.mjs
  - test/fixtures/application/command-inventory.json
  - test/arch/mesh/acd-mesh-command-cli-bijection.test.mjs
  - test/arch/mesh/acd-wire-kind-has-both-ends.test.mjs
---
# 191/03 · A launched session can be ended

## User story

As **an operator who started a session from a phone and is done with it**,
I want **to end it from wherever I am, and to be told whether it really ended**,
so that **a session started from Discord does not run forever on a machine I am not at**.

What lands (ADR-004): `SESSION_END_KIND` and its builder in the lane's one home, the worker
client's `onSessionEnd`, the router's end lane (the control's own id to its local handler, ADR-001
§2), `handler.end(sessionId)`, and `mesh:session-end` confirmed from presence. FF-19104 extends the
wire-kind sweep. There is no idle limit (191/03 Q1, operator): `/session list` is how a forgotten session is found.

## Tasks

- [x] 00 [the end lane has both ends](tasks/00_the-end-lane-has-both-ends.feature)
- [x] 01 [a node ends only a session it launched](tasks/01_a-node-ends-only-a-session-it-launched.feature)
- [x] 02 [the end is confirmed from presence](tasks/02_the-end-is-confirmed-from-presence.feature)

## Notes

- A session `claude` started in a terminal has no launcher PTY, so `end` refuses it by
  construction (ADR-004 §2). That is not a missing feature.
