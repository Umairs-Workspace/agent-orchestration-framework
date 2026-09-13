// src/mesh/assignment-reclaim.mjs — the CONTROL-side dual-staleness reclaim path
// (milestone 35 / story 02, ADR-005, task 04). A non-terminal assignment is
// reclaimed to `reclaimed` ONLY when BOTH clocks agree the target worker is gone:
// presence stale (`isNodeStale`, IMPORTED from mesh-presence, default 90s) AND the
// linked run's heartbeat stale (`isStale`, IMPORTED from run-store, the m20
// `work.loop.heartbeatMs` 15m default) — both strict `>`. This is
// `reclaimed`'s SOLE producer (assignment-record.mjs's ASSIGNMENT_STATE_PRODUCERS:
// "the control reclaim path").
//
// SEMANTICS mined from `reference/retired-dispatch-tests/fleet-orphan-reclaim.mjs`
// (the git-observed LEASE mechanism is discarded per ADR-003/005 — only the decision
// table transfers): presence has PRECEDENCE (fresh presence is hands-off even with a
// stale heartbeat — the worker is alive, the run is just quiet); NO presence record is
// UNKNOWN liveness, NOT staleness (the m23/KR2 guard — never reclaim a possibly-live
// peer); exactly-AT the presence threshold is still LIVE (strict `>`).
//
// BOTH staleness predicates are IMPORTED and SHARED, never re-derived (fitness #10
// acd-assignment-reclaim-dual-staleness) — this module holds no parallel heartbeat
// definition.
import { isNodeStale, readPresenceRecord, DEFAULT_PRESENCE_STALENESS_SECONDS } from "./presence.mjs";
import { isStale, readRuns } from "../run-store.mjs";
import { consumeHeartbeatQueue } from "../run-heartbeat-consumption.mjs";
import { DEFAULT_HEARTBEAT_MS, heartbeatFromConfig, scheduleToStartFromConfig } from "../loop-bounds.mjs";
// m43 / story 06 (ADR-005) — a STAGE-2 LEAF. The reclaim resolves the assignment's item to
// read its LOCAL run record; on a cross-machine assignment that item is exactly the one this
// checkout does not hold, so a disk-only resolve returned null and the streamed-record
// fallback below carried the whole path. Resolving cache-first makes the ref resolvable, and
// the `item != null` guard already in place keeps the local read honest for a cache-answered
// row (its `dir` is null and `readRuns` is simply not attempted for it).
import { findWorkCacheFirst } from "../work/read.mjs";
import { isActiveAssignmentState, listAllAssignments } from "../assignment-record.mjs";
// m42 wave (d) leg d3 — the SHARED assignment transition (holder + terminal guards
// in front of EVERY write; this tick previously had none of its own).
import { transitionAssignmentState } from "../effects/assignment-transitions.mjs";
// m42 wave (d) leg d4 (port 2) — the SHARED run-reclaim edge. This tick force-failed
// the run with its own inline copy of the reclaim transition and then rolled nothing
// back and published nothing; the restart scan did the opposite half inline at its
// own call site. Both now settle here, so both inherit the declared cascade.
import { transitionRunReclaimed } from "../effects/run-transitions.mjs";
// milestone 35 / ADR-008 — runControlDispatchReclaimTick (bottom of this file) is the
// control-side driver's DATA-LAYER orchestrator: it owns the ONE store-open call for
// BOTH halves (dispatch scan + reclaim), so mesh-launcher.mjs itself never imports
// global-work-store.mjs / openGlobalWorkProjectionStore directly (fitness
// acd-global-publisher-single-seam — the launcher reaches the global store only
// through a sanctioned seam, never the SQLite store module itself).
import { openGlobalWorkProjectionStore, readWorkItemRuns } from "../global-work-store.mjs";
// VERIFICATION (UI phase selection, 2026-07-25) — the per-assignment phase directive
// (which lifecycle command the worker runs). The dispatch call site below reads the
// operator-chosen phase from the additive side-table and maps it to the command string;
// the refine default above delegates to the SAME mapper.
// 63/03 (ADR-006 §2, ADR-010 §2) — the SIBLING resolver arrives from the SAME one home.
// This tick reads a phase and asks that module what the phase resolves to; it never maps
// a phase itself and holds no launch vocabulary of its own.
import {
  readAssignmentPhase,
  assignmentDirectiveResolution,
  assignmentDirectiveLaunch,
  phaseRunsOnItemBranch,
  readItemBranch,
  DEFAULT_ASSIGNMENT_PHASE,
} from "./assignment-directive.mjs";
import { headCommit } from "./worktree.mjs";
import { existsSync } from "node:fs";
// m42 item 3 — a log-channel fault is reported, never thrown into the tick.
import { reportDegrade } from "../degrade.mjs";
// ADR-006 — the machine/target bound keeps its ONE existing home. This module
// consumes the resolver; it never names the config key or supplies another default.
import { dispatchConcurrencyFromConfig } from "../work/dispatch.mjs";

