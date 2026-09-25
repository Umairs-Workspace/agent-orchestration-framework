# 10 · Answer by replying in Discord — build plan

## Mechanism

The bot gains an inbound half. It hangs off three existing seams: the notifier's delivery (the
index), the launcher's control branch (the connection), and `work:answer` (the answer).

1. **The index (task 02).** Add `messagingStoreDir(env)` to `secret.mjs`. `ask-messages.mjs`
   joins `discord-asks` beneath it, writes one JSON file per message atomically (the `fs.mjs`
   temp-and-rename helper), prunes on write, and reads by a snowflake-checked id. In `notify.mjs`,
   `deliver` records the message after a successful send of an ask event. It already holds the
   workspace and the envelope, and 09 made the send answer `messageId`. Wrap the record in its own
   try, so the index can never turn a delivery into a failure.
2. **The connection (task 01).** `gateway.mjs` is a small state machine: `connecting → hello →
   identified|resuming → ready`, plus one reconnect timer. Keep the socket factory, the clock
   (`setTimeout`/`clearTimeout`/`now`) and `discordRequest` injected. The session state is three
   values (`sessionId`, `resumeUrl`, `seq`), and it survives reconnects inside one process only.
   The close-code table is one frozen map from code to action and degrade code.
3. **The composer (task 00).** `bot.mjs` exports `startDiscordBot({ token, workspace,
   globalWorkStoreOptions, … })` and returns `{ stop }`. It owns the dispatch table (`t` →
   handler), which 11 extends with `INTERACTION_CREATE`. It also owns the served-workspace read
   (`resolveNodeWorkspaces` + the daemon's own workspace), done per event. The launcher change is
   the deferred import behind `issuanceAuthority`, plus one line in `stop()`.
4. **The reply (task 03).** `replies.mjs` is one function over a `MESSAGE_CREATE` payload. Order
   the silent exits first, then the allowlist, then the invoke. Map the invoke's coded refusals to
   the lines in one frozen table. In `resume.mjs`, add `"discord"` to the `via` mapping only.
5. **The face (task 04).** `renderDiscord(envelope, { replyable })` changes two action lines.
   `notify` passes `replyable` from the channel's `allow`. Add `allow` to the schema.
6. **Register and guide (tasks 05, 06).** The new arch file, the row 65 → 66, the probes, and
   `pending (10)` dropped. The guide section is written from the built behaviour.

## Verification step

Under an isolated `AOF_GLOBAL_HOME`, run `test/discord/index.mjs`, `test/notify/index.mjs`,
`run-session-limit-resume`, the new arch file and `acd-source-directory-budget` through `node
scripts/test.mjs --only`.

Then run one end-to-end probe with the source tree:
1. In a temp project, write a waiting ask file and post it through `notify`, with a fake fetch
   answering an id. The index record appears.
2. Feed `bot.mjs` a fake gateway that delivers a `MESSAGE_CREATE` replying to that id from an
   allowlisted user.
3. Expect the ask file `answered` with `by.via: "discord"`, one reaction request, and no
   `sessions` or daemon started.

A wrong build shows up in one of three ways: a second IDENTIFY in the fake gateway's frame log, a
reply from a non-allowlisted id that changes the file, or any Discord request for an unindexed
reply.

## Out of scope

- Slash commands and the interaction route. Those are 11's (`bot.mjs`'s dispatch table leaves them
  a slot).
- A worker's ask. That is 12's: the index already records any workspace root, so 12 adds nothing
  here.
- An allow/deny verb, buttons, `/answer`, and DMs.

## Known traps

- `72/FF-7205`: nothing in `src/discord/` may be reached by a static import from the session
  closure. The launcher's import is deferred, and `bot.mjs` defers `command-core.mjs`.
- `reportDegrade` throttles each code for 5 s. The fatal-close cases each assert exactly one
  degrade, so reset the sink between cases.
- The `ws` client emits `close` after `error`. Act on `close` only, or a reconnect is scheduled
  twice.
