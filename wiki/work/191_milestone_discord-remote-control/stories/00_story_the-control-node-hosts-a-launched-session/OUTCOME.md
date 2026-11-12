# 191/00 · The control node hosts a launched session — Outcome

## Delivered

### FF-19101 holds one handler for both roles
`test/arch/session/acd-launched-session-from-discord.test.mjs` fails unless both launcher branches build from the worker's factory with the same literal keys, fails if any other module under `packages/mesh/src/` spawns a PTY for a spawn frame, and drives the shipped router to prove its two destinations exclusive. The `test/arch/session` budget row is 40.

### The router sends each frame to exactly one place
`createTerminalInputRouter` takes an injected local handler port: a `session-spawn` or `terminal-input` frame for the port's node goes to the local handler and never to `dispatchDirective`, and a frame for any other node goes down that node's stream. A router with no port behaves as before, and a local handler that throws is a `mesh-terminal-input` degrade and an announced refusal.

### A control-local session's bytes travel the loopback push in both directions
The session's output and its end marker are pushed as `terminal-frame` and `terminal-end` envelopes for the control's node, and a `terminal-input` envelope for that node reaches the session's PTY.

### The control daemon's stop reaches its local session
The control's handler is held in the variable the launcher's `stop()` already halts, so stopping the daemon kills the PTY, clears its ping interval and ends its session record.

### A session-spawn for the control's own node opens a session on the control
A control launcher with a relay builds a session-spawn handler from `createMeshWorkerSessionSpawnHandler`, the worker's factory, so a spawn for its own node opens one PTY at the workspace's checkout, writes the `(node, workspace, assistant, session)` record and pushes an ok `session-spawn-ack` to the loopback relay.

## Assumptions

- **The workspace passes the worker's repo guard** — the handler opens a session only for a workspace `workerHasRepo` answers for: one with a `mesh.repo.published` marker or a managed checkout.
- **The control has a relay** — with no `mesh.relay.url` the control builds no handler, and a spawn for its own node is refused as it was before.

## Gaps

### A served project's checkout is not resolved from its descriptor
- **Status:** open
- **Discharge condition:** the control resolves a served workspace's checkout from its registered descriptor `projectRoot`, so a start for a project the channel serves opens a session with no published marker (191/F-03, an amendment to ADR-001 §1).
A project the control serves from a registered checkout has neither a published marker nor a managed checkout, so a start for it refuses `session-repo-unavailable`.

### A single-node control has no stated way to get a relay
- **Status:** open
- **Discharge condition:** a single-node control has a documented way to set `mesh.relay.url`, and a doctor check names its absence (191/F-03, an amendment to ADR-001 §3).
This laptop's global config has no `mesh.relay.url`, so its control builds no local handler and every start for its own node refuses.

### A resume for the control's own node is not routed locally
- **Status:** open
- **Discharge condition:** a `terminal-resume` frame for the control's own node reaches the local handler, or ADR-001 §2 states that a control-local session is not resumable (191/F-04).
The router sends `terminal-resume` for every node to `dispatchDirective`, which has no entry for the control and refuses it as not-connected.
