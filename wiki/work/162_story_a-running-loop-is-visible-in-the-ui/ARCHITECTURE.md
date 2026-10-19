# 162 · A running loop is visible in the UI — architecture

Decisions settled on 2026-10-17 at refine, after the operator answered EXAMPLES Q1–Q4. Solo:
the architect, QA and developer lenses are played inline in one session, not by independent
agents. The codebase graph was unavailable (`aof graph build .` → `graphify-timeout`), so the
boundaries below are grounded by reading source, cited `file:line`.

**Recall.** The architect recall (observation `cce2518e-5cba-4651-8258-113ec99048fb`) returned
five records. m38/ADR-014 is **honoured**: the loop's bytes ride the frozen
`{ kind, nodeId, signal }` terminal-frame envelope into the read-only mirror, routed by
`(nodeId, sessionId)`, and nothing is persisted. The other four (m03/ADR-003, m38/ADR-013,
m21/ADR-002, m28/ADR-002) were irrelevant. No near-miss was returned.

**The defect, measured at source.** Every `.sendTerminalFrame(` producer lives inside a mesh daemon:
the assignment and resume arrows (`packages/mesh/src/launcher.mjs:1176,1387`) and the spawn
handler's bridge (`packages/mesh/src/session-spawn-handler.mjs:579`). A loop drive is a separate
`aof work drive` process (`packages/work-loop/src/child-drive.mjs:184`), and its Claude driver is
built with no `onOutputChunk` (`packages/work-loop/src/commands/drive.mjs:601-645`). Its bytes
have nowhere to go, its session record never states `relaying`, and the home's feed axis
correctly reads it `no-producer` (`apps/ui/src/home/feed-axis.mjs:124-134`).

## ADR-001: A drive child relays its PTY output through its own node's daemon, over a loopback ingress

**Status:** Accepted for implementation. **Date:** 2026-10-17.

**Context.** EXAMPLES Q1 rules that a loop on any machine streams, including the WSL and Mac
workers. A worker has no local relay: `serveRelay` binds loopback on the control node only
(`packages/mesh/src/relay.mjs:626`). The only off-host leg is the daemon's own admitted stream
(`client.sendTerminalFrame`, `packages/mesh/src/worker-stream-client.mjs:617`). On the control node, the
daemon's `controlTerminalPush` feeds the loopback relay (`packages/mesh/src/launcher.mjs:901-938`).
A daemon is control or worker, never both (`launcher.mjs:845,1058`).

**Decision.**
1. **Every daemon opens one local terminal ingress.** It is a ws server bound to `127.0.0.1` on an
   ephemeral port, started with the daemon and stopped with it. It accepts only terminal-frame
   bytes and end markers for a `sessionId`. Its address and a per-start random token are written
   atomically to `<aof home>/mesh/terminal-ingress.json` (`AOF_GLOBAL_HOME` honoured), and the
   file is removed on stop. A client presents the token, or it is closed before a frame is read.
2. **The daemon forwards on the leg its role owns.** A worker calls
   `client.sendTerminalFrame(sessionId, bytes)` / `sendTerminalEnd(sessionId)`. The control node
   pushes `buildTerminalFrameEnvelope(ownNodeId, …)` into `controlTerminalPush`. **The node id is
   always the daemon's own**, never a field the child sent: this is the F17 re-stamp discipline
   (`launcher.mjs:929-938`) one hop earlier.
3. **The drive child is the producer.** The Claude path in `drive.mjs` passes
   `onOutputChunk(chunk, sessionId)` to the driver. Each chunk is pushed to the ingress, and an
   end marker is pushed once when the session ends. The push is lazy, best-effort and
   fire-and-forget. A missing ingress file, a refused token or a closed socket is reported as one
   coded degrade event per drive, and the drive is never slowed, failed or retried because of it.
4. **Output only, by construction.** The ingress has no write-direction sink. A `terminal-input`
   frame routed to a loop session still reaches no PTY (the worker's input handlers own only
   spawned and assignment sessions), and ADR-002 makes the pane read-only, so no keystroke is
   ever sent.
5. **Scope.** Only Claude drives stream, because a Codex native drive has no PTY. Both the
   sequential drive and every wave lane stream, because both are `spawnLaneDrive` children.

**Alternatives.** (a) The child pushes into the loopback relay itself. Measured: that works on
the control node only, and Q1 rejects it. (b) The child opens its own fabric connection with the
node's credential. That puts a second admitted connection under one node identity, which the
input router and presence attribute by node, and it hands a credential to a short-lived child.
(c) A daemon-side transcript tailer. That is not live, and EXAMPLES Q4 puts the transcript view
out of scope.

**Diagram.** None. This adds one leg to the m38/ADR-014 hybrid transport, and that ADR's
picture stands.

## ADR-002: A loop-driven session states that it is relayed and driven, and its pane is read-only

**Status:** Accepted for implementation. **Date:** 2026-10-17.

**Context.** `relaying === true` makes a pane `producer-known`, and `producer-known` is today
the one input to an **interactive** posture (`apps/ui/src/home/session-mount.mjs:253,259`). A loop
session stated that way would be a typeable pane whose keystrokes are dropped, which is exactly
the silence session-mount exists to prevent (`:26-33`). The story's Notes rule the stream
read-only: typing would race the driver's directive and nudge.

**Decision.**
1. **The session record appends a ninth key, `loopRunId`** (string or null), after `relaying`,
   by the m38/ADR-001 additive discipline. It travels the same hops as `relaying`: the record
   (`packages/mesh/src/session.mjs:158-167`), the presence entry
   (`packages/mesh/src/presence.mjs:239`) and the session index (`packages/mesh/src/global-query.mjs:342`).
