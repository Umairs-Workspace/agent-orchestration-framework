---
type: story
number: 06
slug: discord-starts-sessions-and-loops
title: "Discord starts sessions and loops — `/session start|list|end` and `/loop start` dispatch the registered verbs, behind the channel's allowlist"
parent: 191
depends: [02, 03, 04, 05]
status: not-started
owner: product-owner
created: 2026-11-11
updated: 2026-11-12
adrs: [ADR-006]
schema: 1
aofVersion: 0.1.0
reads:
  - packages/messaging/src/discord-commands.mjs
  - wiki/work/191_milestone_discord-remote-control/SPEC.md
  - wiki/work/191_milestone_discord-remote-control/ARCHITECTURE.md#ADR-006
  - wiki/work/191_milestone_discord-remote-control/ARCHITECTURE.md#ADR-003
  - wiki/work/191_milestone_discord-remote-control/ARCHITECTURE.md#ADR-005
  - wiki/work/archive/131_milestone_the-human-in-the-loop/ARCHITECTURE.md#ADR-009
  - packages/mesh/src/commands/session.mjs
  - packages/work-loop/src/commands/loop.mjs
  - packages/messaging/src/bot.mjs
files:
  - packages/messaging/src/discord-commands.mjs
  - test/discord/discord-commands.test.mjs
  - test/discord/discord-fixture.mjs
  - test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs
  - wiki/architecture/discord-notifications.md
---
# 191/06 · Discord starts sessions and loops

## User story

As **an operator with only Discord on a phone**,
I want **to start a Claude session in any project the channel serves and open it with one tap, see
and end the sessions I started, and start a loop**,
so that **an unplanned debug or a quick fix no longer needs a session I remembered to open before
leaving the desk**.

What lands (ADR-006 §3–§5): four table entries (`/session start`, `/session list`, `/session end`
and `/loop start`), `node`, `item` and `session` autocomplete, the replies, and FF-13113's
`ALLOWED_VERBS` grown by exactly the session verbs and `mesh:status` (FF-19106).

## Tasks

- [ ] 00 [the table carries the new commands](tasks/00_the-table-carries-the-new-commands.feature)
- [ ] 01 [a session starts from the channel, privately](tasks/01_a-session-starts-from-the-channel-privately.feature)
- [ ] 02 [sessions are listed and ended from the channel](tasks/02_sessions-are-listed-and-ended-from-the-channel.feature)
- [ ] 03 [a loop starts from the channel](tasks/03_a-loop-starts-from-the-channel.feature)
- [ ] 04 [FF-19106 grows the verb set by exactly the session verbs](tasks/04_ff-19106-grows-the-verb-set-by-exactly-the-session-verbs.feature)
- [ ] 05 [the guide lists the new commands](tasks/05_the-guide-lists-the-new-commands.feature)

## Notes

- The commands invoke only registered verbs. Starting a session is 02's verb, ending one is 03's,
  and starting a loop is 04's flag. Nothing here spawns or pushes.
