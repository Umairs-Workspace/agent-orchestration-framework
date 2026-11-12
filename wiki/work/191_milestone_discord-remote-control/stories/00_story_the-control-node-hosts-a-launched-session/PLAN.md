# 191/00 · Build brief

## Mechanism

The control branch of `startLauncher` builds `sessionSpawnHandler` with the same factory and the
same literal keys the worker branch passes at its handler construction. Its three outbound legs are
local: terminal bytes and the end marker go to `ingressForward` (162/ADR-001's loopback push), and
the spawn ack goes to `controlTerminalPush.push(buildSessionSpawnAckEnvelope(nodeId, …))`, where the
fleet face's outcome registry already listens. Build it only when `ingressForward` exists (a relay
is configured). With no relay, there is no local session (ADR-001 §3).

The router (`createTerminalInputRouter`'s spawn lane and its input lane) takes one new optional
port, a local handler `{ nodeId, spawn(frame), input(frame) }`. A frame whose `nodeId` equals the
port's is given to it and never to `dispatchDirective`. When the port is absent, the router is
unchanged byte for byte. The launcher's self-subscription is where the port is passed.

## Known traps

- `stop()` already halts `sessionSpawnHandler`. Assign the control's handler to that same variable,
  or a control daemon with a launched shell will not exit on SIGTERM (the m50 trap the hoisted
  variable's comment records).
- The input lane's fallthrough order is pinned by `acd-session-input-lane-fallthrough`. A local
  frame must be offered to the local launched-session registry first, as on a worker.
- The control's node id comes from `resolveNodeIdentity(ws)`, never from the frame.

## Verification

A launcher started as control with a relay and an injected PTY factory receives a relay
`session-spawn` envelope for its own node id. A PTY opens in the workspace's checkout, a session
record is written under that node id, its bytes reach the loopback push as terminal frames, and the
ok ack reaches the push. `dispatchDirective` is never called. The same frame for another node calls
`dispatchDirective` and opens nothing locally. FF-19101 and its red probe.

## Out of scope

What the PTY runs (01). Ending a session (03). Any change to the fleet route or the UI.
