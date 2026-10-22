---
doc: architecture
---
# 167 · The daemon stays within a resource budget — Architecture Decisions

Recall `c9795090-a486-4519-ab3f-3250c24256bb` (architect, `--area architecture`) surfaced
m164/ADR-004 (one sync pass, three drivers). It is **honoured**: no decision here adds a fourth
driver or a second pass. ADR-005 changes only how the tick driver treats a pass that keeps
failing. It also surfaced m33/ADR-003, m27/ADR-005, m22/ADR-004 and m70/ADR-009, none of which
bears on these decisions.

**Measured at refine (2026-10-20, read-only, control node).** Over a 20 s sample, `mesh serve`
held **128% of one core**, with 30,932 CPU-seconds since its start. `mesh ui` held 0%. So the
cost is the serve daemon's own ticks, not only viewer requests. `work-read-cache-unavailable`
still fires at the degrade sink's 5 s throttle
(`packages/foundation/src/degrade.mjs:4`), so the true read rate is unknown. That missing count
is the gap ADR-001 closes. The registry holds 66 workspaces for this node, and 58 of them no
longer exist on disk (57 are dispatch-worktree roots). The journal shows no failing
`publish-projection` step: 16,196 are `done`. Even so, the cache answers "no rows for this
workspace". The degrade line does not name the workspace, so which one is not knowable today.

## ADR-001: Each daemon process has ONE cost meter, a zero-import leaf. It counts by cause and persists a snapshot that `aof mesh status`, `aof work doctor` and the desktop all read

**Status:** Accepted
**Date:** 2026-10-20

**Context.** Nothing in either daemon measures its own cost. The degrade sink throttles each code
to one line per 5 s, so a read that falls back to disk 100 times a second and one that falls back
once look the same. `mesh status` is a separate CLI process, so it cannot ask a daemon's memory.
`mesh ui` publishes no presence record, so the presence record cannot carry its cost.

**Decision.**
- **The meter** is `packages/foundation/src/cost-meter.mjs`, a leaf beside `degrade.mjs`. It
  reads CPU from `process.cpuUsage()` and event-loop utilisation from
  `perf_hooks.performance.eventLoopUtilization()`. It also holds **counters by cause**, each with
  optional labels `{ workspaceId, route, client, code }`. It is the only module in `packages/`
  that reads either clock (FF-16701). `packages/foundation/src` stays at or under the flat-layer
  threshold (7 → 8).
- **The causes** form a closed set declared in the meter: `full-disk-read`, `cache-hit`,
  `cache-miss`, `sync-pass`, `sync-failure`, `request`, and `degrade` (one per code). `degrade`
  counts **every** report, before the throttle drops the line. A throttled line still counts.
- **The sites.** The degrade sink increments `degrade`. `packages/work/src/read.mjs` counts
  `full-disk-read`, `cache-hit` and `cache-miss` where it already decides them. The tick driver
  (`packages/mesh/src/launcher.mjs`) counts `sync-pass` and `sync-failure` per workspace and code.
  Both HTTP faces (`packages/mesh/src/ui-serve.mjs`, `packages/server/src/board-ui.mjs`) count
  `request` by route and by client. The UI sends `X-AOF-Client: fleet|board`, the desktop's own
  status reads are not HTTP, and an absent header counts as `unknown`.
- **Every degrade line names its workspace when the caller has one.** `reportDegrade` already
  takes a context object. The read path passes `workspaceId`, and the line carries it.
- **The snapshot.** Each daemon writes `<meshDir>/cost/<nodeId>.<daemon>.json` atomically every
  15 s and once at a clean exit. The file holds `at`, `pid`, `daemon` (`serve` | `ui`), CPU and
  event-loop utilisation over the last 60 s and since start, the state the budget judges
  (ADR-002), and the top causes in the window with their labels. It is written through
  `packages/mesh/src/presence.mjs`, the module that already owns writes under `meshDir` (the
  write-scope seam), and read through the same module.
- **The readers.** `aof mesh status --json` gains a `cost` block: this node's daemons, each
  snapshot and its age. A snapshot older than 45 s (three missed writes) reads as
  `not-reporting`. `aof work doctor` gains a lane, `doctor/daemon-cost.mjs`, that is pure over
  the snapshots its command edge reads. It warns `daemon-over-budget`, naming the top cause and its
  workspace, and warns `daemon-not-reporting`. Both are warns: they never fail validate.

