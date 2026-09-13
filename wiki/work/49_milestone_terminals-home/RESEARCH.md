# 49 · Research

## Q1 — What is in the grid? Which live sessions reach the index, and is each one openable?

### Who writes a presence session record

`startSession`/`pingSession` (`src/mesh-session.mjs:314,332`) are the sole writers of a
`sessions/<node>~<workspace>~<assistant>~<session>.json` record. Grepping `src/` for every
caller of both finds exactly one production call site: `src/commands/mesh-session.mjs:318,323`,
which is `meshSessionCommand` — the `aof session start|ping|end` CLI verb (`src/cli.mjs:117-118`
routes `command === "session"` here; the module lives at `src/commands/mesh-session.mjs`, not
under a `mesh` subcommand — spike 44's phrase "the `aof mesh session` CLI verb" is a naming
imprecision worth correcting). Nothing in `src/mesh-worker-execution.mjs` or `src/mesh-launcher.mjs`
calls `startSession`/`pingSession` (grepped, zero hits) — the worker never writes a presence
session record directly.

**Board PTYs write to a completely different, unrelated store.** `serveBoard({ recordSessions =
true })` (`src/board-serve.mjs:60`) threads that flag into `attachTerminalWebSocket`
(`src/terminal-ws.mjs:206`), which — when true — calls `registerSession`/`unregisterSession`
(`src/terminal-ws.mjs:544,547`) from `src/terminal-sessions.mjs`. That module persists to
`.aof/terminal-sessions.json` (`src/terminal-sessions.mjs:18`), an **operational pid registry**
("lets the host inspect, clean up, or 'open in terminal' a running session", `terminal-sessions.mjs:1-11`)
— it is not read by `readLiveSessions`/`buildSessionIndex` and carries no `(nodeId, sessionId)`
tuple. A fleet-launched board is handed `recordSessions: false` explicitly
(`src/mesh-ui-serve.mjs:851`), so even this unrelated registry is off for a fleet drill-in board;
a standalone `aof work ui` board defaults it on. Either way, **a board-spawned PTY never calls
`startSession`/`pingSession`**, so opening a board terminal produces *zero* presence-index
entries by itself.

**So whether ANY session gets a presence record is decided entirely by a Claude-Code/Codex hook,
not by who spawned the terminal.** `startSession`/`pingSession` are reached only through `aof
session start|ping|end`, and that CLI verb fires only when a `SessionStart`/`UserPromptSubmit`/
`SessionEnd` hook is wired in the **cwd's own hook config** for that assistant. Checked at
source:

- The distributed bundle (`src/bundle/bundle.json:12-16`) ships `SessionStart`/`UserPromptSubmit`/
  `SessionEnd` hooks calling `aof session start|ping` **only for `runtimes: ["codex"]`**
  (`hooks/codex-session-start.json`, `hooks/codex-session-prompt-ping.json`,
  `hooks/codex-session-stop-ping.json`). There is **no equivalent bundled hook for
  `runtimes: ["claude"]"`** — the only claude-runtime hook member is `claude-artifact-sync`
  (`PostToolUse`, unrelated to session presence).
