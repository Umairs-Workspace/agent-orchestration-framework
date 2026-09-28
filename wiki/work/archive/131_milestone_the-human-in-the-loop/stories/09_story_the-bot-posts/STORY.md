---
type: story
number: 09
slug: the-bot-posts
title: "The bot posts — aof has its own Discord bot account, every notification is posted by it into a configured channel, and it replaces the webhook"
parent: 131
depends: [2, 8]
status: done
owner: product-owner
created: 2026-09-25
updated: 2026-09-25
schema: 1
aofVersion: 0.1.0
adrs: [ADR-005, ADR-007]
reads:
  - wiki/work/131_milestone_the-human-in-the-loop/SPEC.md
  - wiki/work/131_milestone_the-human-in-the-loop/DESIGN.md
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-005
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-007
  - src/notify/form.mjs
  - src/notify/secret.mjs
  - src/work/delegation.mjs
  - src/command-error.mjs
  - src/degrade.mjs
  - src/commands/resume.mjs
  - src/loop/ask.mjs
  - src/commands/item-status.mjs
files:
  - src/notify/discord.mjs
  - src/notify/notify.mjs
  - src/commands/messaging/messaging.mjs
  - schemas/aof.schema.json
  - test/notify/notify-discord.test.mjs
  - test/notify/notify-channels.test.mjs
  - test/notify/notify-messaging.test.mjs
  - test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs
  - wiki/architecture/discord-notifications.md
  - test/arch/loop/acd-loop-ask-waits-in-place.test.mjs
  - test/loop/loop-command-reconcile.test.mjs
  - test/loop/loop-command-stops.test.mjs
  - test/loop/loop-command-wave.test.mjs
  - test/run/run-session-limit-resume.test.mjs
  - wiki/work/131_milestone_the-human-in-the-loop/VERIFICATION.md
---
# 09 · The bot posts

## User story

As **the operator who wants aof to be an account in Discord, not an anonymous webhook**,
I want **a Discord bot that I register once, whose token is stored machine-wide exactly as 08
stores the webhook, and that posts every notification (ask, answered, parked, halt, death,
relaunch, accepted) into a channel named in the project's `work.notify`**,
so that **aof's messages come from one identity I can recognise, permission and later talk back
to, and the bot account is the foundation that answering (10), commands (11) and worker asks (12)
build on**.

## Tasks

- [x] `tasks/00_the-bot-token-enters-by-init-and-prints-the-invite.feature` — `init discord` stores a bot token (prompt or stdin, never argv), `isDiscordBotToken`, the invite URL printed offline; the webhook helpers deleted
- [x] `tasks/01_a-channel-names-its-discord-channel-by-id.feature` — `channelId` + `tokenEnv` in the closed schema; `enable discord --channel <id>`; a channel with no id degrades by name
- [x] `tasks/02_the-bot-posts-through-one-authorised-door.feature` — `discordRequest` + `sendDiscord` to `/channels/{id}/messages`, the token resolved per send, `messages` answered with each `messageId`
- [x] `tasks/03_the-message-is-the-bots-own-and-status-reports-it.feature` — `renderDiscord` without `username`, DESIGN §3 unchanged; `status` reports the bot and never its token
- [x] `tasks/04_the-guide-sets-up-the-bot.feature` — `@manual`: the guide rewritten from the webhook to the bot — portal, intent, invite, permissions, channel id
- [x] `tasks/05_the-register-holds-the-token-and-the-door.feature` — FF-13106 amended, FF-13110 landed, both red-probed in VERIFICATION

## Notes

- **Operator decisions (2026-09-25):** use a bot, not a webhook. The bot REPLACES the webhook: the
  `discord` webhook channel is retired, not kept as a fallback. There is one bot for the whole mesh,
  run by the control node (12 carries worker asks there).
- **Discord facts, checked against the developer docs (2026-09-25):**
  - A bot is an application with a bot user, created in the Developer Portal
    (<https://discord.com/developers/applications>). Its credential is a bot token.
  - Posting is `POST /channels/{channel.id}/messages` with `Authorization: Bot <token>`, and it needs
    no gateway connection. `content` is capped at 2,000 characters, and `allowed_mentions` works as
    it does for webhooks.
  - The bot needs, in the target channel: `VIEW_CHANNEL` (`1 << 10`), `SEND_MESSAGES` (`1 << 11`)
    and `READ_MESSAGE_HISTORY` (`1 << 16`). Refine settles the invite URL's `scope` and
    `permissions`, adding what 10 and 11 need (`applications.commands`, `USE_APPLICATION_COMMANDS`
    `1 << 31`).
- **For refine:**
  - `aof messaging init` stores the token (never argv, owner-only, read at send), reusing 08's store.
  - The channel ID lives in `work.notify`. It is not a secret.
  - The send must return the posted message's ID, because 10 maps a reply back to its ask through it.
  - ADR-005 §1/§2 are amended, and FF-13106 moves from "no webhook URL" to "no bot token".
  - The webhook guide `wiki/architecture/discord-notifications.md` is rewritten as the bot setup
    guide: Developer Portal steps, the settings, the invite URL and the permissions.

## Refine (2026-09-25, `aof:refine 131/09-12 --solo`)

- **ADR-007** is this story's decision, a new ADR that supersedes ADR-005 §1's credential and
  §2's sender (ADR-005 is delivered, so it is marked, not edited).
- **Default decisions:** the invite `client_id` is decoded from the token offline; `init` makes
  no network call; `tokenEnv` defaults to `AOF_DISCORD_BOT_TOKEN`; `channelId` is required, so a
  project enabled by 08 must re-run `enable discord --channel <id>`, which 07's re-refine carries.
- **The send answers `messageId`** so that story 10 can index an ask message. 09 records nothing:
  the index is 10's (ADR-008 §4).