// The PRODUCTION row source: every assignment row for `workspaceId`, off the SAME
// bulk reader story 03's status shape already uses (no second query surface).
function defaultListAssignments(store, workspaceId) {
  return listAllAssignments(store).filter((row) => row.workspaceId === workspaceId);
}

// defaultAssignmentDirectiveCommand(itemRef) — milestone 38 / story 05 (ADR-013): the
// DOCUMENTED DEFAULT whole command string dispatched with a directive when the operator
// chose NO explicit phase. Every dispatch names the first phase of the full lifecycle,
// `/aof:refine <ref> --autonomous`, exactly ADR-013's own worked example — the worker
// types EXACTLY this into its interactive session's PTY stdin
// (mesh-worker-execution.mjs's driveInteractiveClaudeSession).
//
// VERIFICATION (UI phase selection, 2026-07-25) — the "later story's concern" the
// original comment named has arrived: the operator can now pick refine/continue/verify
// in the UI, persisted per-assignment in the additive `global_assignment_directives`
// side-table (mesh-assignment-directive.mjs — the assignment record stays FROZEN, so the
// phase never lives on it). The dispatch call site below reads that phase and maps it via
// `assignmentDirectiveCommand`; this default is the fallback when a row is absent (a CLI
// `aof mesh assign` with no phase), delegating to the SAME mapper's refine case so the
// two paths can never drift.
//
// 63/03 (ADR-006 §2) — it now delegates to the sibling RESOLVER rather than to the mapper
// directly, because the dispatch site needs a whole answer (kind, command, scope) and not
// only a string. The answer for the default phase is unchanged in every byte: `refine` is
// a session, and its command is the same one this comment has always described.
function defaultAssignmentDirectiveResolution(itemRef) {
  return assignmentDirectiveResolution(DEFAULT_ASSIGNMENT_PHASE, itemRef);
}

// The documented default run-heartbeat staleness threshold (ms) — the SAME m20
// `work.loop.heartbeatMs` default `commands/run-start.mjs` already uses
// for the restart-time reclaim scan (never a second, drifting definition).
export const DEFAULT_ASSIGNMENT_HEARTBEAT_STALE_MS = DEFAULT_HEARTBEAT_MS;

// nonTerminalAssignments(rows) — the assignment-record ACTIVE-state partition
// (assigned/accepted/running) restated as a filter; a terminal row (done/failed/
// withdrawn/reclaimed) is never a reclaim candidate.
function nonTerminalAssignments(rows) {
  return rows.filter((row) => isActiveAssignmentState(row.state));
}

