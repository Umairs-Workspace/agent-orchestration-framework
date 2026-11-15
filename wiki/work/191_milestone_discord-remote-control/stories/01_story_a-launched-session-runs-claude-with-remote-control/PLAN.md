# 191/01 · Build brief

## Mechanism

`SESSION_LAUNCHES` and the `launch` key join `buildSessionSpawnFrame` and its relay envelope in
`session-spawn-directive.mjs`. Anything outside the set is dropped, and absent stays absent. The
router's rebuild in `terminal-input.mjs` passes `signal.launch` through the builder. The worker's
receive branch already hands the whole frame on.

In the handler, `launchCommandLine(launch, { sessionId, name, platform })` is a pure export. The
name comes from the workspace the handler already loads (`config.name` or the checkout's basename,
the same fallback the record's `repo` uses), mapped to `[A-Za-z0-9._-]` and clipped. Right after
`pty.spawn` succeeds and before the ok ack, the handler writes the line once. If the write throws,
it is `session-spawn-failed`, through the same teardown as any spawn failure. For a Claude launch,
open the PTY 200 columns wide.

## Known traps

- `cmd.exe` has no `exec`. Close it with `& exit`, and use CR LF.
- `--session-id` must be the canonical UUID the control minted. A frame whose id is not a UUID
  types nothing and refuses.
- The record's `assistant` stays `claude`. Do not invent a new label for a Claude launch.

## Verification

Directive suite: the closed set and the envelope round trip. Handler suite: the typed bytes for each
platform, refusal of a bad id or name, and the PTY ending ending the session. FF-19102's leg and its
red probe. Task 03 on this laptop: a real launch, its name in the Claude app, and the measured
footer bytes.

## Out of scope

Reading the link back (02). Who asks for a Claude launch: the verb (02), never the fleet route.
