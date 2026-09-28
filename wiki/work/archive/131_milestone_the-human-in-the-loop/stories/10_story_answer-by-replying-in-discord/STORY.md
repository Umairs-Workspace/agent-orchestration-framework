---
type: story
number: 10
slug: answer-by-replying-in-discord
title: "Answer by replying in Discord — a Discord reply to the bot's ask message, from an allowlisted user, answers the waiting session exactly as `aof work answer` would"
parent: 131
depends: [4, 9]
status: done
owner: product-owner
created: 2026-09-25
updated: 2026-09-25
schema: 1
aofVersion: 0.1.0
adrs: [ADR-003, ADR-007, ADR-008]
reads:
  - wiki/work/131_milestone_the-human-in-the-loop/SPEC.md
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-003
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-007
  - wiki/work/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-008
  - src/notify/discord.mjs
  - src/notify/notify.mjs
  - schemas/aof.schema.json
  - src/notify/form.mjs
  - src/loop/ask-request.mjs
  - src/mesh/presence.mjs
  - src/work.mjs
  - src/workspace.mjs
  - src/degrade.mjs
  - src/fs.mjs
  - src/command-core.mjs
  - src/commands/mesh/serve.mjs
  - src/mesh/declarations.mjs
  - test/support/source-slice.mjs
files:
  - src/discord/gateway.mjs
  - src/discord/bot.mjs
  - src/discord/replies.mjs
  - src/notify/ask-messages.mjs
  - src/notify/secret.mjs
  - src/notify/notify.mjs
  - src/notify/discord.mjs
  - src/commands/resume.mjs
  - src/mesh/launcher.mjs
  - schemas/aof.schema.json
  - test/discord/index.mjs
  - test/discord/discord-fixture.mjs
  - test/discord/discord-bot.test.mjs
  - test/discord/discord-gateway.test.mjs
  - test/discord/discord-replies.test.mjs
  - test/notify/notify-channels.test.mjs
  - test/notify/notify-discord.test.mjs
  - test/notify/notify-messaging.test.mjs
  - src/commands/messaging/messaging.mjs
  - test/run/run-session-limit-resume.test.mjs
  - scripts/test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs
  - test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs
  - test/arch/loop/index.mjs
  - wiki/architecture/discord-notifications.md
  - wiki/work/131_milestone_the-human-in-the-loop/VERIFICATION.md
---
# 10 · Answer by replying in Discord

## User story

As **the operator away from the terminal when a session asks me something**,
I want **to reply to the bot's ask message in Discord, and have that reply, if I am on the
project's allowlist, land on the waiting ask verbatim through the same answer path as `aof work
answer`, recorded as answered by me via Discord, with the session resuming**,
so that **I can unblock a lane from my phone, and nobody who merely can see the channel can steer a
session**.

## Tasks

- [x] `tasks/00_the-discord-family-is-founded-and-the-bot-runs-on-the-control.feature` — `src/discord/` founded; the launcher starts the bot only on the control with a token and stops it; the two directories budgeted, 11's members named ahead
- [x] `tasks/01_the-gateway-resumes-rather-than-re-identifies.feature` — IDENTIFY once with intents 33280, RESUME on every reconnect, fatal closes stop by name, the identify budget respected
- [x] `tasks/02_the-ask-message-is-indexed-when-posted.feature` — `src/notify/ask-messages.mjs`: the two ask events indexed by message id under `messagingStoreDir()`, pruned at 30 days, never failing a send
- [x] `tasks/03_an-allowlisted-reply-answers-the-ask.feature` — `replies.mjs`: an allowlisted reply runs `work:answer` with `via: "discord"`; ✅ on success, one refusal line otherwise, silence for everything else
- [x] `tasks/04_the-ask-message-says-reply-to-answer.feature` — `allow` in the schema; the action line offers the reply when the channel takes answers
- [x] `tasks/05_the-register-holds-the-gateway-and-the-allowlist.feature` — FF-13111 and FF-13112 in a new arch file, the `test/arch/loop` row 65 → 66, red probes
- [x] `tasks/06_the-guide-shows-how-to-answer-from-discord.feature` — `@manual`: the guide's reply section: the intent, the daemon, a user id, `allow`, what the bot answers

## Notes

- **Operator decisions (2026-09-25):** the answer is a Discord REPLY to the ask message (not a
  button, not `/answer`). Only an ALLOWLIST of Discord user IDs, configured per project, may
  answer. Anyone else is refused, visibly. The bot's connection runs on the control node.
- **Discord facts, checked against the developer docs (2026-09-25):**
  - Receiving messages needs a Gateway connection (a websocket, identified with the bot token, URL
    from `GET /gateway/bot`). Reading a reply's TEXT needs the privileged `MESSAGE_CONTENT` intent,
    turned on in the Developer Portal (Bot → Privileged Gateway Intents). Approval is needed only
    for a verified app in 100+ servers.
  - `IDENTIFY` is limited to 1,000 per 24 hours per token. Exceeding it resets the token. The
    connection must RESUME rather than re-identify on every reconnect, and one process holds it.
  - A reply carries `message_reference.message_id`, the ask message's ID that 09's send recorded.
- **For refine:**
  - Which process holds the connection: the control daemon, supervised by the desktop app.
  - The message → ask mapping, and where it is recorded (the ask file or the run record).
  - The answer enters through 04's `work:answer` (sanitation, first-answer-wins, `session-answered`)
    with `by: { actor: <discord user>, via: "discord", node }`.
  - The allowlist's config shape.
  - The bot's acknowledgement in Discord: answered, refused, or already answered.
  - A reply to a message that is not an ask is ignored.
  - This AMENDS the SPEC's out-of-scope line "Answering FROM Discord".

## Refine (2026-09-25, `aof:refine 131/09-12 --solo`)

- **ADR-008** is this story's decision. It answers every "For refine" item above: the serve
  daemon on the control holds the connection (§1); the mapping is a message index written by the
  notifier (§4), not the ask file or the run record; the answer enters through `work:answer` with
  `via: "discord"` (§6); the allowlist is `work.notify.channels.<name>.allow` (§3); the bot reacts ✅
  on success and replies one line on a refusal (§5); a reply to a non-ask message is ignored in
  silence (§5).
- **Default decisions:** no allow/deny verb (the allowlist is edited in config, and the guide shows
  how); the index is pruned at 30 days; the actor is `@<username>`, never a user id (records are
  public); the identify floor is `remaining < 10`.
- **The guide** gains its reply section here, which 09 marked as arriving with this story, so
  `wiki/architecture/discord-notifications.md` is in `files:`.