// assignmentOccupiesDispatchSlot(row) — THE COUNTED SET from ADR-006. A slot is
// derived from the assignment rows that already exist: work the holder has durably
// accepted or reported running, and never a run parked on a human. `accepted` matters
// after a control restart: the launcher's in-memory sent set is deliberately gone,
// but the worker-authored row still proves that admission happened. No lease row,
// claim file, column or lifecycle is introduced. Exported because this decision table
// is the task's executable contract.
export function assignmentOccupiesDispatchSlot(row) {
  return (row?.state === "accepted" || row?.state === "running") && row?.code !== "needs-input";
}

export function countDispatchSlotsByTarget(rows = []) {
  const counts = new Map();
  for (const row of rows) {
    if (!assignmentOccupiesDispatchSlot(row)) continue;
    counts.set(row.targetNodeId, (counts.get(row.targetNodeId) ?? 0) + 1);
  }
  return counts;
}

// dualStalenessDecision({ presence, heartbeatAt }, nowMs, thresholds) → boolean — the
// ONE decision predicate the scenario outline's 6 rows exercise, ANDing the two
// IMPORTED predicates. `presence` is the raw presence record (or null — no record
// exists); `heartbeatAt` is the linked run's heartbeat/updatedAt stamp.
export function dualStalenessDecision({ presence, heartbeatAt }, nowMs, { presenceThresholdMs, heartbeatThresholdMs }) {
  // No presence record ⇒ UNKNOWN liveness, NOT staleness (m23/KR2) ⇒ hands-off.
  if (presence == null || typeof presence.heartbeatAt !== "string") return false;
  const presenceStale = isNodeStale(presence, nowMs, presenceThresholdMs);
  // Presence precedence: fresh presence is hands-off REGARDLESS of the heartbeat.
  if (!presenceStale) return false;
  const runStale = isStale({ heartbeatAt }, nowMs, heartbeatThresholdMs);
  return runStale;
}

