---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — answers ONE question: how did we decide to build it, and why that way?
  Owner: architect. A log of ADRs: numbered, IMMUTABLE, superseded-not-edited.
  Does NOT contain observable behaviour (→ task .feature files) — only the structure behind it.
-->
# 50 · Session launcher — Architecture Decisions

> Inputs: `SPEC.md` (the "new session" verb — node + workspace + optional item ref, named spawn route on
> bounded allowlist, worker-side PTY-open directive, registration with routable id, honest failure),
> `RESEARCH.md` §1–§5 (every seam below is sourced from it), `STATE.md` (allowlist edit is the risk).
>
> **Memory recall (architect).** `aof work memory recall "session launcher spawn PTY fleet write
> allowlist" --area architecture --block` surfaced five prior ADRs. Each is HONOURED below:
> - **m03/ADR-003** (terminal transport): node-pty + ws at /ws/terminal — the PTY seam this reuses.
> - **m03/ADR-006** (state-aware launch): the board types a command into a PTY — the spawn idiom.
> - **m38/ADR-013** (interactive worker execution): one session per assignment — the sibling this is not.
> - **m48/ADR-008** (fleet-session-identity partition): story boundaries follow graph seams.
> - **m21/ADR-002** (rerun affordance): surfacing, not reimplementation — the composition principle.
>
> **Codebase-graph grounding.** `aof graph build .` (2026-08-14, 10,058 nodes, 24,365 edges, `egress:
> none`). `aof graph impact` was read back per module:
> - `src/mesh-ui-serve.mjs` ← 29 dependents; → 12 imports. Heaviest blast radius.
> - `src/mesh-worker-execution.mjs` ← 47 dependents. Explicitly NOT TOUCHED.
> - `src/terminal-providers.mjs` ← 2; → 1. A near-leaf.
> - `src/mesh-session.mjs` ← 2 (commands/mesh-session, mesh-presence); → fs/mesh-store/run-store.
> - `src/global-mesh-query.mjs` ← 1 (mesh-ui-serve.mjs). Session index home.
> - `src/worker-stream-client.mjs`: pure transport, 7 imports.
> - `src/control-stream-server.mjs`: 37+ dependents — NOT edited (pass-through only).
>
> Two modules reported `NOT COVERED` (`src/fleet-face.mjs`, `test/mesh-ui-write-isolation-bounded.test.mjs`)
> — those filenames do not exist; the real homes are `mesh-ui-serve.mjs` and
> `test/arch/acd-mesh-ui-write-isolation.test.mjs`, both covered.

## ADR-001: The spawn route's shape on the fleet face

**Status:** Accepted  
**Date:** 2026-08-14

### Context

The fleet face (`src/mesh-ui-serve.mjs`, 29 dependents, 12 imports) currently exposes exactly ONE
mutation route: `POST /api/mesh/assign`. The bounded-write posture is fitness-locked by
`test/arch/acd-mesh-ui-write-isolation.test.mjs` (line ~136 regex
`/pathname\s*===\s*["']\/api\/mesh\/(route|revoke)["']/`). Adding a second write route is a
deliberate, named expansion of that bound — not a relaxation.

The fleet face performs ZERO fs write and NO shell-out of its own. The existing mutation rides
entirely inside the `assignWork` verb. A session spawn must follow the same posture: the fleet face
validates, selects, and delegates — it never shells out, never spawns a PTY, never writes a file.

### Decision

1. **Route:** `POST /api/mesh/session` — a SIBLING to `/api/mesh/assign`, same namespace, same
   admission shape (same-origin + `application/json`, SECURITY T13 guard before body parse).

2. **Body shape:** `{ nodeId: string, workspaceId: string, assistant?: string, itemRef?: string }`.
   - `nodeId` (required): the target worker node.
   - `workspaceId` (required): selects the workspace/repo to open the PTY in.
   - `assistant` (optional, default `"claude"`): which CLI provider to spawn.
   - `itemRef` (optional, default `null`): an item to set as cwd context (resolves to a worktree),
     or `null` for a bare checkout root.

3. **Response:**
   - 200 `{ ok: true, sessionId, nodeId, workspaceId }` — the session was dispatched.
   - Coded errors: `workspace-not-found` (404), `workspace-not-local` (409),
     `session-target-not-connected` (503), `control-identity-unknown` (409),
     `invalid-body` (400), `cross-origin-refused` (403), `invalid-content-type` (400).