2. **The drive child states both facts.** Once its ingress connection is admitted, it writes
   `relaying: true` and `loopRunId` onto its session's record through `pingSession`, which
   upserts. It re-states them on every heartbeat beat while the PTY lives, as the spawn handler
   does (`session-spawn-handler.mjs:463-472`). **`startSession` becomes sticky for both facts**,
   as `pingSession` already is for `relaying` (`session.mjs:363-383`), so a hook's
   `SessionStart` on resume or compact cannot demote a live loop pane.
3. **Posture.** A pane is interactive only when the axis is `producer-known` **and** the row's
   `loopRunId` is null or absent. Any other `loopRunId` is read-only, so a malformed value fails
   closed. The read-only reason reads
   `read-only — a loop drives this session; answer it with aof work answer`. The axis still binds
   a socket for it (`bound`), because the bytes are real. The rule has one home, in
   session-mount's posture line. The fleet's mount is read-only by literal already.

**Alternatives.** A new feed-axis value would put a posture fact into a transport vocabulary
that m49 kept closed at three. Leaving `relaying` false and binding loop panes some other way
would be a second producer fact for one transport truth.

## ADR-003: The loop entry carries its drive's timing, and one UI module composes the progress

**Status:** Accepted for implementation. **Date:** 2026-10-17.

**Decision.**
1. **The presence loop entry appends three keys**, after `stop`: `sessionId`, `driveStartedAt` and
   `lastActivityAt`, all read from the entry's own latest running run
   (`packages/mesh/src/presence.mjs:86,141-163`). They are its `sessionId`, its `createdAt` and its
   **consumed heartbeat**, the same value the loop's stall bound reads (`readConsumedHeartbeatAt`,
   `drive.mjs:632`). "Last activity" therefore means one thing on every face (EXAMPLES Q6):
   the UI's quiet flag and the kill agree on what quiet is.
2. **One shared module composes the loop's line**, at `apps/ui/src/components/loop-line.mjs`
   (+ `.d.mts`). `fleetLoopLines` moves there from `apps/ui/src/fleet/runs.mjs:246`, and it gains
   the progress segment. The fleet and the home both import it. Since m49/ADR-001 forbids
   `home → fleet`, and a copy would give the quiet rule two homes, this is a promotion to the
   tree's shared directory with two surface importers. The `components` ceiling rises 7 → 9 for
   it.
3. **The progress segment.** It reads `· <elapsed> · active <age> ago` while the last activity
   is under **10 minutes** old, and `· <elapsed> · quiet <age>` in the warning tone at 10
   minutes and beyond (EXAMPLES Q3). With no heartbeat yet, it shows the elapsed time alone.
   Between drives (no `ref`) it shows nothing. The threshold is one exported constant
   (`LOOP_QUIET_AFTER_MS`). Ages and durations use one formatter (`5 s`, `14 min`, `1 h 05 min`),
   computed from the browser's clock at render and never stored.

## ADR-004: The loop prints a drive status line every five minutes, from the spawn seam

**Status:** Accepted for implementation. **Date:** 2026-10-17.

**Decision.** A new module, `packages/work-loop/src/drive-status.mjs`, owns the line and its
ticker. The line reads `<ref> — <elapsed>, <n> subagent(s) active, last activity <age> ago`.
It is printed every **5 minutes** while a drive runs (EXAMPLES Q2), as a fixed constant and not
a config key. `spawnLaneDrive` is the one seam every drive passes through, sequential and lane
alike (`child-drive.mjs:17-20`). So it takes an optional `status: { narrate }`, starts the
ticker while `runBounded` is pending and stops it on settle. The child-drive module still prints
nothing itself, because the `narrate` it is handed is the caller's, so `--quiet` silences the
ticker exactly as it silences every other line. Last activity is the run's consumed heartbeat
(ADR-003 §1). "Subagents active" counts the session's `subagents/*.jsonl` transcripts written
within the last interval, under the lane's own Claude projects directory. Before the session id
is known, the line reads `<ref> — <elapsed>, session starting`. The `work-loop/src` ceiling
rises by one for this module.

## ADR-005: The home's empty state names the running loop

**Status:** Accepted for implementation. **Date:** 2026-10-17.

**Decision.** When the page would be E2 (runs in flight, no session row) and a live node reports
a loop, `page-state.mjs` answers a loop-naming copy instead of the bundle sentence. Each loop
line comes from ADR-003's module, followed by `its session has not reported yet` (no `sessionId`
on the entry) or `session <id> is not relaying` (an id with no row). E2's existing sentence
stays for runs that belong to no loop (`page-state.mjs:240-257`). The home also renders the live
loops' lines above the grid in every state that holds a payload, so a running loop is visible
where the operator looks first. Both changes are edits to existing home files: the directory
stays at its 18-file ceiling.

## Fitness functions

Both controls are declared here and land with their subject. Register them in
`test/arch/session/index.mjs` and `test/arch/ui/index.mjs`, and record a red probe for each in
VERIFICATION.md. FF-16201 extends what `acd-terminal-output-signal-source` sanctions. That
suite's producer enumeration gains the ingress forward as its third host, with this ADR as the
reason, and its spelling clause still pins the bytes to the producer's own output.

| ID | Invariant | Enforced by | Source |
| --- | --- | --- | --- |
| FF-16201 | The terminal ingress binds loopback only, admits only a token-bearing client, has no write-direction sink, and stamps every forwarded frame with the daemon's own node id, never the child's | test/arch/session/acd-loop-terminal-ingress.test.mjs — pending | ADR-001 |
| FF-16202 | A session row whose `loopRunId` is anything but null or absent never mounts interactive, on any surface, and the quiet threshold and loop line have exactly one home that both surfaces import | test/arch/ui/acd-loop-pane-read-only.test.mjs — pending | ADR-002, ADR-003 |