- This repo's own `.claude/settings.json:2-35` — hand-authored, not part of the installed bundle
  — wires `SessionStart`/`UserPromptSubmit`/`SessionEnd` → `aof session start|ping|end` for
  Claude Code, and has done so since the very first mesh commit (`git log --follow
  .claude/settings.json` → `15e0a92`, 2026-07-26, predating spike 44's 2026-08-02 measurement).
  This is a **dogfooding artefact of the aof repo itself**, not something `aof work init` or the
  bundle installer gives to a target workspace.
- `mesh-worker-execution.mjs` spawns `claude` with `["--permission-mode","auto",
  "--append-system-prompt", WORKER_SESSION_INSTRUCTION]` (`src/mesh-worker-execution.mjs:1412`) —
  no `--settings` override, no injected hook config. Whatever hooks fire are whatever the
  checked-out **worktree's own** `.claude/settings.json` carries.

**Consequence, stated plainly:** a Claude Code session — board PTY, worker assignment, or an
operator's hand-run `claude` — gets a presence record **iff** the workspace it runs in happens to
carry the Claude session hooks. The standard aof bundle gives that to Codex sessions only. This
repo gets it for Claude too, because it is hand-configured, which is why spike 44's casual framing
("written only by the CLI verb") reads as narrower than it is: the CLI verb is the sole *producer*,
but hook wiring — not process origin — is what decides whether it is ever *called*.

### Live measurement

`aof mesh status --json` (read-only; the `mesh:status` command, `src/commands/mesh-identity.mjs:225`)
was run on this control node. All three roster nodes report `"sessions": []` in their raw
`presence` object right now:

```
umamis-mac-mini: activeRuns: ["20260727T154604663Z-0025"], sessions: []
umamis-msi-wsl:  activeRuns: [],                            sessions: []
umamis-msi:      activeRuns: ["20260808T170931867Z-0000"],  sessions: []   (this control node)
```

Two nodes have a **non-empty `activeRuns`** and an **empty `sessions[]`** simultaneously —
live, direct confirmation that a worker's live run does not, by itself, produce a presence
session record. `buildSessionIndex` (`src/global-mesh-query.mjs:197`) reads exactly
`node.presence?.sessions` per node (`:272`); since every node's array is empty, the computed
`sessions[]` served on `/api/mesh/status` would currently be **empty** too. I could not reach
`/api/mesh/status` directly — `curl -v http://127.0.0.1:4181/...` and `:4182` both return
`Connection refused` (no fleet/control daemon is running on this machine right now, and I did not
start one, per the rules of engagement) — so this is inferred from the CLI's identical input data,
not measured on the live HTTP route itself. Flagged explicitly as a gap: the exact top-level
`sessions[]` JSON shape on `/api/mesh/status` was not observed live, only its documented shape
(`ui/src/fleet/api.ts:219-228`) and its inputs.

### Addressability: which sources can open which class of session

The frozen two-row table (`ui/src/terminal/source-table.mjs:63-90`) is:

| kind | params | what it addresses |
|---|---|---|
| `local-pty` | `ref`, `provider`, against `originRole: "self"` (a board origin) | a board server's own PTY |
| `mirror` | `nodeId`, `sessionId`, against `originRole: "fleet"` | a relayed terminal-frame stream |

`MeshSession` (`ui/src/fleet/api.ts:219-228`) carries `nodeId`+`sessionId` and nothing else
addressing-shaped — no `ref`, `provider`, or board origin. So **the session index can only ever
be resolved against the `mirror` row**, never `local-pty` — a `local-pty` pane is opened from
board/work-item context (a `ref`), not from a session-index entry at all.

But holding the `(nodeId, sessionId)` tuple `mirror` needs is **necessary, not sufficient**.
Grepping every caller of `worker-stream-client.mjs`'s `sendTerminalFrame` — the only function
that ever feeds the relay `createTerminalMirror` (`src/mesh-terminal-mirror.mjs`) consumes —
finds exactly two call sites, both inside `src/mesh-launcher.mjs`'s **worker** role branch:
`onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(...)` at `:1151` (the assignment
execution driver) and `:1290` (`aof mesh terminal-resume`'s handler). **A board-hosted PTY
(`terminal-ws.mjs`) never calls this** — its `term.onData` goes straight to its own same-origin
`/ws/terminal` socket (`terminal-ws.mjs:567-573`) and nowhere else. So even a session that *did*
land in the addressable index with a real `sessionId` — e.g. an operator's hand-run `claude` in a
hook-wired workspace, or a board PTY in this repo's own dogfood setup — opens a `mirror` socket
that will **never receive a byte**, because nothing feeds the relay for that tuple; it is honestly
stuck at `waiting` forever, not broken, just never fed. **Today, a `mirror` pane can only ever
actually stream for a session that is simultaneously a worker's assignment (or terminal-resume)
execution** — i.e. one that also carries a non-null `workItem`.

This is the "first-class outcome the grid must render honestly" the milestone brief names, made
concrete: (a) an anonymous session (`sessionId: null`) is **excluded from the addressable index
entirely** by construction (`global-mesh-query.mjs:280`, `typeof sessionId !== "string" ...
continue`) while staying visible in the raw `presence.sessions[]`; and (b) a *named*,
addressable, workItem-less "free" session can be in the index with a resolvable `(nodeId,
sessionId)` and still have no producer that will ever feed it a byte over `mirror` — and no
`ref`/`provider`/board-origin on the entry to try `local-pty` instead.

## Q2 — Where does "agent state" come from? Is there a producer, or must it be invented?

### The vocabularies that exist today, and what each actually means

- **The connection ramp** (`ui/src/terminal/state-ramp.mjs:57-65`) — SEVEN states plus `unknown`:
  `idle · connecting · waiting · streaming · ended · error · unavailable`. This is explicitly a
  **transport** fact: `streaming` "names what a browser can OBSERVE (bytes on an open socket)"
  (`state-ramp.mjs:22-23`), never a claim about what the far-end process is doing.
- **The assignment lifecycle chip** (`ui/src/fleet/assignments.mjs:35-41`) —
  `assigned · accepted · running · done · failed` (+`reclaimed`/`withdrawn`/`unknown`
  degrades). This is dispatch-lifecycle state, not agent-content state: `running` means "the
  worker holds the assignment", not "the agent is unblocked right now".
- **Run state** (`ui/src/fleet/runs.mjs:78-114`, `fleetCurrentWorkLines`) — `working`/`idle` at
  node granularity, derived from `activeRuns`/`sessions[].workspaceHasRun`. Also not an
  agent-content signal — it says a run exists, not what it is doing.
- **The session record's own fields** — the frozen six (`sessionId, workspaceId, repo, assistant,
  lastPingAt, workspaceHasRun`) plus the index's derived `workItem` (`ui/src/fleet/api.ts:40-47,
  219-228`). None of the six, nor `workItem`, carries any agent-behaviour fact.

**None of these can be derived into blocked/working/done for a free session** (no assignment).
`assignmentChip` reads only `.state`/`.reclaimedAt` off an assignment row
(`assignments.mjs:68-69`) — a free session has no assignment row to read at all. There is no
fallback derivation anywhere in `src/` or `ui/src/` that infers behavioural state from the six
session fields; I searched and found none. **This is not "derive it" — it is "there is nothing to
derive it from" for a free session.**

### A real "waiting for human" signal exists — but it is assignment-scoped and not on the wire

`src/mesh-worker-execution.mjs` has a full, shipped `needs-input` outcome (m42, "interactive
worker terminals"): an explicit `NEEDS_INPUT_SENTINEL` observed in the session's own PTY output,
or an unanswered `tool_use` call naming a human-input tool, yields `{ outcome: "needs-input" }`
(`:90, :1124, :1186, :1201`), reported live via `sendAssignmentStatus(assignmentId, "running",
{ code: "needs-input" })` while the assignment stays `running` (`:2654, :2702, :3148, :3158`).
This is a genuine "the agent is blocked on a person" fact, already produced in production.

It is carried on the assignment record's `code` column (`src/assignment-record.mjs:114-116`,
added m42: `"the status-refinement code (needs-input)"`) and surfaces through the **shared** row
mapper `mapAssignmentRow` (`assignment-record.mjs:100-118`), which every reader — including
`shapeGlobalStatus` — uses. But the **fleet's wire projection drops it**: `projectAssignment`
(`src/global-mesh-query.mjs:132-148`) copies exactly eight fields
(`assignmentId, state, targetNodeId, issuer, runId, assignedAt, updatedAt, reclaimedAt`) plus an
optional `sessionId` — `code` is not among them. Confirmed no reader in `ui/src` ever sees it:
`grep -rn "needs-input" ui/src` returns nothing, and `WorkAssignment` in `ui/src/fleet/api.ts:116-126`
has no `code` field. **The fact exists, is captured, and is already flowing through the shared
mapper — it is dropped at exactly one hop (`projectAssignment`) before the wire.** This is a
closed, additive gap (one more field through one function + the type), not a "build a new
producer" problem — but it only ever applies to assignment-scoped sessions; a free session has no
assignment record to carry a `code` at all, so it has *no* existing "blocked" signal, invented or
otherwise.

### The hard constraint: client-side content-sniffing is a fitness-gated violation

`sourceCarriesControlFrames` (`ui/src/terminal/source-table.mjs:135-137`) returns `false` for
`mirror` (`resizeControlFrame: null`, `:80`) — the mirror lane carries **no** control envelope at
all, by design, and the reasoning is stated in terms at `source-table.mjs:126-134`: *"the browser
writes these bytes STRAIGHT into xterm, so sniffing control content out of terminal bytes would
turn a dumb painter into a parser"* and *"a worker's own PTY output could otherwise FORGE one"*.
The same rule is repeated at the server route: `mesh-ui-serve.mjs:718-722`, closing the
`/ws/terminal-view` end-of-stream handling — a transport close, never an in-band marker, "because
… the browser writes these bytes STRAIGHT into xterm". On the input side, the fitness function
`test/arch/acd-fleet-terminal-input-constrained.test.mjs:214-218` fails CI on any
`JSON.parse`/content-branch in the mirror's message handler: *"the message handler JSON.parses the
browser message — the input lane must be CONTENT-BLIND"*. These gates are about the input
direction structurally, but the *design rationale* they encode — "a dumb painter, never a parser,
over the mirror lane's bytes" — applies with equal force to the output direction a pane would have
to sniff to infer state from PTY bytes. **Inferring agent state by parsing terminal output bytes
in the browser is exactly the shape these gates and their stated rationale exist to forbid.**
"Agent state" must therefore come from a **new producer-side fact** (or, for `needs-input`
specifically, one additive wire hop on an existing one) — never from client-side content
inspection.

## Q3 — How many live sockets can the grid hold, and what is the real ceiling?

### Browser limits — MEASURED, and the first-pass answer was wrong

<!-- CORRECTED AT SOURCE by the PO at refine, 2026-08-13, in the same discipline spike 44 applied to
     its own framing. The first pass of this section reported "~6 concurrent WebSocket connections per
     origin" as best-available secondary web evidence and built the ceiling recommendation on it. That
     number is the HTTP/1.1 per-host connection cap; it does NOT govern WebSocket upgrades. A grid
     capped at 6 live panes by the browser is a fundamentally different product from one capped by
     readability, so the premise was measured rather than inherited. The measurement is below; the
     original claim is kept struck through rather than deleted, because the correction is the useful
     part. -->

**~~Chromium enforces roughly 6 concurrent WebSocket connections per origin.~~ FALSE — measured
2026-08-13: one Chromium page holds 255 concurrent WebSockets to ONE origin.**

A throwaway probe (scratchpad, not committed) stood up a real `http.createServer` +
`ws.WebSocketServer` on an ephemeral 127.0.0.1 port and served a page that opened **300** sockets to
its own origin, then dumped the DOM from headless Chromium (`chromium-1187`, the repo's cached
Playwright build). Measured, verbatim:

```
page:   {"N":300,"open":255,"err":45,"closed":45}
server: accepted=255 concurrent=255 peak=255
```

**255 open, 45 refused (300 − 255), and the server independently confirms 255 concurrent upgrades.**
That is Chromium's `kMaxWebSocketsPerHost`, and it is a **per-host** limit — the same 255 the
`gorilla/websocket` issue observes as `ERR_INSUFFICIENT_RESOURCES`, not a separate "global per
renderer" number. Firefox's equivalent is `network.websocket.max-connections`, default 200.

A methodology note worth keeping, because it produced a convincing wrong answer first: the initial
run used `--virtual-time-budget=12000` and reported `{"open":0,"err":45}`. Virtual time fast-forwards
the page's clock while real network still takes real time, so the page was torn down before a single
upgrade completed — an artefact of the harness that reads exactly like a hard browser limit of zero.
The working probe delays the **load event** instead (a trailing `<script src="/slow.js">` the server
holds for 10s) and lets `--dump-dom` wait for it.

**What this means for the ceiling.** Every `mirror` pane dials the SAME fleet origin
(`/ws/terminal-view`), so the grid's binding constraint is the per-host 255 — roughly two orders of
magnitude above any grid an operator would read. **The browser is not the wall.** The real ceilings
are the ones below: xterm.js is main-thread bound and this control is committed to the *DOM* renderer
by m46/ADR-003, and the server has no cap, no backpressure and a 64-tuple replay-tail bound. So the
bounded live-socket count SPEC asks for is a **product/performance policy**, deliberately chosen and
enforced client-side — not a number the platform hands us.
Sources: measurement above (primary); [WebSocket.org — Connection Limits](https://websocket.org/guides/connection-limits/),
[gorilla/websocket#477](https://github.com/gorilla/websocket/issues/477) (secondary, for the Firefox
figure and the `ERR_INSUFFICIENT_RESOURCES` corroboration).

### Server side (measured at source)

`createTerminalMirror` (`src/mesh-terminal-mirror.mjs:76-224`) is a plain `Map<routingKey,
Set<listener>>` closure — a browser subscription costs one `Set` entry, not a socket, on the
mirror's own bookkeeping. The **actual OS socket cost** is the `/ws/terminal-view` WebSocket
upgrade itself: `mesh-ui-serve.mjs:672-706` creates ONE `WebSocketServer({ noServer: true })` and
accepts every valid `(nodeId, sessionId)` upgrade with **no admission cap, no per-connection
buffer beyond the `ws` library's own, and no backpressure check** — `ws.send(bytes)` at
`mesh-ui-serve.mjs:735` is called unconditionally, with no `bufferedAmount` gate. I grepped the
whole tree for `maxSockets|MAX_SOCKETS|maxPanes|MAX_PANES|maxLiveSockets|concurrentSockets` —
**zero hits** — there is no existing ceiling anywhere in `src/` or `ui/src/` today. The mirror's
only bound is on its own **memory**, not connection count: `MAX_TAIL_BYTES_PER_KEY = 256 * 1024`
and `MAX_TAIL_KEYS = 64` (`mesh-terminal-mirror.mjs:58-59`, worst case ≈16 MB of replay tail) — a
control node that has relayed 65+ distinct `(nodeId, sessionId)` tuples starts LRU-evicting
scrollback, which is a data-loss bound, not a socket-count bound. The relay's own per-frame
ceiling is `DEFAULT_MAX_FRAME_BYTES = 1048576` (`src/mesh-relay.mjs:66`, 1 MiB) — irrelevant to
socket count, relevant only to a single frame's size. The `local-pty` lane (`terminal-ws.mjs`) is
per-board-server and per-workspace, with the same "no explicit cap" shape.

### xterm.js per-instance cost

Not directly measured (no browser harness in this repo — `test/support/*-app-harness.mjs` all
stub the terminal control out by module path specifically because it "wants a real DOM",
`ARCHITECTURE.md` ADR-001 context). Best-available, web-sourced: xterm.js is **"100% main thread
bound"** — every terminal instance's writes and repaints compete for the same single JS thread, so
many *actively streaming* instances on one page contend directly rather than parallelising. The
project's own canvas-renderer migration (v3.0.0) measured a **5×–45× speedup over the DOM
renderer**. That matters directly here because `ARCHITECTURE.md` ADR-003 (m46) **forbids** loading
a canvas/webgl addon for this control — "no canvas/webgl addon may be loaded, because `scale`
depends on the DOM renderer scaling crisply in both directions" (`geometry.mjs:14-17`) — so every
pane in this grid is committed to the *slower* of the two renderers by an already-shipped
architectural decision, which lowers the practical per-page ceiling versus what xterm.js can do at
best. At the mirror's fixed `80×24` (`WORKER_TERMINAL_COLS`/`ROWS`, `source-table.mjs:48-49`), each
live pane holds 1,920 character cells' worth of DOM under the DOM renderer, CSS-scaled to fit the
tile — a fixed, small-but-nonzero per-pane DOM budget that does not shrink with tile size.
Sources: [xterm.js Performance testing wiki](https://github.com/xtermjs/xterm.js/wiki/Performance-testing),
[xterm.js#1360 — DOM renderer fallback](https://github.com/xtermjs/xterm.js/issues/1360).

### What is measurable vs. best-available, summarised

| fact | status |
|---|---|
| No existing socket-count cap anywhere in `src`/`ui/src` | measured (grep, zero hits) |
| Mirror server cost is O(subscribers) as `Set` entries, not sockets, on the mirror's own bookkeeping | measured at source |
| No backpressure/`bufferedAmount` check on `ws.send` in the terminal-view route | measured at source |
| Mirror memory bound: ≈16 MB worst case across 64 tuples | measured at source (constants) |
| **Chromium holds 255 concurrent WebSockets to ONE origin; the 256th is refused** | **MEASURED** (headless probe, 2026-08-13 — page `open:255/err:45`, server `peak=255`) |
| ~~Chromium ~6 WS/origin~~ | **FALSIFIED** — that is the HTTP/1.1 per-host cap and does not govern WebSocket upgrades |
| xterm.js main-thread-bound; DOM renderer 5–45× slower than canvas | best-available (web) |
| Exact per-pane DOM node count / memory in this repo's build | **not measured** — no browser harness exists here |

**The browser is not the wall, so the ceiling is a policy.** At 255 per origin the platform is ~two
orders of magnitude above any grid an operator would read, so a defensible default ceiling — reasoning
only, not a decision — has to be argued from the three constraints that ARE binding: xterm.js is
main-thread bound and this control is pinned to the *DOM* renderer by m46/ADR-003, so N actively
streaming panes contend on one thread; the mirror LRU-evicts scrollback past `MAX_TAIL_KEYS = 64`
tuples; and the server has no cap, no `bufferedAmount` gate and no backpressure, so nothing upstream
will refuse for you. That makes the count a **client-enforced product policy** whose number should be
justified by readability and main-thread cost, and it must NOT be justified by a browser limit — there
isn't one in the range that matters.

## Q4 — What does a pane need that is not on the wire today?

SPEC's pane fields against `MeshSession` (`ui/src/fleet/api.ts:219-228`):

| SPEC field | on `MeshSession` today? | where it would come from |
|---|---|---|
| node | `nodeId` only (a bare id, no host/os) | join against `GlobalNode[]` (`api.ts:164-185`) by `nodeId` — already on the same payload |
| repo | yes (`repo`) | — |
| work item (when there is one) | `workItem: { ref, assignmentId } \| null` | title/status need a further join against `items[]` (`GlobalWorkItem`) by `ref` — by design (`api.ts:214-218`: "the item's own title and status stay reachable from `items[]`") |
| agent state | **absent entirely** | see Q2 — a new/additive producer field, not derivable client-side |
| live terminal (the socket) | `(nodeId, sessionId)` only | sufficient for `mirror` **only when** the session is also a worker execution (Q1); no field addresses `local-pty` at all |

### The board-origin field spike 44 asked for: did it ship?

**No — confirmed false at source, correcting a stale premise in this milestone's own dependency
chain.** `GET /api/mesh/board-url` (`src/mesh-ui-serve.mjs:310-362`) resolves the workspace,
guards `workspace-not-local` (`:348-351` — this guard DID ship, closing spike 44 sub-question 5's
gap #1, apparently in m47/ADR-011 per the code comment at `:329-347`, ahead of m49), then responds
`sendJson(response, 200, { url, workspaceId, ref: ref || null })` at **exactly line 358** — three
fields, no `origin`. `BoardUrlResponse` (`ui/src/fleet/api.ts:263-267`) types precisely those
three and nothing else. `ARCHITECTURE.md`'s own AMENDMENT note (m46, dated 2026-08-08) confirms
this in terms: the board-origin *reverse* direction (fleet → board, `GET /api/fleet-origin` on
`setup-ui.mjs`) shipped in m46/story 02, but the *forward* direction this milestone needs (board →
fleet, an additive `origin` on `board-url`'s JSON body) is explicitly unbuilt — "m49's job, not
built here" (`ARCHITECTURE.md` table under ADR-004's context note). **A terminals-home pane would
today have to `new URL(response.url).origin`-parse a navigation URL to get a board's origin** —
precisely the antipattern spike 44 asked m46 to avoid ("a socket consumer would have to
string-parse an origin out of a URL built for navigation"). This work is still entirely ahead of
m49; it did not land as an inherited free lunch.

### Poll cadence and payload viability

`Fleet.tsx` polls the whole `/api/mesh/status` payload every `POLL_MS = 5000` ms
(`ui/src/fleet/assign-affordance.mjs:54`, consumed at `Fleet.tsx:462`) — a full re-fetch of
`{ workspaces, items, nodes, sessions, diagnostics }`, not a delta and not scoped to sessions
only; `items[]` carries every work item across every workspace on the machine regardless of
whether any pane cares about it. This 5 s cadence is a reasonable driver for pane **metadata**
(who exists, what work item, presence liveness) but is far too coarse to drive live typing/output
— that already rides the dedicated per-pane `/ws/terminal-view`/`/ws/terminal` sockets, entirely
independent of this poll. Not measured: actual payload byte size on a real multi-workspace fleet
(no live daemon was available to sample against, per the rules of engagement).

## Q5 — The m48 gap m49 inherits: the deduplicated repo name on the `(session)` line

### The mechanism, precisely

`fleetCurrentWorkLines` (`ui/src/fleet/runs.mjs:99-106`) maps every session whose
`workspaceHasRun !== true` to its `repo`, filters blanks, **sorts but does not deduplicate**, and
joins: `working · <repo>[, <repo>…] (session)`. For two live sessions in the same repo today this
renders `working · demo, demo (session)` — pinned as the exact, current, intentional behaviour by
`test/mesh-fleet-session-subsumption-render.test.mjs:115-127` ("ROW 6 — TODAY'S EXACT OUTPUT for
two same-repo sessions, pinned as-is … m48/ADR-010 R4 HOLDS that behaviour explicitly"), with a
second assertion at `:143-148` stated as a *rule* rather than a string match specifically so a
future dedupe can't slip past by rewording the expectation (`line.split(", ").length ===
sessions.length`).

**The second implementation** is `current_work`/`session_repos()` in the Rust desktop core:
`app/desktop/crates/core/src/view_model.rs:200-210` (`current_work`, short-circuits to
`Running{...}` and never reads sessions at all when `activeRuns` is non-empty — a genuine,
pre-existing structural difference from the JS version's "both lines can render" behaviour, though
not the dedup question itself) calling `session_repos()` at `app/desktop/crates/core/src/status.rs:119-128`,
which likewise maps every session's repo, filters empty, and **sorts with no dedup** —
`repos.sort(); repos` (`status.rs:126-127`), matching the JS behaviour exactly for the branch both
reach.

**The pin that ties the two together byte-for-byte** is `crossSurfaceDriftViolations`
(`test/arch/acd-captured-producer-fixture.test.mjs:176-197`): for every `REAL_CAPTURED_*` Rust
fixture, it re-derives `fleetCurrentWorkLines(local.presence).lines` in JS and asserts the Rust
source text contains that exact rendered line as a quoted literal (`rustLiteral`, `:170-172`,
escaping `·` as `\u{b7}`). Confirmed live: I ran all four `archTests` in this file directly (they
are a plain exported array, not `node:test`-shaped, so a bare `node --test` on the file imports it
but runs nothing — I invoked `t.run()` for each entry under an isolated `AOF_GLOBAL_HOME`) and all
four pass, including the cross-surface agreement test, against the current tree (which carries an
**uncommitted** re-capture of the Rust fixtures, `git diff --stat
app/desktop/crates/core/src/view_model.rs` → 220 insertions, dated 2026-08-11 in its own comments
as `aof:verify 48`'s discharge of the m48 fixture-drift lane — unrelated to dedup, worth knowing
before touching that file).

### A nuance worth recording: today's fixtures don't exercise the exact duplicate-repo case

Grepping the four `REAL_CAPTURED_*` consts in `view_model.rs` (`LIVE_SESSION`, `TWO_SESSIONS`
[`aof`+`beta`], `TWO_SESSIONS_NON_ALPHA` [`pilot-app-portal`+`aof`], `SESSION_WITH_RUN`) — **none**
of them carries two sessions in the *same* repo. So `crossSurfaceDriftViolations` does not, right
now, have a captured payload that would directly trip on a same-repo dedupe. **The gate that
*would* trip immediately, deterministically, on a JS-only change is the plain JS test**
`test/mesh-fleet-session-subsumption-render.test.mjs:124-126`'s row 6, which is not
cross-language. Its own comment states the intent precisely: *"whether the line should deduplicate
is milestone 49's DESIGN question … a JS-only dedupe would fail that fitness function"* — meaning
the cross-language gate is meant to be the enforcement, and becomes actual teeth only once a
same-repo-duplicate fixture is captured and pinned on the Rust side too. **A JS-only change today
would fail the local JS pin immediately (guaranteed), and would only be caught by
`crossSurfaceDriftViolations` if a matching captured Rust fixture is added in the same change** —
which is exactly why m48's OUTCOME phrases the discharge as landing the rule "in the JS formatter
and the Rust view-model in one commit": that commit is what has to add the paired fixture, not
just edit two files independently.

## What this decides for the break-down

- **The grid's population is not "every live session" in the naive sense** — it is bounded by
  whichever workspaces happen to have Claude/Codex session hooks wired (Codex: yes, by the
  standard bundle; Claude: no, unless hand-configured like this repo). A story is needed to decide
  whether m49 accepts that gap as-is, or whether landing the missing Claude session hooks into the
  standard bundle is in scope — that is a separate producer-side decision the architect must make,
  not something the grid can paper over.
- **A "free, addressable, but never-streaming" pane state is a first-class rendering case**, not a
  bug: any session with a real `sessionId` but no `workItem` may sit at `waiting` forever because
  nothing feeds the mirror relay for it. The grid's honest-degrade story needs this case explicitly,
  distinct from `unavailable` (origin-level failure) and from a genuinely stalled worker.
- **"Agent state" needs its own story, and it splits in two**: (a) a small, additive wire change —
  thread `code`/`needs-input` through `projectAssignment` and the `WorkAssignment` type — covers
  *assignment-scoped* sessions only; (b) free sessions have no existing signal at all, and
  client-side content-sniffing to invent one is a fitness-gated violation of the mirror lane's
  content-blind design, so the architect must decide whether free-session state is out of scope for
  m49 or needs a genuinely new producer.
- **The socket ceiling is a client-side policy the architect must choose a number for, and it may
  NOT be justified by a browser limit** — measured 2026-08-13, one Chromium page holds **255**
  concurrent WebSockets to one origin (§Q3), ~two orders of magnitude above any readable grid, so
  the platform is not the wall. The server enforces no cap, no backpressure and no `bufferedAmount`
  gate at all. The binding constraints are main-thread contention (xterm.js is main-thread bound and
  m46/ADR-003 pins this control to the *DOM* renderer) and the mirror's 64-tuple replay-tail
  eviction. The number is a UX/ops call and must be argued from those.
- **The board-origin field for `local-pty` panes is unbuilt work for this milestone**, not
  inherited plumbing — `/api/mesh/board-url` still answers `{ url, workspaceId, ref }` only. A
  story must add the additive field (or an equivalent) before any `local-pty` pane can open without
  parsing a navigation URL.
- **The repo-dedup rule is a one-commit, two-surface change with a captured-fixture obligation.**
  Whoever writes that story must (a) change `fleetCurrentWorkLines`, (b) change `session_repos()`/
  `current_work()` in the Rust core, (c) update `test/mesh-fleet-session-subsumption-render.test.mjs`
  row 6's pinned expectation, and (d) add/re-capture a Rust `REAL_CAPTURED_*` fixture that actually
  exercises two-sessions-one-repo so `crossSurfaceDriftViolations` has teeth on the new rule — doing
  only the JS half fails CI immediately via the local JS pin.