4. **Delegation:** The route sends a directive frame (ADR-002's `kind:"session-spawn"`) down the
   control stream to the target node. It writes NO file, spawns NO process, and imports NO new
   module beyond `sendDirective` / the directive-targets registry already exposed by
   `startControlStreamServer`'s return value.

5. **Fitness function update:** The regex in `acd-mesh-ui-write-isolation.test.mjs` that checks for
   "no /api/mesh/(route|revoke) sibling" expands to include `session` in its NAMED allowlist (i.e.
   the test asserts: the declared write routes are EXACTLY `{assign, session}`, never more). The
   self-check planted-violation fixture gains a `session`-aware case. The XOR/consistency shape stays:
   the fleet face declares AT MOST this named set of write routes, each wrapping a gated verb, none
   performing fs write or shell-out of their own.

### Alternatives considered

- **Pattern-based allowlist** (`/api/mesh/*` writable): rejected — defeats the purpose of a bound.
- **Reusing `/api/mesh/assign` with a `phase: "session"`**: rejected — an assignment carries an
  `itemRef` lifecycle, freezes an assignment record, and expects a terminal state report. A bare
  session has none of those; conflating them adds an untestable special case to every assignment
  consumer.
- **WebSocket-only spawn** (send a message on the existing `/ws/terminal-view` socket): rejected —
  that socket is tuple-bound at upgrade time and is output-only by construction; hijacking it for a
  spawn request breaks ADR-014's content-blind invariant.

### Consequences

- The fleet face's write surface grows from 1 to 2 named routes. The fitness test enumerates both by
  name and still fails on a third unenumerated one.
- `mesh-ui-serve.mjs` gains ONE new conditional branch (~20 lines, same shape as the `/api/mesh/assign`
  branch) and ONE new import: the `sendDirective` / `directiveTargets` access already exposed by the
  control-stream-server module (threaded through the same options bag `serveMeshUi` already receives
  for the assign route's issuer resolution).
- No new `loadWorkspace` call on the spawn path — workspace existence is validated through the SAME
  `queryGlobalMeshStatus` -> find-row -> `existsSync(row.projectRoot)` seam `/api/mesh/assign` and
  `/api/mesh/board-url` already use.

---

## ADR-002: The directive kind for session spawn

**Status:** Accepted  
**Date:** 2026-08-14

### Context

The control stream (`src/control-stream-server.mjs`) routes down-frames to workers by `nodeId`
through the `directiveTargets` registry. The existing `kind:"directive"` frame
(`buildDirectiveFrame`, line ~874) carries `{ assignmentId, itemRef, workspaceId, at, command,
baseBranch, commit }` — all assignment-bound. A bare session spawn has no `assignmentId`, no
`command` (nothing to type on launch), no lifecycle phase.

The worker-stream-client (`src/worker-stream-client.mjs`) already dispatches seven distinct
down-frame kinds to seven registered handlers (`onDirective`, `onWithdraw`, `onTerminalInput`,
`onTerminalResume`, `onRecoveryPush`, `onResync`, effect-ack). Adding a new kind is the established
pattern — one `if (frame?.kind === ...)` branch + one `onXxx(handler)` registration.

### Decision

1. **Kind literal:** `"session-spawn"` — a string constant exported from a single home module
   (a new `src/mesh-session-spawn-directive.mjs`, following the
   `TERMINAL_FRAME_KIND`/`RECOVERY_PUSH_KIND` single-source discipline).

2. **Wire shape (down-frame):**
   ```
   {
     kind: "session-spawn",
     to: <nodeId>,
     sessionId: <uuid, minted control-side>,
     workspaceId: <string>,
     assistant: <"claude"|"codex"|"gemini">,
     itemRef: <string|null>,
     at: <ISO timestamp>
   }
   ```
   - `sessionId` is minted by the CONTROL at dispatch time (`crypto.randomUUID()`). This gives the
     session a routable address before the worker even receives the frame — the fleet face can return
     it immediately in the 200.
   - No `assignmentId`, no `command`, no `baseBranch`, no `commit` — this is NOT an assignment.

3. **Builder:** `buildSessionSpawnFrame(to, { sessionId, workspaceId, assistant, itemRef, at })` —
   lives in the single-home module, exported for the fleet-face route and for tests.

4. **Worker-stream-client registration:** A new `onSessionSpawn(handler)` lane, byte-identical
   pattern to `onWithdraw`/`onTerminalInput`. Unregistered drops the frame silently (the
   never-crash additive discipline).

5. **Control-side dispatch:** The fleet face's `POST /api/mesh/session` handler calls
   `sendDirective(directiveTargets, nodeId, frame)` directly — the SAME one-target dispatch
   `dispatchDirectiveOverTargets` already wraps. The revocation check (`getMeshRegistry`) applies
   identically: a session spawn from a revoked control is refused.

6. **Result acknowledgement (up-frame):** The worker sends a
   `{ kind: "session-spawn-ack", sessionId, nodeId, ok: true|false, code? }` frame UP the stream
   once the PTY either succeeds or fails. The control does NOT persist this (no store write) — it
   is purely diagnostic. The fleet face does NOT wait for it (the 200 returns the `sessionId`
   optimistically; the session's liveness in the grid is governed by the session record's TTL, not
   by this ack).

### Alternatives considered

- **Overloading `kind:"directive"` with a null `assignmentId`:** rejected — every existing consumer
  of `onDirective` (mesh-worker-execution.mjs, 47 dependents) destructures `assignmentId` as
  non-null; adding a null path forces a guard into the hottest handler on the worker.
- **HTTP POST from control to worker:** rejected — no HTTP server runs on the worker; the fabric
  connection is the only reachable channel from control to worker.

### Consequences

- The worker-stream-client gains one new down-frame branch (~5 lines) and one `onSessionSpawn`
  registration function.
- The control-stream-server gains NO new apply logic (the frame is sent DOWN, never UP — the only
  UP-frame is the diagnostic ack, which is a no-op in `applyStreamFrame`'s unknown-kind path or
  a named branch that logs and discards).
- A new leaf module `src/mesh-session-spawn-directive.mjs` owns the kind literal and the builder,
  mirroring `mesh-recovery-push.mjs`'s role for its own lane.

---

## ADR-003: The worker-side PTY spawn for a bare session

**Status:** Accepted  
**Date:** 2026-08-14

### Context

The worker already spawns interactive PTYs for assignments through `mesh-worker-execution.mjs`
(47 dependents). That path is deeply entangled with the assignment lifecycle: it resolves a
worktree, drives a `/aof:*` command, watches for `NEEDS_INPUT`, reports `done/failed/needs-input`
state transitions, and writes run records. None of that applies to a bare session.

The PTY infrastructure itself — `resolveProvider` from `terminal-providers.mjs` (2 dependents) and
`createTerminalSpawn(loadNodePty)` from `terminal-ws.mjs` — is provider-agnostic and reusable.
The board-server path (`terminal-ws.mjs`) uses it for `/ws/terminal` upgrades; the assignment path
reuses it for its own interactive claude session.

### Decision

1. **A new handler module:** `src/mesh-session-spawn-handler.mjs` — the worker-side handler that
   the launcher registers via `client.onSessionSpawn(handler)`. It is a SIBLING to
   `mesh-worker-execution.mjs`, NOT an extension of it.

2. **PTY spawn path:**
   - Resolve the workspace root from the worker's own `global_node_workspaces` registry (the SAME
     `workerHasRepo` / `localNodeWorkspaceMembership` check `mesh-worker-execution.mjs` uses).
   - If `itemRef` is provided, resolve or create a worktree under the workspace's
     `meshWorktreePath` seam (reusing `mesh-worktree.mjs`'s `addWorktree`). If no `itemRef`,
     use the checkout root as cwd.

     > **AMENDED 2026-08-14 (operator ruling, same day, before merge) — an attached `itemRef` opens
     > the item's LIVE work tree where one exists.** As built, this bullet produced a fresh tree
     > detached at HEAD, which is *not* the tree the item's work is in: the assignment lane works in
     > `meshWorktreePath(root, <assignmentId>)` on branch `aof/mesh/<itemRef>`. An operator who
     > attaches item 50 to go look at item 50 therefore saw an unrelated commit. Resolution order is
     > now: **(1)** if a worktree is checked out on `refs/heads/aof/mesh/<itemRef>`, open the PTY
     > there — found from `git worktree list --porcelain`, a git-level fact, never a store lookup or
     > a directory-name inference; **(2)** otherwise create a fresh session tree, detached at HEAD.
     >
     > Two consequences, both deliberate. The shell then shares a working tree and index with a
     > possibly-running agent — that is what "give me a terminal on item 50" means, and it is the
     > point of the affordance. And session-owned trees move OUT of `meshWorktreePath`'s root into
     > `.aof/mesh/session-worktrees/`, because the assignment lane's
     > `listStrandedWorktreeAssignments` trusts a directory name AS an assignmentId and was
     > fabricating a `failed`/`daemon-restarted` report for `session-<slug>` on every worker restart.
     > That also keeps `meshWorktreePath`'s "never called with anything but a real assignmentId"
     > contract true.
   - Call `resolveProvider(assistant)` from `terminal-providers.mjs` to get the CLI binary/args.
   - Call `createTerminalSpawn(loadNodePty)` from `terminal-ws.mjs` to open the PTY with
     `cwd = resolved path`, `env = process.env` (full ambient inheritance — no credential
     isolation needed; this is an operator shell, not a sandboxed agent).
   - The PTY's output is bridged to the control via the SAME `sendTerminalFrame(sessionId, bytes)`
     the assignment driver already uses (worker-stream-client.mjs).

3. **No lifecycle phase, no run record, no state machine.** The PTY lives until it exits (the
   process inside closes, or the operator kills it from the grid). On exit, `sendTerminalFrame`
   with `end: true` signals the control, and `endSession` removes the record.

4. **Failure path:** If the workspace is not available on this node, or the provider binary is
   not found, or `pty.spawn` throws — the handler sends the `session-spawn-ack` up-frame with
   `{ ok: false, code: "..." }` and does NOT register a session.

### Alternatives considered

- **Extending `mesh-worker-execution.mjs` with a `phase: "bare"` branch:** rejected — that module
  is already the widest hub in `src/` (47 dependents); every conditional added there increases the
  blast radius of a change. A bare session shares only the PTY spawn leaf, not the assignment
  lifecycle machinery above it.
- **Spawning through `terminal-ws.mjs`'s upgrade handler:** rejected — that handler expects an HTTP
  upgrade on a board server's `/ws/terminal` path. No HTTP server runs on the worker for the fleet
  face to reach.

### Consequences

- A new `src/mesh-session-spawn-handler.mjs` (~80-120 lines) with exactly 3 imports from existing
  modules: `terminal-providers.mjs`, `terminal-ws.mjs` (for `createTerminalSpawn`/`loadNodePty`),
  and `mesh-worktree.mjs` (for optional `addWorktree`).

  > **AMENDED 2026-08-14 (same day, before merge) — superseded by fact, and by ADR-007.**
  > `terminal-providers.mjs` is NOT imported (ADR-007 took `resolveProvider` off the spawn path).
  > The delivered module has **six** imports, and the structural review assessed each as justified
  > rather than accretion: `terminal-ws.mjs` (the PTY factory), `mesh-worktree.mjs` (the worktree
  > seam), `mesh-session.mjs` (the registration API) — the three sanctioned — plus `work.mjs` and
  > `workspace-identity.mjs`, which are jointly ONE thing (the foreign-workspace repoint, without
  > which a session on a foreign workspace opens a shell in the **wrong repo** — the 2026-07-24 soak
  > defect), and `degrade.mjs`, the house-wide m42-item-3 channel that is effectively ambient.
  > Size is ~250 lines of code (452 total, 175 comment), against the "~80-120" estimate — driven by
  > four coded refusal paths plus the settle/input surfaces this ADR did not enumerate. ADR-007
  > decision 2's "the 3 imports hold with a different third" is likewise superseded.
- `mesh-worker-execution.mjs` is NOT touched — the handler is registered by the launcher alongside
  the existing `client.onDirective(handleDirective)` call, not inside it.
- The spawned PTY's output rides the existing `sendTerminalFrame` wire (worker-stream-client.mjs),
  which already bridges bytes to the control's terminal mirror and from there to the fleet's
  `/ws/terminal-view` socket. No new transport is needed.

---

## ADR-004: Session registration through the m48 session index

**Status:** Accepted  
**Date:** 2026-08-14

### Context

Milestone 48 (ADR-002/005/006) established the session index: a 4-part key
`(nodeId, workspaceId, assistant, sessionId)` stored as a JSON record under
`~/.aof/mesh/sessions/` by `mesh-session.mjs` (2 source dependents). The presence record's
`sessions[]` array (assembled by `readLiveSessions` in `mesh-presence.mjs`) projects live
sessions into the presence frame, which the control ingests via `applyPresenceFrame`
(`control-stream-server.mjs`). The global mesh query (`global-mesh-query.mjs`, 1 source dependent)
then joins these into the fleet status payload, and the terminals-home grid renders them.

Every existing session registers through ONE path: the hook-fired
`startSession`/`pingSession` calls in the worker's own session lifecycle (triggered by the
assistant's own transcript events). A launcher-spawned session has no hook yet — it must
explicitly call `startSession` to appear in the index.

### Decision

1. **The worker calls `startSession` immediately after a successful PTY spawn**, within
   `mesh-session-spawn-handler.mjs`. The key is:
   ```
   {
     nodeId:      <this worker's own nodeId>,
     workspaceId: <from the directive frame>,
     assistant:   <from the directive frame>,
     sessionId:   <from the directive frame, minted control-side>
   }
   ```
   The `repo` field is derived from the workspace's `cloneUrl` or path basename (the SAME
   derivation `mesh-worker-execution.mjs`'s assignment driver uses for its own `startSession`
   call).

   > **AMENDED 2026-08-14 (same day, before merge) — the cited precedent DOES NOT EXIST.**
   > `mesh-worker-execution.mjs` contains no `startSession`/`pingSession`/`endSession` call of any
   > kind (verified at source by story 03's build and again by its structural review), so "the SAME
   > derivation the assignment driver uses for its own `startSession` call" names a call site that
   > is not there. The canonical derivation is the **hook path's**, `commands/mesh-session.mjs:270`:
   > `if (repo == null) repo = cfg.name ?? null` — `config.name`, the field the workspace registry
   > and descriptor themselves store, and what `global-work-store.mjs` and `global-node-registry.mjs`
   > both read.
   >
   > The shipped handler uses `config.name` with a `path.basename(projectRoot)` fallback the
   > canonical path does **not** have. **Consequence to close before accept:** for a workspace with
   > no `config.name`, the hook path writes `repo: null` while the launcher path writes a directory
   > name — so one workspace can show two different repo labels in the grid depending on how its
   > session started, which is the "second class of session" this ADR exists to prevent. Either
   > bless the fallback here and push it into the canonical path, or drop it. Ledgered for
   > `aof:verify`.

2. **Ping cadence:** The handler starts a TTL-refresh interval (`pingSession` every 30s) that
   runs for the PTY's lifetime and stops on PTY exit. This reuses the SAME TTL window
   (`resolveSessionTtlSeconds`, default 120s) every other session lives under.

3. **End:** On PTY exit (the `pty.onExit` callback), the handler calls `endSession` (the
   optimistic delete) and clears the ping interval. The reaper (`reapExpiredSessions`,
   48/ADR-006) is the backstop if the handler crashes without reaching `endSession`.

4. **No second class of session.** The registered record is byte-identical in schema to one
   registered by the hook path. The grid renders it without knowing how it was spawned. The
   session's `assistant` field is what it is (e.g. `"claude"`), and its `sessionId` is a UUID
   from the control's `randomUUID()` — distinguishable from a Claude-issued session id only by
   format, never by a flag or a type field.

5. **Presence propagation:** The worker's presence ticker (the launcher's
   `assembleCurrentPresenceRecord` -> `readLiveSessions`) already picks up any live record in
   `~/.aof/mesh/sessions/`. No additional wiring is needed — the session appears in the next
   presence frame the ticker emits (at most 5s latency, the default ticker cadence).

### Alternatives considered

- **Control-side session registration** (the control writes the session record itself on
  dispatch): rejected — presence records are a per-node fact, published by the node itself;
  a control writing another node's session record introduces a second authority and races
  with the worker's own reaper.
- **A new `launcherSession` record type**: rejected — the SPEC explicitly states "a launcher
  that produces a second class of session defeats its own purpose."

### Consequences

- `mesh-session-spawn-handler.mjs` imports `startSession`, `pingSession`, `endSession` from
  `mesh-session.mjs`. No new writes to `mesh-session.mjs` itself are needed — the API is
  already general.
- The session appears in the grid within one presence-ticker cadence (~5s) after spawn.
- A crashed worker's launched session is reaped by the same TTL mechanism as any other —
  no special recovery path, no zombie grid slots.

---

## ADR-005: Story partition

**Status:** Accepted  
**Date:** 2026-08-14

### Context

The milestone spans four distinct coupling clusters (from `aof graph impact`):

| Module                          | Dependents | Imports | Role in this milestone            |
|---------------------------------|-----------:|--------:|-----------------------------------|
| `mesh-ui-serve.mjs`            |         29 |      12 | Fleet-face route (ADR-001)        |
| `control-stream-server.mjs`    |          — |      14 | Directive dispatch (ADR-002 send) |
| `worker-stream-client.mjs`     |          — |       7 | Down-frame receive (ADR-002 recv) |
| `mesh-worker-execution.mjs`    |         47 |      15 | NOT TOUCHED (ADR-003 decision)    |
| `mesh-session-spawn-handler`   |      (new) |       3 | Worker PTY + registration (ADR-003/004) |
| `mesh-session.mjs`             |          2 |       5 | Session write API (ADR-004, unchanged) |
| `global-mesh-query.mjs`        |          1 |       4 | Session index read (unchanged)    |
| `terminal-providers.mjs`       |          2 |       1 | Provider resolution (reused)      |

The widest blast-radius module (`mesh-worker-execution.mjs`) is explicitly NOT touched. The
remaining work clusters into three groups with minimal cross-dependency:

### Decision — Three stories

**Story 01: The session-spawn directive (the wire)**

Scope: the new `src/mesh-session-spawn-directive.mjs` module (kind literal + frame builder),
the `worker-stream-client.mjs` receive branch (`onSessionSpawn`), and the up-frame ack kind.

Files touched:
- NEW: `src/mesh-session-spawn-directive.mjs`
- EDIT: `src/worker-stream-client.mjs` (~10 lines: one `if` branch + one registration function)

Boundary rationale: `worker-stream-client.mjs` is a transport module (7 imports, pure
send/receive). Adding a receive lane is the smallest, most isolated change and is testable
with a fake transport (no PTY, no real worker, no real control). This story has ZERO
coupling to `mesh-ui-serve.mjs` or the PTY stack.

---

**Story 02: The fleet-face route + control dispatch**

Scope: the `POST /api/mesh/session` branch in `mesh-ui-serve.mjs`, the fitness-test update
in `test/arch/acd-mesh-ui-write-isolation.test.mjs`, and threading the `directiveTargets`
access into the serve function's options.

Files touched:
- EDIT: `src/mesh-ui-serve.mjs` (~30 lines: one route branch, same shape as assign)
- EDIT: `test/arch/acd-mesh-ui-write-isolation.test.mjs` (expand the named allowlist regex
  from `(route|revoke)` to `(route|revoke|session)` in the "no OTHER write route" assertion,
  and add the `/api/mesh/session` branch to the XOR/consistency tree)
- IMPORT: `src/mesh-session-spawn-directive.mjs` (the builder, from story 01)

Boundary rationale: `mesh-ui-serve.mjs` has 29 dependents — the blast radius of a change
here is high. Isolating its modification into its own story means a defect in this surface
does not block the worker-side PTY work (story 03). Depends on story 01 for the frame
builder only (a leaf function, importable the moment story 01 merges).

Dependency: story 01 (for `buildSessionSpawnFrame`).

---

**Story 03: The worker-side spawn handler + session registration**

Scope: the new `src/mesh-session-spawn-handler.mjs` (ADR-003 + ADR-004 combined), plus the
launcher wiring that registers `client.onSessionSpawn(handler)`.

Files touched:
- NEW: `src/mesh-session-spawn-handler.mjs`
- EDIT: `src/mesh-launcher.mjs` (one `client.onSessionSpawn(...)` registration line, same
  shape as the existing `client.onDirective(handleDirective)`)

Boundary rationale: the handler imports THREE existing modules
(`terminal-providers.mjs`, `terminal-ws.mjs`, `mesh-session.mjs`) — all leaves or near-leaves
(2, 2, 2 dependents respectively). It registers through `mesh-session.mjs`'s already-general
`startSession`/`pingSession`/`endSession` API, so no change to the session module is needed.
This story can be built and tested in full isolation: a test injects a fake PTY provider and
asserts that `startSession` was called with the correct 4-part key, that `pingSession` fires
on the expected cadence, and that `endSession` + `sendTerminalFrame(end:true)` fire on PTY exit.

Dependency: story 01 (for the `onSessionSpawn` lane to receive on).

---

### Parallelism

Story 01 is the leaf — no dependencies, buildable first.  
Stories 02 and 03 depend on story 01 but are INDEPENDENT of each other (02 touches the control
side + fleet face; 03 touches the worker side + session store). They can be built in parallel
once story 01 merges.

```
       ┌─── Story 02 (fleet face + fitness)
       │
Story 01 (wire) ──┤
       │
       └─── Story 03 (worker handler + registration)
```

### Consequences

- Maximum parallelism: 2 stories buildable concurrently after the leaf ships.
- No story touches `mesh-worker-execution.mjs` (47 dependents) — the riskiest module is untouched.
- The fitness-test update (story 02) ships WITH the route it guards, so the bound is never
  temporarily relaxed.
- Each story is testable in isolation without a live daemon, real PTY, or real network.

---

## ADR-006: The production bridge from the fleet face to the control's dispatch seam

**Status:** Accepted — **supersedes ADR-001 decision 4 and ADR-002 decision 5**  
**Date:** 2026-08-14

### Context

ADR-001 decision 4 assumed the fleet face could reach `sendDirective` / the `directiveTargets`
registry "already exposed by `startControlStreamServer`'s return value", threaded through
`serveMeshUi`'s options bag. **That handle does not exist in the shipped process topology.**
`aof mesh ui` owns the ONLY production `serveMeshUi({...})` call
([commands/mesh-ui.mjs:76](../../../../src/commands/mesh-ui.mjs#L76)) and runs as a **separate process**
from `aof mesh serve`, where [mesh-launcher.mjs:862](../../../../src/mesh-launcher.mjs#L862) owns
`startControlStreamServer`. Both are children of the desktop supervisor, not of each other. A
`directiveTargets` callback injected only in tests would make story 02's route green while the
shipped `aof mesh ui` remained structurally unable to dispatch — a green test over a dead feature.

The blocker recorded in `STATE.md` on 2026-08-14 concluded from this that "there is no shared handle
or general directive IPC between those processes" and that "the existing relay bridge is deliberately
limited to `terminal-input`". **The second half is false, and it is what unblocks this.** The
loopback relay is already a general control-frame bridge with TWO down-lanes:

- **`terminal-input`** — [mesh-terminal-relay-bridge.mjs:39-47](../../../../src/mesh-terminal-relay-bridge.mjs#L39-L47):
  a browser keystroke "is wrapped in THIS kind **by the mesh-ui process**, crosses the loopback relay
  to the serve process, and is routed DOWN the worker's admitted stream connection". This is
  precisely the process-crossing story 02 needs, originating in precisely the process the route
  lives in.
- **`terminal-resume`** — [mesh-terminal-relay-bridge.mjs:52-58](../../../../src/mesh-terminal-relay-bridge.mjs#L52-L58):
  a control-side **CLI** pushes this envelope into the loopback relay; the serve process routes it
  down the holder's stream. A second, non-keystroke lane on the same machinery — proof the bridge
  generalises beyond `terminal-input`.

Both land in ONE router: [mesh-terminal-input.mjs:54](../../../../src/mesh-terminal-input.mjs#L54)
switches on kind and dispatches via the seam wired at
[mesh-launcher.mjs:1017-1021](../../../../src/mesh-launcher.mjs#L1017-L1021), where the serve process
**self-subscribes to its own broker** and hands every inbound frame to the router.

### Decision

1. **`POST /api/mesh/session` does NOT call `sendDirective`.** It validates, mints the `sessionId`,
   builds the ADR-002 frame via story 01's `buildSessionSpawnFrame`, wraps it in the FROZEN relay
   envelope `{ kind, nodeId, signal }` — the frame's fields riding INSIDE `signal`, never as
   top-level envelope keys (ADR-014 invariant 2) — and pushes it into the loopback relay through the
   push transport `mesh-ui-serve.mjs` **already constructs** for the terminal-input lane
   (`terminalInputPush`, [mesh-ui-serve.mjs:775](../../../../src/mesh-ui-serve.mjs#L775)).

2. **Relay kind literal:** reuse the `"session-spawn"` constant story 01 already homed in
   `src/mesh-session-spawn-directive.mjs`. The relay is content-blind and forwards an unknown kind
   byte-for-byte (the m26 leasing property), so the down-frame kind and the envelope kind are one
   literal with one home — no second constant to drift.

3. **The router gains a third named branch.** `createTerminalInputRouter` already owns two kinds and
   the singular subscriber machinery (parse + backoff + reconnect); `session-spawn` is added there
   rather than in a sibling router that would duplicate that machinery. It stays kind-blind to
   everything else and validates SHAPE only (non-empty `nodeId`, `sessionId`, `workspaceId`).

4. **Dispatch is `streamServer.dispatchDirective(frame)` — NOT raw `sendDirective`.** This is the
   seam the withdraw notify and the assignment dispatch tick already use, so the session lane rides
   the one production dispatch path rather than a bypass.

   > **AMENDED 2026-08-14 (same day, before merge) — this decision's REVOCATION RATIONALE was
   > wrong, and is withdrawn.** As first written it claimed that because `directiveTargets` is
   > populated only post-admission (SECURITY T5), "a revoked or unadmitted control↔worker pair has
   > no target entry", and that this preserved ADR-002 decision 5's promise that "a session spawn
   > from a revoked control is refused". **Two independent reviews measured otherwise, and they are
   > right.** `dispatchDirectiveOverTargets` (`control-stream-server.mjs:960`) evaluates the T2
   > live-revocation gate only when `directive?.issuer != null`, and **no frame builder anywhere in
   > `src/` sets `issuer`** — not `buildDirectiveFrame`, not the terminal-input/resume frames, not
   > `buildSessionSpawnFrame`. So T2's live re-read has never executed on any lane, and nothing
   > evicts an already-admitted socket when its control is revoked. T5 admission covers the
   > never-admitted and disconnected cases only — **not** the revoked-after-admission window T2
   > exists for. Reproduced live: a revoked control's assignment directive is refused
   > (`assignment-issuer-revoked`) while its session-spawn envelope routes and the worker receives it.
   >
   > The instruction in this decision stands (use `dispatchDirective`); only the claim that it
   > already enforces revocation is withdrawn. The gap is **pre-existing and mesh-wide**, not
   > introduced by story 02 — but story 02 is the first rider that CREATES a PTY with full ambient
   > env rather than typing into one that already exists, which makes it the strictly greater
   > capability to leave ungated. Ledgered as `TECH_DEBT` item 45; ADR-002's frame shape is frozen
   > and carries no `issuer`, so closing it needs its own ADR, not a developer edit.
   >
   > I wrote the withdrawn rationale by reasoning from a code comment about admission rather than
   > reading the dispatch path — the identical mistake this very ADR was written to correct in the
   > blocker note (which reasoned from a module doc comment instead of the router's kind switch).
   > Recorded in `STATE.md` for retro.

   The route still answers `session-target-not-connected` (503) for a target with no live
   connection — see decision 7 for where that fact actually comes from.

5. **Unconfigured relay is an honest failure, not a fake success.** When `loopbackRelayUrl(config)`
   is null (no `mesh.relay.url`), the route answers **`session-dispatch-unavailable` (503)** rather
   than returning a 200 for a session that can never be spawned. This adds one code to ADR-001
   decision 3's list.

6. **The relay envelope never crosses the fabric.** `loopbackRelayUrl` forces host `127.0.0.1`, so
   this leg is same-machine by construction — the down-frame reaches the worker over the admitted
   stream connection only, exactly as the input and resume lanes do.

7. **Target connectivity is answered from the fleet projection, not from the dispatch result.**
   `/api/mesh/assign` never needs this: it is store-FIRST (`assignWork` writes an `assigned` row and
   the control's dispatch/reclaim tick delivers it later, once the target is a connected admitted
   peer — mesh-launcher.mjs:1364-1373). A session spawn has NO store record by design (ADR-002
   decision 6: "the control does NOT persist this"), so it cannot borrow that deferred-delivery
   pattern — and the relay push is fan-out, so it yields no synchronous delivery result. The route
   therefore resolves `session-target-not-connected` (503) from the SAME `queryGlobalMeshStatus`
   projection it already consults for the workspace — the node's presence liveness, i.e. exactly the
   fact the grid renders as "online" — and only then pushes. A node that drops between the check and
   the push simply never spawns: no session record is written (only the worker writes one, ADR-004
   decision 5), so the failure surfaces as a session that never appears, never as a ghost grid slot.
   This satisfies `02_honest-failure-responses.feature`'s locked 503 scenario without inventing a
   synchronous ack the transport cannot provide.

### Alternatives considered

- **Co-host the fleet HTTP face inside the `mesh serve` process:** rejected — it rewrites the
  shipped supervisor's two-daemon contract for one route, and `aof mesh ui` deliberately starts at
  global scope without requiring a mesh-enabled cwd (commands/mesh-ui.mjs:20-21); folding it into
  the launcher would re-impose the workspace identity coupling that separation removes.
- **A new authenticated loopback HTTP/IPC channel between the two processes:** rejected — a SECOND
  cross-process control channel beside the relay, re-implementing admission, backoff and reconnect
  for a single route, when the existing channel already carries two down-lanes from this exact
  process.
- **Threading a `directiveTargets` callback into `serveMeshUi` options (ADR-001 as written):**
  rejected — satisfiable only in-process; in production it is `undefined`, which is the defect this
  ADR exists to prevent.

### Consequences

- No process-topology change, no new transport, no new IPC. Story 02's file list gains
  `src/mesh-terminal-input.mjs` (one named branch) and drops the impossible options-bag threading.
- Story 02's locked contract is UNAFFECTED: `00_spawn-route-handler.feature` asserts "a session-spawn
  directive was dispatched to n1" without naming the seam, so this decision changes the wiring under
  a green contract rather than the contract.
- The fleet face still performs zero fs write and no shell-out — it pushes one envelope, exactly as
  the terminal-input lane does.

---

## ADR-007: A launched session runs the operator's default shell

**Status:** Accepted — **supersedes ADR-003 decision 2 (the `resolveProvider` bullet)**  
**Date:** 2026-08-14  
**Ruling:** operator, 2026-08-14 (the contradiction below is not resolvable from the record).

### Context

ADR-003 contradicted **itself**. Decision 2 required `resolveProvider(assistant)` "to get the CLI
binary/args" — i.e. spawn Claude/Codex/Gemini — while the very next bullet justified full ambient
env inheritance because "**this is an operator shell, not a sandboxed agent**". The locked contract
`00_spawn-handler-module.feature` takes the shell reading explicitly: "the PTY's shell is the system
default (not a claude/codex CLI)". `03_failure-and-cleanup.feature` then modelled
`resolveProvider("node-pty")` throwing — wrong twice over: `node-pty` is the PTY mechanism, not a
member of `PROVIDER_IDS` (`["claude","codex","gemini"]`), and `resolveProvider` returns **null** for
an unknown id, it never throws ([terminal-providers.mjs:90-94](../../../../src/terminal-providers.mjs#L90-L94)).

SPEC's objective states the missing verb as opening "a bare shell", and the out-of-scope list
excludes "an agent-facing session API". The operator ruled for the shell reading.

### Decision

1. **The PTY runs the operator's default shell.** `process.env.ComSpec` on win32 (falling back to
   `cmd.exe`), `process.env.SHELL` on POSIX (falling back to `/bin/bash`). Spawned through the SAME
   `createTerminalSpawn(loadNodePty)` factory — `spawnWithLoader(bin, args, options)` takes the
   binary and args from the caller, so no provider table is involved.

2. **`resolveProvider` is NOT on the spawn path.** `terminal-providers.mjs` leaves
   `mesh-session-spawn-handler.mjs`'s import list. ADR-003's "exactly 3 imports" holds with a
   different third: `terminal-ws.mjs`, `mesh-worktree.mjs`, `mesh-session.mjs`.

3. **`assistant` remains on the wire and in the session key — as a LABEL, not a spawn instruction.**
   ADR-002's frame shape and ADR-004's 4-part key `(nodeId, workspaceId, assistant, sessionId)` are
   UNCHANGED, as is story 02's locked "absent assistant defaults to `claude`" scenario. The field
   selects which lane of the grid the session renders in; it does not select a binary.

4. **`03_failure-and-cleanup.feature`'s provider scenario is amended** from
   `resolveProvider("node-pty") throws` to "the node-pty native module fails to load" — same
   `session-spawn-failed` code, same no-session-registered assertion, a failure mode that exists.

5. **An operator who wants an assistant types its name in the shell.** That is m03/ADR-006's
   established "the board types a command into a PTY" idiom, and it keeps the excluded agent-facing
   session API out of this milestone.

   > **CONSEQUENCE ADDED 2026-08-14 (structural review) — doing so produces TWO session records for
   > ONE shell.** The launcher already registered the session under its control-minted UUID (ADR-004);
   > when the operator types `claude`, that assistant's own start/ping hooks register a SECOND record
   > under its own claude session id. Only the launcher's registry holds the PTY write handle, so the
   > grid shows two slots for one terminal — one typeable, one not. This is a sharper form of the
   > "mild honesty wrinkle" already noted for the `claude` label, and it is the predictable outcome of
   > decision 5 rather than a defect in it. Not closed in this milestone; ledgered for `aof:verify`.

### Alternatives considered

- **Assistant session (`resolveProvider(assistant)` spawns the CLI):** rejected by ruling — it
  requires editing a LOCKED contract clause in two places, and reads against SPEC's "bare shell".
- **Shell by default, CLI when `assistant` is named:** rejected by ruling — it still contradicts the
  locked task 00 scenario (which passes `assistant: "claude"` and expects a system shell) and
  doubles the spawn-path test matrix for a lane no scenario asks for.

### Consequences

- Story 03 loses a dependency and a failure mode: no provider resolution, no missing-binary path.
  `session-spawn-failed` now covers node-pty load failure and `pty.spawn` throwing only.
- A launched bare shell defaulting to the `claude` label is a mild honesty wrinkle in the grid.
  Noted in `STATE.md` for retro; not a blocker, and not worth breaking story 02's locked default over.

---

## ADR-008: The spawn-outcome lane — how a worker's ack reaches the operator's browser

**Status:** Accepted — **supersedes ADR-002 decision 6's "purely diagnostic" clause.** That decision's
two OTHER clauses (the control persists no ack; the fleet face does not wait for one) are re-affirmed
below, unchanged. ADR-006 solved the DOWN direction of the mesh-ui ↔ mesh-serve process split; this is
its UP direction. It also carries **three cross-milestone amendments that other milestones' own
documents instruct milestone 50 to make**: m48/ADR-002's and m48/ADR-005's frozen session shapes gain
one appended key each (decision 8), m49/ADR-003's feed-axis derivation is re-derived and its shrink-only
producer ceiling raised 2 → 3 (decision 9, the raise that gate's contract reserves to "an ADR that
re-derives the feed axis"), and m49's `ui/src/home/` directory budget is raised with its argument
(decision 10, which that budget's own `why` and DESIGN open question 6 both route here).
**Date:** 2026-08-14
**Inputs read at source:** `DESIGN.md` (the operator-visible state machine, the two deadlines, the
fourteen-row failure map, DG-50-1's producer requirement and open question 6), `SPEC.md`, story 03's
locked features, and the m48/m49 seams cited inline.

### Context

SPEC promises: *"**Honest failure.** A node that cannot spawn, a repo that does not exist on the chosen
node, a worktree that cannot be created — each fails with a stated reason, never a spinner that ends in
an empty grid slot."* The milestone as built through story 03 **cannot keep that promise**. Five facts,
each read at the call site rather than inferred from a comment (the mistake ADR-006 and its own
amendment were both written to correct):

**1. All three named failure modes are worker-side, and all of them happen AFTER the 200.**
`mesh-session-spawn-handler.mjs` refuses with exactly four coded outcomes —
`session-repo-unavailable` ([:227](../../../../src/mesh-session-spawn-handler.mjs#L227), [:244](../../../../src/mesh-session-spawn-handler.mjs#L244), [:260](../../../../src/mesh-session-spawn-handler.mjs#L260), [:270](../../../../src/mesh-session-spawn-handler.mjs#L270), [:278](../../../../src/mesh-session-spawn-handler.mjs#L278)),
`session-already-active` ([:235](../../../../src/mesh-session-spawn-handler.mjs#L235)),
`session-worktree-failed` ([:290](../../../../src/mesh-session-spawn-handler.mjs#L290)) and
`session-spawn-failed` ([:311](../../../../src/mesh-session-spawn-handler.mjs#L311), [:315](../../../../src/mesh-session-spawn-handler.mjs#L315), [:340](../../../../src/mesh-session-spawn-handler.mjs#L340)) —
and every one of them is carried by exactly one thing: `sendSessionSpawnAck`
([worker-stream-client.mjs:847-854](../../../../src/worker-stream-client.mjs#L847)) building
`buildSessionSpawnAckFrame` ([mesh-session-spawn-directive.mjs:22-26](../../../../src/mesh-session-spawn-directive.mjs#L22)).
The fleet face answered `200 { ok:true, sessionId }` several hundred milliseconds earlier.

**2. Nothing reads that ack — and the control actively MIS-reports it.** The ack rides `sendFrame` up
the fabric stream. In `control-stream-server.mjs`'s message handler it matches no branch
(`heartbeat` [:1206](../../../../src/control-stream-server.mjs#L1206), `terminal-frame`
[:1221](../../../../src/control-stream-server.mjs#L1221), `assignment-status`
[:1234](../../../../src/control-stream-server.mjs#L1234)) and falls into `applyStreamFrame`, whose kind
table ends `return { published:false, skipped:true, code:"unknown-frame-kind" }`
([:812-824](../../../../src/control-stream-server.mjs#L812)). That `skipped:true` is then routed to
`onFrameSkipped` ([:1255-1263](../../../../src/control-stream-server.mjs#L1255)) → the launcher's warning
emitter ([mesh-launcher.mjs:966-977](../../../../src/mesh-launcher.mjs#L966)), which writes to the
daemon's durable log:

> `Refused a session-spawn-ack frame from <node> for workspace (none) — this node has no registered`
> `descriptor for that workspace, so the frame's items were DISCARDED.`

Three of that sentence's four claims are false: there is no workspace on the frame, no descriptor is
required for it, and it carries no items. So the only operator-reachable trace of a failed spawn today
is a **wrong sentence in a log** — strictly worse than silence, because it sends the reader after a
workspace-registration bug that does not exist. `SESSION_SPAWN_ACK_KIND` has a builder, a sender, a
transport and a test, and **no reader anywhere in `src/`**.

**3. `routed=false` is a SECOND hole, and only the control can see it.** `POST /api/mesh/session`
answers `session-target-not-connected` (503) from the fleet PROJECTION's presence freshness
([mesh-ui-serve.mjs:751](../../../../src/mesh-ui-serve.mjs#L751)), and that freshness is a **60-second
ramp**: `queryGlobalRegistry`'s default `stalenessSeconds` is 60
([global-node-registry.mjs:153](../../../../src/global-node-registry.mjs#L153)) and `freshnessFor` labels
anything inside it `live` ([:303-309](../../../../src/global-node-registry.mjs#L303)) — and the session
route calls `queryGlobalMeshStatus({ ...globalStoreOptions })` with no override
([mesh-ui-serve.mjs:709](../../../../src/mesh-ui-serve.mjs#L709)), so the default applies. A node whose
admitted stream died 40 seconds ago is therefore `live` to the route, gets a 200, and its envelope
reaches [mesh-terminal-input.mjs:140-143](../../../../src/mesh-terminal-input.mjs#L140), which logs
`session-spawn-target-not-connected` and returns false — **in the serve process, where no browser is
listening**. ADR-006 decision 7's pre-dispatch check is a best-effort proxy with a documented lie
window; the authoritative not-connected fact exists only post-200, in the other process.

**4. The UP direction is already solved — for bytes, in production.** A worker's PTY chunk travels:
`client.sendTerminalFrame` ([worker-stream-client.mjs:614-625](../../../../src/worker-stream-client.mjs#L614))
→ fabric → `control-stream-server.mjs` branches `TERMINAL_FRAME_KIND` **before** `applyStreamFrame` and
hands it to the injected `onTerminalFrame` sink, default no-op
([:1069-1080](../../../../src/control-stream-server.mjs#L1069) declares it, [:1221-1228](../../../../src/control-stream-server.mjs#L1221)
branches it) → [mesh-launcher.mjs:960](../../../../src/mesh-launcher.mjs#L960) pushes it into the loopback
broker **with the connection-bound nodeId re-stamped over the worker's self-declared one** (finding
F17) → [mesh-relay.mjs:594-604](../../../../src/mesh-relay.mjs#L594) fans it to every client except the
sender, forwarding an unknown `kind` byte-for-byte (the m26 leasing property) → the mesh-ui process's
ONE subscriber ([mesh-ui-serve.mjs:1081-1083](../../../../src/mesh-ui-serve.mjs#L1081), wired literally at
[commands/mesh-ui.mjs:80](../../../../src/commands/mesh-ui.mjs#L80)) → `mirror.apply`
([mesh-terminal-mirror.mjs:136-169](../../../../src/mesh-terminal-mirror.mjs#L136)) → `/ws/terminal-view`.
**Every hop the ack needs already exists, is wired at a production call site, and is under test.**

**5. The fleet's data visibility is POLL, not push.** `Fleet.tsx`'s own comment at
[:457-463](../../../../ui/src/fleet/Fleet.tsx#L457) — "Poll-only freshness (NO WebSocket, NO SSE)" — and
`POLL_MS = 5000` ([assign-affordance.mjs:54](../../../../ui/src/fleet/assign-affordance.mjs#L54)). The one
socket the fleet opens is `/ws/terminal-view`, an opaque byte pipe. And the sibling affordance this one
mirrors already solved "a dispatch that never answers": `ASSIGN_TIMEOUT_MS = POLL_MS * 2`
([:71](../../../../ui/src/fleet/assign-affordance.mjs#L71)) with the copy `"no answer — timed out"` and a
detail that says the outcome is **UNKNOWN, not negative** ([:129-137](../../../../ui/src/fleet/assign-affordance.mjs#L129)).

**6. A launched session would render DEAD in the grid, and the arithmetic that makes it so is pinned
by a gate that names this ADR as its only amender.** Milestone 49's terminals home derives each pane's
**feed axis** in the browser from ONE field: `establishedProducer` requires a non-blank `ref` AND
`assignmentId` on `workItem` ([feed-axis.mjs:79-98](../../../../ui/src/home/feed-axis.mjs#L79)). A launched
session is a *free* session — no assignment, so `workItem` is `null` — so it lands in `no-producer`, and
four already-built consequences follow: no socket
([grid.mjs:181-185](../../../../ui/src/home/grid.mjs#L181)), a read-only mount
([session-mount.mjs:21-39](../../../../ui/src/home/session-mount.mjs#L21)), the chip `no live output` with
the pane line `no live output — no assignment is relaying this session`
([feed-axis.mjs:57](../../../../ui/src/home/feed-axis.mjs#L57), [:229](../../../../ui/src/home/feed-axis.mjs#L229)),
and neither header control — no expand, no `Watch terminal →`, which is the only way to type. **All
while story 03 is streaming that session's bytes and accepting input on them.** That is SPEC's
"appearing in the terminals-home grid like any other session" and "a launcher that produces a second
class of session defeats its own purpose", both broken by the milestone's own headline feature.

The browser's derivation is not wrong — it is **arithmetic over a repository fact**: `workItem == null
⟹ no `.sendTerminalFrame(` call site anywhere in `src/` will ever feed this tuple`, true only because
this repo has exactly TWO such call sites, both inside `mesh-launcher.mjs`'s worker branch, both inside
an assignment execution. That is pinned by a shrink-only ceiling,
`SANCTIONED_PRODUCER_SITES = 2` ([acd-terminal-output-signal-source.test.mjs:97-131](../../../../test/arch/acd-terminal-output-signal-source.test.mjs#L97)),
whose own header states the terms: the number "may be RAISED **only by an ADR that re-derives the feed
axis** — because raising it is not a test edit, it is the browser's `no-producer` answer changing
meaning." **Story 03's PTY bridge is the third call site, and this ADR is that ADR.** 49/DESIGN §DG-49-2
wrote the same instruction in words and named milestone 50 as the amender.

**Codebase-graph grounding.** `aof graph build .` — **2026-08-14T12:10:00.870Z, 10,106 nodes / 24,536
edges, `egress: none`** (the code-only build; no backend, no API key). `aof graph impact` read back per
module — these are ACTUAL edges, not inference:

| module | ← dependents | → imports | role in ADR-008 |
|---|---:|---:|---|
| `src/control-stream-server.mjs` | **39** | 15 | +1 branch, +1 default-no-op option (widest blast radius touched) |
| `src/mesh-launcher.mjs` | 24 | **38** | +2 literal wiring keys (the widest out-degree in `src/`) |
| `src/mesh-terminal-input.mjs` | 3 | 3 | +1 injected refusal callback |
| `src/mesh-terminal-mirror.mjs` | 10 | 4 | **unchanged** — its subscriber machinery is reused whole |
| `src/mesh-session-spawn-directive.mjs` | 6 | **0** | +1 envelope builder; stays a 0-out-edge leaf |
| `src/mesh-ui-serve.mjs` | 30 | 14 | +1 GET route, +1 consumer, +1 import |
| `src/mesh-session-spawn-outcome.mjs` | (new) | 1 | the registry |
| `src/mesh-worker-execution.mjs` | 47 | 15 | **NOT TOUCHED** (ADR-003 holds) |

### Decision

**1. The optimistic 200 STANDS (ADR-002 decision 6, upheld). The discarded ack was the defect, not
the 200.**

Waiting for the ack inside `POST /api/mesh/session` would mean correlating a reply across **five hops
in two processes** (mesh-ui → relay → serve → fabric → worker, and back) while holding an HTTP request
open. The fleet face has no synchronous handle on any of it: the relay push is **fan-out**
([mesh-relay.mjs:594-604](../../../../src/mesh-relay.mjs#L594)) and yields no delivery result at all, which
is precisely why ADR-006 decision 7 had to answer connectivity from the projection instead. Building
request/reply over a fan-out bus needs a pending-map keyed on `sessionId` with its own timeout in the
mesh-ui process — **that is the outcome registry of decision 4**, plus a blocked socket and a timeout
policy in the wrong layer. And the 200's `sessionId` is what the browser needs *immediately* to open
the terminal view; delaying it delays the terminal.

The trade-off is named honestly: an optimistic 200 means **`200` proves the dispatch was accepted, never
that a session exists**. That is the same statement `/api/mesh/assign`'s affordance already makes — "the
affordance reports the CALL; region 5 reports the ASSIGNMENT"
([assign-affordance.mjs:29-36](../../../../ui/src/fleet/assign-affordance.mjs#L29)) — and story 04's UI
must speak it the same way (DESIGN owns the words).

**2. The ack rides the SHIPPED loopback relay, on the machinery terminal frames already use.** Three
additive seams, each byte-identical in shape to a production predecessor:

- **`control-stream-server.mjs` gains ONE branch and ONE default-no-op option.** A new
  `onSessionSpawnAck = () => {}` option beside `onTerminalFrame`, and a
  `if (frame?.kind === SESSION_SPAWN_ACK_KIND) { try { onSessionSpawnAck(frame, { nodeId }); } catch
  (error) { reportDegrade(...); } return; }` branch placed **before** the `applyStreamFrame` call,
  immediately after the `TERMINAL_FRAME_KIND` branch at [:1221-1228](../../../../src/control-stream-server.mjs#L1221).
  ~8 lines. Every existing caller is byte-identical (the default is a no-op), which is exactly the
  argument ADR-014's amendment made for `onTerminalFrame` against this same 39-dependent module. There
  is no alternative: the frame arrives on a socket only this module holds, and the relay broker binds
  loopback ([mesh-relay.mjs](../../../../src/mesh-relay.mjs)), so a worker cannot reach it off-host.
- **The ack is NEVER a store apply.** It is not added to `applyStreamFrame`'s kind table
  ([:812-824](../../../../src/control-stream-server.mjs#L812)). ADR-002 decision 6's no-persist clause and
  ADR-004 decision 5's "only the worker writes a session record" both stand; a failed spawn registers
  no session, so there is no record to hang an outcome on.
- **`mesh-launcher.mjs` wires the sink as a LITERAL key at the production `startServer({...})` call**,
  beside `onTerminalFrame` at [:960](../../../../src/mesh-launcher.mjs#L960) — never through the
  `controlStreamServerOptions` test spread, which would make it production-dead (the F12/F-38.05
  discipline, and the exact class of defect ADR-006 exists to prevent):
  `onSessionSpawnAck: (frame, { nodeId }) => controlTerminalPush?.push(buildSessionSpawnAckEnvelope(nodeId, frame))`.
  The **F17 re-stamp is load-bearing and identical to the terminal lane's**: the envelope's `nodeId` is
  the CONNECTION-bound identity resolved at admission, and the worker's self-declared `frame.nodeId` is
  discarded — otherwise an admitted worker could send `{ kind:"session-spawn-ack", nodeId:"<victim>",
  ok:false }` up its own socket and refuse another node's pending spawn.
- **`buildSessionSpawnAckEnvelope(nodeId, { sessionId, ok, code })` lives in the lane's EXISTING home**,
  `src/mesh-session-spawn-directive.mjs`, beside `buildSessionSpawnEnvelope`. The FROZEN envelope stays
  exactly `{ kind, nodeId, signal }` with every field inside `signal` (ADR-014 invariant 2 — the relay
  parses only `{ kind, nodeId }`), and the envelope `kind` IS `SESSION_SPAWN_ACK_KIND`: **one literal,
  one home, no second constant to drift** (ADR-006 decision 2's rule, applied to the return direction).
- **The relay and the DOWN-direction router are unchanged.** The serve process's own input-router
  subscriber will also receive this envelope (fan-out is broadcast-to-others, and the push socket and
  the subscribe socket are different clients) and will ignore it: `createTerminalInputRouter`'s kind
  guard is a closed three-kind check
  ([mesh-terminal-input.mjs:61-65](../../../../src/mesh-terminal-input.mjs#L61)). **That router must never
  grow an ack branch** — it is the DOWN direction's authority, the ack is UP, and a lane that both
  dispatches and interprets its own replies is the shape this split was drawn to avoid.

**3. The control SYNTHESISES the one outcome only it can see (`session-target-not-connected`).**

`createTerminalInputRouter` gains an injected `onSessionSpawnRefused({ nodeId, sessionId, code })`
(default no-op, the module's established injection idiom — it already takes `dispatchDirective`, `now`
and `onLog` and keeps "PURE IN-MEMORY: no fs, no store, no durable write"). It is called in the
`result?.sent !== true` branch at [mesh-terminal-input.mjs:140-143](../../../../src/mesh-terminal-input.mjs#L140),
beside the log line that is today's only trace. `mesh-launcher.mjs` wires it, at the same
`createTerminalInputRouter({...})` construction at [:1023-1027](../../../../src/mesh-launcher.mjs#L1023), to
push a `session-spawn-ack` envelope with `ok:false, code:"session-target-not-connected"`.

This is deliberately the **same kind, same envelope, same registry** as a worker's own ack, so the
browser needs exactly ONE reader for both. The synthesised outcome is control-authored, and that is
sound: no worker is involved in a frame that was never routed, the `nodeId` is the fleet route's own
validated target, and the code is one **no worker can produce** (the worker's four codes are disjoint
from it) — so the two producers stay distinguishable by code without a `source` field the registry
would have to trust.

This closes reproduced experience #1 end to end: presence says `live`, the stream is gone, the browser
gets `200 {ok:true}`, and instead of holding a sessionId forever it is told
`session-target-not-connected` within one client poll.

**4. The outcome is EPHEMERAL, tuple-keyed, bounded, and lives in the mesh-ui process.**

A new leaf module `src/mesh-session-spawn-outcome.mjs` exports `createSpawnOutcomeRegistry({ now })`:

- **`apply(envelope) → boolean`** — deliberately `createTerminalMirror().apply`'s consumer contract, so
  the **shipped** subscriber machinery (parse + backoff + reconnect,
  [mesh-terminal-mirror.mjs:289-366](../../../../src/mesh-terminal-mirror.mjs#L289)) drives it with zero
  new transport code. This is the same trick `createTerminalInputRouter` already plays on the serve
  side ([mesh-terminal-input.mjs:35-40](../../../../src/mesh-terminal-input.mjs#L35)); it is a shape with
  two prior instances, not an invention. Kind-blind to everything but `SESSION_SPAWN_ACK_KIND`; never
  throws; drops a frame with no resolvable tuple.
- **Keyed by `(nodeId, sessionId)`, not by `sessionId` alone** — the mirror's own `routingKey`
  discipline ([:64-68](../../../../src/mesh-terminal-mirror.mjs#L64)). With the F17 re-stamp above, this
  makes cross-node forgery structurally impossible: worker B's ack keys `(B, sessionId)` and can never
  resolve a spawn the browser is waiting on at `(A, sessionId)`.
- **`read(nodeId, sessionId) → { ok, code, at } | null`** — a Map lookup. No store open, no fs, no
  clock read of its own (`now` is injected, the ticker-injection idiom every mesh module keeps).
- **Bounded, and pruned on access rather than on a timer.** At most `MAX_SPAWN_OUTCOMES = 64` entries
  (the mirror's `MAX_TAIL_KEYS`, [:59](../../../../src/mesh-terminal-mirror.mjs#L59) — borrowed, not
  invented), LRU-evicted, each expiring at `SPAWN_OUTCOME_RETENTION_MS = 120_000`. Pruning happens
  inside `apply`/`read`, so **the registry owns no interval, holds no handle, and has no lifecycle to
  dispose** — one less thing for `server.close` to get wrong. Retention is **eight times** decision 7's
  15s outcome window, which is what makes "the browser was not connected at ack time" (a refreshed tab,
  a slow first poll, a reopened page) a non-event: the answer is still there when it asks.
- **Never a system of record.** No fs import, no durable write, no record schema — a rebuilt process
  starts empty, exactly as the terminal mirror does. Kill it and the fleet loses the *explanation* of a
  failed spawn, never data (nothing was written to lose).

**Wiring, with ZERO change to the composition root.** `mesh-ui-serve.mjs` constructs the registry beside
the mirror it already builds at [:259](../../../../src/mesh-ui-serve.mjs#L259), and hands the ONE existing
subscriber a fan-out consumer at [:1083](../../../../src/mesh-ui-serve.mjs#L1083):

```
terminalSubscriberHandle = await startTerminalRelaySubscriber({
  apply: (frame) => { const a = mirror.apply(frame); const b = spawnOutcomes.apply(frame); return a || b; },
});
```

Because `commands/mesh-ui.mjs:80` passes whatever it is handed straight through as `mirror`, the
production launcher needs **no edit at all** — and there is still exactly ONE relay subscriber in the
mesh-ui process (a second socket would double the reconnect ladder for one lane).

**5. The browser reads the outcome over ONE NEW READ route. The WRITE allowlist does not move.**

`GET /api/mesh/session-outcome?nodeId=<id>&sessionId=<id>` on the fleet face.

- **Method:** GET/HEAD only; anything else is a 405 with `Allow`, the shape `/api/mesh/status` already
  keeps. It is a **read** route: the write allowlist stays EXACTLY `{assign, session}`, which is story
  04's acceptance criterion verbatim.
- **Refusal:** `400 invalid-query` when either parameter is blank/absent (the `invalid-scope`
  vocabulary, not `invalid-body` — there is no body).
- **Answer:** always `200 { ok:true, nodeId, sessionId, state, code, at }`, with
  `state ∈ { "pending", "started", "failed", "unknown" }`:
  - `pending` — nothing retained for this tuple. `code:null`.
  - `started` — an ack with `ok:true`: the worker opened the PTY and wrote the session record. It is a
    reported WIRE fact, **not the UI's success trigger** — DESIGN rail 1 keeps the grid as the success
    authority (decision 7), and this value corroborates it, distinguishes the two ways the window can
    expire, and is what FF-B's both-ends invariant is measured on.
  - `failed` — an ack with `ok:false`; `code` is the worker's coded reason or the control's
    `session-target-not-connected`.
  - `unknown` with `code:"spawn-outcome-lane-unavailable"` — decision 6.
- **Never a 404.** The registry cannot distinguish "this session never existed" from "the ack has not
  arrived yet", and answering 404 would assert the first. `pending` states exactly what is known.
- **The route does NOT own the timeout.** It cannot: only the client knows when it dispatched. The
  bound is the client's (decision 7), and the server never invents a terminal state it cannot observe.

**Why an exact-pathname query route and not `/api/mesh/session/:id/outcome`:** all four route-table
detectors read `pathname === "/api/mesh/<literal>"` string equality, and the 2026-08-14 review fix to
`declaredMeshRoutes` widened its capture to `[^"']+` **precisely because** `"/api/mesh/session/kill"`
was invisible to the previous name-shape class
([acd-mesh-ui-write-isolation.test.mjs:52-64](../../../../test/arch/acd-mesh-ui-write-isolation.test.mjs#L52)).
A path-parameter route would evade the bound rather than join it.

> **AMENDED 2026-08-14 (structural review, same day, before merge) — this paragraph named the hazard
> and did not close it, and the hole was then MEASURED.** Planting a prefix-matched route into the
> real `src/mesh-ui-serve.mjs` —
> `if (pathname.startsWith("/api/mesh/session/")) { if (request.method === "POST") { sendJson(response, 200, …) } }`
> — left **all four** route-table detectors green, plus `mesh-ui-read-only-contract` and
> `advertised-paths`. A third write route, POST, answering 200, invisible to every instrument,
> because every detector anchors on `pathname ===` and that is the only form it can see. This
> milestone's chosen exact-pathname form is correct; the escape hatch beside it was open.
> Closed by an absence clause in `acd-mesh-ui-write-isolation` (no `pathname.startsWith("/api/mesh/`,
> no `pathname.match(/^\/api\/mesh`, no `/^\/api\/mesh\/…/.test(pathname)`), with a planted
> self-check.
>
> **Retro lesson, and it is the milestone's recurring one:** this ADR reasoned correctly about a
> hazard, chose the safe form BECAUSE of it, and never drove a detector against the unsafe
> alternative — structurally the same mistake as ADR-006 decision 4's withdrawn revocation rationale.
> When an ADR argues "form X would evade gate G", plant form X against G in the same sitting. It cost
> four minutes here and turned a paragraph of correct reasoning into a measured hole.

**Why this route adds NO instance of TECH_DEBT item 44's duplication.** Item 44 measured that
`/api/mesh/session` is 63 lines verbatim-identical to `/api/mesh/assign` across five blocks, that three
fitness functions now *require* the copies in place, and closes with "do this **before** a fourth write
route is added, not after". This route is a GET, so it needs **none** of them: no SECURITY T13
admission (a GET, like `status` and `board-url`), no `readJsonBody`, no `queryGlobalMeshStatus` →
row → `existsSync` probe, no `controlNodeId()`. It adds one 4-line method guard and a Map read. That is
asserted, not merely asserted-in-prose — see FF-D.

**6. A lane that cannot HEAR is an outcome, not silence.**

If the mesh-ui process's relay subscriber is not connected (no broker yet, relay unconfigured, broker
restarted), no ack can ever arrive and every dispatch would sit at `pending` until the client's bound
turned it into a generic timeout — the operator told "no answer" when the truth is "this control node
cannot hear answers at all". `startTerminalMirrorSubscriber` already exposes a live
`get connected()` ([mesh-terminal-mirror.mjs:352-365](../../../../src/mesh-terminal-mirror.mjs#L352)) and
`mesh-ui-serve` already holds that handle as `terminalSubscriberHandle`. The route reads it and answers
`state:"unknown", code:"spawn-outcome-lane-unavailable"` instead of `pending`. Same posture as ADR-006
decision 5's `session-dispatch-unavailable`: an unconfigured/degraded lane refuses BY NAME rather than
looking like a slow success.

**7. TWO deadlines, pinned — and they are two numbers because they wait on two different facts.**

DESIGN §The state machine states both and rules that they "must not be one number"; it derives them and
leaves the pinning here. Both are expressed in terms of **`HOME_POLL_MS = 5000`**
([page-state.mjs:357](../../../../ui/src/home/page-state.mjs#L357)) — the terminals home's OWN cadence
constant, **not** `ui/src/fleet/`'s `POLL_MS`, because `ui/src/home/` may import nothing from
`ui/src/fleet/` (49/ADR-001, gated) and `page-state.mjs` already declares its own for exactly that
reason. Neither is ever a second literal.

- **The POST deadline — `2 × HOME_POLL_MS` (10s).** The request itself hanging. Inherited verbatim with
  its reasoning from m38: *"one interval is too eager for a cross-machine POST; two is past the point
  any answer is still useful"* ([assign-affordance.mjs:63-71](../../../../ui/src/fleet/assign-affordance.mjs#L63)).
  It abandons the WAIT, never the CALL — no abort and no retry, because a possibly-successful
  server-side mint must not be made ambiguous.
- **The outcome window — `3 × HOME_POLL_MS` (15s).** The 200 is in hand and the session is not yet
  visible. DESIGN's derivation, adopted: the worker's presence ticker (~5s, ADR-004 decision 5) plus the
  page poll (5s) plus one poll of margin. **This is why it is three and not two**: it waits on the
  session appearing in the GRID, which is the success authority (below), and a launched session reaches
  the grid in ~10-12s worst case. A two-interval window would render a *successful* spawn as a failure.

**The GRID is the success authority; the lane is the failure authority.** DESIGN rail 1 — "the launcher
reports the DISPATCH; the grid reports the SESSION" — and DG-50-2 rule 2 fix `started` on the session
appearing in `sessions[]`, not on the ack. ADR-008 does not overrule that, and the reason is sound: a
launcher saying "started" while no tile exists is the launcher claiming a session the grid does not
show. So `ok:true` rides the lane as a **corroborating** fact (it proves the lane is alive, and it is
what FF-B's both-ends invariant is measured on), while `ok:false` and the control's synthesised refusal
are what the affordance actually resolves on. Both directions are carried; the UI chooses which one
terminates which state.

**One consequence for DESIGN, surfaced not decided (copy is the designer's).** Because the lane carries
`ok:true`, the window can now expire in TWO distinguishable ways: no ack at all, or an ack that said the
PTY opened while the session never appeared. K50-12's long form asserts the first — *"…and the node has
reported nothing"* — which is false in the second case. DESIGN owns whether that is one string or two;
the lane makes the distinction available either way.

**The outcome poll may run faster than the page poll.** `/api/mesh/session-outcome` is a Map read with
no store open, so a ~1s cadence inside the ≤15s window is cheap — which is what makes a
`session-repo-unavailable` refusal (known worker-side in ~200ms) reach the operator in about a second
rather than five. Folding this onto `/api/mesh/status` would have forced a machine-wide store projection
per check. The exact cadence is DESIGN's; this ADR requires only that it derive from `HOME_POLL_MS`,
live in ONE home under `ui/src/home/`, and stop at the window.

**8. A session's live-output producer is a STATED FACT on the wire: `relaying`, written by the worker.**

The browser may not guess. It may not sniff bytes (gated, and forgeable by a worker's own PTY output),
and it may not read *"no work item, therefore launched"* — the same guess with the opposite sign. So the
fact is produced where it is known and carried where every other session fact already travels.

- **The field: `relaying: boolean`**, on the session record. It states one thing: *"something is
  bridging this session's PTY output up this worker's stream"* — precisely what a `.sendTerminalFrame(`
  call site embodies.
- **A BOOLEAN, never a named producer.** A `producer: "launcher" | "assignment"` enum would let a build
  render the difference, and SPEC forbids exactly that ("a launcher that produces a second class of
  session defeats its own purpose"; DESIGN §S4: "a build that marks it — a badge, a tint, a different
  order — is a GAP"). With a boolean the payload **cannot** distinguish the two populations, so
  no-second-class is structural rather than a rule someone must remember.
- **The wire states a transport fact; the browser keeps its own word.** The field is `relaying`; the
  axis stays `producer-known`. `feed-axis.mjs` "DEFINES NO STATE WORD" ([:12-18](../../../../ui/src/home/feed-axis.mjs#L12))
  and this does not give it one — no vocabulary crosses in either direction.
- **The WORKER writes it, and only the worker.** `mesh-session-spawn-handler.mjs` passes `relaying: true`
  to its `startSession` and `pingSession` calls (ADR-004 decision 1-2's existing calls, one field wider).
  Sticky across a ping — `relaying: relaying === true || existing?.relaying === true`, mirroring
  `pingSession`'s existing `repo: existing?.repo ?? repo` carry-forward — so a ping that omits it can
  never silently demote a live pane to `no live output` mid-session. The record is deleted at
  `endSession`, so the fact never outlives the bridge.

**The derivation becomes a DISJUNCTION of two positive statements, and `mesh-worker-execution.mjs` is
still not touched:**

```
producer-known  ⟺  establishedProducer(workItem)   OR   row.relaying === true
no-producer     ⟺  neither                                  (still fails CLOSED)
```

An assignment session keeps its existing positive statement via `workItem` — so the assignment driver
needs no edit, which is what keeps the 47-dependent module out of this milestone. A launched session
gets the new one. A hook-registered free session (an operator running `claude` by hand on a worker) has
neither, and stays `no-producer` — correctly, because nothing is relaying it. Read with strict `=== true`,
exactly as `workspaceHasRun` is, so an older node that states nothing reads `false` rather than
throwing or claiming.

**FOUR hops carry it, and THREE of them must be taught — each an APPEND, never a reorder:**

| # | seam | today | change |
|---|---|---|---|
| 1 | `assembleSessionRecord` ([mesh-session.mjs:142-152](../../../../src/mesh-session.mjs#L142)) | the m48/ADR-002 frozen SEVEN | **append an eighth**, the same re-freeze-by-insertion m48 itself performed on m38's six |
| 2 | `readLiveSessions`'s projection ([mesh-presence.mjs:136-143](../../../../src/mesh-presence.mjs#L136)) | the m48/ADR-005 frozen ordered SIX | **append a seventh at the tail** — the shape that ADR already declares ("an INSERTION at the head and an APPEND at the tail, NEVER a reorder") |
| 3 | `safeSessionArray` ([control-stream-server.mjs:272-276](../../../../src/control-stream-server.mjs#L272)) | passes each entry object **VERBATIM** | **NO CHANGE — and that is a decision.** It filters non-objects only; teaching it a key whitelist would end the verbatim property the m38 fabric bug was fixed by |
| 4 | `buildSessionIndex`'s entry ([global-mesh-query.mjs:317-335](../../../../src/global-mesh-query.mjs#L317)) | the unconditional EIGHT-key entry | **append a ninth**, unconditional and strict-read, exactly as `workspaceHasRun` is |

A projection that silently drops the key is the whole failure mode here — the browser would keep
answering confidently from a field that never arrives — which is why hop 3's non-change is written down
beside the three changes rather than left to be discovered.

**Why NOT the ack lane** (the tempting answer, since this ADR is already building it): the outcome
registry is ephemeral and per-dispatch, with a 2-minute retention. The grid must render a launched
session `producer-known` for its whole life, in any browser, after any refresh, ten minutes later. The
fact's lifetime is the SESSION's lifetime, and the session record is the only thing whose lifetime is
exactly that. The lane answers *"what happened to my dispatch?"*; the record answers *"what is this
session?"*.

**9. The producer-site ceiling is RAISED 2 → 3, and what the number proxies is re-stated.**

`acd-terminal-output-signal-source`'s `SANCTIONED_PRODUCER_SITES` becomes **3**. The three sanctioned
`.sendTerminalFrame(` call sites are the assignment driver's `onOutputChunk`, the resume lane, and story
03's spawn-handler PTY bridge. **A fourth still stops the build and asks a human**, for the unchanged
reason: the gate is "the only place the two builds meet", and it does not judge branches.

What the number now proxies has changed, and the re-derivation is the substance of the raise:

- **Before:** the count carried BOTH directions. `workItem != null ⟹ a producer exists` (still true —
  the two assignment sites are untouched) **and** `workItem == null ⟹ no producer` (true only while
  every producer was assignment-bound).
- **After:** the reverse direction no longer rests on the count at all. It rests on **every non-assignment
  producer stating `relaying: true` on the wire** (decision 8). The count survives as the tripwire that
  forces a human to check that a new producer states itself — which is what it was always really doing.

This is the amendment 49/DESIGN §DG-49-2 instructed be made "in the same change", and it lands with the
change rather than after it. 49/DESIGN §DG-49-2's own premise sentence ("keys on one fact on the wire —
`workItem === null`") becomes false on merge and is amended by the designer in the same change; that is
DESIGN's own DG-50-1 rule 4, recorded here so the two documents do not drift.

**10. The launcher's UI files: `ui/src/home/`, ceiling 15 → 18, argued here because the budget says it
must be.**

`ui/src/home/` is at its declared ceiling of **15 with an allowance of 0**, and its `why` in
[acd-ui-directory-budget.test.mjs](../../../../test/arch/acd-ui-directory-budget.test.mjs) ends: "THE
DIRECTORY IS NOW COMPLETE: every noun the domain has is named, and the next member is a decision to
SPLIT one — which belongs in `ui/src/components/` or `ui/src/terminal/` if a second surface wants it,
**and needs an ADR either way**." DESIGN open question 6 routes the same question here. Both are answered
now rather than at build time:

**The raise is granted for exactly three files, and the ceiling is set AT the delivered count (allowance
0), never above it** — a ceiling set "for headroom" is the ratifying move that ratchet exists to refuse:

1. `ui/src/home/session-launcher.mjs` — the framework-free decision module: DESIGN's eight-state machine (its heading says seven; its table and diagram enumerate eight, and the table governs),
   the two deadlines derived from `HOME_POLL_MS`, the code→copy map, and the derived-not-remembered
   selection resolution. It **must** be a module: this repo has no React test harness, and "a rule that
   can only be exercised through a component is a rule with no test"
   ([feed-axis.mjs:6-9](../../../../ui/src/home/feed-axis.mjs#L6)) — DESIGN's failure map alone is fourteen
   testable rows.
2. `ui/src/home/session-launcher.d.mts` — 49/ADR-001's split, which that budget entry itself calls "not
   optional".
3. `ui/src/home/SessionLauncher.tsx` — the ONE component (trigger + panel), mounted from `Home.tsx`'s
   **existing** `<SurfaceSlot>` contribution ([Home.tsx:150-164](../../../../ui/src/home/Home.tsx#L150)).

**The launcher is not a SPLIT of an existing noun — it is the domain's first WRITER**, where all fifteen
existing members are readers. That is what makes it a new noun rather than the growth the entry closed
the directory against. The three alternatives, each rejected on a measured ground:

- **`ui/src/fleet/`** — forbidden outright: `ui/src/home/` may import nothing from it (49/ADR-001,
  gated). Story 04's STORY.md Context bullet names `ui/src/fleet/` and DESIGN already flags it as an
  error; **an earlier draft of this ADR's scope section repeated it**, and the correction is recorded
  here so the build meets the decision instead of the fitness function.
- **`ui/src/components/`** (ceiling 7) — that directory is for what a SECOND surface imports. Nothing
  else launches sessions, and putting a home-only noun there is precisely the "accidental shared
  library" TECH_DEBT item 18(a) records about `ui/src/board/`.
- **Regions of `Home.tsx`** — rejected for the decision module (no test harness can reach it) and for the
  component: `Home.tsx` already owns the page's fetch and its five page states, and that budget entry's
  own words warn against handing it "a second author".

The route paths and the poll constant the launcher needs live where the home already keeps its own —
beside `HOME_STATUS_PATH` / `HOME_POLL_MS` in `page-state.mjs`, or in the launcher module — **never**
imported from `ui/src/fleet/api.ts`. The home declares its own, and the duplication is named rather than
accidental, exactly as `HOME_POLL_MS` already is ([page-state.mjs:346-357](../../../../ui/src/home/page-state.mjs#L346)).

**11. Fitness functions this ADR owes.**

- **FF-A · `acd-session-spawn-ack-has-reader` (new).** The invariant the milestone actually broke:
  (a) `control-stream-server.mjs` branches `SESSION_SPAWN_ACK_KIND` and that branch appears **before**
  its `applyStreamFrame(` call (index comparison over the comment-stripped source, so the ack can never
  regress into the `unknown-frame-kind` path and its false "items DISCARDED" warning);
  (b) `applyStreamFrame`'s kind table does **not** contain the ack (it is never persisted);
  (c) `mesh-launcher.mjs` wires `onSessionSpawnAck` as a LITERAL key at the production `startServer({`
  call, before the `controlStreamServerOptions` spread (the F12 discipline);
  (d) that wiring builds its envelope from the **second argument's** `nodeId`, never `frame.nodeId`
  (the F17 re-stamp), asserted the same way `acd-fleet-terminal-frame-connection-identity` asserts it
  for the byte lane;
  (e) a behavioural half — a fake worker frame driven in at the control's socket seam arrives at a
  registry `apply`. Each clause carries a planted-violation self-check (the non-vacuity discipline this
  repo's gates keep, and which TECH_DEBT item 24 exists because of).

- **FF-B · `acd-wire-kind-has-both-ends` (new — THE RATCHET).** Every `export const *_KIND` literal
  declared in `src/` must be referenced by at least **two** modules other than its declaring home — one
  that builds/sends it and one that reads/branches on it — with an **explicit, NAMED exemption list**
  (an enumeration, never a pattern; ADR-001 decision 5's rule). This is earned, not speculative — it is
  the **third** instance of "a shipped seam with no counterpart": (1) `wireTerminalBridge`, deleted at
  m46/story 01 (ADR-007) for having no production caller
  ([mesh-terminal-relay-bridge.mjs:20-30](../../../../src/mesh-terminal-relay-bridge.mjs#L20));
  (2) TECH_DEBT item 38's two shipped, tested rendering paths with no production producer;
  (3) `SESSION_SPAWN_ACK_KIND` — built, sent, transported and unit-tested across **three accepted
  stories** while nothing read it. Measured today, `SESSION_SPAWN_ACK_KIND` has exactly ONE importer,
  so **this gate is RED at HEAD and turns green with ADR-008's lane** — which is the strongest possible
  evidence it is not vacuous. It is the fitness function that makes this milestone's own defect
  structurally impossible to repeat, rather than fixed once.

- **FF-C · the four route-table pins, expanded BY NAME.** Adding a fifth `/api/mesh/*` route makes four
  detectors red, which is the enumeration doing its job. Each is expanded by name — never relaxed to a
  pattern (ADR-001 decision 5; a `/api/mesh/*` allowlist was considered and rejected there):
  - [`acd-mesh-ui-write-isolation.test.mjs`](../../../../test/arch/acd-mesh-ui-write-isolation.test.mjs):
    `READ_ROUTES` → `["board-url","session-outcome","status"]`; the declared-routes deepEqual →
    `["assign","board-url","session","session-outcome","status"]`; **`WRITE_ROUTES` UNCHANGED at
    `["assign","session"]`** — and the Examples-driven table gains a `session-outcome` (allowed) row
    while `route`/`revoke`/`terminate` must still fire.
  - [`acd-mesh-ui-read-only.test.mjs`](../../../../test/arch/acd-mesh-ui-read-only.test.mjs): the route-table
    deepEqual, and the "every non-GET/HEAD on a read route is a 405" behavioural sweep, gain the route.
  - [`acd-fleet-face-single-mutation-route.test.mjs`](../../../../test/arch/acd-fleet-face-single-mutation-route.test.mjs):
    its `READ_ROUTES` const gains it; its `WRITE_ROUTES` does not. The load-bearing statement of this
    whole story is that **the mutation surface did not grow**.
  - [`acd-fleet-board-link-resolved.test.mjs`](../../../../test/arch/acd-fleet-board-link-resolved.test.mjs):
    the `routeRegions` deepEqual gains it; the **`resolvers` deepEqual does NOT** — a positive assertion
    that the outcome route binds no `workspaces` row and opens no store.

- **FF-D · the outcome route stays a Map read (a new clause inside `acd-mesh-ui-write-isolation`).**
  Brace-cut the `/api/mesh/session-outcome` region and assert it calls none of `queryGlobalMeshStatus(`,
  `existsSync(`, `controlNodeId(`, `readJsonBody(`, `assignWork(`, `.push(`. This is what keeps the
  route from silently becoming TECH_DEBT item 44's sixth copy, and it is checkable rather than hoped
  for. The file-wide zero-fs-write / no-shell-out clauses already cover the rest.

- **FF-E · `acd-terminal-output-signal-source`, AMENDED (it owns this number).** `SANCTIONED_PRODUCER_SITES`
  2 → 3, with the three sites enumerated by name in the constant's own prose and the re-derivation of
  decision 9 written into its header — because that gate's contract is that the number moves only with a
  stated re-derivation, and a raise whose reason is not written there is the raise it was built to stop.
  Its existing FLOOR, its sanctioned-arrow shape and its credential sweep are untouched. Two clauses are

  > **CORRECTED 2026-08-14 (structural review, same day, before merge) — "sanctioned-arrow shape …
  > untouched" was WRONG, and raising the number alone would have left the gate red.** QA measured a
  > SECOND failing clause the ADR did not account for: `src/mesh-launcher.mjs` carries a
  > `.sendTerminalFrame(` call site that sits OUTSIDE any `onOutputChunk:` property value — it is a
  > bridge KEY (`sendTerminalFrame: (sessionId, bytes) => client.sendTerminalFrame(sessionId, bytes)`),
  > not an arrow. So the sanctioned-HOST set had to become an **enumeration of two exact spellings**
  > (`SANCTIONED_PRODUCER_SHAPES`, a frozen two-member table), each anchored `^…$` and each pinning its
  > whole second argument. Verified non-vacuous by planting a credential fold into the NEW shape — it
  > fires, naming the exact spelling it violates, so the second entry is as strict as the first.
  > Relaxing the arrow to a pattern was the only other way to green and would have deleted the very
  > property both shapes exist to hold.
  ADDED, both cheap: the third site's module (`mesh-session-spawn-handler.mjs`) passes `relaying: true`
  to `startSession(` and `pingSession(`; and `feed-axis.mjs` still takes **no byte parameter** (the
  existing gated invariant, restated now that its derivation has a second input).

- **FF-F · `acd-session-producer-fact-survives-the-wire` (new).** The four-hop chain of decision 8, which
  is the failure mode nothing else can see — a projection that drops the key leaves the browser
  answering confidently from a field that never arrives, with every test on both sides green:
  (a) `assembleSessionRecord`'s returned literal contains `relaying`;
  (b) `readLiveSessions`'s pushed entry literal contains it;
  (c) `buildSessionIndex`'s entry literal contains it, unconditionally and read with `=== true`;
  (d) `safeSessionArray` remains a **shape** filter with no key whitelist (a negative clause — this is
  the hop that must NOT change);
  (e) `feed-axis.mjs`'s derivation reads `relaying` and its `no-producer` answer is reachable only when
  BOTH positive statements are absent (the fail-closed half);
  (f) the wire field is a BOOLEAN — no `producer`/`launched`/`kind` string appears on a session entry in
  `src/` — which is how decision 8's no-second-class property is held structurally rather than by
  review. Each clause with a planted-violation self-check.
  It is a NEW gate rather than more clauses on FF-E deliberately: `acd-terminal-output-signal-source` is
  already 533 lines, and TECH_DEBT item 39 records that an oversized arch test is a shape this repo has
  measured and that only a reviewer has ever noticed.

### Alternatives considered

- **Wait for the ack inside `POST /api/mesh/session` (drop the optimistic 200).** Rejected — decision 1.
  It needs the registry anyway, adds a held socket and a timeout in the transport layer, and delays the
  `sessionId` the browser needs to open the terminal.
- **Send the outcome as JSON in-band on `/ws/terminal-view`.** Rejected — the browser writes those bytes
  **straight into xterm**, so a control message on that socket is indistinguishable from PTY output and
  therefore **forgeable by the worker's own printed text** (SECURITY T14). It is the identical argument
  ADR-014's amendment used to put the end-of-stream marker in the transport layer instead of the byte
  stream ([mesh-terminal-relay-bridge.mjs:104-124](../../../../src/mesh-terminal-relay-bridge.mjs#L104)).
- **Push the reason into the terminal MIRROR as bytes, then `end`.** Superficially the cheapest option
  — zero new modules, zero new state, zero new routes, and the mirror's bounded tail already replays to
  a late subscriber. Rejected outright: it makes the control author terminal content, which violates
  the surviving half of SECURITY T14 — "the streamed signal is sourced EXCLUSIVELY from the PTY's own
  printed output" — and its live fitness function `acd-terminal-output-signal-source`. A pane whose text
  is sometimes the server's and sometimes the machine's is unreadable as evidence.
- **A WebSocket close CODE/reason on `/ws/terminal-view`.** Rejected — unforgeable, but it conflates
  "the session ended" with "the session never started", carries ≤123 bytes of reason, requires the
  browser to have the socket open at ack time, and buys a push channel the fleet deliberately does not
  have (fact 5).
- **A second upgrade path, `/ws/spawn-outcome`.** Rejected — the fleet's data visibility is poll by
  design; a socket, its reconnect ladder and its own fitness clauses are heavy machinery for a ≤10s
  wait. It would also break `acd-mesh-ui-write-isolation`'s existing "declares no `/ws/` HTTP route"
  clause, which is satisfied today only because the upgrade guard is written `pathname !==
  "/ws/terminal-view"`.
- **Fold `spawnOutcomes` onto the existing `GET /api/mesh/status` payload.** The strongest rejected
  option: no route-table churn at all, and one poll loop. Rejected on three grounds. (i) `/api/mesh/status`
  answers *what the fleet is* — a projection of the durable store, typed in the client as
  `FleetStatus = GlobalMeshStatus` ([api.ts:267](../../../../ui/src/fleet/api.ts#L267)); a per-dispatch
  transient event is not fleet state, and smuggling one in makes that type a lie for every grid consumer.
  (ii) It is the **expensive** read — a machine-wide `queryGlobalMeshStatus` — so the affordance could
  never poll it faster than the grid, and a refusal known worker-side in 200ms would sit unseen for up
  to 5s (decision 7). (iii) It establishes "add a key to the status payload" as the cheapest way past
  the route enumeration, i.e. an accretion vector with no ratchet on it, defeating the bound rather
  than joining it.
- **Persist the outcome (a store row).** Rejected — ADR-002 decision 6 and ADR-004 decision 5 both
  forbid it, and correctly: a failed spawn registers no session, so there is no record to attach one to,
  and a durable row for a transient answer would need its own reaper, its own schema and its own
  authority question ("who may write another node's outcome?").
- **Read the ack out of `onFrameSkipped`.** Rejected — it is a diagnostic channel that receives
  `{ code, nodeId, workspaceId, kind }` and **not the frame**, so `sessionId`, `ok` and `code` are all
  already gone by the time it fires ([control-stream-server.mjs:1258-1263](../../../../src/control-stream-server.mjs#L1258)).
  Reaching an outcome through a "this frame was refused" hook would also enshrine the refusal as
  correct behaviour.
- **Put the registry in `mesh-terminal-mirror.mjs`** (same species: fleet-face-side, in-memory,
  relay-fed, already fitness-locked read-only). Rejected — it is exactly TECH_DEBT item 10's third named
  shape, NAME DRIFT: `board-worker-stream.mjs` became the node's shared cache-read module while still
  named for one face, and the register says so. A spawn outcome is not a terminal mirror.
- **Put the registry in `mesh-session-spawn-directive.mjs`** (the lane's own home; would avoid a new
  file against an open flat-root debt item). Rejected on the graph: that module has **0 out-edges and 6
  dependents** — a pure contract leaf whose header claims "a pure projection of its inputs — no fs, no
  clock, no network" three times. A stateful, clocked, LRU-pruned registry ends that property, and
  purity claims are load-bearing in this tree (several fitness functions assert them). Saving one file
  by falsifying a checked claim is the wrong trade; the file-count cost is registered debt with a
  scheduled fix.

**On the producer fact (decision 8):**

- **Let the browser infer `producer-known` from "no work item ⇒ a launched session".** Rejected, and it
  is the option a build reaches for first because it needs no wire change at all. It is a guess about a
  process on another machine — the exact class of assertion `streaming` beat `running` for refusing to
  make ([feed-axis.mjs:12-18](../../../../ui/src/home/feed-axis.mjs#L12)) — and it is wrong for the
  population that motivated `no-producer` in the first place: a hook-registered `claude` an operator
  started by hand on a worker also has no work item, and nothing relays it. The guess would light up
  every one of those panes with a socket that never delivers a byte.
- **Infer it from the arrival of bytes.** Rejected and structurally impossible by design: `feedAxisFor`
  has no byte parameter and gaining one is gated, because the browser writes those bytes straight into
  xterm and a worker's own PTY output could then FORGE its pane's state by printing it.
- **Name the producer (`producer: "launcher" | "assignment"`) instead of a boolean.** Rejected — richer
  for diagnostics, but it hands any future build the means to mark a launched session, which is SPEC's
  named anti-goal and DESIGN §S4's explicit GAP. Diagnostics have the daemon log and the ack lane; the
  wire's job here is to make a distinction *impossible*, not available.
- **Derive the fact control-side** (join the session index against "which nodes have a spawn handler
  registered"). Rejected — it is inference wearing a server-side coat, it invents a second authority over
  a per-node fact, and it is wrong the moment a worker's bridge dies while its record lives.
- **Edit `mesh-worker-execution.mjs` so assignment sessions also state `relaying: true`, making the
  derivation a single field.** Cleaner on paper — one positive statement instead of a disjunction.
  Rejected: that module has **47 dependents**, ADR-003 and this milestone's own constraint keep it
  untouched, and the `workItem` branch is not wrong — it is a positive statement that still holds. Worth
  doing later as a simplification, when the module is being opened for another reason; recorded as the
  reason the derivation is a disjunction rather than a mystery for the next reader.

### Consequences

- **The three SPEC failure modes each reach the operator with their own code**, plus the fourth the
  control synthesises. The vocabulary, reconciled against DESIGN §The failure map: `session-repo-unavailable`,
  `session-already-active`, `session-worktree-failed`, `session-spawn-failed` (worker, post-200, on the
  lane); `session-target-not-connected` (control — **the same code on both phases**, minted pre-200 by
  the route's presence check and synthesised post-200 by decision 3, deliberately so DESIGN's map needs
  no new row and the operator reads the same true sentence whichever phase caught it);
  `spawn-outcome-lane-unavailable` (the lane itself, decision 6); plus the pre-200 route codes —
  ADR-001 decision 3's set, ADR-006 decision 5's `session-dispatch-unavailable`, and the two DESIGN
  measured on the shipped route that no earlier ADR enumerated: **`session-dispatch-failed` (503, the
  relay hand-off threw — nothing crossed) and `session-route-failed` (500, the route's own catch-all).**
  Both are reachable and both are now on the record.
- **A launched session's pane is `producer-known`, subscribable and typeable** — SPEC's "like any other
  session" — and the two populations remain indistinguishable to any renderer, because the wire carries
  a boolean and not a name.
- **Three frozen projections gain one key each** (`assembleSessionRecord`, `readLiveSessions`,
  `buildSessionIndex`), each by APPEND under the ADR that froze it. A fourth (`safeSessionArray`) is
  deliberately unchanged. Story 03's locked
  `01_session-registration-lifecycle.feature` scenario reads "**the record contains** { …seven keys }" —
  *contains*, not *is exactly* — so an additive eighth key satisfies the locked contract as written; only
  the derived test's key-count assertion moves, which is a test edit and not a feature edit.
- **A live false diagnostic is removed.** After FF-A, a `session-spawn-ack` no longer reaches
  `applyStreamFrame`, so the daemon log stops claiming a workspace-descriptor failure that never
  happened.
- **`mesh-worker-execution.mjs` (47 dependents) is still untouched**, as is `mesh-relay.mjs`. The
  DOWN-direction router keeps its closed three-kind guard.
- **No process-topology change, no new transport, no new IPC, no second relay subscriber.** The
  production composition root `commands/mesh-ui.mjs` needs no edit.
- **The fleet face keeps its posture**: zero fs write, zero shell-out, write allowlist unchanged at
  `{assign, session}`. Its route table grows 4 → 5, all five enumerated by name in four detectors.
- **`control-stream-server.mjs` (39 dependents) gains ~8 lines** whose default is a no-op, so every one
  of those 39 is byte-identical without change.

#### Codebase health — measured, and routed

Two degradations found while grounding this ADR. Neither is caused by ADR-008 alone; both are trend
lines this diff sits on, and both belong to **TECH_DEBT item 10**, which already names the fix
("Give `src/` interior directories and a ratchet"). Recorded here with the measurement so item 10's
table can be brought current; **neither fits this milestone** (a `src/mesh/` grouping moves ~100 import
sites and every arch test that greps a module by path).

| Signal | m43/04 | m45 | m46/47 | **m50 (worktree)** | with ADR-008 |
|---|---:|---:|---:|---:|---:|
| `src/` root-level `.mjs` | 106 | 108 | 109 | **111** | **112** |
| `src/mesh-launcher.mjs` out-edges | 30 | — | — | **38** | **38** |
| `src/mesh-ui-serve.mjs` lines | — | — | — | **1,233** | ~1,270 → **1,340 delivered** (estimate low ~2.3×) |

- **`src/` root is at 112 and there is no gate.** m50 alone is +3 from m47's recorded 109 — the largest
  single-milestone jump since 43/03. The sharper finding: `acd-ui-directory-budget.test.mjs:30-34`
  justifies the *ui* file-count ratchet by asserting "the `src/` half of this codebase already meters
  exactly that", citing a milestone ARCHITECTURE health table. **It is not a gate.** `src/` root is
  metered only by hand-written tables in m43/m45/m46/m47 ARCHITECTURE docs that nobody re-runs, and
  m48/m49/m50 did not write one — which is why 109 → 112 happened unremarked. The fix is item 10's own:
  extend `acd-ui-directory-budget`'s model (a NAMED table, per-entry ceiling, allowance 0, both-directions
  sweep) to `src/`. **Deliberately NOT taken in story 04**: authoring the ratchet in the same diff that
  raises the number to 112 sets the ceiling at the growth it was meant to question — precisely the
  "ratchet that RATIFIES it" trap that test's own header names (49/ARCHITECTURE bad cut 4). It wants its
  own chore, with the baseline set after this milestone lands.
- **`mesh-launcher.mjs` is at 38 out-edges, up from item 10's recorded 30 (+27%).** ADR-008 makes it 39:
  it needs `buildSessionSpawnAckEnvelope` from the lane's home, which the launcher does not yet import.
  Accepted deliberately — the alternative is inlining the envelope literal at the wiring site, i.e. a
  second home for a frozen wire shape, which is the drift the one-literal-one-home rule exists to stop.
  A composition root's out-degree is what a composition root is; but **every new lane costs it +1**, and
  that is the trend item 10 should record rather than this ADR re-arguing per lane.
- **`mesh-ui-serve.mjs` is 1,233 lines and story 02 added 266 of them.** ADR-008 adds ~35 more (one GET
  route). Cause and fix are already written up as **TECH_DEBT item 44** (the routes are a COPY, not a
  shape, and three fitness functions require the duplication). ADR-008's route is shaped so it adds
  **zero** instances of item 44's five duplicated blocks, and FF-D asserts that structurally rather than
  trusting it. Item 44's own deadline — "before a fourth **write** route" — is not reached here; the
  write count stays two.
- **`ui/src/home/` goes 15 → 18 files (+20%), and `ui/src` is at its ceiling across the board**
  (TECH_DEBT items 28, 33). Unlike the `src/` root, this one **is** gated — `acd-ui-directory-budget`,
  allowance 0 — so the growth is a decision with an argument (decision 10) rather than a diff, which is
  exactly the outcome that ratchet was built for. It is working: this is the first raise in the tree
  that was argued in an ADR before the files existed. Recorded as a health measurement, not a debt
  entry, because the mechanism that should have caught it did.

### Story 04 scope

Buildable as ONE story. Three lanes, each additive, with **two clean boundaries**: the ROUTE separates
the ack lane from the affordance, and the WIRE FIELD separates the producer fact from the browser's
axis. Nothing in `ui/` knows about relays, envelopes or the process split; nothing in `src/` knows about
pickers, states or copy.

**Lane A — the ack lane (task 00), backend:**
- NEW `src/mesh-session-spawn-outcome.mjs` (~80 lines, 1 import) — the registry.
- EDIT `src/mesh-session-spawn-directive.mjs` — `buildSessionSpawnAckEnvelope` beside its sibling.
- EDIT `src/control-stream-server.mjs` — one `onSessionSpawnAck` option + one pre-`applyStreamFrame`
  branch (~8 lines).
- EDIT `src/mesh-terminal-input.mjs` — one injected `onSessionSpawnRefused` in the existing
  `result?.sent !== true` branch (~5 lines). **No new kind branch.**
- EDIT `src/mesh-launcher.mjs` — two literal wiring keys, at the two existing production call sites.
- EDIT `src/mesh-ui-serve.mjs` — construct the registry, fan-out the one subscriber, add
  `GET /api/mesh/session-outcome`, return the registry beside `terminalMirror`.
- NEW `test/arch/acd-session-spawn-ack-has-reader.test.mjs` (FF-A), NEW
  `test/arch/acd-wire-kind-has-both-ends.test.mjs` (FF-B), EDIT the four route-table detectors (FF-C)
  and `acd-mesh-ui-write-isolation` (FF-D).

**Lane B — the producer fact (task 00 as well; it is one wire change, and it is what makes lane C's
tile alive):**
- EDIT `src/mesh-session.mjs` — `assembleSessionRecord` + `startSession`/`pingSession` carry `relaying`
  (sticky on ping).
- EDIT `src/mesh-session-spawn-handler.mjs` — its two session calls pass `relaying: true`.
- EDIT `src/mesh-presence.mjs` — `readLiveSessions` appends the seventh projected key.
- EDIT `src/global-mesh-query.mjs` — `buildSessionIndex`'s entry appends the ninth key, strict-read.
- EDIT `ui/src/home/feed-axis.mjs` (+ its `.d.mts`) — `workItemAxis` becomes the disjunction of decision
  8. **No new file, no new state word, no byte parameter.**
- AMEND `test/arch/acd-terminal-output-signal-source.test.mjs` (FF-E), NEW
  `test/arch/acd-session-producer-fact-survives-the-wire.test.mjs` (FF-F).
- **NOT** `src/mesh-worker-execution.mjs` (47 dependents) and **NOT** `safeSessionArray`.

**Lane C — the affordance (tasks 01-02), confined to `ui/src/home/`:**
- NEW `ui/src/home/session-launcher.mjs` + `.d.mts` — framework-free and `node:test`-drivable: DESIGN's
  eight-state machine (see the note above; the table governs, not the heading), the two deadlines derived from `HOME_POLL_MS`, the fourteen-row code→language
  map, and the derived-not-remembered selection resolution.
- NEW `ui/src/home/SessionLauncher.tsx` — the trigger + panel, mounted from `Home.tsx`'s existing
  `<SurfaceSlot>` contribution.
- EDIT `ui/src/home/Home.tsx` — the mount and the POST/outcome calls (or `page-state.mjs` for the two
  route paths, beside `HOME_STATUS_PATH`).
- EDIT `test/arch/acd-ui-directory-budget.test.mjs` — `ui/src/home/` 15 → 18 with decision 10's argument
  in its `why`, set AT the delivered count.
- **`ui/src/home/` may import NOTHING from `ui/src/fleet/`** (49/ADR-001, gated). Every constant it needs
  from that surface is declared locally with the duplication named — the idiom `HOME_POLL_MS` already
  follows.

**The two boundaries, stated so they cannot blur:**

1. **The backend answers `{ state, code }` and nothing else** — no sentences, no severity, no display
   text. The UI owns every word and holds no knowledge of how an outcome arrived. A coded refusal the UI
   has no mapping for must still render its code with a generic sentence rather than vanish (DESIGN
   §DG-50-3 rule 4) — the affordance never has an unhandled branch.
2. **The wire states `relaying`; the browser names `producer-known`.** Neither vocabulary crosses. `src/`
   never learns what a feed axis is; `feed-axis.mjs` never learns what a launcher is.

**Note for task authoring:** the two locked story-03 features are untouched — the record scenario says
"contains", and `02_pty-output-bridging.feature`'s third `sendTerminalFrame` call site is what FF-E's
raise sanctions rather than contradicts. Story 04's STORY.md Context bullet naming `ui/src/fleet/` as
the surface is an error DESIGN already flagged; it is the PO's to correct, and decision 10 is what the
build follows.
