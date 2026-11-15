---
type: story
number: 194
slug: global-discord-channel
title: "A Discord channel declared once in the global config serves every project, instead of being set up per project"
status: done
owner: product-owner
created: 2026-11-14
updated: 2026-11-14
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/194_story_global-discord-channel/EXAMPLES.md
  - wiki/work/194_story_global-discord-channel/PLAN.md
  - packages/core/src/workspace.mjs
  - packages/core/src/paths.mjs
  - packages/core/src/work/delegation.mjs
  - packages/messaging/src/notify.mjs
  - packages/messaging/src/bot.mjs
  - packages/core/src/application/bindings/discord/bot.mjs
  - test/notify/notify-messaging.test.mjs
  - test/notify/notify-channels.test.mjs
  - test/discord/discord-fixture.mjs
  - test/discord/discord-replies.test.mjs
  - test/discord/discord-commands.test.mjs
  - test/discord/discord-buttons.test.mjs
  - test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs
files:
  - packages/core/src/application/bindings/work.mjs
  - packages/core/src/application/bindings/commands/messaging/messaging.mjs
  - packages/messaging/src/commands.mjs
  - packages/messaging/src/replies.mjs
  - packages/messaging/src/discord-buttons.mjs
  - packages/messaging/src/discord-commands.mjs
  - packages/messaging/README.md
  - test/notify/notify-global-channel.test.mjs
  - test/notify/index.mjs
  - test/discord/discord-global-channel.test.mjs
  - test/discord/index.mjs
  - test/fixtures/application/command-inventory.json
  - wiki/work/194_story_global-discord-channel/VERIFICATION.md
  - packages/core/src/application/assemble.mjs
  - packages/messaging/test/services.test.mjs
  - test/notify/notify-messaging.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - wiki/architecture/discord-notifications.md
---
# 194 · Global Discord channel settings

## User story

As an operator who drives several aof projects from one Discord server,
I want to declare a Discord channel (its `channelId` and `allow` list) once in the global
`~/.aof/aof.config.json` and have every project I serve pick it up,
so that a new project notifies me and answers my commands from the first run, without my
re-running `aof messaging enable discord --channel <id>` in it and copying the same `allow` ids
into every project's config.

## Tasks

- [x] 00 · [a project with no channel of its own uses the global one](tasks/00_a-project-with-no-channel-uses-the-global-one.feature)
- [x] 01 · [a project's own channels replace the global ones, and it can switch the global one off](tasks/01_a-projects-own-channels-replace-the-global-ones.feature)
- [x] 02 · [the global channel is set, shown and tested from `aof messaging`](tasks/02_the-global-channel-is-set-and-read-from-the-cli.feature)

## Notes

- **Decisions (operator, 2026-11-14, EXAMPLES.md Q1/Q2):** a project's own channels replace the
  global ones whole, `allow` lists included, and a project can switch the global channel off
  (`aof messaging disable discord` there writes `channels: {}`).
- **Defaults taken (technical, EXAMPLES.md Q3–Q5):** the global layer is applied in
  `loadWorkspace` beside the existing global `mesh` merge; only `channels` is global, `link` stays
  per project; a present `channels` key, even `{}`, is the project's declaration.
- **Why one seam is enough:** the notifier, replies, buttons, slash commands and the command
  registrar all read `workspace.config.work.notify.channels` from `loadWorkspace`. Only
  `aof messaging` reads the project file raw, so it gets the global read/write injected.
- The contract set was drawn by hand from the trace: `story-contract-derive` has no CLI entry,
  and the graph backend is being retired.
- Tests must isolate `AOF_GLOBAL_HOME`. This story writes the global config by design.

## Build notes (continue, 2026-11-14)

- **Contract gaps (writes outside the refined `files:`, now declared above):**
  `assemble.mjs` (one line: the messaging binding gets `provideWork`, so `status`/`test` read
  through the one loader instead of a second copy of the layering rule; a new module was ruled out
  by FF-16004's pinned module ceiling); `packages/messaging/test/services.test.mjs` (the factory's
  new `readGlobalConfig` collaborator); `test/notify/notify-messaging.test.mjs` (three exact-shape
  `status` assertions gain `from`/`switchedOff` and the new `global:` line, which task 02 E9
  requires); `acd-source-directory-budget.test.mjs` (the `test/discord` and `test/notify`
  exemptions name their new suites — 131/10 R1 honoured; `test/discord` is now AT the threshold
  of 8); `wiki/architecture/discord-notifications.md` (the operator guide: the adoption path).
- **Scenario flagged, not changed:** task 00 E2 and task 02's last scenario say `/loop status`,
  which is not a command (`loop` has `stop|resume|start`). The tests use `/status`, which is what
  the scenarios mean. EXAMPLES.md E2 says the same and is only `proposed`.
- **Design decision at build:** `status` and project-level `disable` read the global config the
  way the loader does (unreadable = no global channels), so a broken global file never fails the
  report or blocks a project's own disable; only the `--global` writes refuse it
  (`messaging-global-config-unreadable`), so a write never replaces a file nobody could read.

## Review (solo, 2026-11-14)

Gate ladder clean (`validate 194` PASS, `doctor 194` 0 errors). By-file regression: 135 suites /
906 cases; the only reds are three `test/bundle/core-workspace.test.mjs` cases that fail
identically on a clean `HEAD` worktree (pre-existing: `/var` vs `/private/var`, and the boundary
walker's type-declaration case). The milestone-wide regression gate is not run on this machine.

- **Structural:** no Blocker. Important, `fixed` at the close: `status` and project `disable`
  read the global config strictly, so a broken global file failed a report that must exit 0 —
  they now read it as the loader does.
- **Behavioural:** no Blocker; every `@executable` scenario has a named green case (23 + 1).
  The one `@manual` scenario (a real post on this MacBook) is owed at `aof:verify`.

## Feedback (for retro)

- Nit, recorded: `allowKeyOf` is now spelled three times (replies, buttons, slash commands),
  beside the `channelOf` the first two already duplicate. A shared leaf would cost a module on the
  FF-16004 path; left as is.
- Amendment, recorded: task 00 E2 and task 02's last scenario name `/loop status`, which is not a
  command; the intended command is `/status`. The delivered `.feature` is not edited.
- `test/discord` sits at the flat-layer threshold (8); the next suite there owes a row.
