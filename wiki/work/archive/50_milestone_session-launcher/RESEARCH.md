---
doc: research
---
<!--
  Milestone RESEARCH.md — blocking unknowns resolved by measurement.
  Owner: researcher. Read-only on the codebase; never writes code or design decisions.
-->
# 50 · Session launcher — Research

> **No blocking unknowns.** Every seam this milestone touches is well-established and measured by
> prior milestones. The questions below are CONFIRMATIONS of prior findings, cited at source for the
> architect/builder.

---

## §1 — The control stream's directive dispatch shape (confirmed, not unknown)

**Question.** How does the control dispatch a frame to a specific worker, and what shapes already ride
it?

**Finding (code-read, 2026-08-14).**

`sendDirective(targets, nodeId, directive)` (`src/control-stream-server.mjs:931`) is the ONE
dispatch seam: `targets` is a `Map<nodeId, WebSocket>`, it looks up the socket and sends the JSON
frame. Worker-side `handleTransportMessage` (`src/worker-stream-client.mjs:358-400`) parses the raw
JSON and dispatches on `frame.kind`:

| `kind` | Module that defines it | Purpose |
|---|---|---|
| `"directive"` | literal in control-stream-server.mjs:875 | assignment lifecycle dispatch |
| `WITHDRAW_KIND` ("withdraw") | worker-stream-client.mjs:95 | control-side assignment withdrawal |
| `TERMINAL_INPUT_KIND` ("terminal-input") | mesh-terminal-relay-bridge.mjs | keystroke routing |
| `TERMINAL_RESUME_KIND` ("terminal-resume") | mesh-terminal-relay-bridge.mjs | resume a parked session |
| clone/write credential frames | mesh-clone-credential-provider.mjs | credential supply to worker |
| clone-url frames | control-stream-server.mjs | clone URL resolution for worker |
| effect-ack frames | control-stream-server.mjs | event-reactor acknowledgement |
| recovery-push frames | mesh-recovery-push.mjs | push stranded worktree |

The pattern is: define a `kind` constant, add a branch in `handleTransportMessage`, register a
handler. A new `kind: "session-spawn"` follows this pattern exactly.

**The directive-frame schema is NOT frozen** — `acd-directive-frame-frozen` does not exist. The
assignment-directive frame (`{ kind: "directive", to, assignmentId, itemRef, workspaceId, at }`) is
specific to assignments. Every OTHER kind has its own shape. A session-spawn frame is a SIBLING kind,
not a variant of the assignment directive.

---

## §2 — Worker-side PTY spawn: terminal-providers.mjs reuse (confirmed)

**Question.** Can the worker spawn a bare PTY (no assignment, no work item) using the same seam
`mesh-worker-execution.mjs` uses?

**Finding (code-read, 2026-08-14).**

`src/terminal-providers.mjs` exports `resolveProvider(providerId)` which returns a provider object
with `spawn(options)`. The provider is a node-pty wrapper (`PROVIDER_IDS` is `["node-pty"]`). It is
called from:
- `src/terminal-ws.mjs` — the board-server PTY (takes `projectDir`, spawns the shell)
- `src/mesh-worker-execution.mjs` — the assignment's interactive `claude` PTY

Neither caller imposes a requirement that an `itemRef` or `assignmentId` exist — the PTY spawn is
purely `{ cwd, shell, args, cols, rows }`. A bare session spawn needs:
1. Resolve the `projectDir` for the given `workspaceId` (the worker already does this for assignments
   via `workerHasRepo`/`meshCheckoutPath`)
2. Call `resolveProvider("node-pty").spawn({ cwd: projectDir, cols, rows })` — the same call both
   existing callers make.
3. Register the session via `startSession` (src/mesh-session.mjs) so it appears in presence.

The `sessionId` for a launched session is minted by the ASSISTANT that runs inside it (m48/ADR-001:
the id is read, never made). For a bare shell with no assistant, the session is ANONYMOUS
(`sessionId: null`) until the operator starts `claude` in it — at which point the hook fires and
registers the session with a real id. This is the m48/ADR-001 design at work.

**BUT** milestone 50's SPEC requires "registration with a routable id" — a launched session must be
ADDRESSABLE immediately, not only after `claude` starts. This means the LAUNCHER must assign an id at
spawn time. The launcher is the one caller that cannot wait for a hook to fire (the session exists
before any assistant does). The id must be opaque, stable for the life of the session, and never
collide with a Claude-assigned UUID.

