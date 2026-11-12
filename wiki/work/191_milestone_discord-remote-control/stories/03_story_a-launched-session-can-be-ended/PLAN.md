# 191/03 · Build brief

## Mechanism

`SESSION_END_KIND`, `buildSessionEndFrame(to, { sessionId, at })` and its relay envelope join
`session-spawn-directive.mjs`, beside the spawn kind. `worker-stream-client.mjs` gains a receive
branch and `onSessionEnd(handler)`, shaped like `onSessionSpawn`. The router in `terminal-input.mjs`
gains the end lane, routed by node exactly as 00 routes the spawn lane: the control's own id goes to
its local handler, every other id to `dispatchDirective`. In both launcher branches, `onSessionEnd`
calls `sessionSpawnHandler.end(sessionId)`.

`handler.end(sessionId)` reuses the per-session `halt()` the shutdown path already has, for one
entry: kill, release, send the end marker, `endSession`. An id it does not own is logged once as
`session-end-not-launched`.

`mesh:session-end` joins `commands/session.mjs`. It resolves the node from presence when not given,
refuses `session-not-found`, pushes the envelope, then polls `queryGlobalMeshStatus` every second
for up to 15 s and answers `{ ended, sessionId, nodeId }`. The CLI face is
`aof mesh session end <session> [--node] [--json]`, and `session` may also be the ADR-002 name.

## Known traps

- `acd-wire-kind-has-both-ends` reds on a kind declared with no reading end. Land the client branch
  and the router lane in the same change as the constant.
- The end must not race the spawn: an end for a session whose spawn is still in flight is "not
  owned" and is logged. It is not queued.
- Ending one session must not touch another's ping interval.

## Verification

Directive suite: the frame and envelope round trip. Handler suite: end of an owned session, end of a
stranger's id, and a second end. Verbs suite: confirmed, unconfirmed after 15 s, not found. The
wire-kind sweep green with the new kind. By hand on this laptop: start with 02's verb, then end it
by name.

## Out of scope

Discord (06). Any idle limit (191/03 Q1: none).
