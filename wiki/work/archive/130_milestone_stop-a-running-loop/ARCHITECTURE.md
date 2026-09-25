---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — answers ONE question: what did we decide, and why?
  Owner: architect. ADRs are append-only; a superseded decision is marked, never deleted.
  Structural invariants belong here as FITNESS FUNCTIONS (the register at the foot), not in a
  task .feature — a .feature states observable behaviour over a seam, a fitness function states a
  property of the tree.
-->
# 130 · Stop a running loop — Architecture

The SPEC made the design decision — a stop is a DURABLE REQUEST in the aof home, keyed by the loop's
own `loopRunId`, that the loop polls, the verb writes, the fleet and the desktop reach, and the
supervisor reads before it relaunches. These ADRs answer the SPEC's six questions in its order and
decide HOW: which module owns the request, how `--stop` rides a command whose registered `run` is a
read-only probe, how the interrupt path stops dropping the driver's observation, how a Rust
supervisor that can only `start_kill` a direct child asks first and kills the tree last, how one
additive presence key carries the loop to a card that does not yet know which machine it is on, and
what stays frozen. They do not re-litigate the thesis. Every decision is made here; where a value is
a default it is marked DEFAULT DECISION with its reason, because contracts are authored after this
document and never re-opened for it.

## Memory recall — what was surfaced, and what it changed

`aof work memory recall … --area architecture --block`, run six times before the six ADRs (the stop
channel; the verb; the settle; the desktop; the fleet; the scope), plus the five records the
coordinator's own recall surfaced. Each honoured or departed from in writing.

- **`19/ADR-001`** (*the run has the explicit state machine queued → running → done | failed |
  cancelled*) → **HONOURED as the vocabulary.** A stopped drive settles on the `running>cancelled`
  edge the machine already has (`src/run-store.mjs:276`); no state, no reason and no store byte is
  added (ADR-003 §4).
- **`20/ADR-006`** (*dedup: a leaked non-terminal `running` row walls the next mint on that item*)
  → **HONOURED, and it is the defect this milestone closes.** 129/04's run is that leaked row today
  (SPEC). ADR-003 §3 makes the interrupt path settle before it halts, and FF-13002's fixture leg
  asserts that no run is left `running` after a stop at either rung.
- **`53/ADR-005`** (*`aof work loop` is ONE launcher-seam command whose registered `run()` is a
  promptly-returning PROBE*) → **HONOURED by shape, EXTENDED by one input.** `--stop` rides `run`,
  which stays prompt and mints nothing in the project tree; the probe leg is byte-identical and the
  write it performs is one file in the aof home. The alternative — a second `cli.launch` door — is
  rejected because no HTTP route may reach a launch body (ADR-002).
- **`53/ADR-015`** (*ONE of seven contradictions is a lossy settle in delivered code*) → **HONOURED
  as the class.** The interrupt branch at `src/commands/loop.mjs:1833-1838` is a lossy settle of the
  same species — the observation the driver returned is discarded — and is ruled here as delivered
  code to fix, not an instrument to re-aim.
- **`126/ADR-002`** (*the loop narrates in flight through the ONE injected printer*) → **HONOURED.**
  The one new in-flight line (`Cleared stop request …`, ADR-003 §6) rides `narrate`, and FF-12602's
  needle table and count move by exactly one in the story that adds it.
- **`126/ADR-004` + `126/ADR-006`** (*ONE pure decider answers which declarations should run; the
  Rust supervisor reconciles a SUPPLIED set, level-triggered, and no completion semantics cross
  into Rust*) → **HONOURED.** The "stopped" fact enters the engine as one additive, default-absent
  input (ADR-004 §4) and the producer is the only reader of the mark; the Rust side gains a pure
  ladder and no run-state knowledge — it counts presses and a grace, and forms one argv.
- **`36/ADR-002`** (*spawn + watchdog behind a kill-on-close Job Object; a bare `child.kill()`
  orphans the Node tree*) → **HONOURED, and it decides the fallback.** The hard rung is the OS tree
  kill the driver itself uses (`taskkill /PID <pid> /T /F`), never `start_kill()` on a declaration
  (ADR-004 §3).
- **`38/ADR-012` + `27/ADR-006` + `35/ADR-007`** (*the fleet face's write surface is a NAMED,
  bounded set; each route wraps a verb VERBATIM behind same-origin + json*) → **HONOURED.** The
  third write route takes assign's exact shape and calls the one verb core; and because the entry
  ledger says the second route was a COPY (item 44), the shared blocks are hoisted first, in the
  same story (ADR-005 §4).
- **`20/ADR-004`** (*liveness is `heartbeatAt` on the run record*) → **HONOURED.** The verb's `live`
  and the presence read's "which loops are in flight" are both the record's own liveness under
  `heartbeatMs`; nothing new is polled.
- **`129/ADR-007`** (*one declaration per scope; lanes are children*) → **HONOURED.** A request is
  keyed by the declaration's `loopRunId`, which every lane run carries, so one file stops a loop and
  all of its lanes.
- **`63/ADR-016`** (*what settles a loop run is the process EXIT it already has*) → **HONOURED at
  the process grain, and it explains the desktop's hazard.** A halted loop exits 0, which
  `classify_exit` reads as `stopped` with no hold and `handle_exit` turns into `desired = false` — so
  a stopped loop whose row persists is RESTARTED at the next declarations tick. That measured chain is
  why the mark must remove the row (ADR-004 §4).
- **`35/ADR-004` + `26/ADR-008`** (*node-partitioned runs; cross-node reclaim is bounded*) →
  **HONOURED as the scope boundary.** A run record whose `node` is another machine's is that
  machine's loop; the verb refuses `loop-stop-not-local` and nothing here reaches across (ADR-006).
- **`17/ADR-001` + `12/ADR-005`** (*a git-ignored sidecar keyed by aof id; `AOF_GLOBAL_HOME`
  honoured, no hard-coded home*) → **HONOURED.** The request lives beside the loop's other home-side
  files through the same `globalMeshPaths` call `loop-diag.mjs` makes (ADR-001 §1).

## Measured facts this document reasons from

