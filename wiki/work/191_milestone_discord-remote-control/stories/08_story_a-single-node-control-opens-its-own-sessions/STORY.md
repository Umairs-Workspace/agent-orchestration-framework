---
type: story
number: 08
slug: a-single-node-control-opens-its-own-sessions
title: "A single-node control opens its own sessions — it finds a served project at its registered folder, and always has a loopback relay"
parent: 191
depends: [00]
status: in-review
owner: product-owner
created: 2026-11-14
updated: 2026-11-14
adrs: [ADR-001]
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/191_milestone_discord-remote-control/ARCHITECTURE.md#ADR-001
  - wiki/work/191_milestone_discord-remote-control/VERIFICATION.md
  - packages/mesh/src/session-start.mjs
  - packages/mesh/src/worker-repo-admission.mjs
  - packages/mesh/src/relay.mjs
  - packages/mesh/src/registry.mjs
  - packages/mesh/src/commands/invite.mjs
  - packages/mesh/src/commands/join.mjs
files:
  - packages/mesh/src/launcher.mjs
  - packages/core/src/application/bindings/mesh/launcher.mjs
  - packages/mesh/src/terminal-relay-bridge.mjs
  - packages/core/src/application/bindings/mesh/terminal-relay-bridge.mjs
  - packages/mesh/src/session-spawn-handler.mjs
  - packages/mesh/src/ui-serve.mjs
  - packages/core/src/application/bindings/mesh/ui-serve.mjs
  - packages/mesh/src/commands/desktop-preflight.mjs
  - packages/core/src/application/bindings/commands/mesh/desktop-preflight.mjs
  - packages/mesh/src/session-start.mjs
  - packages/mesh/src/commands/session.mjs
  - packages/mesh/src/commands/terminal-resume.mjs
  - test/arch/session/acd-launched-session-from-discord.test.mjs
  - test/arch/session/acd-terminal-stream-transport-wired.test.mjs
  - test/mesh/session/mesh-session-spawn-handler.test.mjs
  - .claude/rules/build-deploy-restart.md
---
# 191/08 · A single-node control opens its own sessions

## User story

As **an operator whose laptop is its own single-node mesh**,
I want **`/session start` for a project on this laptop to open a session in that project's folder**,
so that **I can start work from my phone without a second machine, which is the milestone's outsider
check**.

What lands (ADR-001 amendment 2026-11-14, F-03): the control binds its own checkout seams,
built from the workspace's registered `project_root`. A nominated control with no `mesh.relay.url`
derives a loopback relay at `ws://127.0.0.1:4183/ws/relay`, so the relay never shares the stream
server's port. The desktop preflight gains `control-relay-loopback`. FF-19108 and FF-19109.

## Tasks

- [x] 00 [the control opens a served project at its registered folder](tasks/00_the-control-opens-a-served-project-at-its-registered-folder.feature)
- [x] 01 [a nominated control always has a loopback relay](tasks/01_a-nominated-control-always-has-a-loopback-relay.feature)
- [x] 02 [the preflight names the control's relay](tasks/02_the-preflight-names-the-controls-relay.feature)
- [x] 03 [ff-19108 and ff-19109 hold](tasks/03_ff-19108-and-ff-19109-hold.feature)

## Notes

- Scenarios check the ports the launcher asks of its injected `startControlStreamServer` and
  `relayMode` seams. A test never binds 4181, 4182 or 4183: the live daemons on this laptop hold
  4181 and 4182.
- The Windows control sets `mesh.relay.url`, so its relay legs must stay byte-identical (amendment
  §8). That is task 01's last rule.
- 01's `@bug` task (F-05) also writes `session-spawn-handler.mjs`. Build them one after the other.
- The start through the real daemons is not a task here. It is the milestone's outsider check
  (`/session start` from the phone), after `install-local` and the operator's restart.