// reclaimStaleAssignments(store, workspace, workspaceId, options) — the scan: every
// non-terminal assignment row for `workspaceId`, joined to its target's presence
// record and its linked run's heartbeat, reclaimed under dual staleness. Returns the
// list of reclaimed assignment records (post-write). `now`/thresholds are INJECTED
// (the 22/R2 clock discipline) — this module reads no wall clock beyond the top-level
// default parameter.
//
//   store            — the opened global-work-store handle (assignment-record.mjs's
//                       writers operate on it directly).
//   workspace         — the loaded workspace (work.mjs shape: { workDir, … }) used to
//                       resolve each assignment's itemRef to its item.dir (readRuns
//                       needs the item, not just the ref) via findWork.
//   workspaceId       — narrows the scan to this workspace's assignment rows.
//   listAssignments   — INJECTED row source: (store, workspaceId) => rows[] (tests
//                       inject a scoped list; production passes a thin wrapper over
//                       listAllAssignments filtered to workspaceId — kept injectable
//                       so a test never needs every workspace seeded).
export async function reclaimStaleAssignments(store, workspace, workspaceId, options = {}) {
  const {
    now = new Date().toISOString(),
    presenceThresholdSeconds = DEFAULT_PRESENCE_STALENESS_SECONDS,
    heartbeatThresholdMs = DEFAULT_ASSIGNMENT_HEARTBEAT_STALE_MS,
    listAssignments = defaultListAssignments,
  } = options;
  const nowMs = Date.parse(now);
  const presenceThresholdMs = presenceThresholdSeconds * 1000;

  const rows = nonTerminalAssignments(await listAssignments(store, workspaceId));
  const reclaimed = [];
  const presenceCache = new Map();

  for (const row of rows) {
    if (row.runId == null) continue; // no run minted yet (still `assigned`) — the dispatch retry loop owns that state

    const matches = await findWorkCacheFirst(workspace, row.itemRef, { globalWorkStoreOptions: options.globalWorkStoreOptions ?? {} });
    // ADR-010/R6.4 — a cache-answered row names no folder here, so it is not a LOCAL run
    // record candidate. The streamed record below is its truthful source; treating it as
    // local would join `readRuns` onto a null dir.
    const resolved = matches.find((m) => m.ref === row.itemRef) ?? matches[0] ?? null;
    const item = resolved != null && typeof resolved.dir === "string" && resolved.dir.length > 0 ? resolved : null;

    // m42 wave (b) / item 7 leg 3 — THE RUN RECORD, WHEREVER IT ACTUALLY IS. The
    // original read was local-only (`readRuns(item)` against THIS checkout), and a
    // cross-machine run's record lives on the WORKER — the control checkout has no
    // runs/ by construction — so `run == null` skipped EVERY mesh assignment and the
    // dual-staleness reclaim was structurally dead for exactly the case it exists
    // for (measured live: a dead run sat `running` 25+ minutes, recovered by hand).
    // Order of truth: the LOCAL record (single-machine runs, unchanged behaviour),
    // else the STREAMED record (schema v5's work_item_runs — the worker's own run
    // records ride the projection while it works), else NO record at all — in which
    // case the ASSIGNMENT's own updatedAt is the staleness clock (it froze when the
    // worker last reported; a worker that died before ever streaming must not be
    // un-reclaimable forever).
    if (item != null) await consumeHeartbeatQueue(item);
    const localRuns = item != null ? await readRuns(item) : [];
    const localRun = localRuns.find((r) => r.runId === row.runId) ?? null;
    const streamedRun = localRun == null
      ? readWorkItemRuns(store, row.workspaceId ?? workspaceId, row.itemRef)
          .map((entry) => entry.record)
          .find((record) => record?.runId === row.runId) ?? null
      : null;
    const run = localRun ?? streamedRun;
    if (run != null && run.state !== "running") continue; // already terminal — never a reclaim candidate

    if (!presenceCache.has(row.targetNodeId)) {
      presenceCache.set(row.targetNodeId, await readPresenceRecord(workspace, row.targetNodeId));
    }
    const presence = presenceCache.get(row.targetNodeId);

    const shouldReclaim = dualStalenessDecision(
      { presence, heartbeatAt: run?.heartbeatAt ?? run?.updatedAt ?? row.updatedAt },
      nowMs,
      { presenceThresholdMs, heartbeatThresholdMs },
    );
    if (!shouldReclaim) continue;

    // Force-fail the run runtime_offline, retryable — through the ONE reclaim edge
    // the restart scan also uses (m42 wave (d) leg d4, port 2: the comment here used
    // to CLAIM that and be a second copy of it). The run.completed it raises carries
    // the declared cascade, so a control-side reclaim now rolls the item's status
    // back and refreshes the projection exactly as the restart-time reclaim always
    // did — the half this path silently lacked. LOCAL records only: a streamed record
    // is the worker's own disk state mirrored here — the control cannot transition a
    // file on another machine, and the assignment write below IS the control-side
    // fact the fleet/board read.
    //
    // NO `workspace` is passed, deliberately: that is the seam's established way of
    // saying "this process is not the one that should publish here" (the worker's
    // mint/settle sites and run-retry use it identically). The ROLLBACK — the
    // consequence this path genuinely lacked — lands, while the projection refresh
    // stays with the launcher's periodic propagation ticker, which already owns this
    // workspace's publishing and is running in the same process holding this tick's
    // open store handle.
    if (localRun != null && item != null) {
      await transitionRunReclaimed(
        item,
        { runId: localRun.runId, now },
        { journalOptions: options.globalWorkStoreOptions ?? {} },
      );
    }

    // THE SHARED TRANSITION (m42 wave (d) leg d3). This writer had NO transition
    // guards at all — it called the guard-free store writer directly, so a race
    // between a settling worker frame and this tick could reclaim a row that had
    // just gone terminal. The rule now runs in front of the write for every
    // writer: a settled row refuses the reclaim (coded, and the loop moves on),
    // and no `byNode` is passed because control is the ISSUER, not the holder.
    const result = await transitionAssignmentState(
      store,
      row.assignmentId,
      "reclaimed",
      { now, reclaimedAt: now },
      { journalOptions: options.globalWorkStoreOptions ?? {} },
    );
    if (result.applied) reclaimed.push(result.assignment);
  }

  return reclaimed;
}