Measured 2026-09-13 on the working tree at `66c30068` plus the uncommitted 127/128 work (graph
`aof graph build .`: unchanged, current at 16,752 nodes / 40,927 edges, built
`2026-09-13T12:28:11Z`, egress none). Cited as actual structure, not inference. `aof work debt <files>`
runs in this tree again (127/02's break is closed): four entries cite the subject files.

| claim | value | source |
|---|---|---|
| the shell's interrupt | `let interrupted = null` + `process.once("SIGINT"/"SIGTERM")` set it; read at the tick head and after the drive returns; the listeners are removed in `finally` | `src/commands/loop.mjs:1580-1584`, `:1607`, `:1833`, `:2219-2220` |
| the lossy settle | the post-drive interrupt branch returns BEFORE `settleDriven`; the driver's `failed/timeout` observation is dropped; 129/04's record is `running`, node `win-host-a`, `supervised: false`, last heartbeat `11:30:24Z` | `src/commands/loop.mjs:1833-1839`; `stories/04_story_the-wave-tick/runs/node-7297/20260913T110303238Z-0000.json` |
| `settleDriven`'s terminal map | `outcome === "done" ? "done" : "failed"` — `cancelled` is never produced; `drivenRow.outcome` is the driver's word | `:1178`, `:1275` |
| the driver's cancel seam | `options.signal.aborted` before spawn → `{ failed, cancelled, processStarted: false }`; an abort while live → `stopForOutcome({ failed, cancelled })` through the full bracket; the tree kill is `taskkill /PID <pid> /T /F` | `src/agent-session-driver.mjs:944`, `:1264`, `:1245` |
| how a signal reaches the in-process drive | `ctx.agentSessionDriverOptions` is spread as `baseOptions` into `driverOptions`; the launch seam sets that option ONLY when the diag recorder is installed (`AOF_LOOP_DIAG=0` leaves it absent) | `src/commands/drive.mjs:263`, `:289`; `src/commands/loop.mjs:2298` |
| the child drive's cancel channel | `spawnLaneDrive({ signal, graceMs })`, `stdin: "pipe"`, outcome `aborted` | `src/loop/child-drive.mjs:91`, `:123` |
| a halted launch body's exit code | a body that returns exits 0 — no exit adapter runs on the launch path | `src/spine/face.mjs:166-176` |
| `run` is `probeLoop`; the input schema is closed; `launch` answers `null` only for `dryRun` | | `:2256`, `:2237-2254`, `:2281` |
| what FF-5304 pins | `run({scope})` → ten keys, `driven: []`, zero spawns, no file minted or rewritten under the PROJECT root; `haltDecision(stop, ref, producer)`; no `message.includes/match`; `LOOP_STOPS` literal | `test/arch/loop/acd-loop-probe-contract.test.mjs:50-70`, `:101-113` |
| what FF-5307 pins | `src/commands/loop.mjs` contains no `writeFile(` / `mkdir(` / `rename(` call form; no `src/**/*loop*-store.mjs`; the engine has no effect source; `src/run-store.mjs`, `run-status.mjs`, `board-ui.mjs` digests; the whole `ui/` tree hashed | `test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs:100-107`, `:105-166` |
| what FF-12602 pins | exactly TEN `narrate` lines in the shell, each named; exactly THREE `await drivePhase({` sites | `test/arch/loop/acd-loop-narrates-in-flight.test.mjs:113-119`, `:127-128` |
| `decideSupervisedDeclarations` | destructures `{ maxAttempts, stalenessMs, now, isRunning, isStale, retryReadiness } = input`; skips a declaration that is null or not supervised; six-key rows; the file has 0 imports (1,578 lines now, +128 since 129's table) | `src/work/loop.mjs:1450-1535`; `acd-declaration-predicate-is-composed:71` (the destructure regex admits an appended key) |
| the declarations producer | reads run records from disk per member workspace, composes rows `{ id: loopRunId, label: "loop <scope>", argv: argvFor(route, {scope, level}, {resume: true}), cwd, scope, level, cap }`; 0 src dependents | `src/mesh/declarations.mjs:33-113`; `aof graph impact` |
| the desktop's parse | `SupervisedChild { id, label, argv, cwd }` — `scope`/`level`/`cap` are dropped; the argv is admitted only under the prefix `["work","loop"]`; `serde` derives carry no `deny_unknown_fields`, so a new presence key is ignored | `app/desktop/crates/core/src/status.rs:272-296`; `supervision.rs:32`; `grep deny_unknown_fields` → none |
| the desktop's Stop | `Stop(id)` → `hold()` + `set_desired(false)`; the watchdog breaks its wait and calls `child.start_kill()` then `wait()`; the Job Object reaps the tree only when its handle closes | `supervisor.rs:385-395`, `:656-662`, `:253-270` |
| what a clean exit does to a declaration | `classify_exit(success=true)` → `signal "stopped"`, `hold: false`; `handle_exit` stores `desired = false`; the next declarations tick's `reconcile` sees "row present, not held, not desired" → `start` | `core/src/supervision.rs:176-184`, `:264-297`; `supervisor.rs:674-691` |
| the signals map and the supplied rows | `SupervisorState.signals: BTreeMap<id, word>`; the supplied rows are read out of the same parsed document every tenth tick and applied by `apply_plan`; nothing keeps them after the tick | `supervisor.rs:77-89`, `:486-489`, `:404-440`; `core/src/poll.rs:16` |
| `get_view_model` | nodes + the two daemon signals + `notice`; no declaration rows; `stop_mesh_server`/`stop_mesh_ui` are the only Stop commands | `app/desktop/crates/app/src/main.rs:65-130` |
| `assemblePresenceRecord` callers | THREE: `heartbeat.mjs:107` (the one-shot verb), `launcher.mjs:603` (the daemon tick — the record this machine actually publishes), `global-node-registry.mjs:209` (the READ side reshapes the disk record through it, so a key it does not carry is stripped from the wire) | `grep assemblePresenceRecord(` |
| the presence key pins | NINE suites + TWO arch controls deep-equal `Object.keys(record)` to the five/six keys | `acd-active-runs-frozen-string-array:312`, `acd-captured-producer-fixture:376,422`, `mesh-presence-record:28`, `mesh-presence-additive-sessions:26`, `mesh-presence-session-entry:343`, `mesh-presence-session-wire:280,298,311`, `mesh-fleet-presence-plumbing:191`, `mesh-fabric-liveness-cutover:194`, `control-stream-server:346` |
| `buildId`'s discipline | emitted only when non-empty, appended last; a pre-stamp node's record is byte-identical | `src/mesh/presence.mjs:318-333` |
| the fleet card's "this node" | `GlobalNode` has no `local` marker; `nodePanelFacts` reads `safe.local` only on the never-mounted local shape; the status route stamps `scope` and `currentWorkspace` on the body it serves; `controlNodeId()` memoises `config.mesh.nodeId` off a `loadWorkspace` | `ui/src/fleet/api.ts:180-201`; `scope.mjs:664`; `src/mesh/ui-serve.mjs:942-943`, `:310-315` |
| where `config.mesh.nodeId` comes from here | this repo's committed config has NO `mesh.nodeId`; `loadWorkspace` HYDRATES it from the machine-wide sidecar — measured `win-host-a`, the same value on the leaked run record | `src/work.mjs:261-267`; `node -e loadWorkspace(...)` |
| `fleetCurrentWorkLines` | byte-pinned against the Rust `current_work()` literals over captured producer fixtures | `test/arch/session/acd-captured-producer-fixture.test.mjs:181-192` |
| the fleet's write surface | the route table is EXACTLY five (`assign`, `board-url`, `session`, `session-outcome`, `status`); the face imports no `commands/*` and its ONE sanctioned write door is `./assignment.mjs`'s `assignWork`, a core BELOW the command layer | `acd-mesh-ui-read-only:108-112`; `acd-mesh-ui-no-core-import:44-60` |
| the copy the ledger already names | the session route repeats 63 lines of the assign route; three detectors find the guards INSIDE each branch and would go red on a hoist; "do this BEFORE a fourth write route is added" | `wiki/work/TECH_DEBT.md` item 44 |
| `src/loop/`'s exemption | by SIZE (≤ `FLAT_LAYER_THRESHOLD` = 8), re-checked every run; the `why` names three members | `acd-source-directory-budget:585`, `:708-716` |
| test directories at ceiling | `test/loop` 72/72, `test/arch/loop` 55/55, `test/mesh/presence` 7/7, `test/mesh/ui` 11/11, `test/ui` 56/56, `test/arch/mesh` 49/49 | the table, `:256`, `:375`, `:445`, `:480`, `:536`, `:270` |
| budgets at ceiling | `src/` 92/92, `src/commands/` 68/68, `src/mesh/` 34/34, `ui/src/fleet/` 20/20; `Fleet.tsx` 1,549/1,560 | SPEC; `acd-ui-surface-file-budget` |
| the subject files | `src/commands/loop.mjs` 2,311; `src/mesh/ui-serve.mjs` 1,340; `src/mesh/presence.mjs` 470; `src/mesh/launcher.mjs` 1,918 (25 dependents); `src/mesh/declarations.mjs` 113; `Fleet.tsx` 1,549; `supervisor.rs` 745; `main.rs` 507; `supervision.rs` 865; `app.js` 358; `status.rs` 691 | `wc -l`, `aof graph impact` |
| coupling | `src/commands/loop.mjs` ← 1 src (`command-core`) / 40+ tests; `src/mesh/presence.mjs` ← 13 src / 33 tests; `src/mesh/declarations.mjs` ← 0; `src/work/loop.mjs` ← 8 src; `src/loop/child-drive.mjs` ← 0 src; `src/loop-diag.mjs` ← 1 src | `aof graph impact` |
| the live stop's cadence | presence re-published every 15 s, the fleet polls every 5 s, declarations every 30 s | DESIGN §What the surfaces receive |

---

## ADR-001 — The stop request is one file

<!-- Heading shortened at 127's accept (2026-09-16): the refine brief's architecture slice carries each declared ADR's heading, and at this milestone's heading lengths the slice was budget-truncated past the ids its stories declare (127/VERIFICATION). The original sentence is the lede below; the id and every citation are unchanged. -->

**The stop request is ONE file in the aof home, owned by `src/loop/stop-request.mjs`; its ladder is 129/04's (first drains, second cancels); its lifecycle is requested → honoured → cleared by `--resume`; and it is the producer of the ONE interrupt source the shell reads**

### Context

The shell sees an interrupt only through `process.once` flags on its own console; Windows delivers
no signal from outside; 129/04's task 06 fixes the two-rung semantics at the wave grain against an
INJECTED signal seam that does not exist yet. The loop already leaves two files in the aof home —
`<meshRoot>/logs/loop-diag.*` and 129/ADR-005 §3's `loop-fixes/<runId>.json` — and never in a
checkout. `src/` root and `src/commands/` are at ceiling; `src/loop/` is the exempt family
(`child-drive.mjs` today; 129/04 adds `wave.mjs` and `cycle.mjs`).

### Decision

1. **Home and path.** `src/loop/stop-request.mjs` exports `loopStopsDir(env = process.env)` =
   `path.join(globalMeshPaths({ env }).meshRoot, "loop-stops")` — the sibling of `logs/` and
   `loop-fixes/`, through the same call `loop-diag.mjs:57` makes, honouring `AOF_GLOBAL_HOME` —
   and `stopRequestPath(dir, loopRunId)` = `<dir>/<loopRunId>.json`. The segment literal
   `loop-stops` is spelled in this module and nowhere else under `src/`. A request is never in a
   checkout: a loop must leave the tree as it found it (78's black-box contract) and a lane's
   `git add -A` would otherwise commit it.
2. **Shape — TEN keys, frozen order:** `{ loopRunId, scope, workspaceId, level, state,
   requestedAt, escalatedAt, honouredAt, cancelled, by }`. `level` ∈ {1, 2}; `state` ∈
   {`"requested"`, `"honoured"`}; `escalatedAt`/`honouredAt`/`cancelled` are `null` until set;
   `cancelled` is the runId the loop cancelled, or `null`; `by` = `{ node, pid }` of the writer.
   Written whole through `writeText` (`src/fs.mjs:22`, temp + rename) after a recursive `mkdir`;
   read absence-tolerant (`null`); a file that does not parse reads `null` after
   `reportDegrade("loop-stop-request", …)` — never a throw into the loop. The module exports
   `STOP_LEVELS = Object.freeze({ drain: 1, cancel: 2 })`, the ONE map from level to word; the
   verb, the presence read and the faces speak those two words and spell no third. It also exports
   `STOP_STATES = Object.freeze({ requested, honoured })`, the ONE map from state to word, so a
   reader that must test a request's state (04's producer: `record.state === STOP_STATES.honoured`)
   compares against the export and never spells the word *(graduated at Accept, 2026-09-24: added at
   130/01's review close)*.
3. **Ladder — exactly 129/04 task 06's.** `requestLoopStop(dir, { loopRunId, scope, workspaceId,
   by, now })`: no file → level 1 `requested` (`created: true`); level 1 `requested` → level 2 with
   `escalatedAt` (`escalated: true`); level 2 → unchanged (`escalated: false`); `honoured` →
   unchanged, and the answer says so. The first request drains (no further dispatch; the in-flight
   drive finishes; halt `operator-interrupt`); the second cancels the in-flight session now.
4. **Lifecycle.** `markStopHonoured(dir, loopRunId, { now, cancelled })` sets `state:
   "honoured"`, `honouredAt` and `cancelled`, and is called by the SHELL at the halt it produces
   for the request (ADR-003 §5) — only the loop knows it has halted. `clearStopRequest(dir,
   loopRunId)` deletes the file and is called by the shell on `--resume` for the declaration it
   resumes (ADR-003 §6) — the operator asking for the loop back. The coordinator's stale rule ("a
   request older than the invocation's own start is cleared, never honoured") holds BY CONSTRUCTION
   and needs no clock comparison: a non-resume invocation mints a fresh `loopRunId`, so the only
   invocation that can find a standing request keyed by its own id is `--resume`, and `--resume`
   clears whatever it finds — `requested` or `honoured` — and narrates it. One branch.
5. **The interrupt source — the seam 129/04 consumes.** `createStopSource({ loopRunId, dir,
   process, pollMs, now })` returns `{ level(), producer(), request(), signal, poll(), start(),
   stop() }`:
   - `level()` is `max(signalsSeen, request?.level ?? 0)` clamped to 2, where `signalsSeen` counts
     `SIGINT`/`SIGTERM` through PERSISTENT `process.on` listeners the source owns: the first raises
     the level to 1, the second to 2. At 2 the source REMOVES its own listeners, so a third signal
     reaches node's default through `loop-diag.mjs`'s last-listener repair (exit `128 + signo`) —
     first drains, second cancels and settles, third kills the process, in that order and no other.
   - `request()` is the file's record or `null`; the source reads the file's LEVEL and never its
     state — an `honoured` request at level ≥ 1 still halts the loop that reads it (idempotently
     re-marked), which is what makes a stop landing in the between-drives gap stick (ADR-002 §6).
   - `signal` is an `AbortController`'s signal, aborted the moment the level reaches 2 — the same
     object the driver honours at `agent-session-driver.mjs:1264` and `spawnLaneDrive` at
     `child-drive.mjs:91`. It is aborted once and never re-armed.
   - `producer()` is `"SIGINT"`, `"SIGTERM"` or `"stop-request"` — whichever FIRST raised the
     level to its current value — a datum the shell puts on the halt, never a message match.
   - `poll()` reads the file once (awaited by the shell at the tick head and after a drive
     returns); `start()` arms ONE `setInterval(poll, pollMs)`, `unref()`'d so it never holds the
     process open; `stop()` clears it. DEFAULT DECISION: `pollMs = 2000` — a cancel is seen within
     two seconds of the write, and 2 s of file stats per loop is noise beside a PTY.
   - It is injected as `ctx.stopSource` (a test's fake carries the same seven members, with `level`
     set by the test and `signal` its own controller's). 129/04's "injected signal seam" IS this
     object: `level() >= 1` is "stop dispatching", `signal` is "abort every child".
6. **Which lands first, and how the other adapts.** 130/01 (this module) lands first regardless —
   it touches no file 129/04 owns. 130/02 (the shell, ADR-003) and 129/04 both edit
   `src/commands/loop.mjs`, and the SPEC's rule holds: they are not driven in this checkout at the
   same time. DEFAULT DECISION: 129/04 lands first (it is `in-progress` and holds the file) and
   130/02 rebases on it, replacing any interim seam in `wave.mjs` with `ctx.stopSource` in the same
   diff; if 129/04 is still unbuilt when 130/02 is ready, 130/02 lands first and 129/04's task 06
   consumes `ctx.stopSource` instead of inventing one. The seam's SHAPE is §5 either way, so the
   builder of whichever is second has nothing to decide.

### Alternatives considered

- The request inside the checkout (`.aof/loop-stops/`) — rejected: 78's contract, and a lane's
  commit would carry it.
- A socket or named pipe the loop listens on — rejected: a daemon the SPEC's out-of-scope forbids,
  and it dies with the loop it is meant to stop.
- Keying the request by `scope` — rejected: a scope has many loops over time, and a scope-keyed
  request left behind stops the NEXT loop on that scope — 20/ADR-006's hazard in a new coat.
- Keeping `process.once` for signals and the file for requests — rejected: two ladders, and the
  second Ctrl+C would exit the process before the settle it is now guaranteed to reach.
- Polling only during a drive — rejected: the between-drives gap is where the tick reads the
  request, and it is the gap a `live: false` verb answer lands in.

### Consequences

`src/loop/` gains its second member (~150 lines; ~4 members after 129/04 and ADR-002, under the
exemption's threshold of 8). Three modules import it — the shell, the declarations producer, the
presence read — and none spells its path. No daemon, no registry, no store. FF-13001 holds the
single home.

### Invariant

`loop-stops`, the state words `requested`/`honoured` and the level-to-word map are spelled in
`src/loop/stop-request.mjs` and nowhere else under `src/`; no module under `src/` writes beneath
`<meshRoot>/loop-stops/` except through that module's exports.

---

## ADR-002 — `--stop` rides one verb core

**`--stop` rides the registered `run` through a verb core BELOW the command layer, `src/loop/stop.mjs`, so the CLI, the fleet route and the desktop reach ONE function; `--json` and `--dry-run` stay the probe and nothing launches**

### Context

`work:loop`'s registered `run` is `probeLoop` (`loop.mjs:2256`), and FF-5304 asserts it mints and
rewrites nothing under the project tree, spawns nothing and answers ten keys. The executing form is
the `cli.launch` body, which `acd-work-command-route-coverage` records as reachable by NO HTTP route
— that deferral is why `work:loop` is `BOARD_DEFERRED`. The fleet face may import no `commands/*`
module (`acd-mesh-ui-no-core-import`); its one sanctioned write door is a core below the command
layer (`assignWork`). 126/ADR-002 §6: a flag lands in all three homes or does not exist.

### Decision

1. **Three homes.** The closed input schema gains `stop: { type: "boolean" }`; `cli.spec.flags`
   gains `stop`; `cli.argv` maps `options.stop === true` to `{ stop: true }`; the usage string
   gains `[--stop]`. `launch: (options) => options.dryRun === true || options.stop === true ? null
   : body` — a `--stop` never enters the foreground body and never installs the diag recorder; it
   prints through `render`. `--stop` with `--resume` is refused, coded `loop-stop-exclusive`
   (400), before any read.
2. **`run` dispatches; the probe is byte-identical.** `run: (input, ctx) => input.stop === true ?
   stopLoopCommand(input, ctx) : probeLoop(input, ctx)`. `probeLoop` is not edited; FF-5304's first
   leg holds without a re-pin. Nothing pins `run === probeLoop` by identity (measured over `test/`).
3. **The core — `src/loop/stop.mjs`, `stopLoop(workspace, { scope, now })`** — returns a document
   and NEVER throws for a refusal (`{ ok: false, code, message }`), in this order:
   (a) `decideLoopScope(scope)` — refusal → `loop-stop-scope`;
   (b) the items in scope: `listItems(workspace.workDir)` filtered by `loopScopeIncludes`, their
       runs through `readRuns` (the same read the shell's `resumableState` performs at `:885`);
   (c) `readLoopDeclaration(runs)` — `null` → `loop-stop-no-declaration`;
   (d) the latest run carrying that `loopRunId`: when its `node` and `workspace.config.mesh.nodeId`
       are both strings and differ → `loop-stop-not-local`, naming both (ADR-006 §1); a `null` node
       (a flat pre-26 record) counts as local — absence is benign;
   (e) `live` = that run `isRunning` and not `isStale(run, nowMs, heartbeatFromConfig(workspace))`
       — the record's own liveness under `heartbeatMs` (20/ADR-004);
   (f) `requestLoopStop(loopStopsDir(), { loopRunId, scope, workspaceId, by: { node, pid }, now })`
       (ADR-001 §3); when `live === false` the same call marks the request `honoured` at once —
       there is no loop to honour it, and the honoured mark is what stops the supervisor
       relaunching a dead one (ADR-004 §4-§5);
   (g) the answer. `workspace.config.mesh.nodeId` is the sidecar-hydrated id `loadWorkspace`
       fills (measured `win-host-a` here), so the locality check works on a repo whose committed
       config pins no id — this one.
4. **The document — SEVEN keys, frozen order:** `{ ok: true, loopRunId, scope, live, request,
   state, path }`. `request` ∈ {`"drain"`, `"cancel"`} is the word for the level AFTER this call
   (through `STOP_LEVELS`); `state` ∈ {`"requested"`, `"honoured"`}; `path` is the file. A third
   call answers `"cancel"` again — idempotent, never an error.
5. **The command's faces.** `stopLoopCommand` maps `ok: false` to `commandError(message, code,
   404 for no-declaration, 409 otherwise)` — stderr + non-zero, the command-error contract.
   `render` prints one line: `<scope> — stop requested (<request>) for loop <loopRunId>, <live |
   not live>. <path>`; `json` answers the document verbatim. `renderLoopState` gains one branch on
   `result.request` and nothing else.
6. **Liveness is reported honestly and the gap still stops the loop.** Between drives a loop has no
   running run for a few seconds; a `--stop` landing there answers `live: false`, writes the
   request AND marks it honoured. The loop's next tick head reads the file's LEVEL (ADR-001 §5) and
   halts, re-marking honoured (a no-op). `live` is a true statement about the record, never a
   refusal, and no window exists in which a request is written and ignored.
7. **Foreground loops are first-class.** The verb reads run records, not the declarations
   producer; `supervised` plays no part. The 129 loop ran `supervised: false` and is stoppable.
8. **`BOARD_DEFERRED` stands.** No `/api/work/loop` exists; the fleet's route (ADR-005 §4) is on
   the fleet server and calls the core, not the command.

### Alternatives considered

- `--stop` on the `cli.launch` seam — rejected: no route may reach a launch body (the
  route-coverage rationale), so the fleet could not stop a loop; the desktop could spawn it, which
  is one caller of three.
- A new `work:loop-stop` command — rejected: `src/commands/` is 68/68, a second command for one
  flag, and every `work:*` command owes a bundle wrapper.
- The route invoking `work:loop` through the registry — rejected: `acd-mesh-ui-no-core-import`
  forbids `command-core` and `commands/*` in the fleet face; the sanctioned door is a core below
  the command layer, exactly as `assignWork` is (38/ADR-012's "a second CALLER of the SAME core,
  never a re-implementation").
- The core inside `stop-request.mjs` — rejected: the presence read and the producer import that
  module, and the core needs `run-store`, `work/loop` and `work.mjs`; one leaf, one composer.
- Refusing when the loop is not live — rejected in §6: a stop in the gap must still stop it.

### Consequences

`src/loop/` gains its third member (~80 lines); `src/commands/loop.mjs` gains ~12 lines across the
schema, flags, argv, usage, `launch` and `run`. Two importers of the core: the command and the fleet
face. FF-13003 holds the probe-shaped write and the single function.

### Invariant

`run({ scope, stop: true })` mints and rewrites no file under the project tree and spawns nothing;
the stop's resolution exists once, in `src/loop/stop.mjs`, and `src/commands/loop.mjs` and
`src/mesh/ui-serve.mjs` reach it only by import.

---

## ADR-003 — Every interrupt settles

**The shell reads the source, not a flag; the interrupt path ALWAYS settles; a cancelled session settles `cancelled`; the account names the request; `--resume` clears it**

### Context

`runLoopBody` sets `interrupted` from `process.once` (`:1580-1584`), reads it at the tick head
(`:1607`) and after the drive (`:1833`), where it returns BEFORE `settleDriven` (`:1839`) — the
lossy settle the SPEC measured. `settleDriven` maps every non-done observation to `failed`
(`:1178`); the driver's cancel arrives as `{ outcome: "failed", failureReason: "cancelled" }`;
`running>cancelled` is legal (`run-store.mjs:276`) and a clean cancel with `failureReason: null`
reads `not-retryable` (`:437-447`). The launch seam sets `agentSessionDriverOptions` only when the
diag recorder is installed (`:2298`). FF-12602 pins ten narrate lines and three drive sites.

### Decision

1. **One source, composed in `runLoopBody`.** After `loopRunId` is resolved: `const source =
   ctx.stopSource ?? createStopSource({ loopRunId, dir: loopStopsDir(), process, pollMs })`;
   `source.start()` after the resume handling; `source.stop()` in the `finally` that today removes
   the listeners. The `process.once` pair and `removeListener` pair are deleted. Every drive's ctx
   is `{ ...ctx, agentSessionDriverOptions: { ...(ctx.agentSessionDriverOptions ?? {}), signal:
   source.signal } }` — composed HERE, not in the launch seam, so a foreground loop, a loop under
   `AOF_LOOP_DIAG=0` and a test-driven `runLoopBody` all carry the signal, and the diag seam's
   `onSessionStop` survives the spread. When 129/04 lands, `spawnLaneDrive({ signal: source.signal
   })` is the same object.
2. **Tick head.** `await source.poll(); if (source.level() >= 1) act = haltOnStop(source,
   inFlightRef ?? next?.ref ?? resolved.scope)` replaces the `interrupted` read at `:1607`.
3. **Post-drive — settle FIRST.** The block at `:1833-1839` becomes: `phaseRun = await
   settleDriven(...)`; `driven.push(drivenRow(phaseRun))`; `await source.poll(); if
   (source.level() >= 1) { … haltOnStop … return state; }`. The early return before the settle is
   deleted. A drive that ended on its own settles as it ended (`done`, `failed/timeout`,
   `needs-input` untouched); a drive the source cancelled settles `cancelled` (§4). `settleDriven`'s
   existing catch already narrates a record settled from under the shell.
4. **`settleDriven` maps the cancel.** `terminal = outcome.outcome === "done" ? "done" :
   outcome.failureReason === "cancelled" ? "cancelled" : "failed"`; `failureReason: terminal ===
   "failed" ? (outcome.failureReason ?? "agent_error") : null`; `transitionRunComplete(item, {
   outcome: terminal, … })` — `running>cancelled` is the edge, `run-complete.mjs:24`'s
   `VALID_OUTCOMES` already has it, and the store is not touched. DEFAULT DECISION: the spend
   settle's `exitReason` for a cancel is `"error"` (the existing non-done word; the transcript is
   partial). `drivenRow.outcome` is `entry.record.state === "cancelled" ? "cancelled" :
   entry.outcome.outcome` — the row 129/04 task 06 defines for lanes, produced here for the
   in-process drive. The retry loop (`while (phaseRun.outcome.outcome === "failed")`) never sees a
   cancel because §3's halt returns first; a `cancelled` record is `not-retryable` in any case.
5. **The halt and the mark.** `haltOnStop(source, ref)` = `haltDecision("operator-interrupt", ref,
   source.producer())` — the stop id is unchanged, `LOOP_STOPS` is fifteen (129/01 added three; the
   refine's "twelve" was stale, corrected at Accept) and unchanged by this milestone, the producer is a value
   (`"SIGINT"`, `"SIGTERM"` or `"stop-request"`). Its `Details` (through `reportLine`, never
   `actShape`) are `{ signal: <producer>, level, request: <path> | null, by: "<node>:<pid>" |
   null, cancelled: <runId> | null }`. Before the state is returned, when `source.request() !=
   null`, the shell calls `markStopHonoured(dir, loopRunId, { now, cancelled })`. A signal-only halt
   writes nothing — there is no request to mark.
6. **`--resume` clears, and narrates once.** Under `input.resume === true`, after `loopRunId` is
   resolved: `const standing = await readStopRequest(dir, loopRunId); if (standing != null) {
   await clearStopRequest(dir, loopRunId); await narrate(\`Cleared stop request for ${loopRunId}
   (${standing.state}, level ${standing.level}) — resumed.\`); }`. This is the ONE new in-flight
   line; it rides `narrate` by 126/ADR-002's role rule, and story 02 moves FF-12602's count from
   ten to eleven and adds the needle `Cleared stop request` to its table in the same diff.
7. **Order after a drive: settle → interrupt → needs-input → retry.** A drive that answered
   `needs-input` is not settled (the store's design: the session waits for the operator); an
   interrupt over it halts `operator-interrupt` with `sessionId` in `Details`. Nothing else in the
   ladder moves.
8. **Pins, restated.** `LoopState` ten keys; `brief.loop` nine; the record sixteen; `LOOP_STOPS`
   fifteen and unchanged; `src/run-store.mjs` byte-pinned (moved once, by 130/06's retry carry, re-pinned under ADR-007 §5); `actShape`'s whitelist untouched; no `writeFile`,
   `mkdir` or `rename` call form in the shell — every write goes through `stop-request.mjs`'s
   exports (FF-5307's leg holds as written).

### Alternatives considered

- Settle a cancel as `failed/cancelled` — rejected: `cancelled` is the terminal state the machine
  has for it, `retryReadiness` reads a clean cancel `not-retryable`, and the mesh's withdraw
  precedent settles `cancelled`, never `failed` (`worker-execution.mjs:1539`).
- Mark honoured at the verb for a live loop — rejected: the mark means "this loop halted"; only the
  loop knows, and a verb that lied about it would let the supervisor drop a loop still driving.
- Keep the interrupt check before the settle and settle inside it — rejected: two settle sites for
  one drive is how the next branch forgets.
- A `stop-requested` stop id — rejected: `LOOP_STOPS` is frozen and `operator-interrupt` IS the
  stop; the producer names the request.

### Consequences

`src/commands/loop.mjs` moves ten seams and grows by ≤ 30 lines net (the `process.once` pair and
the early return leave; the source, the settle-first block and the resume clear arrive). The 40+
loop suites hold the sequential path byte-identical except for the two new `Details` keys on an
interrupt. FF-13002 holds the always-settles rule structurally and over a fixture.

### Invariant

In `src/commands/loop.mjs`, every binding assigned from `await drivePhase(` reaches `settleDriven(`
before any `return` in the same block; the shell registers no `process.once`/`process.on` for a
signal; `operator-interrupt` is produced only through `haltDecision` with a producer read off the
source.

---

## ADR-004 — The desktop: request, then kill

**The desktop lists what it supervises from the map it already keeps, its Stop is the REQUEST first and the tree kill last, the ladder is a pure `core` function, and the declarations producer drops a honoured declaration so `reconcile` never restarts a stopped loop**

### Context

`get_view_model` exposes the two daemon signals and no declaration row (`main.rs:65-110`);
`SupervisorState.signals` is already one map keyed by id (`supervisor.rs:88`); the supplied rows are
read every tenth tick and applied, then forgotten (`:486-489`). `Stop(id)` places a hold and flips
`desired`; the watchdog answers with `child.start_kill()` — the direct child only, which orphans
the Node tree (36/RESEARCH §2, the reason the Job Object exists). A halted loop exits 0, which
`classify_exit` reads as `stopped` with NO hold and `handle_exit` turns into `desired = false`; if
its row persists, the next `reconcile` starts it. `crates/app` is excluded from `cargo test`;
every decision must live in `core`. The DESIGN fixed the row shape `{ id, label, signal }` and the
one new ramp word `stopping`.

### Decision

1. **Rows from the map.** `IpcViewModel` gains `loops: Vec<IpcLoopRow>` with EXACTLY `{ id, label,
   signal }` — the designer's shape, confirmed — one per NON-reserved id in `signals`, joined on id
   with `SupervisorState.declared: Vec<SupervisedChild>` (new; replaced by the `supplied` rows on
   every ANSWERED declarations tick, never cleared by a failed poll) for the `label` (`loop
   <scope>`, the producer's own). `SupervisedChild` is unchanged: `scope` is NOT re-parsed into it.
   Where the shell needs the scope it is `argv[2]` of the row's own admitted argv — the prefix
   `["work","loop"]` plus the scope, composed at one home (`declarations.mjs:103` through
   `argvFor`). `app.js`'s `normalizeIpcView` passes `loops` through; `renderControlBar` renders the
   DESIGN's second `.controlbar` from it and renders nothing when it is empty.
2. **One Tauri command, no new variant.** `stop_loop(id)` → `SupervisorCommand::Stop(id)`. The
   command loop (`supervisor.rs:385-395`) branches on `is_reserved_id(&id)` — the core's existing
   predicate: a reserved id keeps today's `hold` + `set_desired(false)`; a declaration takes
   `ctl.hold()` and the ladder (§3). `app.js` wires `data-action="loop-stop"` (`data-id`) in the
   one control-bar delegate to `invoke('stop_loop', { id })`.
3. **The ladder is PURE and lives in `core`.** `mesh_desktop_core::supervision::stop_step(presses:
   u32, since_cancel_ms: Option<u64>, grace_ms: u64, exited: bool) -> StopStep`, `StopStep::{
   Request, Cancel, Wait, Kill, Done }`: `exited` → `Done`; `presses == 1` → `Request`; `presses >=
   2` with no cancel yet → `Cancel`; `since_cancel_ms >= grace_ms` → `Kill`; otherwise `Wait`.
   `stop_argv(child: &SupervisedChild) -> Option<Vec<String>>` = `argv[0..3]` + `"--stop"`, `None`
   for a reserved id or an argv shorter than three — the argv is formed HERE and never in the shell.
   The desktop counts presses only; the VERB escalates (ADR-001 §3), so `Request` and `Cancel` both
   spawn `stop_argv(child)` — `form_argv_spawn(resolved, argv, child.cwd)`, the resolved absolute
   `aof`, `CREATE_NO_WINDOW`, the row's own cwd — and differ only in what the loop does with the
   second file write. DEFAULT DECISION: `STOP_GRACE_MS = 30_000`, measured against the loop's poll
   (≤ 2 s) plus the driver's stop bracket (seconds); the grace starts at the CANCEL's spawn, never
   at the drain, so a draining loop is never killed from under a live drive. The shell applies:
   `Request` → spawn, signal `stopping`; a spawn that fails or exits non-zero → the standing notice
   `loop <scope>: <last non-empty line>` (the footer, keyed to the id) and the pill keeps the
   child's true signal; `Cancel` → spawn; `Kill` → `taskkill /PID <child.id()> /T /F` (the driver's
   own primitive, `agent-session-driver.mjs:1245`) then `child.wait()`, signal `stopped`. A
   declaration's Stop never calls `child.start_kill()`. The two daemons keep `start_kill` — out of
   scope, named so nobody widens it here.
4. **Never relaunch what was stopped — two independent guards.** (a) The HOLD placed at press 1
   makes `reconcile` retain the id while its row persists (`supervision.rs:276`, the existing
   branch; nothing clears a hold but retirement). (b) The row itself goes: `supervisedDeclarations`
   (`declarations.mjs:33`) reads, for each candidate declaration, `readStopRequest(loopStopsDir(),
   loopRunId)` from ADR-001's module and collects `stopped: Set<loopRunId>` of those whose `state`
   is `"honoured"`, handing it to `decideSupervisedDeclarations` as an ADDITIVE input. The engine
   appends it to the one destructure — `const { maxAttempts, stalenessMs, now, isRunning, isStale,
   retryReadiness, stopped } = input` — and skips `if (stoppedSet.has(declaration.loopRunId))`
   immediately after the `supervised !== true` guard (`work/loop.mjs:1490`). **DEFAULT-ABSENT
   discipline:** `const stoppedSet = stopped instanceof Set ? stopped : EMPTY_SET` (a frozen empty
   `Set`, module-level); an absent or ill-typed input drops nothing, every existing caller and
   fixture answers byte-identically, and `src/work/loop.mjs` gains no import (`Set` is a global;
   `acd-clock-counts-attempts` keeps its zero). A `requested` mark drops nothing — the loop is
   draining and its row is retained on liveness as today. Belt: a `cancelled` or `done` latest run
   already reads `not-retryable`; the mark is load-bearing only for a retryable last run
   (`failed/timeout`), which is exactly the lineage 126 relaunches. With no row, `reconcile` answers
   `stop` → `retire()` → the watchdog exits and drops the signal; the row persists `stopped` for
   ≤ one declarations tick, which the DESIGN renders as the row's terminal frame.
5. **A dead supervised loop is stoppable.** `--stop` on a declaration that is not live marks the
   request honoured at once (ADR-002 §3f), so its row goes at the next tick and nothing relaunches
   it until `--resume` clears the mark (ADR-003 §6).
6. **A pre-existing shape, measured and left.** A foreground `--supervised` loop already yields a
   row the desktop will start a controller for; that is 126's design and not this milestone's to
   change. Named so the live run (story 06) does not mistake it for a regression.

### Alternatives considered

- Keep `start_kill` and add a pre-kill request — rejected: it still orphans the tree, and the SPEC
  names the tree kill as the fallback.
- A `SupervisorCommand::StopLoop` variant — rejected: the id already says what it is, and
  `is_reserved_id` is the predicate the core exports for exactly this split.
- Parsing `scope` into `SupervisedChild` — rejected: a second spelling of what `argv[2]` carries,
  and the row's argv is the admitted prefix by construction (`status.rs:281-286`).
- The desktop reading the request file itself — rejected: `mesh status --json --declarations` is
  the supervisor's ONE data command (`acd-desktop-single-data-path`), and the producer is the one
  reader of "should this run".
- A grace from the first press — rejected in §3: a drain is an hour long by design, and a kill at
  its grace would re-create the leaked `running` row.

### Consequences

`core/src/supervision.rs` +~60 lines with tests; `supervisor.rs` +~60 (the branch, the ladder's
application, `taskkill`); `main.rs` +~25 (the row, the command); `app.js` +~30; `status.rs` 0;
`declarations.mjs` +~10; `src/work/loop.mjs` +~4. FF-13004 holds the no-row rule; FF-13007 holds
the pure ladder and the argv's one home.

### Invariant

`stop_step` and `stop_argv` are pure functions in `mesh_desktop_core::supervision`; `supervisor.rs`
spells no `"--stop"` literal; `decideSupervisedDeclarations` drops a row only for a `loopRunId` in
its `stopped` input, and answers byte-identically when that input is absent.

---

## ADR-005 — The fleet learns the loop

**The fleet learns the loop from ONE additive presence key read by the same pass as `activeRuns` and carrying the standing request; the status body names the serving node; the Stop is a third guarded route in assign's exact shape, with item 44's helpers hoisted first; every rendered fact is a pure projection**

### Context

The node card says `running N runs` from `presence.activeRuns` (a frozen `string[]`);
`fleetCurrentWorkLines` is byte-pinned to the Rust `current_work()`; `GlobalNode` carries no local
marker and the status body names no serving node; nine suites and two arch controls pin the presence
record's key list; three callers assemble the record, one of them the read-side reshape; the fleet's
write surface is an enumeration of two routes whose blocks are already a copy (item 44);
`ui/src/fleet/` is 20/20 files and `Fleet.tsx` has eleven lines of headroom; the DESIGN needs the
line to carry the request's rung so the card's memory is eventually replaced by the wire.

### Decision

1. **The key: `loops`, additive, OMITTED when empty, after `buildId`.** `presence.mjs` gains
   `readActiveLoops(items, { workspaceId, stopRequestFor })` beside `readActiveRuns` (`:69`): over
   the same `readRuns` read, every `running` run whose `brief.loop` is usable contributes to ONE
   entry per `loopRunId` (the latest such run) — ELEVEN keys, frozen order: `{ loopRunId,
   workspaceId, scope, level, cap, phase, cycle, ref, runId, supervised, stop }`, `ref` the run's
   `itemRef`, `stop` ∈ {`null`, `"drain"`, `"cancel"`} read through `readStopRequest` from
   ADR-001's module and mapped by `STOP_LEVELS` (a `honoured` request still maps by level — the
   loop is exiting). `assemblePresenceRecord` gains `loops` and emits `...(Array.isArray(loops) &&
   loops.length > 0 ? { loops } : {})` as the LAST key. This is the `buildId` discipline, and a
   DEPARTURE from the brief's and the DESIGN's "key always present, `[]` when none": eleven pins
   deep-equal the record's key list (the measured-facts row), an always-present key re-pins all of
   them for no reader's benefit, and `buildId` already established omitted-when-empty as an
   admitted additive shape. Every reader treats an absent key as `[]`.
2. **Both producers, and the reshape.** `heartbeat.mjs:107` and the launcher tick
   (`assembleActiveRunsAndSubsumedWorkspaces` returns `loops` beside `activeRuns`, `launcher.mjs:419`,
   consumed at `:585` and passed at `:603`) both call `readActiveLoops` — the launcher's tick is the
   record this machine actually publishes, and a heartbeat that carried the key alone would be
   erased by the next tick. `global-node-registry.mjs:209`'s reshape passes it through because the
   disk record is spread into the assembler. The desktop's `status.rs` needs nothing (no
   `deny_unknown_fields`). The cached-run half of the union (`readCachedActiveRunIds`) contributes
   no loop: a loop is local by definition (ADR-006).
3. **The serving node on the wire — pays TECH_DEBT item 18 (b).** The `/api/mesh/status` route
   stamps `localNodeId: await controlNodeId()` on the body beside `scope` (`ui-serve.mjs:942`) —
   the board's own precedent (`board-ui.mjs:89` stamps `nodeId` on its envelope) and its rule: an
   unconfigured machine names no node, and then no card shows a button. `api.ts` `FleetStatus`
   gains `localNodeId?: string | null`; `PresenceRecord` gains `loops?: PresenceLoop[]`. The
   projection (`shapeGlobalStatus`) is untouched: which machine serves a payload is a fact about
   the server, not about the store.
4. **The route: `POST /api/mesh/loop-stop`, in assign's exact shape, after the hoist.** Story 03
   first pays item 44: `admitWriteRequest(request, response)` (method → 405; same-origin +
   `application/json` → 403/400) and `resolveLocalWorkspaceRow(workspaceId, response)`
   (`queryGlobalMeshStatus` → row → 404; `existsSync` → 409 `workspace-not-local`) are hoisted
   INSIDE `ui-serve.mjs` (no new module — `src/mesh/` is 34/34 and the face is one file's concern),
   the assign and session routes call them, and the three detectors item 44 names are re-aimed at
   the helpers ("every write-route branch CALLS `admitWriteRequest` before it reads a body").
   Then the third route: `admitWriteRequest`; body lifted to EXACTLY `{ scope, workspaceId }`
   (both required strings, else 400 `invalid-body`); `resolveLocalWorkspaceRow`; `loadWorkspace(row.projectRoot)`
   and the own-id assertion assign performs (`:555-558`); `stopLoop(workspace, { scope })` from
   `../loop/stop.mjs` — the SECOND sanctioned write door, so `acd-mesh-ui-no-core-import`'s
   allow-list grows by that one specifier; `ok: false` → `sendApiError(404 for
   loop-stop-no-declaration, 409 otherwise, message, code)`; otherwise 200 with ADR-002 §4's document
   verbatim. The route enumerations (`acd-mesh-ui-read-only`, `acd-mesh-ui-write-isolation`) grow to
   six named routes and three named write routes. No `controlNodeId()` issuer is needed — the verb
   stamps `by` from the workspace it is handed.
5. **The line and the button are pure, and `fleetCurrentWorkLines` is untouched.** `runs.mjs`
   gains three exports: `fleetLoopLines(presence)` → ordered entries `{ key, line, title,
   loopRunId, scope, workspaceId, stop }` (ascending by `scope` then `loopRunId`; the DESIGN §1
   anatomy — `loop <scope> [· stopping | · cancelling] [· <phase> <ref>] · cycle <n>[ of <cap>]`,
   with `L<n>` and `supervised` in `title` only); `loopStopAffordance({ loop, node, localNodeId,
   remembered })` → `{ button: null | { rung: 1 | 2, label, title, tone }, remote: boolean }` — a
   button ONLY when `localNodeId` is a non-empty string and `node.nodeId === localNodeId`, `null`
   after rung 2, and the rung is `max(wire, remembered)`; `rememberStopRung(memory, loopRunId, rung,
   runId)` → a new `Map` of `{ rung, runId }` that never lowers a rung within one DRIVE and is read
   only while the entry's `runId` is the loop's current drive, so a `--resume` (a new drive) returns
   the button without a reload or a timer *(graduated at Accept, 2026-09-24: the PO's ruling on
   130/03 QA's design-gap; the refine's signature had no reset event, so a cancelled-then-resumed
   loop read `cancelling` with no button for the page's life)*. The line and the button take an
   OPTIONAL rung memory in the pure modules (`fleetLoopLines(presence, memory)`,
   `nodeWorkRegion(node, localNodeId, memory)`), wire-only without it, and the Stop rides
   `runAssign` through two additive options (`refusalCopy`, `timedOut`), so `git diff -- ui/` is
   eight fleet files, not six *(graduated: 130/03's two stated deviations)*. `scope.mjs` gains
   `nodeWorkRegion(node, localNodeId)` → `{ lines, token, loops }`, composing
   `fleetCurrentWorkLines(node.presence)` with the loop entries and dropping the single `idle` line
   when loops exist; `nodeCurrentWork` and `fleetCurrentWorkLines` are byte-identical (the Rust
   drift pin). `Fleet.tsx` swaps `nodeCurrentWork(node)` for `nodeWorkRegion(node,
   status.localNodeId)` at `:1426`, renders the loop entries inside the existing paragraph map as
   the DESIGN's flex row, and holds one `useState` for the rung memory plus the in-flight/hold
   guard the assign affordance already defines (`ASSIGN_SENT_HOLD_MS`, `ASSIGN_TIMEOUT_MS`);
   `api.ts` gains `loopStop(scope, workspaceId)` — the one `fetch("/api/mesh/loop-stop"` in
   `ui/`. No new file under `ui/src/fleet/`. DEFAULT DECISION: `Fleet.tsx` stays under 1,560 —
   every fact is precomputed, the JSX is one map; if story 03's review measures an overflow, the
   `acd-ui-surface-file-budget` row rises by exactly that overflow (≤ 20 lines) citing this ADR as
   the reason m43/ADR-014 E3 requires, and item 33 stays open with that raise recorded against it.
6. **FF-5307 re-pinned with the measurement, or not at all.** The re-pin comment states, measured:
   `git diff -- ui/` names only `ui/src/fleet/{api.ts, runs.mjs, runs.d.mts, scope.mjs, scope.d.mts,
   Fleet.tsx}`; nothing under `ui/src/board/` moved; `src/board-ui.mjs`'s digest is unchanged; no
   run-record key is read that was not read before. FF-5202: `work:loop` and `loop-stop` are
   outside its forbidden set, and no `loops-*` token enters `ui/`.
7. **What is not this surface.** The desktop's node row `current_work` cell stays pinned to the JS
   string (S10) and gains no loop text; the desktop's loop rows are ADR-004's.

### Alternatives considered

- The loop line inside `fleetCurrentWorkLines` (the brief's proposal) — rejected: the function is
  byte-pinned against Rust literals over captured fixtures (`acd-captured-producer-fixture:181-192`);
  a dynamic line could never satisfy it, and the subsumption rule it holds is about sessions, which
  the loop's drive already counts as one of the `N runs`.
- `localNodeId` on `shapeGlobalStatus` (item 18's letter) — rejected for the board's route-stamp
  precedent: the serving node is the server's fact; the projection has no self.
- A button on every card, refused `not-local` by the verb — rejected: an affordance that always
  refuses is a lie by shape; the wire must say which card is this node.
- `loops: []` always present (the `sessions` precedent) — rejected in §1 by the count of pins.
- A timed decay of the remembered rung — rejected: the DESIGN's hazard; a decayed hold re-offers
  `Stop`, and the reassuring click cancels a session.
- A fourth copy of the guard blocks — rejected: item 44 says "before a fourth route", and this is
  the fourth.

### Consequences

`presence.mjs` +~40; `launcher.mjs` +~8 at two sites; `heartbeat.mjs` +~4; `ui-serve.mjs` ≈ +20 net
(−60 duplicated, +30 helpers, +50 route); `runs.mjs`/`scope.mjs` +~90 with their `.d.mts`;
`Fleet.tsx` ≤ +11; `api.ts` +~20. Items 18 (b) and 44 leave the ledger; item 33 stays. FF-13005 and
FF-13006 hold the additive key and the local-only button.

### Invariant

`assemblePresenceRecord` without `loops` is byte-identical to today's record; every `src/**` caller
of `readActiveRuns(` also calls `readActiveLoops(`; `ui/src/fleet/**` reaches `/api/mesh/loop-stop`
from exactly one `fetch` and renders a Stop only where `node.nodeId === status.localNodeId`.

---

## ADR-006 — Local loops; board frozen

**Local loops only, refused by name; no daemon, registry or store; the board is frozen and the records are the ones we have**

### Context

The request is a file in THIS machine's aof home; run records are node-partitioned and a remote
node's records reach this checkout by git; 53/ADR-004 froze the board against a loop face and
FF-5307 pins `src/board-ui.mjs` and the `ui/` tree to it; the SPEC's out-of-scope names the
cross-node stop as a later mesh directive.

### Decision

1. **`loop-stop-not-local`, 409.** The verb refuses when the declaration's latest run names another
   node (ADR-002 §3d), and the message names both nodes and the remedy ("stop it on
   `<node>`'s own console"). The fleet renders a remote node's loop line with no button and no
   message slot, its `title` tail saying why (ADR-005 §5).
2. **No new daemon, registry or store.** The readers are the loop (its own unref'd interval), the
   verb, the declarations producer and the presence read — each on a cadence it already has;
   nothing polls on their behalf.
3. **The board gets nothing.** `src/board-ui.mjs` byte-identical; nothing under `ui/src/board/`
   moves; `work:loop` stays `BOARD_DEFERRED`; no `/api/work/loop`.
4. **Records.** `running>cancelled` is the edge used; `src/run-store.mjs` is byte-pinned and
   unchanged; `LoopState` ten keys, `brief.loop` nine, the record sixteen; `LOOP_STOPS` fifteen and unchanged —
   `operator-interrupt` is the stop and the producer names the request.
5. **What an outsider verifies (story 06).** The SPEC's paragraph, read at the source: a live loop
   in this checkout, `aof work loop <scope> --stop` from another terminal, the session's tree
   terminated first, the run `cancelled` on its record, the halt line naming the request, no
   relaunch by the desktop across two declarations ticks, `--resume` bringing it back; the same from
   the fleet's button and the desktop's row; a second `--stop` while draining cancelling now.

### Alternatives considered

- A cross-node stop through a mesh directive — deferred by the SPEC; the request's shape (keyed by
  `loopRunId`, level and state) is what such a directive would carry, so nothing here forecloses it.
- A board affordance on the run row — rejected: 53/ADR-004.

### Consequences

None beyond the refusal code and the absence. The invariant is the frozen set restated.

### Invariant

`src/board-ui.mjs` keeps its FF-5307 digest and `src/run-store.mjs` its ADR-007 §5 re-pin; `LOOP_STOPS` has fifteen
members, none added here; the verb answers `loop-stop-not-local` for a declaration whose latest run names another
node, and the fleet renders no button for a node other than `status.localNodeId`.

---

## ADR-007 — The desktop attaches to a loop it did not start

**Supersedes ADR-004 §6 and one clause of ADR-006 §4. Ratified 2026-09-23 by the operator, from 130/06's live run.**

### Context

130/06's live run measured what ADR-004 §6 had named and left alone. A foreground `--supervised`
loop yields a declarations row (126/02, "listed on its own liveness"). The desktop's controller for
that row spawns `aof work loop <scope> --level L2 --resume`, which walls at once on the loop's open
run: `a non-terminal run already exists for this item`, the named clean exit `duplicate-run`
(126/ADR-006 §6). This was measured at 17:13:14, 18:48:44 and 19:15:44, plus a twelve-relaunch storm
in run 1. The row then reports that dead child, `stopped` with no control and a
`loop 02: duplicate-run` footer, beside a loop that is running. So the desktop can never stop a
loop started on a console, which is the only way a loop is started, and leg 6 of 130/06 cannot pass.

Two routes were measured against locked contracts. A liveness key on the row breaks 126/FF-12604
leg 4, which pins "a row is six keys and carries no verdict". Re-classifying the exit breaks 126's
delivered cargo test (`duplicate-run` reads `stopped`, raises the notice and places the hold).

### Decision

1. **The refusal is the attach.** When an UNPRESSED declaration's child exits with the named reason
   `DuplicateRun`, the row attaches to the loop that answered. It reports `running`, the notice that
   exit raised is cleared (`notice_after_start`, keyed to the id), and the hold `handle_exit` placed
   stays, so no tick relaunches against the live loop. The decision is a pure core function,
   `attaches(id, presses, reason)`, read beside `classify_exit`. `classify_exit` and its 126 test
   are unchanged, and so is the wire: the row keeps its six keys.
2. **An attached row's stop is the verb, rung by rung, with no kill.** Each press spawns
   `aof work loop <scope> --stop` (`stop_argv`, ADR-004 §3) and the verb escalates the level on disk:
   drain, then cancel. There is no grace clock and no `taskkill` rung, because the row holds no child
   and the cancel is carried out by the loop's own stop bracket (ADR-003). A refused spawn raises the
   footer notice and restores the pill, as ADR-004 §3 already does.
3. **The attached row ends with the row.** The pill reads `stopping` from the first landed press until
   the reconcile retires the row, which happens on the next declarations tick after the loop's halt
   (its honoured mark, ADR-004 §4). An attached row shows no `stopped` frame: the desktop has no
   exit to observe. Named here, not in DESIGN §Surface 2, whose `stopped, held` frame stays true for a
   row the desktop spawned.
4. **One relaunch per foreground start remains.** The attach is learned from the refusal, so the first
   relaunch still runs (gates, then the refused mint, under two seconds, writing nothing). A row
   carrying its liveness would remove it, at the cost of FF-12604's contract, which is not re-opened here.
5. **`src/run-store.mjs` moves once (supersedes ADR-006 §4's "byte-pinned and unchanged").** `retryRun`
   no longer carries `brief.loop` into an UNBRIEFED retry. Measured in run 1: `aof work resume` re-minted
   a dead loop's 09-10 lineage under that loop's id, and `--stop` (ADR-002 §3c, latest declaration in
   scope) resolved that dead loop. Every loop retry passes its own brief. FF-5307 re-pinned with the
   reason (the file's rule: re-pin, never drop).

### Alternatives considered

- A `live` key on the declarations row: rejected. It re-opens 126/FF-12604, and the refusal already
  carries the fact.
- A desktop that stops the foreground loop by pid: rejected. The desktop does not know the pid, and
  a tree kill is the last rung, never the first (ADR-004).
- Re-scoping leg 6 to a desktop-launched loop: rejected by the operator. Nothing launches one today,
  and the console loop is the case that exists.

### Consequences

The relaunch storm is bounded to one refused relaunch per foreground start, which the hold already
did. The row now tells the truth, `running`, and has a working control. A foreground loop that dies
without halting stays attached until its row goes (the hold means no relaunch), which is today's
behaviour after a `duplicate-run`.

### Invariant

`attaches` holds only for a non-reserved id, zero presses and `DuplicateRun`, and `classify_exit`'s
answer for that exit is unchanged (`only_an_unpressed_declarations_duplicate_run_attaches`, cargo).
An attached row never reaches `tree_kill`. `src/run-store.mjs` matches its FF-5307 pin.

---

## Codebase health — what these stories land in

`src/commands/loop.mjs` at **2,311 lines** is still the widest file this milestone touches and the
one 129 is committed to shrinking (129/ADR-008 §3, −300 with the wave tick). The stop is a SMALL
delta by construction — **ten seams**, named: the schema/flags/argv/usage/`launch` (one seam, ~8
lines), the `run` dispatch (2), the source creation and its `start`/`stop` (4), the drive-ctx spread
(3), the tick-head read (1 changed), the post-drive reorder (~8, and the early return leaves), the
`settleDriven` terminal map (2), `drivenRow` (1), the resume clear (5), and the halt helper with its
`Details` (~10). Net ≤ +30 lines; story 02's review measures it and a larger delta is a finding.
`src/loop/stop.mjs` and `src/loop/stop-request.mjs` are where the new logic lives — the family 129
founded, ~230 lines between them, zero `console.log`, every catch on `reportDegrade`.

`src/mesh/ui-serve.mjs` (**1,340**) is the file the ledger already names: item 44 measured the
session route as a 63-line copy of the assign route and asked that the blocks be hoisted "before a
fourth write route is added". This milestone adds the third, so the hoist is paid IN story 03 — not
deferred, not copied a third time — and the net is ≈ +20 lines for a route that would have been +90
as a copy. `src/mesh/presence.mjs` (**470**, 13 src dependents) gains one read beside the one it
has. `src/mesh/launcher.mjs` (**1,918**, 25 dependents, the runner-up god-node) gains ≤ 8 lines at
two sites and nothing else; its own ledger entries are not this milestone's. `Fleet.tsx`
(**1,549/1,560**) gains ≤ 11 lines because every fact it renders is computed in `runs.mjs` and
`scope.mjs`; ADR-005 §5 states the only sanctioned overflow. `supervisor.rs` (**745**) and `main.rs`
(**507**) grow by the application of a ladder that is decided in `core`, where cargo can reach it.

Ledger entries citing the subject files, re-measured: **item 18** — (b) is true today (no local
marker on the global shape, no serving node on the body) and is PAID by ADR-005 §3 in story 03; (a)
(the `ui/` shared layer) is untouched and stays open — story 03 rewrites the entry to one leg.
**Item 44** — true today (63 duplicated lines, three detectors aimed at branch bodies) and PAID in
story 03 as above; the entry is deleted at that story's close. **Item 33** — true today (`Fleet.tsx`
eleven lines of headroom) and stays open; this milestone does not raise a ceiling unless ADR-005 §5's
measured overflow forces one, in which case the raise is recorded against the entry. **Items 76 and
91** cite `src/commands/loop.mjs` and are not touched by these seams — neither the cap resolution
nor the cycle hand-off is on the stop's path; both stay as they are.

Recurring shared-write shapes, named for the PO's `files:`: the budget table
(`test/arch/testing/acd-source-directory-budget.test.mjs`), the per-directory `test/**/index.mjs`
files, and three arch ENUMERATIONS that a story turns red by doing its job — `acd-mesh-ui-read-only`'s
route list, FF-12602's narrate count, FF-5307's `ui/` digest. Each is single-writer in the partition
below; the enumerations go to the story whose diff moves them, the table and the indexes to the
register story alone.

---

## Proposed partition

Drawn from the graph's coupling. `src/loop/stop-request.mjs` is a new leaf (imports `fs`,
`workspace.mjs`, `degrade.mjs`); `src/loop/stop.mjs` imports it plus `run-store`, `work/loop` and
`work.mjs`, all leaves the other stories do not edit; `src/commands/loop.mjs` has one src dependent;
`src/mesh/presence.mjs`, `launcher.mjs`, `heartbeat.mjs` and `ui-serve.mjs` share no import edge with
`src/mesh/declarations.mjs` (0 dependents) or `src/work/loop.mjs`; `app/desktop/**` is reached by
nothing in `src/`. So 01 stands alone; 02 follows it; 03 and 04 are write-disjoint of each other
and can run as one wave once 02 lands (03 needs the core, 04 needs the verb to spawn and the marks to
read). **AMENDED from the brief's five to SIX stories:** the register is its own story 05, because the
three arch files, `test/arch/loop/index.mjs` and the budget table are the milestone's only
shared-write files and must have ONE writer, and a `@manual` story is the wrong place to build
controls. Every test directory a story would add to is at ceiling (measured), so every story but 05
EXTENDS an existing suite: no story but 05 edits an `index.mjs` or the budget table.

| story | ADRs | lands | files (write set) | depends |
|---|---|---|---|---|
| 01 `the-stop-request-has-one-home` | ADR-001 | `loopStopsDir`, `stopRequestPath`, the ten-key record, `STOP_LEVELS`, `requestLoopStop` (the ladder), `markStopHonoured`, `clearStopRequest`, `readStopRequest`, `createStopSource` (signals + file, the unref'd poll, the `AbortSignal`, the third-signal hand-back) | `src/loop/stop-request.mjs`; `test/loop/loop-diag.test.mjs` (extended — the recorder's suite is the loop's home-side files driven against injected doubles, the nearest subject at a 72/72 ceiling) | — |
| 02 `the-verb-and-the-shell-honour-it` | ADR-002, ADR-003 | `src/loop/stop.mjs` (`stopLoop`, the seven-key document, the three refusal codes); `--stop` in three homes + `launch` predicate + `run` dispatch; the source replaces `process.once`; settle-first; `cancelled` terminal; the halt helper and `Details`; mark-at-halt; `--resume` clears and narrates; FF-12602 count 10 → 11 + needle | `src/loop/stop.mjs`, `src/commands/loop.mjs`, `test/loop/loop-command-stops.test.mjs`, `test/loop/loop-command-narration.test.mjs`, `test/loop/loop-command-resume.test.mjs`, `test/loop/loop-command-probe.test.mjs`, `test/arch/loop/acd-loop-narrates-in-flight.test.mjs` | 01 |
| 03 `the-fleet-sees-and-stops-it` | ADR-005, ADR-006 §1 (the line) | `readActiveLoops`, `loops` on the record (both producers, the reshape); `localNodeId` on the status body; item 44's hoist + the three detectors re-aimed; `POST /api/mesh/loop-stop`; `fleetLoopLines`, `loopStopAffordance`, `rememberStopRung`, `nodeWorkRegion`; the card's row + button; `fleetApi.loopStop`; FF-5307 re-pinned with the measurement; enumerations grown; items 18 (b) and 44 discharged | `src/mesh/presence.mjs`, `src/mesh/launcher.mjs`, `src/commands/mesh/heartbeat.mjs`, `src/mesh/ui-serve.mjs`, `ui/src/fleet/api.ts`, `ui/src/fleet/runs.mjs`, `ui/src/fleet/runs.d.mts`, `ui/src/fleet/scope.mjs`, `ui/src/fleet/scope.d.mts`, `ui/src/fleet/Fleet.tsx`, `test/mesh/presence/mesh-presence-record.test.mjs`, `test/mesh/presence/mesh-presence-aggregate-workspaces.test.mjs`, `test/mesh/ui/mesh-ui-serve.test.mjs`, `test/ui/fleet-scope.test.mjs`, `test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs`, `test/arch/mesh/acd-mesh-ui-read-only.test.mjs`, `test/arch/mesh/acd-mesh-ui-write-isolation.test.mjs`, `test/arch/mesh/acd-mesh-ui-no-core-import.test.mjs`, `test/arch/ui/acd-fleet-face-single-mutation-route.test.mjs`, `test/arch/ui/acd-fleet-board-link-resolved.test.mjs`, `wiki/work/TECH_DEBT.md` | 02 |
| 04 `the-desktop-stops-what-it-supervises` | ADR-004 | `stop_step`, `stop_argv`, `STOP_GRACE_MS` + cargo tests; `declared` on the state, `loops` on the view model, `stop_loop`; the `is_reserved_id` branch, the ladder applied, `taskkill`, `stopping`; the second `.controlbar` in `app.js`; `stopped: Set` into the engine (default-absent); the producer reads the honoured marks | `app/desktop/crates/core/src/supervision.rs`, `app/desktop/crates/app/src/supervisor.rs`, `app/desktop/crates/app/src/main.rs`, `app/desktop/ui/app.js`, `src/mesh/declarations.mjs`, `src/work/loop.mjs`, `test/loop/work-loop-declarations.test.mjs` | 01, 02 |
| 05 `the-register` | all | the seven controls in three files; `test/arch/loop` 55 → 58; the `src/loop` exemption's `why` names `stop-request.mjs` and `stop.mjs`; red probes in `VERIFICATION.md` | `test/arch/loop/acd-loop-stop-request-single-home.test.mjs`, `test/arch/loop/acd-loop-stop-settles-the-run.test.mjs`, `test/arch/loop/acd-loop-stop-reaches-every-face.test.mjs`, `test/arch/loop/index.mjs`, `test/arch/testing/acd-source-directory-budget.test.mjs`, `wiki/work/130_milestone_stop-a-running-loop/VERIFICATION.md` | 02, 03, 04 |
| 06 `the-live-stop` (`@manual`) | all | ADR-006 §5 read at the source, after `node scripts/install-local.mjs` and the operator's restart of the desktop app: a real loop on this machine stopped from the verb, the fleet and the desktop; the record `cancelled`; the halt line; no relaunch across two declarations ticks; `--resume` brings it back; the second `--stop` cancels now | `wiki/work/130_milestone_stop-a-running-loop/STATE.md` | 05 |

Pairwise disjoint, checked: no two rows share a path. 02 and 129/04 both own `src/commands/loop.mjs`
across milestones — the SPEC's sequencing rule, ADR-001 §6. FF-13007's cargo half lands with 04 in
`supervision.rs` (04's file); its node-side leg lands with 05.

---

## Fitness functions

HARNESS SHAPE (`119/ADR-010`): each arch-test exports `archTests`, an array of `{ name, run }`, and
is registered by one import + one spread in its directory's `index.mjs` — never discovered by
`readdir`. Every control below is `pending` until story 05 lands it (FF-13007's cargo half rides
story 04); each landed control owes a red probe in `VERIFICATION.md`. The id stands alone in its
first cell. Three new files land under `test/arch/loop/` (its row rises by exactly that count —
written 55 → 58 at refine, landed 59 → 62 after 129/05's four; the delta is the invariant, graduated
at Accept 2026-09-24; FF-13002's "three drive sites" likewise span the shell and `src/loop/cycle.mjs`
since 129/04, the family FF-12602 sweeps) — the subject is the loop's stop, and the faces are its readers. The standing controls this
milestone must keep green are cited, not redeclared: FF-5304 `acd-loop-probe-contract` (ten keys,
zero spawns, the stops literal, `haltDecision`), FF-5307 `acd-loop-state-rides-the-run-record`
(re-pinned by 03 with the measurement; the store and board digests unchanged), FF-5202
`acd-loop-module-import-boundary`, FF-12602 `acd-loop-narrates-in-flight` (moved by 02 to eleven),
`acd-clock-counts-attempts` (the engine imports nothing), `acd-declaration-predicate-is-composed`,
`acd-active-runs-frozen-string-array`, `acd-captured-producer-fixture` (the Rust drift pin),
`acd-session-presence-additive`, `acd-mesh-ui-read-only` / `acd-mesh-ui-write-isolation` /
`acd-mesh-ui-no-core-import` (grown by 03), `acd-desktop-single-data-path`, `acd-source-directory-budget`,
`acd-ui-surface-file-budget`, `acd-console-log-confined`, `acd-no-new-silent-catch`.

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-13001 | **The request has ONE home.** Over a comment-stripped sweep of `src/**`, the literal `loop-stops` and the state literals `"requested"`/`"honoured"` (as a stop-request state) appear only in `src/loop/stop-request.mjs`; `src/loop/stop.mjs`, `src/commands/loop.mjs`, `src/mesh/declarations.mjs` and `src/mesh/presence.mjs` each import that module by RESOLVED specifier and contain no `path.join(` whose arguments name `meshRoot` beside a `loop` literal; `src/commands/loop.mjs` contains no `writeFile(` / `mkdir(` / `rename(` call form (FF-5307 cited) and no `process.once(` or `process.on(` whose first argument starts with `SIG`; no `src/**` module matches `*loop*-store.mjs`. Non-vacuous: the sweep finds the module and at least four importers. Red probe: spell `path.join(globalMeshPaths().meshRoot, "loop-stops", id)` in `declarations.mjs`. | `test/arch/loop/acd-loop-stop-request-single-home.test.mjs` *(pending — 130/05)* | ADR-001 |
| FF-13003 | **The verb is a probe-shaped write and one function.** Fixture: over the loop fixture with `AOF_GLOBAL_HOME` isolated and a live declaration, `getCommand("work:loop").run({ scope, stop: true }, ctx)` leaves exactly ONE new file under `<home>/mesh/loop-stops/`, leaves `treeFiles(projectRoot)` unchanged, the fake driver's `spawnCalls` at 0, and answers a document whose keys deep-equal the seven; a second call answers `request: "cancel"` and the file reads `level: 2`; a call with no declaration rejects with code `loop-stop-no-declaration`; `run({ scope })` still answers the ten keys (FF-5304 cited). Structural: `stop` is a key of the closed input schema, of `cli.spec.flags`, and appears in `cli.argv`'s body; `cli.launch`'s predicate names `options.stop`; `stopLoop` is defined in `src/loop/stop.mjs` and imported by exactly `src/commands/loop.mjs` and `src/mesh/ui-serve.mjs`. Red probe: make `launch` ignore `stop`; and separately re-implement the declaration read inside the route. | `test/arch/loop/acd-loop-stop-request-single-home.test.mjs` *(pending — 130/05)* | ADR-002 |
| FF-13002 | **The interrupt path always settles.** Structural: in `src/commands/loop.mjs`, for every `await drivePhase(` site, the binding it assigns reaches a `settleDriven(` call before any `return` in the enclosing block (the enclosing-function textual rule FF-12702 uses); every `haltDecision("operator-interrupt"` receives a producer bound from `source.producer()`; there are exactly three drive sites (FF-12602 cited). Fixture: drive `runLoopBody` with an injected `stopSource` — (a) raised to level 2 during the drive, the fake driver honouring `signal` with `{ failed, cancelled }`: the record is `cancelled` with `failureReason: null`, the `driven` row's `outcome` is `"cancelled"`, the halt is `operator-interrupt` with producer `stop-request` and `Details` `cancelled=<runId>`, the request file reads `honoured`, and NO run in the fixture is `running` (20/ADR-006); (b) raised to level 1 between drives: the drive settles `done`, the halt names the request; (c) `runLoopBody({ resume: true })` over a standing request clears the file and narrates `Cleared stop request` exactly once. Red probe: re-insert the early `return` before `settleDriven`. | `test/arch/loop/acd-loop-stop-settles-the-run.test.mjs` *(pending — 130/05)* | ADR-003 |
| FF-13004 | **A honoured declaration yields no row, and the engine still imports nothing.** Engine fixture: `decideSupervisedDeclarations` over one supervised lineage whose latest run is `failed/timeout` (retryable) answers one row; the same input plus `stopped: new Set([loopRunId])` answers none; the input with `stopped: new Set()` and the input without `stopped` answer deep-equal rows; `src/work/loop.mjs` has zero `import` statements (cited). Producer fixture: `supervisedDeclarations` over a fixture home holding a `honoured` request for that `loopRunId` answers no row, and a `requested` one still answers the row; structural: `src/mesh/declarations.mjs` imports `readStopRequest` from `src/loop/stop-request.mjs` (resolved) and passes `stopped` to the engine. Red probe: drop the `stopped` argument from the producer's call. | `test/arch/loop/acd-loop-stop-settles-the-run.test.mjs` *(pending — 130/05)* | ADR-004 §4 |
| FF-13005 | **`loops` is additive and read by the same pass.** `assemblePresenceRecord` without `loops`, and with `loops: []`, is byte-identical to today's record (the six keys, order included); with one entry the key is LAST, after `buildId`; `activeRuns` stays `string[]` (cited); `assemblePresenceRecord(diskRecordWithLoops)` — the registry's reshape — keeps the entry; `readActiveLoops` over a fixture with one running loop run and a `requested` level-2 file answers exactly one eleven-key entry with `stop: "cancel"`. Structural: every `src/**` module that calls `readActiveRuns(` also calls `readActiveLoops(` — two today, `heartbeat.mjs` and `launcher.mjs`, and the sweep must find both. Red probe: remove the launcher's call. | `test/arch/loop/acd-loop-stop-reaches-every-face.test.mjs` *(pending — 130/05)* | ADR-005 §1-§2 |
| FF-13006 | **The fleet's button is local-only and reaches the one route.** `loopStopAffordance` answers `button: null` for `localNodeId: null`, for `node.nodeId !== localNodeId`, and after rung 2; a rung-1 button otherwise; `rememberStopRung` never lowers a rung; `fleetCurrentWorkLines` over the captured producer fixtures is byte-identical to its pinned lines (cited); `ui/src/fleet/**` contains exactly one `fetch("/api/mesh/loop-stop"` (in `api.ts`) and none of the `work-loops` / `work/loops` / `loops-` tokens (FF-5202 cited); in `ui-serve.mjs` the `/api/mesh/loop-stop` branch reads exactly `body.scope` and `body.workspaceId` and calls `admitWriteRequest(` before `readJsonBody(`; the route table is exactly six (cited); the status route's body carries `localNodeId`. Red probe: render the button for every node. | `test/arch/loop/acd-loop-stop-reaches-every-face.test.mjs` *(pending — 130/05)* | ADR-005 §3-§5 |
| FF-13007 | **The desktop's ladder is pure and the argv is formed in core.** Cargo (`supervision.rs` `#[cfg(test)]`, run by `scripts/test.mjs` over `app/desktop/Cargo.toml`): `stop_step` — presses 1 → `Request`, 2 → `Cancel`, cancel + grace → `Kill`, `exited` → `Done`, otherwise `Wait`; `stop_argv` — a declaration's argv → `["work","loop","<scope>","--stop"]`, a reserved id or a two-token argv → `None`; `reconcile` retains a held, undesired id whose row persists and stops it when the row is gone. Node-side structural: `app/desktop/crates/app/src/supervisor.rs` spells no `"--stop"` literal and reaches `taskkill` in exactly one place; `main.rs` registers `stop_loop` in `generate_handler!`; `app.js` invokes `stop_loop` from exactly one delegate. Red probe: form the argv in `supervisor.rs`. | `test/arch/loop/acd-loop-stop-reaches-every-face.test.mjs` (node leg) + `app/desktop/crates/core/src/supervision.rs` tests (cargo) *(pending — 130/05 for the node leg; the cargo half lands with 130/04)* | ADR-004 §3-§4 |