Resolution: the control mints a `crypto.randomUUID()` at launch time and passes it to the worker in
the spawn frame. The worker registers the session under THAT id. When/if `claude` starts inside it
and fires its hook with its own `session_id`, the hook's id takes precedence (a re-registration with
the real id replaces the launcher-minted one via the normal `pingSession` upsert). This is safe
because m48/ADR-002's 4-part key makes each session its own leaf — a re-keyed session simply stops
pinging under the old key (TTL expires it) and starts under the new one.

---

## §3 — The fleet face's bounded write surface (confirmed)

**Question.** What exactly must change in the fitness functions when a second named write route is
added?

**Finding (code-read, 2026-08-14).**

`test/arch/acd-mesh-ui-write-isolation.test.mjs` (line 136) asserts:
```js
const declaresOtherWriteRoute = /pathname\s*===\s*["']\/api\/mesh\/(route|revoke)["']/.test(source);
```

This regex detects `/api/mesh/route` and `/api/mesh/revoke` as PLANTED VIOLATIONS. The test's logic
is:
1. At most ONE of `/api/mesh/issue` and `/api/mesh/assign` is declared (XOR).
2. No `/api/mesh/(route|revoke)` sibling exists.
3. No fs-write, no shell-out, no `/ws/terminal` regardless of which tree is live.

Adding a second NAMED route (e.g. `/api/mesh/session`) requires:
- Expanding the XOR to a THREE-WAY mutual-exclusion or a new bounded-list assertion.
- OR: restructuring the test to assert an EXACT ALLOWLIST of named routes (the cleaner path — a
  regex that grows with every milestone is the opposite of "bounded").

The cleanest structural edit: replace the "at most one of issue/assign" XOR with an **exact allowlist
check** — `declaresAssignRoute && declaresSessionRoute && !declaresOtherWriteRoute`, where
"other" is everything NOT in the known set. This keeps the bound a bound while making it
maintainable.

The no-fs-write/no-shell-out/no-ws-terminal checks are ORTHOGONAL and unchanged — the new route's
mutation rides behind a verb (like `assignWork`), so the face itself still writes nothing.

---

## §4 — The session index (m48/ADR-007): how a launched session appears in `status.sessions[]`

**Question.** What makes a session appear in `buildSessionIndex()` (the grid's data source)?

**Finding (code-read, 2026-08-14).**

`buildSessionIndex({ nodes, assignments, now })` (`src/global-mesh-query.mjs:223`) iterates
`nodes[].presence.sessions[]` — every presence session entry on a live (non-stale) node. For each,
it derives `workItem` from a matching assignment row. The session must:
1. Be in `node.presence.sessions[]` — which means `readLiveSessions` returned it from the node's
   session record files.
2. Have `sessionId` non-null to be ADDRESSABLE (the index includes `sessionId: null` entries but
   they are filtered out by the terminals-home's `addressableSessions(status)` check at
   `ui/src/home/page-state.mjs:80`).

So a launched session appears in the grid if and only if:
- The worker writes a session record file (via `startSession`) with a non-null `sessionId`.
- The worker's heartbeat (`pingSession`) keeps it alive past the TTL.
- The node's presence is assembled and published (the existing heartbeat cycle handles this).

The launcher must therefore ensure the worker calls `startSession` + begins `pingSession` with the
launcher-minted `sessionId`. On end (shell exit / user closes), `endSession` removes the record.

---

## §5 — Honest failure: what can go wrong on the worker side

**Question.** What are the failure modes the SPEC requires honest reporting for?

**Finding (reasoned from code structure).**

1. **Node cannot spawn** — the target `nodeId` has no live WebSocket in `directiveTargets`. Already
   handled by `sendDirective`'s `assignment-target-not-connected` code. The fleet route returns this
   as a coded 4xx (same pattern as `/api/mesh/assign`).
2. **Repo/workspace does not exist on the chosen node** — `workerHasRepo(workspaceId)` returns false
   AND clone-on-miss is not appropriate for a bare session (no credential resolver for a bare spawn).
   The worker refuses with a coded `session-repo-unavailable`.
3. **PTY provider not found** — `resolveProvider("node-pty")` fails (the binary is missing). Already
   surfaces as `{ type: "error", message }` in terminal-ws.mjs. The worker reports
   `session-spawn-failed`.
4. **Shell exit immediately** — the PTY opens and the shell exits (e.g. shell not found). The worker
   reports the session as ended; the pane shows `ended` (the normal terminal-control lifecycle).

Each failure mode is a coded response from the spawn route (synchronous ones: 1, 2) or a lifecycle
event on the session wire (asynchronous ones: 3, 4).