**Alternatives considered.**
- *Ride the presence record.* Rejected: only `serve` writes one, it replicates to peers, and
  counters do not belong on the mesh wire.
- *A daemon HTTP endpoint.* Rejected: a pegged or hung daemon answers nothing. A file with an
  `at` still says "not reporting since 18:05".
- *A profiler.* Out of scope (SPEC). Counters by cause answer "on what", which is the question an
  operator can act on.

**Consequences.** `packages/work/src/doctor` rises 13 → 14 for `daemon-cost.mjs`. It is a
distinct subject from `sync.mjs`, which reports what the store is owed; this lane reports what
the daemon costs. The meter's counters are process memory: a restart zeroes them, and the
snapshot's `since start` says so.

### Diagram

Why: two daemons, three readers and one file per daemon. The data path is what a builder needs
to see. View: data flow. Components: the `serve` and `ui` daemons with their counter sites, the
meter, the snapshot files under `meshDir/cost/`, `aof mesh status --json`, the doctor lane and the
desktop guard (ADR-006). Flows: sites → meter → snapshot every 15 s → each reader, and
`cost.budget` → desktop.

![ADR-001 — Each daemon process has ONE cost meter, a zero-import leaf. It counts by cause and persists a snapshot that `aof mesh status`, `aof work doctor` and the desktop all read](diagrams/ADR-001-daemon-cost-flow.svg)

Source: [ADR-001-daemon-cost-flow.html](diagrams/ADR-001-daemon-cost-flow.html) · PNG: [ADR-001-daemon-cost-flow.png](diagrams/ADR-001-daemon-cost-flow.png)

---

## ADR-002: The budget has ONE home, the meter. It judges CPU as a share of one core over 60 s, in two states the daemon decides for itself, and readers are handed the numbers rather than re-declaring them

**Status:** Accepted
**Date:** 2026-10-20

**Context.** The SPEC left the numbers to the operator (167/00 Q1). The shape of the measure is
an engineering choice, and it has to hold up in three places: the doctor lane, the soak test
(ADR-007) and the Rust guard (ADR-006).

**Decision.**
- **The measure** is CPU-seconds consumed per wall-second, as a percentage of one core, averaged
  over a sliding 60 s window, per daemon process. Child processes are not counted, because the
  daemons spawn `git` and those costs are the work the operator asked for. A share of one core
  stays meaningful on any core count.
- **Two states.** A daemon is `viewer-open` when it served a `fleet` or `board` request in the
  last 30 s, and `idle` otherwise. The snapshot states which budget applies, so no reader infers
  it.
- **The numbers** are exported constants in `cost-meter.mjs`, `DAEMON_BUDGET`
  (`{ idlePercent: 2, viewerOpenPercent: 10 }`), the operator's answer to 167/00 Q1
  (2026-10-20). No other file in
  `packages/`, `apps/` or `test/` declares a budget number (FF-16702). The soak test imports the
  constants. The desktop reads them off `mesh status --json` `cost.budget` and holds no literal.
- **Over budget** is a judgement on one window. **Sustained** is the desktop guard's word for
  being over budget for 5 minutes (167/05 Q1).

**Alternatives considered.** *A config key per machine.* Rejected for now: the budget is a
product promise, and a per-machine key would let the soak test's number drift from the one a
user's device is held to. A key can wrap the constant later without moving its home.

---

## ADR-003: A read of an unchanged work tree costs one stat walk. The stream read is single-flight, and its result is remembered by stat digest

**Status:** Accepted
**Date:** 2026-10-20

**Context.** Every tick and every viewer poll re-reads and re-parses the record docs.
`listItemsCacheFirst` → `buildStreamView` (`packages/work/src/read.mjs`) is reached from the
presence tick for every resolved workspace and from the board's `/api/work/list`.
`readWorkspaceProjectionItems` (`packages/mesh/src/projection-store.mjs`) is reached from the
sync detector and the stream-snapshot tick. When the cache is empty, as now, every one of those
reads parses the whole tree. 164/ADR-002 already defines the right signal:
`workspaceStatDigest` (`packages/mesh/src/publisher.mjs:262`), a hash of `(path, size, mtimeMs)`,
measured at about 240 ms of wall time for 3,200 files. But it lives in `@aof/mesh`, which
`@aof/work` cannot import.

