---
type: story
number: 13
slug: test-and-allow-from-the-cli
title: "Test and allow from the CLI — `aof messaging test discord` posts one real message and names the fix when it does not arrive, `enable discord --allow` writes the answer list, and every message names its project"
parent: 131
depends: [8, 9, 10]
status: done
owner: product-owner
created: 2026-09-26
updated: 2026-09-26
schema: 1
aofVersion: 0.1.0
adrs: [ADR-007, ADR-008]
reads:
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-007
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-008
  - src/notify/secret.mjs
  - src/work/delegation.mjs
  - src/command-error.mjs
files:
  - src/commands/messaging/messaging.mjs
  - src/notify/notify.mjs
  - src/notify/discord.mjs
  - src/command-core.mjs
  - test/notify/notify-messaging.test.mjs
  - test/notify/notify-channels.test.mjs
  - test/loop/loop-command-stops.test.mjs
  - test/mesh/mesh-effects-outbox.test.mjs
  - test/run/run-session-limit-resume.test.mjs
  - test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs
  - wiki/architecture/discord-notifications.md
---
# 13 · Test and allow from the CLI

## User story

As **the operator setting up aof's Discord bot for the first time**,
I want **`aof messaging test discord` to post one real message to the project's channel and tell me
in plain words why it did not arrive, and `aof messaging enable discord --channel <id> --allow
<user-id>` to write the answer list**,
so that **I can prove the bot works before a loop depends on it, and set up who may answer without
hand-editing `.aof/aof.config.json`**.

## Tasks

- [ ] `tasks/00_enable-takes-the-allow-list.feature` — `--allow <id>[,<id>…]` adds user ids to the
      channel's `allow`, unique and in order, never removes one; a bad id is refused before any write
- [ ] `tasks/01_messaging-test-posts-one-message.feature` — `messaging test discord` posts the bot's
      test message through the notifier's own checks and sender, answers the message id, degrades
      nothing, and names the fix for 401, 403 and 404; every message names its project on line 1;
      the guide shows all three (`@manual` walk)

## Notes

- **Asked for by the operator during 07's setup (2026-09-26):** "add a test capability into the
  cli please: aof messaging test discord" and "add the allow list to the cli as well".
- **It supersedes 08/00's "four messaging commands" by addition.** 08's delivered `.feature` is not
  edited. This story's contract names the fifth verb, and 08's registration suite reads the verb
  list rather than a literal four.
- **The test post is not a notification.** It is not one of the seven firing sites (FF-13107) and
  builds no envelope. It shares `deliver`'s pre-send checks through one function, `readyChannel`,
  so a green test is the path an ask takes, and the token is still read only in `notify.mjs`
  (FF-13106) and put on the wire only by `discordRequest` (FF-13110).
- **Governed after the build** (`aof:verify 131`, 2026-09-26). The operator asked for the
  change in the middle of 07's setup, so the code landed first and this record governs it.
