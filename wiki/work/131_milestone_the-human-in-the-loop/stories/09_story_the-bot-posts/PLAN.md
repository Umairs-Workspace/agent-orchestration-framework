# 09 · The bot posts — build plan

## Mechanism

The credential and the sender change. The six firing sites and the envelope do not.

1. **The door first (task 02).** Add `discordRequest` to `discord.mjs`. It is the only builder of
   `Authorization: Bot …` and the only place that names `https://discord.com/api/v10`. Lift the
   bounded-send body out of today's `sendDiscord`: one timer, an abort, a 429 `retry_after`, and
   `onError` hearing only an error's name. Then `sendDiscord(token, channelId, body)` is one call
   to `POST /channels/{id}/messages`, answering the JSON `id` as `messageId`. Delete
   `isDiscordWebhookUrl` and the URL-taking sender. 11 will call `discordRequest` for its
   interaction routes, so keep its signature general (method, route, body).
2. **The resolution (tasks 01–02).** In `notify.mjs`, `resolveNotifyConfig` reads `channelId` and
   `tokenEnv`. `urlEnv` goes, and `DEFAULT_URL_ENV` becomes `DEFAULT_TOKEN_ENV`. `deliver`
   resolves the token (env, then the store), checks it with `accepts`, and checks `channelId`, then
   renders, then sends. Re-key the redaction pass on the token. Collect `messages` from each
   successful `deliver`. The call sites in `ask.mjs`, `resume.mjs`, `loop.mjs` and
   `item-status.mjs` stay untouched.
3. **The command (tasks 00, 01, 03).** In `messaging.mjs`, `init` keeps its seam and swaps
   `accepts`. It prints the invite URL built from the decoded snowflake. `enable` gains the
   `--channel` flag in `cli.spec.flags` and checks the snowflake. `status` adds `channelIds` and
   renames the override's default name. Nothing in `secret.mjs` changes.
4. **The schema (task 01).** Change the discord channel's properties to `type`, `channelId`
   (pattern `^[0-9]{17,20}$`), `tokenEnv` and `events`, with `required: ["type", "channelId"]`.
   Rewrite the block's description, which today talks about webhooks.
5. **The guide and the register (tasks 04, 05).** Rewrite the guide last, from the built
   commands' real output. Amend FF-13106's legs, add FF-13110 beside it, probe both, and drop
   `pending (09)` from both register entries in `ARCHITECTURE.md`.

## Verification step

Under an isolated `AOF_GLOBAL_HOME`, run the notify suite index and
`acd-loop-ask-reaches-every-face` through the focused runner (`--only`). Then run a hand probe
from a temp project with the source CLI:
1. Pipe the synthetic token into `init discord` and read the invite URL it prints.
2. Run `enable discord --channel 123456789012345678`, then `status --json`.
3. Start a `127.0.0.1:0` server that answers 200 `{"id":"1"}`, and point the send at it through
   an injected `fetch`. Accept a fixture milestone with `work:status`. One POST should arrive,
   carrying the `Bot` header and the channel route.

Grep all output for the token's third segment, and expect no hits.

## Out of scope

- Reading replies, the index, the allowlist and the gateway. Those are 10's.
- 07's precondition change (`enable --channel`). That is 07's re-refine.
- Keeping the webhook as a fallback, which the operator ruled out.

## Known traps

- `reportDegrade` throttles each code for 5 s, so reset the sink between legs, as 08's cases do.
- The FF-13106 sweep still bans the incoming-webhook path literal in `src/**`, and the test
  fixtures are not swept. Build the webhook URL a refusal test pipes in from parts.
- `@inquirer/prompts` stays a lazy import. Only the TTY path loads it.
