
# 09 · The bot posts — Outcome

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

### A Discord bot token as the one messaging credential
`aof messaging init discord` stores a bot token (hidden prompt or stdin, never argv) in 08's owner-only `discord.secret`; `isDiscordBotToken` is the shape check, a webhook URL is refused naming the guide, and no webhook sender or URL shape remains in `src/`.

### An offline invite URL
`init discord` prints `https://discord.com/oauth2/authorize?client_id=<id>&scope=bot+applications.commands&permissions=2147552320`, with `<id>` decoded from the token's first segment and no network call.

### A channel named by id in `work.notify`
A discord channel is `{ type, channelId, tokenEnv?, events?, allow? }` in the closed schema (no `url`, `webhook`, `token` or `urlEnv`); `enable discord --channel <id>` writes it, refuses `messaging-channel-id-required` without the flag, and completes a channel 08 left with no id in place.

### One authorised door to the Discord API
`discordRequest` in `src/notify/discord.mjs` is the only `src/**` code that builds `Authorization: Bot …` or names the API host (FF-13110); `sendDiscord` posts to `/channels/{id}/messages` after validating `channelId` as a snowflake, is bounded, never throws or retries, and answers the posted `messageId`.

### Every notification posted by the bot
`notify` resolves the token per send (`env[tokenEnv]`, then the store), posts through `sendDiscord`, and answers `{ delivered, failed, messages }` with one `{ channel, channelId, messageId }` per delivered channel; a 2xx whose body read outruns the bound counts as delivered with no id; a channel with no `channelId` degrades `notify-channel-unconfigured` naming the enable command.

### A render that is the bot's own message
`renderDiscord` answers `{ content, allowed_mentions: { parse: [] } }` with no `username`, and DESIGN §3's lines, cap and clip are unchanged.

### A status that reports the bot, never its token
`messaging status` reports the stored token's presence, the `AOF_DISCORD_BOT_TOKEN` override, and each project channel's `channelId` (`--json`: `project.channelIds`, `null` for a channel with no id).

### A bot setup guide
`wiki/architecture/discord-notifications.md` walks the Developer Portal, the Message Content intent, the invite, the permissions and the channel id, and every quoted CLI output in it matches the source CLI.

## Assumptions

- **The application id equals the bot user's id** — true for every application created since 2016; the guide says to take the portal's Application ID if they ever differ.

## Gaps

### A live post by a real bot
- **Status:** open
- **Discharge condition:** 131/07's live run records a real bot message in a real channel, by message id.
Every send above is proven against a fake `fetch`; the guide's test-send commands (PowerShell and curl) were not run against the live API.
