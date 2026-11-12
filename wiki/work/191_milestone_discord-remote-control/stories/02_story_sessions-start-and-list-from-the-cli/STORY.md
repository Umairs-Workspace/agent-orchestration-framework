---
type: story
number: 02
slug: sessions-start-and-list-from-the-cli
title: "Sessions start and list from the CLI — `aof mesh session start` starts Claude with Remote Control and answers its link, through the one start core the fleet route also uses"
parent: 191
depends: [01]
status: in-review
owner: product-owner
created: 2026-11-11
updated: 2026-11-12
adrs: [ADR-003]
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/191_milestone_discord-remote-control/SPEC.md
  - wiki/work/191_milestone_discord-remote-control/ARCHITECTURE.md#ADR-003
  - wiki/work/191_milestone_discord-remote-control/RESEARCH.md#Q1
  - wiki/work/191_milestone_discord-remote-control/RESEARCH.md#Q4
  - wiki/work/archive/50_milestone_session-launcher/ARCHITECTURE.md#ADR-006
  - wiki/work/archive/50_milestone_session-launcher/ARCHITECTURE.md#ADR-008
  - packages/mesh/src/commands/terminal-resume.mjs
  - packages/mesh/src/session-spawn-directive.mjs
  - packages/mesh/src/terminal-mirror.mjs
  - packages/mesh/src/session-spawn-outcome.mjs
  - packages/core/src/application/bindings/commands/mesh/terminal-resume.mjs
files:
  - packages/mesh/src/session-start.mjs
  - packages/mesh/src/commands/session.mjs
  - packages/mesh/src/commands/contribution.mjs
  - packages/mesh/src/ui-serve.mjs
  - packages/mesh/package.json
  - packages/core/src/application/bindings/commands/mesh/session.mjs
  - packages/core/src/application/bindings/commands/mesh/contribution.mjs
  - packages/core/src/application/assemble.mjs
  - test/mesh/session/mesh-session-verbs.test.mjs
  - test/mesh/session/index.mjs
  - test/mesh/ui/mesh-ui-session-route.test.mjs
  - test/fixtures/application/command-inventory.json
  - test/arch/mesh/acd-mesh-command-cli-bijection.test.mjs
  - test/arch/session/acd-launched-session-from-discord.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
---
# 191/02 · Sessions start and list from the CLI

## User story

As **an operator, and as the Discord bot acting for one**,
I want **one command that starts Claude with Remote Control in a project, on the control or on a
named node, and tells me where to open it, plus one that lists what is running**,
so that **every way of starting a session (the fleet's button, the terminal, Discord) applies the
same checks and gives the same refusals, and the phone always gets either a link or the name to
look for**.

What lands (ADR-003): `planSessionStart` in `session-start.mjs`, used by the fleet route and the new
verbs. `mesh:session-start`, with its bounded watch of the relay for the link or the refusal.
`mesh:session-list`. FF-19103 is the third leg of `acd-launched-session-from-discord`.

## Tasks

- [x] 00 [one start core for the route and the verb](tasks/00_one-start-core-for-the-route-and-the-verb.feature)
- [x] 01 [a start resolves the project, the node and the item](tasks/01_a-start-resolves-the-project-the-node-and-the-item.feature)
- [x] 02 [a start waits for the link or the refusal, and never lies](tasks/02_a-start-waits-for-the-link-or-the-refusal.feature)
- [x] 03 [the list shows what is running](tasks/03_the-list-shows-what-is-running.feature)

## Notes

- `test/mesh/session` moves 7 → 8 in the budget row, with its reason: the session verbs' suite.
  The `mesh:` prefix puts the verbs under the mesh CLI bijection gate with no edit to its predicate,
  but the gate's fixture case table gains `session start|list|end` (172/R3: the census owes this on
  day one). `mesh:session-end` is registered by 03, which extends the same files.
- The route's locked scenarios in `mesh-ui-session-route.test.mjs` must stay green unchanged. The
  edits to that suite add the scenarios that prove the route reaches the core.
