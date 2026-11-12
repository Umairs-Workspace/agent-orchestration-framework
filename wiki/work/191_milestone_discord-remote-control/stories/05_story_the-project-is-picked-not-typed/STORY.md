---
type: story
number: 05
slug: the-project-is-picked-not-typed
title: "The project is picked, not typed — every command's `workspace` option becomes `project`, offered by autocomplete from the projects the user may address"
parent: 191
status: not-started
owner: product-owner
created: 2026-11-11
updated: 2026-11-12
adrs: [ADR-006]
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/191_milestone_discord-remote-control/SPEC.md
  - wiki/work/191_milestone_discord-remote-control/ARCHITECTURE.md#ADR-006
  - wiki/work/archive/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-009
  - packages/messaging/src/bot.mjs
  - packages/messaging/src/form.mjs
  - packages/core/src/application/bindings/discord/commands.mjs
files:
  - packages/messaging/src/discord-commands.mjs
  - test/discord/discord-commands.test.mjs
  - test/discord/discord-fixture.mjs
  - test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs
  - wiki/architecture/discord-notifications.md
---
# 191/05 · The project is picked, not typed

## User story

As **an operator typing on a phone in a channel that serves several projects**,
I want **to pick the project from a short list instead of typing its folder name or workspace id,
and to meet one word for it, `project`, on every command**,
so that **a mistyped project never stops or resumes the wrong loop, and the commands read the same
way the replies do**.

What lands (ADR-006 §1–§2): the `workspace` option is renamed `project` on `/status`, `/asks`,
`/loop stop` and `/loop resume`, with `autocomplete: true`. Type-4 autocomplete interactions are
answered with type-8 choices from the kept workspaces. The guide's command table is updated.

## Tasks

- [ ] 00 [one word for the project on every command](tasks/00_one-word-for-the-project-on-every-command.feature)
- [ ] 01 [the project is offered, never refused, while typing](tasks/01_the-project-is-offered-while-typing.feature)
- [ ] 02 [the guide says project, and shows the pick](tasks/02_the-guide-says-project.feature)

## Notes

- `node`, `item` and `session` autocomplete arrive with the commands that take them (06). This
  story builds the autocomplete answer they reuse.
- FF-13113's fixture asserts every COMMAND defers with type 5 first. An autocomplete interaction
  is not a command, is never deferred, and dispatches no verb. The fixture's leg is amended to say
  so, and that is the only edit to the arch file here.
