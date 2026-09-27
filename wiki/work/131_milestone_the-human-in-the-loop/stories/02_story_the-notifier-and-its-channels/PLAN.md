# 02 · The notifier and its channels — build plan

## Mechanism

Four new leaves and one call site. Stories 03 and 04 import them later, so nothing here waits on
anything.

1. **The form first.** `form.mjs` is pure string work with no import, not even a `node:` one.
   Every other module in the family, and later the board, spells the headline through it. Build
   it and its `.d.mts` first, and check the `.d.mts` by reading its export names. The board's
   type-check is story 05's.
2. **One config reader, one builder.** `resolveNotifyConfig` is the only code that looks inside
   `work.notify`. The schema is the shape's authority, but `validateConfig` does not walk
   `work.*`, so the resolver must survive a hand-edited block without throwing. `buildNotifyEnvelope`
   copies from `fields` only what the event keeps (task 03's list). It fills `answerPath` and
   `link`, and freezes. Do not let `env` near either function.
3. **Render is pure, send is dumb, notify decides.** `renderDiscord` is a pure function of the
   envelope. `sendDiscord` only POSTs and classifies the response into `{ ok, reason, status,
   retryAfter }`. It never throws, and it keeps no string from the URL. `notify` reads
   `env[urlEnv]` at the last moment, picks the degrade code, and builds the message from the
   channel name and the status or error name. Its last act is a redaction pass. Use
   `Promise.allSettled` over the channels so that one hang cannot hold the others past the bound.
4. **The accept site.** In `item-status.mjs`, after `transitionItemStatus` returns and inside
   the success path, if the item is a milestone moving to `done`, await `notify`. Put it before
   the return value is built, and leave the returned object as it was. Pass `ctx.notifyOptions`
   through. The `--if-applicable` catch path never reaches it.

## Verification step

Under an isolated `AOF_GLOBAL_HOME`, run the three notify suites and the source-directory budget
control (all four are in `files:`) through `node scripts/test.mjs --only`. Then run one hand probe. Start a local
`http.createServer` on `127.0.0.1:0` that records the request body and answers 204. Put its URL in
a throwaway env var named by a fixture config's `urlEnv`, and accept a fixture milestone with
`work:status`. The server logs exactly one POST, whose `content` begins `**<ref> — accepted**`.
Repeat with the server answering 500: the milestone still moves to `done`, and the degrade sink
has one `notify-delivery-failed` line with no URL in it. A wrong build shows as a rejected
`notify`, a missing `done`, or the URL in the sink.

## Out of scope

- The other five firing sites: 03 builds `session-needs-input`, `session-parked-unanswered`,
  `loop-halted`, `loop-died` and `loop-relaunched`, and 04 builds `session-answered`.
- The terminal account line's use of `accountLine` (03), and the board's import of `form.mjs` (05).
- FF-13106 to FF-13108 themselves, which are 06's. This story's cases prove the behaviour they will
  guard.
- A `work.notify` block in the committed `.aof/aof.config.json`, and the live webhook. Both are 07's.

## Known traps

- `reportDegrade` throttles per code for 5 s. A second case asserting the same code sees nothing
  unless it calls `setDegradeSinkForTest` first.
- A real `fetch` error from undici can carry the URL in `cause`. Never interpolate `error.message`
  or `cause`; use `error.name` only.
- Race the send against a plain `setTimeout` and CLEAR it when the send settles. Do not `unref` it,
  and do not rely on `AbortSignal.timeout` alone: neither holds the process open, so a
  never-settling `fetch` ends the process mid-run (measured by the developer: exit 13).
- The milestone accept path runs the regression gate. Fixtures accept through `gateOverride` with a
  reason, as the gate's own suites do.
- `acd-source-directory-budget` is shared with 06. Add only the two exemptions.