// runControlDispatchReclaimTick(ws, streamServer, options) — milestone 35 / ADR-008:
// the control-side driver's ONE tick body, called from mesh-launcher.mjs's control-
// tick ticker callback. Owns the ONE store-open for both halves:
//   (1) DISPATCH — scans global_assignments for `assigned` rows whose targetNodeId is
//       a currently-connected admitted peer in streamServer.directiveTargets, and
//       dispatchDirective(buildDirectiveFrame(row)) each over the ADR-002 channel — at
//       most once per assignmentId per launcher lifetime (options.dispatchedIds, a
//       caller-held Set so the once-guard survives across ticks; NOT persisted).
//   (2) RECLAIM — calls reclaimStaleAssignments(store, ws, workspaceId, { now })
//       VERBATIM (ADR-005's decision, never re-derived).
// `options.openStore` defaults to openGlobalWorkProjectionStore (this module's own
// import — the launcher itself never imports it, keeping acd-global-publisher-
// single-seam intact). `options.buildDirectiveFrame` is INJECTED (default the real
// control-stream-server.mjs export) so this module does not import that module at
// the top level either (it only needs the pure frame-shape function, handed in by
// the ONE caller — mesh-launcher.mjs — that already imports it for the worker-side
// wiring, avoiding a needless new cross-module edge here).
export async function runControlDispatchReclaimTick(ws, streamServer, options = {}) {
  const {
    workspaceId,
    now = new Date().toISOString(),
    openStore = openGlobalWorkProjectionStore,
    storeOptions = {},
    buildDirectiveFrame: buildBaseDirectiveFrame,
    dispatchedIds = new Set(),
    pickupEscalatedIds = new Set(),
  } = options;

  // 63/03 (ADR-006 §3) — THE FRAME SITE. The injected `buildDirectiveFrame` stays the
  // frozen five-key projection it has always been (35/ADR-002; the credential-smuggle
  // guard reads it directly and must keep reading exactly that), so the ADDITIVE `launch`
  // is placed on the frame HERE, beside the equally additive `baseBranch` and `commit`
  // the tick already resolves. Conditional inclusion, the same pattern those two use: a
  // session-phase directive carries no `launch` key at all and is byte-identical to a
  // delivered tree's. The resolution site is ten lines below; only this one puts the
  // field on the wire.
  const buildDirectiveFrame = (to, fields) => {
    const frame = buildBaseDirectiveFrame(to, fields);
    if (fields?.launch != null) frame.launch = fields.launch;
    return frame;
  };

  const store = await openStore(storeOptions);
  try {
    // The default base-commit resolver (injectable for tests): the launcher's own
    // workspace when the row is ours, else the descriptor's project_root when
    // that checkout lives on this machine; anything unresolvable sends null.
    const resolveDispatchCommit =
      options.resolveDispatchCommit ??
      (async (row) => {
        try {
          const root =
            row.workspaceId === workspaceId && typeof ws?.projectRoot === "string"
              ? ws.projectRoot
              : (store.db
                  .prepare("SELECT project_root FROM global_workspace_descriptors WHERE workspace_id = ?")
                  .get(row.workspaceId)?.project_root ?? null);
          if (typeof root !== "string" || root.length === 0 || !existsSync(root)) return null;
          return await headCommit(root);
        } catch {
          return null;
        }
      });
    const rows = await listAllAssignments(store);
    const dispatchBound = dispatchConcurrencyFromConfig(ws);
    const scheduleToStartMs = scheduleToStartFromConfig(ws);
    const nowMs = Date.parse(now);
    // Durable occupancy comes only from worker-authored accepted/running rows.
    // `dispatchedIds` remains the once-guard, never a shadow lease: carrying a
    // successful send as occupancy across ticks would let a sent-but-never-status
    // row consume an unobservable slot forever. Successful sends are reserved below
    // for THIS scan, closing the async status-frame window without inventing state.
    const occupiedByTarget = countDispatchSlotsByTarget(rows);
    for (const row of rows) {
      if (row.state !== "assigned") continue;
      if (dispatchedIds.has(row.assignmentId)) continue;
      if (pickupEscalatedIds.has(row.assignmentId)) continue;
      const assignedAtMs = Date.parse(row.assignedAt);
      if (Number.isFinite(nowMs) && Number.isFinite(assignedAtMs) && nowMs - assignedAtMs >= scheduleToStartMs) {
        pickupEscalatedIds.add(row.assignmentId);
        try {
          options.onDispatchLog?.({
            code: "assignment-pickup-deadline-exceeded",
            level: "warn",
            message: `assignment ${row.assignmentId} (${row.itemRef}) was not started within ${scheduleToStartMs}ms; operator action is required and it will not be dispatched automatically`,
          });
        } catch (error) {
          reportDegrade("mesh-assignment-reclaim", error);
        }
        continue;
      }
      // VERIFICATION (UI phase selection, 2026-07-25) — read the operator-chosen phase
      // for THIS assignment from the additive side-table and map it to the whole command
      // string; absent (a CLI assign, or a legacy row) falls back to the refine default.
      const phase = readAssignmentPhase(store, row.assignmentId);
      // 63/03 (ADR-006 §1, ADR-010 §2/§3) — THE RESOLUTION SITE, at DISPATCH. Nothing
      // about the launch was decided when the assignment was minted and nothing about it
      // is remembered: the record has nowhere to keep a scope, a level or a launch, so a
      // second dispatch of the same row resolves again rather than replaying an answer
      // that may since have gone stale on a machine nobody is watching.
      const resolution = phase != null
        ? assignmentDirectiveResolution(phase, row.itemRef)
        : defaultAssignmentDirectiveResolution(row.itemRef);
      // ADR-010 §3 — a ref the loop declares no scope form for is refused HERE, BEFORE
      // anything leaves the control: no directive, no worktree, no bound consumed and no
      // deadline started. It rides the SAME operator escalation the pickup deadline above
      // uses — logged once with its code and the scope it refused, and never dispatched
      // automatically again — so the row is distinguishable from a worker that never
      // answered rather than being retried forever in silence. Scoped to the one phase
      // that resolves a loop: the same ref on `continue` or `verify` is untouched.
      //
      // ABOVE the connectivity and bound guards ON PURPOSE (63/03 review). The refusal is
      // connectivity-independent — `assignmentDirectiveResolution` reads only the phase and
      // the ref — so evaluating it below those guards let a disconnected target swallow it:
      // the tick `continue`d silently every pass, the pickup deadline elapsed first, and the
      // row escalated as `assignment-pickup-deadline-exceeded` ("operator action is
      // required") while the actual cause, a ref matching no declared scope form, was never
      // reported at all. A refusal that a later guard can re-label is a refusal reported
      // under the wrong code. Reading the phase for a row that will not be dispatched this
      // tick is one indexed lookup on the side table and buys exactly that.
      if (resolution.refused === true) {
        pickupEscalatedIds.add(row.assignmentId);
        try {
          options.onDispatchLog?.({
            code: resolution.code,
            level: "warn",
            message: `assignment ${row.assignmentId} (${row.itemRef}) -> ${row.targetNodeId}: no directive was sent — the ${phase ?? DEFAULT_ASSIGNMENT_PHASE} phase resolves to a loop and "${row.itemRef}" matches no scope form the loop declares (${(resolution.detail?.admits ?? []).map((form) => `${form.id}, e.g. ${form.example}`).join("; ")}); ${resolution.detail?.alternative ?? "re-assign it on a phase that runs a single step"}`,
          });
        } catch (error) {
          reportDegrade("mesh-assignment-reclaim", error);
        }
        continue;
      }
      const connected = streamServer?.directiveTargets?.get?.(row.targetNodeId) != null;
      if (!connected) {
        const seen = streamServer?.directiveTargets?.entries?.() ?? null;
        console.error(`[mesh-dispatch] assignment ${row.assignmentId} (${row.itemRef}) -> ${row.targetNodeId}: not connected; currently tracked targets: ${seen != null ? JSON.stringify(seen) : "n/a"}`);
        continue;
      }
      // The over-bound branch is deliberately the disconnected branch's quiet
      // sibling: leave the row `assigned`, create no queue/lease state, and let a
      // later tick retry it after a slot frees.
      if ((occupiedByTarget.get(row.targetNodeId) ?? 0) >= dispatchBound) continue;
      // review fix (live soak, 2026-07-17): the dispatch RESULT must gate the
      // once-guard — dispatchDirective/sendDirective checks the socket's readyState
      // and reports `{ sent: false }` on a target that's present in the map but not
      // yet (or no longer) OPEN (e.g. mid-handshake right after a worker reconnect).
      // Marking dispatchedIds unconditionally here meant a send that silently didn't
      // go out was NEVER retried — the row sat "assigned" forever with no further
      // attempt, indistinguishable from a hung/misbehaving worker. Found live: a
      // real assignment stuck for 24h+ despite a confirmed-connected, healthy worker.
      //
      // The resolution itself happened above the connectivity guard (see there); what is
      // left here is only the projection of its two alternatives onto the wire.
      const command = resolution.command;
      // The loop launch and the typed command are ALTERNATIVES: this is null for a loop
      // resolution and a whole command string for a session one, never both.
      const launch = assignmentDirectiveLaunch(resolution);
      // VERIFICATION (continue-on-existing-branch, 2026-07-25; REVISED 2026-07-27) —
      // every non-refine phase runs on the item's EXISTING active branch (the
      // refine's), so its commits accumulate there rather than on a fresh branch off
      // main. The predicate is the ONE HOME in mesh-assignment-directive.mjs — a
      // hand-spelled phase list HERE is exactly how the first `autonomous` dispatch
      // built milestone 18 off main with none of its refined stories (measured
      // 2026-07-27).
      //
      // M42 (the brittleness cure) — DELIBERATELY CACHE-ONLY here, no derivation:
      // sending a derived-but-never-pushed name would fail the worker's reuse door
      // (no local branch, no origin/<branch> to track). A cache miss sends no
      // baseBranch and the WORKER derives `aof/mesh/<ref>` itself — reusing the
      // item's line when the checkout already holds it, branching fresh under that
      // ONE name when it does not. The wrong-base disease dies worker-side: the
      // fallback now converges instead of minting a per-assignment fork.
      const baseBranch = phaseRunsOnItemBranch(phase)
        ? readItemBranch(store, row.workspaceId, row.itemRef)
        : null;
      // M42 base-commit pin (operator, 2026-08-01): stamp the state this
      // assignment is being made against — the workspace checkout's HEAD on THIS
      // control node — so a fresh worker worktree builds from exactly that
      // commit. Resolved from the launcher's own workspace when the row is ours,
      // else from the descriptor's project_root when that checkout lives on this
      // machine. Unresolvable (a foreign path, not a repo) sends no commit and
      // the worker keeps its HEAD fallback — degraded, and said so in the
      // decision log below.
      const commit = await resolveDispatchCommit(row);
      const result = streamServer.dispatchDirective(buildDirectiveFrame(row.targetNodeId, {
        assignmentId: row.assignmentId,
        itemRef: row.itemRef,
        workspaceId: row.workspaceId,
        at: now,
        command,
        baseBranch,
        commit,
        launch,
      }));
      if (result?.sent) {
        dispatchedIds.add(row.assignmentId);
        // Acquire before admitting another row in THIS scan. Without this measured
        // reservation, N assigned rows observed against zero running rows would all
        // be sent before any worker could report its running transition.
        occupiedByTarget.set(row.targetNodeId, (occupiedByTarget.get(row.targetNodeId) ?? 0) + 1);
        console.error(`[mesh-dispatch] assignment ${row.assignmentId} (${row.itemRef}) -> ${row.targetNodeId}: directive sent`);
        // 2026-07-27 (the wrong-base dispatch) — the DECISION, durably. The line
        // above goes to stderr only and names neither the command nor the base
        // branch, so the one fact that mattered ("what did the tick actually send")
        // was unrecoverable after the fact. This entry rides the launcher's log
        // channel into the durable sink; a sink fault never blocks the dispatch.
        try {
          options.onDispatchLog?.({
            code: "mesh-dispatch",
            level: "info",
            // 63/03 (ADR-006 §5) — the decision log has to say WHICH KIND went out, so
            // that an idle session on a skewed worker reads as "the worker did not
            // understand the directive" rather than "the worker is gone". A loop
            // directive names its scope and no command, because it carries none.
            message: `assignment ${row.assignmentId} (${row.itemRef}) -> ${row.targetNodeId}: ${launch != null ? `${launch.kind} launch over scope ${launch.scope}` : command}${baseBranch != null ? ` on ${baseBranch}` : " (no base branch — worker converges on the item's derived branch)"}${commit != null ? ` from ${commit.slice(0, 12)}` : " (no base commit resolved — worker builds from its own HEAD)"}`,
          });
        } catch (error) {
          reportDegrade("mesh-assignment-reclaim", error);
        }
      } else {
        console.error(`[mesh-dispatch] assignment ${row.assignmentId} (${row.itemRef}) -> ${row.targetNodeId}: send did not complete (${result?.code ?? "unknown"}); will retry next tick`);
      }
    }

    // 2026-07-27 (the duplicate-run wall) — WITHDRAW NOTIFY. A withdrawal used to
    // be a control-side row flip the holder never learned about: its session kept
    // running and its run record stayed `running`, walling every future run for
    // the item behind the duplicate-run guard. Each withdrawn row is now notified
    // to its target node exactly once per launcher lifetime (the caller-held
    // `withdrawNotifiedIds` Set, the dispatchedIds discipline); the worker's
    // handler is idempotent, so a post-restart re-notify of an old row is a
    // logged no-op there, never a second effect. Feature-gated on the caller
    // passing the Set — every existing caller/test that doesn't is byte-identical.
    const withdrawNotifiedIds = options.withdrawNotifiedIds;
    if (withdrawNotifiedIds != null) {
      for (const row of rows) {
        if (row.state !== "withdrawn") continue;
        if (withdrawNotifiedIds.has(row.assignmentId)) continue;
        if (streamServer?.directiveTargets?.get?.(row.targetNodeId) == null) continue; // retried once the worker connects
        const result = streamServer.dispatchDirective({
          kind: "withdraw",
          to: row.targetNodeId,
          assignmentId: row.assignmentId,
          itemRef: row.itemRef,
          workspaceId: row.workspaceId,
          runId: row.runId ?? null,
          at: now,
        });
        if (result?.sent) {
          withdrawNotifiedIds.add(row.assignmentId);
          try {
            options.onDispatchLog?.({
              code: "mesh-withdraw-notify",
              level: "info",
              message: `assignment ${row.assignmentId} (${row.itemRef}) -> ${row.targetNodeId}: withdraw notified (run ${row.runId ?? "none"})`,
            });
          } catch (error) {
            reportDegrade("mesh-assignment-reclaim", error);
          }
        }
      }
    }

    return await reclaimStaleAssignments(store, ws, workspaceId, {
      now,
      heartbeatThresholdMs: heartbeatFromConfig(ws),
    });
  } finally {
    store.close?.();
  }
}
