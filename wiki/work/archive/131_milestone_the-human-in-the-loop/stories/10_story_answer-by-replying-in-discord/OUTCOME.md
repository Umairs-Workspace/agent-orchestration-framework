
# 10 · Answer by replying in Discord — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the MAIN-SESSION GOVERN COMMAND THAT ACCEPTS the
  item (ADR-004, reconciled at 85: aof:verify, or aof:assimilate-code, which reaches done in
  its own step) — never at insert, and never by a developer/evidence subagent, which is the threat
  the rule names (they have Write and have been observed to clobber records and fabricate decisions).
  States product STATE ("the system now IS X"), never motive ("we built X because Y" — that reasoning
  belongs in RETROSPECTIVE.md). This is an ADDITIONAL artifact: it carries no identity frontmatter and
  is never this item's record doc.
-->

## Delivered

### The bot runs on the control node
`startLauncher` starts `src/discord/bot.mjs` on the control node only, when a token resolves, and stops it with the daemon; with no token it logs `discord-bot-off` once and posting is unaffected; a worker never connects.

### A gateway connection that resumes
`src/discord/gateway.mjs` is the only module that opens the gateway socket (FF-13111): it IDENTIFYs with intents 33280, heartbeats and closes a zombie, RESUMEs on every reconnect, re-identifies only on an invalid session or 4007/4009, guards the IDENTIFY budget, stops on 4004/4010–4014 with a named degrade, backs off 1 s → 60 s with jitter, and never throws into the daemon.

### A machine-wide index from a posted ask to its ask
`src/notify/ask-messages.mjs` records `{ messageId, channelId, event, ref, workspaceId, projectRoot, postedAt }` under `<messaging store>/discord-asks/` when `session-needs-input` or `session-parked-unanswered` is delivered to a discord channel, atomically, pruning past 30 days, and a failure degrades `notify-ask-index` without failing the send.

### An allowlisted reply answers the waiting session
`src/discord/replies.mjs` turns a reply to an indexed ask message from a user in that channel's `allow` into `invoke("work:answer", { ref, text, as: "@<username>", via: "discord" })`, adds one ✅ reaction on success, replies with one coded line on a refusal, ignores bots and unindexed or foreign-channel replies silently, and never writes an ask file or run record (FF-13112).

### An allowlist that defaults to nobody
`work.notify.channels.<name>.allow` is a unique list of user snowflakes, absent by default, so a reply is refused `discord-answer-not-allowed` naming the key until the operator lists someone; `messaging status` reports each channel's allowlist size, never an id.

### `by.via: "discord"` on the record
`work:answer` accepts `via: "discord"` from the in-process caller (no CLI flag), and the answer's sanitation, first-answer-wins and `session-answered` are 04's, unchanged.

### An ask message that says it can be answered here
When the channel's `allow` is non-empty, the needs-input action line reads ``Answer: reply to this message, or `aof work answer <ref> "…"` ``.

## Assumptions

- **The bot starts with the daemon** — a token stored after the serve daemon started needs one desktop-app restart before replies are heard; the guide says so.
- **Message Content is enabled in the Developer Portal** — without it the gateway closes 4014 and degrades `discord-intent-disallowed`.

## Gaps

### A live reply through a real gateway
- **Status:** open
- **Discharge condition:** 131/07's live run records a real Discord reply answering a waiting session, with its ✅ and the `session-answered` message.
The gateway, the index and the reply path are proven against a fake gateway and fake REST, never a live Discord session.