**Decision.**
- **The digest moves to `@aof/work`**, into `packages/work/src/discovery.mjs`, the one
  enumerator of the work tree. It is exported as `workTreeStatDigest(workDir)`. The publisher
  imports it, and keeps no copy of its own. No file is added to `packages/work/src`.
- **The stream read is memoised by digest.** One per-process memo, keyed by the resolved
  `workDir`, holds the last digest and the parsed result (items plus record metadata). A read
  computes the digest, and an equal digest returns the remembered result without reading a
  record doc. Both hot consumers above read through it.
- **Single-flight.** Concurrent reads of one `workDir` share one in-flight walk and parse. The
  second caller awaits the first's promise. A failed read is never remembered.
- **Correctness is the digest's.** An edit changes `mtimeMs` or `size`. A digest that cannot be
  computed (an unreadable tree) bypasses the memo and reads from disk, exactly as today.
- **Counted.** A memo answer counts `cache-hit` with label `memo`. A parse counts
  `full-disk-read` (ADR-001), so the soak test can prove the parse stopped.

**Alternatives considered.**
- *A file watcher.* Rejected, as 164 rejected it: a watcher is a second source of change truth,
  and it is unreliable on network drives and in WSL.
- *A time-to-live cache.* Rejected: it serves a stale answer for the length of the TTL, and the
  board's freshness promise is the poll.
- *Memoise per file inside `readItemMeta`.* Rejected as the decision: it still opens every file
  on every read. It stays available as a later refinement under the same digest.

---

## ADR-004: An idle view costs almost nothing. The two polled routes answer conditionally, and every UI poller pauses while hidden and backs off while nothing changes, through ONE cadence helper

**Status:** Accepted
**Date:** 2026-10-20

**Context.** The board polls `/api/work/list` every 5 s, `/api/work/run-status` per running item
every 5 s, and `/api/work/next` per gate. The fleet polls `/api/mesh/status` every 5 s, and the
detail panel polls runs every 5 s, and the home feed polls on its own cadence. Each poller is a
bare `setInterval` (`apps/ui/src/board/Board.tsx`, `apps/ui/src/fleet/Fleet.tsx`,
`apps/ui/src/board/DetailPanel.tsx`, `apps/ui/src/home/Home.tsx`). None pauses when the window is
hidden, and none slows down when the answer has not changed.

**Decision.**
- **Conditional GET.** `/api/work/list` and `/api/mesh/status` send an `ETag`, a hash of the
  response body. A request whose `If-None-Match` equals it gets `304` with no body. Server compute
  for an unchanged tree is already one stat walk (ADR-003). The 304 removes serialisation,
  transfer and the client's re-render.
