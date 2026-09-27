
# 02 · The notifier and its channels — Outcome

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

### A `work.notify` config surface that never holds the secret
`work.notify` is a closed schema. Channels are named by type, and `urlEnv` defaults to `AOF_DISCORD_WEBHOOK_URL`. It also takes an `events` filter and a `link`. There is no `url`, `webhook` or `token` key, and `resolveNotifyConfig` is its one resolver. An absent block is a no-op with zero network calls.

### One envelope, built in one place
`buildNotifyEnvelope` in `src/notify/notify.mjs` builds the eleven-key envelope (`event, ref, at, node, phase, elapsedMs, question | stop | outcome, answerPath, link`) for the closed `EVENTS` set. `stop` carries the halting item's `ref`.

### One headline formatter every face shares
`src/notify/form.mjs` (zero imports, typed by `form.d.mts`) is the only home of `formatElapsed`, `oneLineAsk`, `eventPhrase`, `headline`, `cost` and `accountLine`. The terminal, the board and Discord all read from it (FF-13108).

### A Discord webhook renderer and a channel registry
`CHANNELS` maps a type to its renderer and sender. `renderDiscord` posts plain `content` with `allowed_mentions: { parse: [] }`, at most 2,000 characters. Only the body gives way under the cap, the headline, answer command and link are kept, and code fences are closed before the suffix.

### Best-effort delivery that never fails a run
`notify` is awaited and sends to each channel in parallel, each bounded at 5 s and never retried. It never throws. A failure degrades by one of three named codes, and no message, log or degrade carries the URL (FF-13106, FF-13107).

### An accepted milestone is announced
`aof work status <milestone> done` fires `milestone-accepted` once, after the move, with the title from the resolved row. A delivery failure never fails the accept.

## Assumptions

- **Discord accepts an unauthenticated webhook POST** — delivery has no bot and no retry, so an outage loses that message and leaves only the degrade line.
