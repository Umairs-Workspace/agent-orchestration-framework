# 162 · A running loop is visible in the UI — build plan

## Mechanism

The story hangs off the Claude driver's existing `onOutputChunk(chunk, sessionId)` hook. The mesh
assignment path already feeds that hook to `client.sendTerminalFrame`. The drive child feeds it
instead to a loopback ingress that its own node's daemon opens. The daemon forwards each frame
on the leg its role already owns: a worker up its admitted stream, the control node into
`controlTerminalPush`. From there the m38 path is unchanged: control → loopback relay → mirror →
pane. The ingress lives beside the relay push transport in the terminal relay bridge module,
and it should look like that transport: lazy, best-effort, never stalling its caller.

The two facts a pane needs (`relaying`, `loopRunId`) are stated by the child, the one process
that knows them, on the same upsert-and-re-state rhythm the spawn handler uses. The posture
change is one line in session-mount. Timing rides three appended loop-entry keys read off the
drive run. The UI composes progress in one shared loop-line module that both surfaces import.
The terminal ticker hangs off `spawnLaneDrive`, the one seam every drive crosses, and prints
through the caller's own `narrate`.

Build in this order: wire facts first (session record, presence, index, wire types), then the
ingress and the child producer, then the UI module and its two importers, then the ticker. Each
layer's suites stay green before the next starts.

## Verification step

On this machine, with the payload installed and the desktop app restarted by the operator, run a
short loop on the standing test-bed (the `aof-test-repo` checkout, workspace 01). Open
`http://127.0.0.1:4181/` and confirm:

- the session's pane fills with the Claude screen;
- typing into it shows the read-only reason;
- the loop line ticks `active N s ago`;
- after five minutes the terminal prints one status line.

Repeat on the WSL worker after `install-local --wsl` and its restart. Its frames must arrive
under the worker's node id (node-2976), not the control's.

A wrong answer looks like an empty pane with the stream bound. Read the drive's degrade event
first, and check that `~/.aof/mesh/terminal-ingress.json` exists on that node and names a live
daemon's port.

## Out of scope

- The transcript-view fallback — EXAMPLES Q4; its own backlog item.
- Codex native drives — no PTY exists to relay.
- Any input path to a loop session — the read-only rule; answers go through `aof work answer`.

## Known traps

- `acd-terminal-output-signal-source` enumerates the sanctioned `.sendTerminalFrame(` hosts and
  pins each one's exact spelling. The ingress forward is a third host and must be added there,
  with this story's ADR named, or the gate goes red for the right reason.
- The `home → fleet` import ban is gated. `fleetLoopLines` must MOVE to the shared module: a home
  copy gives the quiet rule two homes, and re-exporting the move from fleet is fine.
- The hook's own `SessionStart` fires again on resume and compact. Without the sticky
  `startSession`, a live loop pane silently falls back to `no-producer` mid-drive.
- Lanes are separate checkouts. The heartbeat, run record and Claude projects dir the ticker
  reads are the lane's, never the primary's.
- Never start a daemon to test the ingress. The fixtures inject a server; the live check is the
  operator's restart.
