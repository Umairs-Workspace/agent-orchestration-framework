---
type: story
number: 07
slug: buttons-on-the-notifications
title: "Buttons on the notifications — a halt carries Resume and Open a session here, a fixed-choice question carries one button per choice, and a tap is checked and dispatched like a reply"
parent: 191
depends: [02]
status: not-started
owner: product-owner
created: 2026-11-11
updated: 2026-11-12
adrs: [ADR-007]
schema: 1
aofVersion: 0.1.0
reads:
  - wiki/work/191_milestone_discord-remote-control/SPEC.md
  - wiki/work/191_milestone_discord-remote-control/ARCHITECTURE.md#ADR-007
  - wiki/work/archive/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-008
  - wiki/work/archive/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-010
  - packages/messaging/src/replies.mjs
  - packages/messaging/src/form.mjs
  - packages/execution/src/codex-protocol-profile.mjs
  - packages/work-loop/src/ask-request.mjs
  - packages/mesh/src/commands/session.mjs
files:
  - packages/messaging/src/discord-buttons.mjs
  - packages/messaging/src/bot.mjs
  - packages/messaging/src/discord.mjs
  - packages/messaging/src/notify.mjs
  - packages/messaging/src/ask-messages.mjs
  - packages/messaging/package.json
  - packages/core/src/application/bindings/discord/buttons.mjs
  - packages/core/src/application/bindings/discord/bot.mjs
  - packages/core/src/application/assemble.mjs
  - packages/work/src/observe.mjs
  - packages/work-loop/src/ask.mjs
  - test/discord/discord-buttons.test.mjs
  - test/discord/index.mjs
  - test/discord/discord-fixture.mjs
  - test/notify/notify-discord.test.mjs
  - test/loop/loop-command-stops.test.mjs
  - test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - wiki/architecture/discord-notifications.md
---
# 191/07 · Buttons on the notifications

## User story

As **an operator who gets a Discord notification on a phone**,
I want **to resume a halted loop, open a session where it halted, or pick one of a question's fixed
answers with a single tap**,
so that **the common responses take one tap instead of typing a command or a reply on a phone
keyboard**.

What lands (ADR-007): `components` on `loop-halted`, `loop-died` and fixed-choice asks when the
channel has an allowlist. Claude asks record their option labels as `choices`. The message index
records halts and the choices it rendered. `discord-buttons.mjs` holds the one `custom_id` grammar
and the press handler, and `bot.mjs` routes type-3 interactions to it. FF-19107 is a leg beside
FF-13113.

## Tasks

- [ ] 00 [a Claude question keeps its choices](tasks/00_a-claude-question-keeps-its-choices.feature)
- [ ] 01 [the right notifications carry buttons](tasks/01_the-right-notifications-carry-buttons.feature)
- [ ] 02 [a tap is checked and dispatched like a reply](tasks/02_a-tap-is-checked-and-dispatched-like-a-reply.feature)
- [ ] 03 [FF-19107 holds a button to what a reply reaches](tasks/03_ff-19107-holds-a-button-to-what-a-reply-reaches.feature)
- [ ] 04 [the guide shows the buttons](tasks/04_the-guide-shows-the-buttons.feature)

## Notes

- `test/discord` gains `discord-buttons.test.mjs`, a seventh member. Its budget row's reason names
  it (131/10 R1: a new module in a swept family names the sweep's control in `files:`).
- A worker's ask carries choices only where its park fact does (131/ADR-010). Where it does not,
  that ask stays reply-only (ADR-007 §2). That is stated, not a gap to close here.