- **One cadence helper**, `apps/ui/src/lib/poll-cadence.mjs`, owns the next-delay rule. While
  `document.hidden` it polls nothing. On becoming visible it polls at once. Each unchanged answer
  (`304`, or an equal body) doubles the delay from the base up to a 15 s cap, the operator's
  answer to 167/02 Q1 (2026-10-20), held as a named constant in the helper. A changed answer, a user action on that
  surface, or a pending assign (the fleet's `Sent` hold, which is timed in `POLL_MS`) returns it to
  the base at once. Every interval poll in `apps/ui/src` goes through it (FF-16703). Two kinds are
  exempt: the clock ticks that only re-render a relative time, and the session launcher's bounded
  wait for one spawn outcome.
- **The base cadences do not change.** While the answers keep changing, a user sees each change
  within the base cadence. After a quiet spell, a change can take up to the cap to appear.

**Alternatives considered.** *Server push (SSE or a WebSocket) for work changes.* Rejected for
this milestone: it needs a change signal the daemon does not have without a watcher (ADR-003).
Conditional polling gets most of the saving with no new channel.

**Consequences.** The fleet's assign timeout (`ASSIGN_TIMEOUT_MS = POLL_MS * 2`) keeps its meaning,
because a pending assign pins the base cadence.

---

## ADR-005: The tick driver says a permanent failure once and backs off from it, and a registration whose workspace is gone stops being walked

**Status:** Accepted
**Date:** 2026-10-20

**Context.** `syncTickWorkspaces` and `assemblePresenceForTick`
(`packages/mesh/src/launcher.mjs`) each call `resolveTickWorkspaces`, so every tick resolves the
registry twice and warns twice for each unresolvable registration. A pass that throws the same
permanent error (the measured `event-id-conflict`) is retried on the next tick, forever, and warns
every time. 164/ADR-006 made a journal step retry until done with backoff. That covers a
`publish-projection` step that failed. It does not cover a pass that throws before it appends.

**Decision.**
- **One resolve per tick.** The tick resolves its workspace set once. The sync pass and the
  presence aggregation both use that result, and each unresolvable registration is warned about
  at most once per tick.
- **Permanent failures are a closed set** declared in the launcher: `event-id-conflict`,
  `workdir-missing`, `not-a-directory` and `no-descriptor`. Any other code is transient and keeps
  today's behaviour.
- **Said once, then backed off.** The driver keeps an in-memory ledger per
  `(workspaceId, code)`. The first permanent failure warns once, naming the workspace and the code,
  and counts `sync-failure` (ADR-001). Later passes for that workspace are skipped until a backoff
  elapses. The backoff doubles from one tick up to a 1-hour cap. It ends early when the
  workspace's stat digest moves (ADR-003), because a change can be the fix. A skipped pass is
  counted, not warned. A daemon restart clears the ledger, so the fault is said once more.
- **A registration whose work dir is gone is removed at once**, with one line naming the
  workspace and its path (the operator's answer to 167/03 Q1, 2026-10-20). The removal is
  reversible by use: the next aof command run in that folder registers it again. Removing a
  registration is a write to the registry, so its one writer is
  `packages/mesh/src/global-node-registry.mjs`. A node only ever removes its own membership rows
  (`node_id` = self). A registry that cannot be read removes nothing.

**Alternatives considered.** *Fix registration of dispatch worktrees at the source.* Deferred: a
live lane's registration may be what puts a lane's progress on the fleet, and that is not measured
here. Pruning the dead ones is safe either way.

---

## ADR-006: The desktop guard samples each daemon's CPU from the OS, judges it against the budget the status read hands it, and shows and logs a sustained overrun. It never kills

**Status:** Accepted
**Date:** 2026-10-20

**Context.** `aof-mesh-desktop.exe` supervises both daemons (`apps/desktop/crates/app/src/supervisor.rs`)
and already runs `aof mesh status --json` every 3 s (`apps/desktop/crates/core/src/poll.rs`). A
daemon that burns a core may stop writing its own snapshot (ADR-001). An outside sample is the
only one that survives that.

**Decision.**
- **The sample.** Each poll tick, the supervisor reads each reserved child's cumulative CPU time
  from the OS by its process handle (`GetProcessTimes` on Windows), and turns successive samples
  into a share of one core. The OS call sits behind a trait in the app crate. The judgement is a
  pure module in the core crate, `apps/desktop/crates/core/src/guard.rs`, tested over fake
  samples. Grandchildren are not counted (ADR-002).
- **The budget is handed in.** The guard judges against `cost.budget` and each daemon's `state`
  from the status read it already makes. A daemon whose snapshot is `not-reporting` has no known
  state, so it is judged against the viewer-open budget, the looser of the two. A daemon too busy
  to report is still caught. If `cost.budget` itself is absent, the guard judges nothing. It holds
  no budget literal (FF-16702).
- **One footer slot.** A standing exit notice (a child that died) outranks an overrun notice. The
  overrun still sets the tray state.
- **Sustained.** A daemon is in overrun once its share stays over budget for 5 minutes, the
  operator's answer to 167/05 Q1 (2026-10-20). It leaves overrun once it has been back under budget for one full window.
- **Shown.** While a daemon is in overrun, the tray shows its existing `degraded` icon, and the
  window's footer, the one notice slot (`apps/desktop/ui/app.js`), names the daemon, its share and
  its budget. If the daemon's snapshot names a top cause, the footer adds it.
- **Logged.** Entering and leaving overrun each append one JSON line to
  `~/.aof/mesh/logs/degrade.log` in the sink's shape, with `proc: "desktop"` and code
  `daemon-over-budget` or `daemon-back-within-budget`.
- **Never kills.** The guard has no path to stop, restart or kill a child (FF-16704). The
  operator decides.
- **The binding** comes from `windows-sys` 0.61.2, which `apps/desktop/Cargo.lock` already holds.
  It is declared as a target-scoped direct dependency with the feature the call needs, so the
  lockfile gains no package. The supply-chain audit confirms it.

**Alternatives considered.** *Trust the daemon's snapshot alone.* Rejected: the case that
prompted this milestone is a daemon too busy to be trusted. *Kill or restart on overrun.*
Rejected by the SPEC: nothing is ever killed silently.

---

## ADR-007: The budget is proven by a soak test that runs the real daemons over a generated tree as large as aof's, with planted faults and a polling viewer. It joins the regression gate

**Status:** Accepted
**Date:** 2026-10-20

**Context.** Unit tests cannot see a cost that comes from cadence × tree size × fault. The SPEC
asks for a test that goes red over budget and runs in the gate. The gate runs across sharded
workers, so the measure must hold up under contention.

**Decision.**
- **The harness** (`test/mesh/budget/soak-harness.mjs`) generates a fixture project at test time:
  about 1,800 record docs in aof's own shape (32 at the root, the rest archived), never committed.
  It starts the real CLI's `mesh serve --serve` and `mesh ui` as child processes under an isolated
  `AOF_GLOBAL_HOME`, on ephemeral ports. The fixture config sets the control-stream port through
  `mesh.relay.url`, and `mesh ui` gets `--port`. Nothing binds `:4181` or `:4182`.
- **Three planted faults**, from the motivating case: an empty cache for the fixture workspace
  (its descriptor is registered and it has no rows), a sync that fails with `event-id-conflict`
  (the journal is seeded with a conflicting event id), and five registrations whose work dirs do
  not exist.
- **Phases.** A 15 s warm-up, then 30 s idle, then 30 s with a viewer that polls the fleet and the
  board at the UI's cadence over real HTTP, sending `X-AOF-Client` and honouring `ETag` as the UI
  does.
- **The measure** is CPU-seconds per phase, from each daemon's cost snapshot (ADR-001). It is
  judged against `DAEMON_BUDGET` (ADR-002). CPU-seconds hold up under contention: a loaded
  machine stretches wall time, but the work a fixed cadence does stays the same.
- **It asserts:** each daemon under budget in each phase; `aof mesh status --json` names each
  planted fault as a counted cause, with its workspace; and the degrade log carries the
  failing sync's line and each gone registration's line once, not once per tick.
- **The gate.** The suite is registered through `test/mesh/budget/index.mjs` and
  `test/mesh/index.mjs`, so `yarn test:sharded` runs it as one unit of about 90 s.

**Alternatives considered.** *Run the launcher in-process with injected tickers.* Rejected: the
injected tickers are the part that hides the cost. *Commit a fixture tree.* Rejected: 1,800
generated files are cheaper to make than to review.

---

## ADR-008: A workspace puts its own runs in the store through the ledger it already writes, and the presence tick reads what is running from the store

**Status:** Accepted
**Date:** 2026-10-21

**Context.** 167/04's soak measured `mesh serve` at 12–14% of one core while idle, against the 2%
budget, on Linux as on Windows. A CPU profile in the container named the cause:
`readActiveRuns` and `readActiveLoops` (`packages/mesh/src/presence.mjs`) each call `readRuns`
for every item of every registered workspace, archived ones included. That is two `readdir`s of a
`runs/` folder that almost never exists, about 3,600 `ENOENT`s per 15 s tick over 1,800 docs.
The responsibility is inverted: the daemon rebuilds "what is running" by walking every workspace,
when each workspace already announces every run change. Every run transition goes through the one
seam, `run-transitions.mjs` (`transitionRunStart`, `transitionRunComplete`,
`transitionRunReclaimed`, `transitionStaleRunsReclaimed`, pinned by `acd-effects-ledger`), which
raises `run.started` or `run.completed` into 164's journal. The `@aof/mesh` reactor on both,
`publish-projection`, republishes item rows only. The store already has `work_item_runs` and a
running-run reader over it (`readCachedActiveRunIds`), but today only worker streams fill them.

**Decision.**
- **The workspace writes.** `run.started` and `run.completed` gain one more `@aof/mesh` step,
  `publish-run` (locus `local`, 164/ADR-006's retry until done), beside an unchanged
  `publish-projection`. It upserts that run's record into `work_item_runs`, with this node as its
  reporter, reading the record as it stands when the step runs, so the step is state-based and
  idempotent. When a mint passed no workspace, the step resolves it from the run's own item, so
  no mint site changes. It publishes only where the one propagation predicate allows, so a lane,
  a secondary checkout or a workspace off the mesh writes nothing. A run the ledger never saw (one written before this change) reaches it through the
  existing reconciler's backfill, run when a command or the daemon start reconciles.
- **The daemon reads.** The presence tick takes this node's running runs, and the loops they
  declare, from `work_item_runs` over its one store handle. It calls no `readRuns` and reads no
  item's `runs/` folder. The union across registered workspaces is unchanged (m38/ADR-003). Only a
  loop's `lastActivityAt` still comes off disk: the heartbeat writes a running run's `heartbeatAt`
  without raising an event, so presence reads that one field from each running run's own record,
  one read per running run, never one per item.
- **A workspace that does not propagate has no ledger rows,** so its runs are not in this node's
  presence. It is not on the mesh, so no face shows it.
- **Counted** (ADR-001): the presence read counts `cache-hit` labelled `runs`.

**Alternatives considered.**
- *Keep the walk, but over live items only, once per tick.* Rejected by the operator
  (2026-10-21) as treating the symptom: the daemon would still own a workspace's job.
- *A run index of its own under the global home.* Rejected: 164/ADR-003 already refused a sibling
  ledger, and the journal plus `work_item_runs` is that index.
- *Raise an event on every heartbeat.* Rejected: a heartbeat fires every few seconds per session,
  and the one field it moves is cheap to read from one file.

---

## ADR-009: The daemon watches each work tree it syncs, and an unchanged watched tree costs no stat walk. A safety walk every 5 minutes, and today's walk wherever a watch cannot be held

**Status:** Accepted
**Date:** 2026-10-22
**Amends:** ADR-003 for the daemon. A read of an unchanged tree that is WATCHED costs nothing; a
tree that is not watched still costs one walk.

**Context.** After 06, 167/04's soak still measures `mesh serve` idle at 6–7% of a core, against the
2% budget (F-04). A `--cpu-prof` in the container (STATE.md, 2026-10-22) has the main thread idle
for 103.7 of 109.8 s. The only frames that are not idle are `readdir`, `stat` and
`readdirRecursive` under `statWorkTree` (`packages/work/src/discovery.mjs`), so the cost is the stat
walk's threadpool work. A preload counter found **≈3 walks per 15 s tick** of the same tree, from the
backoff check (`workTreeMovedSince`, `launcher.mjs`), the publisher's stat gate
(`syncWorkspace`, `publisher.mjs`) and the presence read's memo digest (`readStreamSnapshot`). One
walk of aof's own tree costs ≈0.4–0.5 CPU-s in Linux and ≈1.1 CPU-s on Windows (167/00/R2 and 167/01/R2:
measured as CPU, not wall time). The idle budget is 0.3 CPU-s per tick. Even one walk per tick
spends it all, so sharing one digest per tick cannot pass, and an idle tick has to walk nothing.

**Decision.**
- **One home for the walk and the watch.** `discovery.mjs` keeps `statWorkTree` as the only walk
  and gains the only work-tree watch, `createWorkTreeWatches({ watch, now, safetyMs, meter,
  reportDegrade })`. Its handle has `retain(workDirs)` and `close()`, and it is one per process. A
  watched tree's entry holds `dirty`, the last complete walk's `{ digest, shape, complete }`, the
  time of that walk, and the walk in flight.
- **The gate is inside the walk, so no caller changes.** `statWorkTree` answers a watched tree with
  its last walk when the tree is not dirty, the last walk was complete, and the walk is younger
  than `safetyMs` (5 minutes). Otherwise it walks. `dirty` is cleared when a walk STARTS, so an
  event during the walk makes the next ask walk again. A second ask while a walk is in flight
  awaits that walk, and never reads the answer it is about to replace. All three tick sites
  (`workTreeStatDigest` twice, and `readStreamSnapshot`) are therefore gated at once.
- **What makes a tree dirty.** Any watch event, except one whose file name has an extension other
  than `.md` or `.feature`: a run record, a log or a JSON lock never forces a walk. An event with no
  file name, or one naming a folder, is dirty. That honours 167/01/R1 (the tree's shape is part of the
  key).
- **The daemon arms, nothing else does.** `mesh serve` passes `workTreeWatch: true` to
  `startLauncher`. Each tick retains watches for the work dirs the sync pass did not skip as
  non-propagating, so a lane or a checkout that is off the mesh is never watched. A watch for a
  dir that is no longer in the tick set is closed. `stop()` closes them all. A tick whose registry
  read failed changes no watch. The CLI, the tests and `mesh ui` arm none, so ADR-003's behaviour
  is unchanged for them, and every delivered 01 and 03 scenario still holds as written.
- **A tree that cannot be watched is walked as before.** A watch that throws when it starts, or
  emits `error` later, is closed and dropped. That dir is not armed again in this process, and one
  degrade `work-tree-watch-unavailable` names it.
- **Counted** (ADR-001). `stat-walk` joins the closed cause set, and every real walk in a process
  that holds watches is counted under it, labelled `unwatched`, `first`, `changed` or `safety`.
  The next walk that costs the budget is then named by `mesh status`, not found by a profiler.

**Alternatives considered.**
- *One digest per tick, shared by the three sites.* Rejected: measured, one walk already spends
  the whole idle budget on an aof-sized tree.
- *Slower idle sync (the gate every 60 s).* Rejected by the operator (2026-10-22): edits would take
  up to a minute to reach the store, and Windows would still sit near 2%.
- *Raise the idle budget.* Rejected by the operator: the daemon would still cost a share of a core
  on every user device.
- *Watch in `mesh ui` too, for board polls.* Not now. A board poll walks in `ui`, which is held to
  the 10% viewer-open budget and measured under it.

**Assumptions.** Recursive `fs.watch` is native on Windows (`ReadDirectoryChangesW`) and macOS
(FSEvents), and inotify-backed on Linux from Node 20. On Linux each watched folder costs one inotify
watch, so a tree with more folders than `fs.inotify.max_user_watches` allows fails to arm. It is
then walked as before and said once. Inotify sees no change made from Windows to a
`/mnt/c` tree, so such a tree is stale for at most `safetyMs`. A watched root that is deleted while
the daemon runs is held open until its watch errors and is closed. Only trees that propagate are
watched, so the dispatch lanes that are created and removed all day are never held.

Recall `729a69d4-93f4-4b8a-b9f0-30542740e4ed` (architect, `--area architecture`) surfaced ADR-003
(amended here, not replaced), m164/ADR-004 (honoured: still one pass and three drivers, now
gated), 167/01/R2 (honoured: every cost above is CPU) and 167/01/R1 (honoured: a folder event is dirty).
It also surfaced m22/ADR-004, which does not bear on this.

---

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-16701 | Only `packages/foundation/src/cost-meter.mjs` reads `process.cpuUsage` or `eventLoopUtilization` in `packages/` sources | `test/arch/mesh/acd-one-cost-meter.test.mjs` | ADR-001 |
| FF-16702 | A daemon budget number is declared only in `cost-meter.mjs`; no other `packages/`, `apps/` or `test/` file holds one, and the desktop crates hold no budget literal | `test/arch/mesh/acd-daemon-budget-one-home.test.mjs` | ADR-002, ADR-006 |
| FF-16703 | Every interval poll in `apps/ui/src` is scheduled through `apps/ui/src/lib/poll-cadence.mjs` (clock re-render ticks exempt) | `test/arch/ui/acd-ui-polls-through-one-cadence.test.mjs` | ADR-004 |
| FF-16704 | The desktop guard (`guard.rs` and its app-crate caller) has no path to stop, restart or kill a child | `test/arch/ui/acd-desktop-guard-never-kills.test.mjs` | ADR-006 |
| FF-16705 | The presence tick reads running runs and loops from `work_item_runs`: no function on its path calls `readRuns` or reads an item's `runs/` folder, and the `publish-run` reactor of `run.started` and `run.completed` writes the run row | `test/arch/mesh/acd-presence-reads-runs-from-the-store.test.mjs` | ADR-008 |
| FF-16706 | `packages/work/src/discovery.mjs` is the only file in `packages/work/src` or `packages/mesh/src` that walks a tree with a recursive `readdir` or calls `watch` from `node:fs`; `mesh serve` is the only caller that arms work-tree watches | `test/arch/mesh/acd-one-work-tree-walker.test.mjs` | ADR-009 |
