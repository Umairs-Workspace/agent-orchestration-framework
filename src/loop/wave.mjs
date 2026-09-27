// src/loop/wave.mjs — THE WAVE TICK: the BUILD phase fans the wave into lanes (milestone 129 /
// story 04; ADR-001 §3, ADR-002, ADR-003, ADR-004, ADR-005 §4, ADR-006, ADR-007, ADR-008 §1).
//
// Under `refine_first` the shell hands this module the BUILD phase and takes back one answer:
// the phase is complete (every in-scope story is in review), or it halted, or a lane's cycle
// cap handed a unit to its plan. Between those, per `work:next --through-review` answer:
//
//   ask  — `decideWave` (the engine, pure) over the answer's `wave`/`heldSet` minus the lanes
//          this loop already holds and the units set aside; `work:dispatch { refs }` admits the
//          rest and the BOUND rides its answer (ADR-006 — no config key is read here and no
//          number is held);
//   lane — for every admitted member, in its own worktree: OPEN (at HEAD, or reused and
//          advanced to HEAD) → RESOLVE in the lane → reclaim → MINT in the lane with the loop's
//          declaration and `brief.lane` → the child `aof work drive` (story 02) → SETTLE against
//          the lane item → the LADDER in the lane workspace (`settleStoryCycle`, `crossToVerify:
//          false`) → COMMIT on the lane branch → MERGE home in the primary through the one
//          merge verb → CLEANUP through `work:dispatch --cleanup`;
//   wave — ONE milestone-level run in the primary carries the loop's liveness while lanes are
//          open (ADR-007 §2), heartbeated on `heartbeatMs / 3` through the hook's own queue,
//          settled `done` on the wave's close and `failed` on a halt, and RE-MINTED after every
//          merge so the supervisor never reads a merged lane's newer `done` run as the loop's;
//   halt — a halt in one lane DRAINS the others (no new dispatch, every child finishes, its lane
//          is committed and merged where it merges) and only then does the loop halt, naming the
//          first halting lane and the drained lanes (ADR-005 §4's interrupt rule for every stop);
//   stop — the shell's ONE stop source (130/ADR-001 §5, `shell.stopSource`) is read here: its
//          first level (a signal or a `--stop` request) drains and halts `operator-interrupt`;
//          its signal aborts every child through its stdin, settles each lane run `cancelled`,
//          and halts the same way — the wave registers no listener of its own;
//   resume — `--resume` reconciles every live lane under the dispatch root BEFORE the first ask
//          (ADR-007 §4): a stale running run is reclaimed and re-driven from its own tree, a
//          committed unmerged tip is merged, a merged tip is cleaned up, dirt is committed first,
//          and a lane the loop cannot classify is narrated and left.
//
// `narrate` and `report` are PARAMETERS (ADR-008 §3): nothing here prints on its own. The
// family's ONE spawn seam is `child-drive.mjs` (FF-12902); this module reaches no child process
// and no shell, and every git act goes through `src/work/dispatch.mjs`'s composed verbs.
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadWorkspace } from "../work.mjs";
import {
  decideCycleCapExhaustion,
  decideLoop,
  decideReadySetExhausted,
  decideScheduleToClose,
  decideWave,
  loopPlanRef,
  mapStoreRefusal,
} from "../work/loop.mjs";
import { readRuns, isRunning, isStale } from "../run-store.mjs";
import { consumeHeartbeatQueue, enqueueHeartbeat } from "../run-heartbeat-consumption.mjs";
import { transitionRunComplete, transitionRunStart, transitionStaleRunsReclaimed } from "../effects/run-transitions.mjs";
import { reportDegrade } from "../degrade.mjs";
import {
  commitDispatchLane,
  dispatchLaneBase,
  inspectDispatchLanes,
  mergeDispatchLaneHome,
  resolveDispatchLane,
  resolveRefInWorktree,
} from "../work/dispatch.mjs";
import { headCommit, meshDispatchWorktreePath, resolveExec } from "../mesh/worktree.mjs";
import { LANE_CANCEL_GRACE_MS, childDriveOutcome, loopFixFilePath, spawnLaneDrive as spawnLaneDriveChild } from "./child-drive.mjs";
import { askEnvFor, askFileFor, awaitAnswer, liveOwnerHolds, parkedHalt, standingAsk } from "./ask.mjs";
import {
  budgetElapsedMs,
  drivenRow,
  measureGradeBaseline,
  readGradeBaseline,
  retryUntilTerminal,
  runBrief,
  settleDriven,
  settleStoryCycle,
  transitionOptionsFor,
} from "./cycle.mjs";

const NO_PRINT = () => {};

async function invokeRegistered(id, input, ctx) {
  if (typeof ctx?.invokeRegistered === "function") return await ctx.invokeRegistered(id, input, ctx);
  const { invoke } = await import("../command-core.mjs");
  return await invoke(id, input, ctx);
}

const parentOf = (ref) => (typeof ref === "string" && ref.includes("/") ? ref.slice(0, ref.indexOf("/")) : ref);
const isObjectName = (value) => typeof value === "string" && /^[0-9a-f]{7,64}$/iu.test(value);
const short = (sha) => (typeof sha === "string" ? sha.slice(0, 7) : String(sha));

// A `work:dispatch` answer, read as ENTRIES whichever face it took: a batch answers
// `dispatched[]`; a single ref answers the `open` shape, which is read exactly as one entry would
// be (ADR-006; task 05's "wave of one" scenario).
function dispatchEntries(answer) {
  if (Array.isArray(answer?.dispatched)) {
    return answer.dispatched.map((entry) => ({
      ref: entry.ref,
      ok: entry.ok !== false,
      value: entry.value ?? null,
      error: entry.error ?? null,
    }));
  }
  if (answer?.action === "open") {
    const { action, bound, ...value } = answer;
    return [{ ref: value.ref, ok: true, value, error: null }];
  }
  return [];
}

// mergeHome(primaryRoot, ref, options) — `mergeDispatchLaneHome` with its THROWN shapes read as a
// refusal (129/03's `F-44`): `commit-failed` (the primary's own-writes commit), `gate-propagation-failed`
// and `gate-propagation-base-unresolved` are git refusing the merge home, which is what the returned
// `refused` already means — so they answer the same shape, `reason` carrying the thrown code, and
// `mergeHalt` names the one stop for both. The lane stays committed and kept, so a `--resume`
// reconciles it. A throw with no code is `merge-home-error`; either way the message rides `error`.
async function mergeHome(primaryRoot, ref, options) {
  try {
    return await mergeDispatchLaneHome(primaryRoot, ref, options);
  } catch (error) {
    return { ref, outcome: "refused", code: "lane-merge-refused", reason: error?.code ?? "merge-home-error", error: String(error?.message ?? error), branch: null, base: null, tip: null, commit: null };
  }
}

// mergeHalt(merge, ref, lane, haltDecision) — the two named stops a merge home can end on
// (ADR-002 §1, §3), spelled ONCE for the lane close and the reconcile: `refused` names the files
// or the reason, `conflict` names lane, branch, base and tip. Anything else is not a halt.
function mergeHalt(merge, ref, lane, haltDecision) {
  const where = { lane: lane.worktree, branch: merge.branch, base: merge.base, tip: merge.tip };
  if (merge.outcome === "refused") {
    return { act: haltDecision("lane-merge-refused", ref, "dispatch:merge-home:refused"), details: { ...where, ...(merge.files != null ? { files: merge.files } : {}), ...(merge.reason != null ? { reason: merge.reason } : {}), ...(merge.error != null ? { error: merge.error } : {}) } };
  }
  if (merge.outcome === "conflict") {
    return { act: haltDecision("lane-merge-conflict", ref, "dispatch:merge-home:conflict"), details: where };
  }
  return null;
}

// cleanupLane(ref, lane, ctx, narrate) — a finished lane is closed through `work:dispatch
// --cleanup <ref> --remove` (ADR-002 §6: the existing convergence gate, never a bare removal);
// a refusal there is NARRATED and the lane is left for the sweep — never a halt.
async function cleanupLane(ref, lane, ctx, narrate) {
  try {
    const answer = await invokeRegistered("work:dispatch", { cleanup: true, ref, remove: true }, ctx);
    if (answer?.outcome === "refused") {
      await narrate(`Lane ${ref} — cleanup refused (${answer.code}): ${lane.worktree} left for aof work dispatch --sweep.`);
      return answer;
    }
    await narrate(`Lane ${ref} — cleanup: ${answer?.outcome ?? "removed"}${answer?.branchRemoved ? `, branch ${lane.branch} removed` : ""}.`);
    return answer;
  } catch (error) {
    reportDegrade("loop-lane-cleanup", error);
    await narrate(`Lane ${ref} — cleanup refused (${error?.code ?? "error"}): ${lane.worktree} left for aof work dispatch --sweep.`);
    return { outcome: "refused", code: error?.code ?? "error" };
  }
}

// runWaveBuild(shell) → { outcome: "complete" } | { outcome: "halt", act, details } | { outcome: "handoff", act }
//
// `shell` is the loop's own scope, handed in as one bag: { ctx, resolved, loopRunId, startedAt,
// declarationFor, bookkeeping, ladderOptions, setAside, narrate, report, now, bounds, scopeRuns,
// laneRuns, laneRetries, liveElsewhere, resolveItem, haltDecision, requireDecision,
// commitOwnWrites, stopSource }. The shell's rungs — `haltDecision`, `requireDecision`, the exact
// resolver, the own-writes commit — are PARAMETERS here, never re-spelled (ADR-008 §3's rule for
// the family); so is the stop source (130/02), the seam 129/04's task 06 injected as `ctx.stopSource`.
export async function runWaveBuild(shell) {
  const {
    ctx,
    resolved,
    loopRunId,
    startedAt,
    declarationFor,
    bookkeeping,
    ladderOptions,
    setAside,
    narrate = NO_PRINT,
    now: injectedNow,
    bounds,
    resolveItem,
    haltDecision,
    requireDecision,
    commitOwnWrites,
    // 130/02 — the shell's source, or a silent one when a caller composes none: level 0, no
    // producer, no request, a signal that never aborts.
    stopSource = { level: () => 0, producer: () => null, request: () => null, signal: new AbortController().signal, poll: async () => null },
  } = shell;
  // THE MILESTONE A MEMBER BELONGS TO — the ref grammar's own answer (`NN/SS` → `NN`), resolved
  // once per parent through the shell's exact resolver and memoised: the wave run is minted on
  // it (ADR-007 §2) and the merge's own-writes commit is scoped to its folder (ADR-002 §2).
  const milestones = new Map();
  async function milestoneFor(ref) {
    const parent = parentOf(ref);
    if (!milestones.has(parent)) milestones.set(parent, await resolveItem(parent));
    return milestones.get(parent);
  }
  const primaryRoot = ctx.workspace.projectRoot;
  const primaryWorkDir = ctx.workspace.workDir;
  const exec = ctx.exec;
  const node = ladderOptions.node;
  const spawnLaneDrive = typeof ctx.spawnLaneDrive === "function" ? ctx.spawnLaneDrive : spawnLaneDriveChild;
  const timers = ctx.waveTimers ?? { setInterval: (fn, ms) => setInterval(fn, ms), clearInterval: (handle) => clearInterval(handle) };
  const clock = () => injectedNow ?? (typeof ctx.now === "function" ? ctx.now() : new Date().toISOString());
  const { driven, cycles, pendingFixes, pendingGrades } = bookkeeping;
  const { cap } = resolved;

  const lanes = new Map(); // ref → lane state, while its child/ladder is in flight
  const laneRetries = shell.laneRetries ?? new Map(); // ref → { prior } a reconcile reclaimed
  const liveElsewhere = shell.liveElsewhere ?? new Set(); // lanes another process still heartbeats
  // 131/03 (task 04, ruling 3) — lanes whose run waits on a human with no live owner: the wave
  // reopens each one's slot and re-enters the wait in its own tree, minting nothing.
  const laneReentries = shell.laneReentries ?? new Map(); // ref → { run }
  // BASELINES KEYED BY BASE COMMIT (ADR-003 §1): sha → { promise, value, settled }. Seeded from
  // the scope's runs UNION the live lanes' runs a resume reconciled, so a resumed loop never
  // pays for a baseline a lane already holds.
  const gradeBaselines = shell.gradeBaselinesByBase ?? new Map();
  const knownRuns = [...(shell.scopeRuns ?? []), ...(shell.laneRuns ?? [])];

  let waveRun = null;
  let waveOrdinal = 0;
  // THE PRELUDES RUN IN DISPATCH ORDER: each lane's open → resolve → baseline-ask waits for the
  // previous lane's to finish, so "the first lane admitted on a base" is the wave's first member
  // and not whichever lane's git answered first. The children then run concurrently.
  let preludeTurn = Promise.resolve();
  let lastBound = null;
  const laneBoundAsk = Number.isSafeInteger(bounds?.laneBound) && bounds.laneBound > 0 ? { bound: bounds.laneBound } : {};
  let heartbeatHandle = null;
  let halted = null; // { act, details }
  const drained = [];
  const cancelled = [];
  let handoff = null;
  // 131/03 (ADR-004 §2-§3) — the lanes whose ask parked this invocation: set aside, unmerged, and
  // the reason the wave halts on the question when nothing else can run.
  const parkedLanes = [];

  // ---- the stop (ADR-005 §4, through 130/ADR-001 §5's source): the FIRST level drains — no new
  // dispatch, every child finishes, what merges merges; the source's SIGNAL (level 2) aborts
  // every child through its stdin (end → grace → kill). The wave polls the source at every ask
  // and after every lane closes, so a `--stop` written from another terminal reaches it. ----
  const stopping = () => stopSource.level() >= 1;
  // 131/03 (task 02, ruling 4) — a lane's wait reads the wave's own stop: the operator's level, or a
  // halt the wave already holds from another lane (the drain), parks a waiting lane silently.
  const laneAsk = {
    site: ladderOptions.ask?.site ?? {},
    deps: { ...(ladderOptions.ask?.deps ?? {}), stopping: () => stopping() || halted != null },
  };
  const abortLanes = () => { for (const lane of lanes.values()) lane.controller.abort(); };
  if (stopSource.signal?.aborted === true) abortLanes();
  else stopSource.signal?.addEventListener?.("abort", abortLanes, { once: true });

  // ---- the wave run in the primary (ADR-007 §2) ----
  // mintWaveRun(members, bound) — the epoch's run, minted in the primary at its HEAD and then
  // COMMITTED with the loop's other own writes (ADR-002 §2) BEFORE any lane is cut from HEAD:
  // the record is a primary-tree write, and a lane cut over it uncommitted would make every merge
  // home a real merge rather than the fast-forward a still primary earns. `brief.wave.baseCommit`
  // is therefore the HEAD at the mint; the lanes' base is the own-writes commit that carries it —
  // one commit later, by construction.
  async function mintWaveRun(members, bound) {
    const milestoneItem = await milestoneFor(members[0]);
    if (milestoneItem?.dir == null) return null;
    const baseCommit = await headCommit(primaryRoot, { exec });
    const declaration = declarationFor({ ...resolved, loopRunId, phase: "continue", cycle: 1, startedAt });
    const brief = runBrief(declaration, { wave: { members, baseCommit, bound } });
    const { record } = await transitionRunStart(milestoneItem, { brief, node, now: clock() }, laneTransitionOptionsFor(ctx.workspace));
    const row = { ref: milestoneItem.ref, phase: "continue", runId: record.runId, outcome: "running", attempt: record.attempt, cycle: 1, wave: { members: [...members], bound } };
    driven.push(row);
    waveRun = { item: milestoneItem, record, row, members: [...members] };
    const committed = typeof commitOwnWrites === "function" ? await commitOwnWrites() : { committed: false };
    if (committed?.refused != null) {
      return { halt: { act: haltDecision("lane-merge-refused", resolved.scope, `dispatch:commit-own-writes:${committed.refused.code}`), details: { message: committed.refused.message } } };
    }
    return waveRun;
  }
  async function settleWaveRun(outcome) {
    if (waveRun == null) return;
    const current = waveRun;
    waveRun = null;
    try {
      const completed = await transitionRunComplete(
        current.item,
        { runId: current.record.runId, outcome, failureReason: outcome === "failed" ? "agent_error" : null, now: clock() },
        laneTransitionOptionsFor(ctx.workspace),
      );
      current.row.outcome = completed.record.state;
    } catch (error) {
      reportDegrade("loop-wave-run", error);
      current.row.outcome = outcome;
    }
  }
  async function beatWaveRun() {
    if (waveRun == null) return;
    const at = clock();
    try {
      // The hook's exact bytes, appended and consumed through the ONE enqueue (131/03, ADR-001 §3),
      // which the owner of a run waiting on a human beats through as well.
      await enqueueHeartbeat(waveRun.item, waveRun.record.runId, at);
    } catch (error) {
      reportDegrade("loop-wave-heartbeat", error);
    }
  }
  function armHeartbeat() {
    if (heartbeatHandle != null) return;
    heartbeatHandle = timers.setInterval(() => beatWaveRun().catch((error) => reportDegrade("loop-wave-heartbeat", error)), Math.max(1, Math.floor(bounds.heartbeatMs / 3)));
    if (typeof heartbeatHandle?.unref === "function") heartbeatHandle.unref();
  }
  function disarmHeartbeat() {
    if (heartbeatHandle == null) return;
    timers.clearInterval(heartbeatHandle);
    heartbeatHandle = null;
  }

  // THE LOCK IS THE PRIMARY'S (ADR-004 §2): a run written under a lane workspace is still locked
  // under the primary's context, so the item lock holds across trees.
  const laneTransitionOptionsFor = (workspace) => transitionOptionsFor(ctx, { workspace, lockWorkspace: ctx.workspace });

  function readBound(answer) {
    if (Number.isSafeInteger(answer?.bound) && answer.bound > 0) lastBound = answer.bound;
    return lastBound;
  }

  // ---- the baseline per base commit (ADR-003 §1) ----
  function baselineFor(baseCommit, measure) {
    const known = gradeBaselines.get(baseCommit);
    if (known != null) return { entry: known, first: false };
    const persisted = readGradeBaseline(knownRuns, { baseCommit });
    if (persisted != null) {
      const entry = { promise: Promise.resolve(persisted), value: persisted, settled: true };
      gradeBaselines.set(baseCommit, entry);
      return { entry, first: false };
    }
    const entry = { promise: null, value: null, settled: false };
    entry.promise = measure().then((value) => { entry.value = value; entry.settled = true; return value; });
    gradeBaselines.set(baseCommit, entry);
    return { entry, first: true };
  }

  // ---- the opener `work:dispatch` materialises through (ADR-002 §7, ADR-007 §4) ----
  //
  // EVERY OPEN RECLAIMS FIRST (129/04 ruling): a lane that already exists is read for a running
  // record BEFORE it is advanced — a still-fresh one refuses the open by name (`duplicate-run`,
  // and nothing is touched), a stale one is left for the lane's own reclaim and the lane is then
  // re-driven FROM ITS OWN TREE, dirt in place, never advanced first. Every other reopened lane is
  // advanced to the primary's HEAD (ADR-002 §7) through the lane home's own verb.
  async function openLane(ref, baseCommit) {
    const lanePath = meshDispatchWorktreePath(primaryRoot, ref);
    let advance = !laneRetries.has(ref) && isObjectName(baseCommit);
    if (existsSync(lanePath)) {
      const laneItem = await resolveRefInWorktree(primaryRoot, primaryWorkDir, lanePath, ref);
      if (laneItem != null) {
        await consumeHeartbeatQueue(laneItem);
        const running = (await readRuns(laneItem)).find(isRunning);
        if (running != null) {
          if (!isStale(running, Date.parse(clock()), bounds.stalenessMs) && !laneReentries.has(ref)) {
            throw Object.assign(new Error(`a non-terminal run ${running.runId} is still fresh in the lane at ${lanePath}`), { code: "duplicate-run", runId: running.runId });
          }
          advance = false;
        }
      }
    }
    return await resolveDispatchLane(primaryRoot, ref, { ...(advance ? { advanceTo: baseCommit } : {}), exec });
  }

  // ---- one lane, open → mint → child → settle → ladder → commit ----
  async function runLane(open, member, lane) {
    const ref = open.ref;
    const halt = (act, details = {}) => ({ ref, outcome: "halt", lane, halt: { act: { ...act, ref: act.ref ?? ref }, details } });
    let laneItem = null;
    let laneWorkspace = null;
    let laneCtx = null;
    let laneOpts = null;
    let fixFile = null;
    const removeFixFile = async () => {
      if (fixFile == null) return;
      const target = fixFile;
      fixFile = null;
      await rm(target, { force: true }).catch((error) => reportDegrade("loop-fix-file", error));
    };
    try {
      await lane.turn;
      lane.baseCommit = await dispatchLaneBase(open.worktree, { primaryRoot, exec });
      await narrate(`Lane ${ref} — open: ${open.worktree} at ${lane.baseCommit} (branch ${open.branch}, ${open.created ? "created" : "reused"}).`);
      laneItem = await resolveRefInWorktree(primaryRoot, primaryWorkDir, open.worktree, ref);
      if (laneItem == null) {
        return halt(haltDecision("lane-open-failed", ref, "work:dispatch:lane-ref-unresolved"), { lane: open.worktree, branch: open.branch });
      }
      laneWorkspace = await loadWorkspace(open.worktree, undefined, { env: ctx.globalWorkStoreOptions?.env });
      laneCtx = { ...ctx, workspace: laneWorkspace };
      laneOpts = laneTransitionOptionsFor(laneWorkspace);

      // EVERY OPEN RECLAIMS FIRST (129/04 ruling): a stale running record in the lane is settled
      // `runtime_offline` before the mint; a still-fresh one refuses the open by name.
      const reclaimed = await transitionStaleRunsReclaimed([laneItem], { now: clock(), stalenessThreshold: bounds.stalenessMs }, laneOpts);
      for (const entry of reclaimed) {
        laneRetries.set(ref, { prior: entry.record });
        await narrate(`Reclaimed ${ref} — run ${entry.record.runId} (${entry.record.failureReason}).`);
      }
      if (!laneReentries.has(ref) && (await readRuns(laneItem)).some(isRunning)) {
        return halt(haltDecision("lane-open-failed", ref, "run-store:duplicate-run"), { lane: open.worktree, branch: open.branch });
      }

      const { entry: baselineEntry, first } = baselineFor(lane.baseCommit, async () => {
        const taken = await measureGradeBaseline(ref, laneCtx, { now: clock(), priorDrives: 0, baseCommit: lane.baseCommit });
        if (taken == null) return null;
        await narrate(`Baseline work:grade at ${short(lane.baseCommit)} — ${taken.baseline.failures.length} failing case(s) inherited, ${taken.measured.cases.total} case(s) measured, measured in lane ${ref}.`);
        return taken.baseline;
      });

      lane.releasePrelude?.();
      const laneNext = { ...member, state: "ready", ref, type: "story" };
      let laneFacts = { tasks: undefined };
      try {
        laneFacts = { tasks: await invokeRegistered("work:tasks", { ref }, laneCtx) };
      } catch (error) {
        reportDegrade("loop-lane-tasks", error);
      }

      for (;;) {
        // ---- the cycle, the shell's own arithmetic per (ref, phase) ----
        const key = `${ref}\0continue`;
        let fix = pendingFixes.get(ref) ?? null;
        let pendingGrade = pendingGrades.get(ref) ?? null;
        const priorCycle = cycles.get(key) ?? 0;
        // A RE-ENTERED lane (131/03, task 04) keeps the run it waited on: no mint, no new cycle.
        const reentry = laneReentries.get(ref) ?? null;
        const cycle = reentry != null || fix?.progressContinuation === true ? Math.max(1, priorCycle) : priorCycle + 1;
        if (cycle > cap) {
          const plan = loopPlanRef({ ref, type: "story", parent: parentOf(ref) });
          const capDecision = decideCycleCapExhaustion({
            ref,
            type: "story",
            parent: parentOf(ref),
            phase: "continue",
            cycle,
            cap,
            scope: resolved.scope,
            planReEntries: cycles.get(`${plan}\0refine`) ?? 0,
          });
          if (capDecision.act === "halt") return halt({ ...capDecision, ref: capDecision.ref ?? ref }, { cap });
          // THE HAND-OFF is the shell's to drive (a refine in the primary): the unit is set
          // aside here and the act travels back with the wave's answer.
          setAside.add(ref);
          pendingFixes.delete(ref);
          pendingGrades.delete(ref);
          return { ref, outcome: "handoff", lane, act: capDecision };
        }
        cycles.set(key, cycle);
        pendingFixes.delete(ref);
        pendingGrades.delete(ref);

        // THE FIRST LANE'S CHILD WAITS FOR THE BASELINE (a rubric measured over a tree its child
        // is mutating is the deadlock class in a new coat); every later lane's child starts at
        // once and only its post-drive grade awaits the same promise.
        const gradeBaseline = first ? await baselineEntry.promise : (baselineEntry.settled ? baselineEntry.value : null);

        const declaration = declarationFor({ ...resolved, loopRunId, phase: "continue", cycle, startedAt });
        const brief = runBrief(declaration, {
          admittedBlockerClaim: fix?.blocker,
          admittedBlockerClaims: fix?.blockers,
          admittedBlockerCount: fix?.blockerCount,
          progress: bookkeeping.progressStates.get(ref),
          progressContinuation: fix?.progressContinuation === true,
          grade: pendingGrade,
          gradeBaseline,
          lane: { worktree: open.worktree, branch: open.branch, baseCommit: lane.baseCommit },
        });

        // ---- MINT, in the lane (ADR-004 §1-§2) ----
        let record;
        const retry = laneRetries.get(ref);
        try {
          if (reentry != null) {
            laneReentries.delete(ref);
            record = (await readRuns(laneItem)).find((run) => run.runId === reentry.run.runId) ?? reentry.run;
          } else if (retry != null) {
            const resumeDeadline = decideScheduleToClose({
              elapsedMs: budgetElapsedMs({ runs: await readRuns(laneItem), record: retry.prior, stalenessMs: bounds.stalenessMs, now: clock() }),
              ceilingMs: bounds.scheduleToCloseMs,
            });
            if (resumeDeadline.act === "halt") {
              return halt({ ...resumeDeadline, ref }, { deadline: resumeDeadline.deadline, ceilingMs: resumeDeadline.ceilingMs, elapsedMs: resumeDeadline.elapsedMs, disposition: resumeDeadline.disposition });
            }
            ({ record } = await transitionRunStart(laneItem, { mode: "retry", runId: retry.prior.runId, maxAttempts: cap, brief, node, now: clock() }, laneOpts));
            laneRetries.delete(ref);
            await narrate(`Resumed ${ref} — attempt ${record.attempt} of ${cap} on run ${record.runId}.`);
          } else {
            ({ record } = await transitionRunStart(laneItem, { brief, node, now: clock() }, laneOpts));
          }
        } catch (error) {
          if (error?.code === "duplicate-run") return halt(haltDecision("lane-open-failed", ref, "run-store:duplicate-run"), { lane: open.worktree, branch: open.branch });
          const mapped = mapStoreRefusal(error);
          if (mapped != null) return halt(haltDecision(mapped.stop, ref, mapped.producer), { readyAt: error.readyAt, attempt: retry?.prior?.attempt });
          throw error;
        }
        lane.runIds.push(record.runId);
        if (reentry == null) await narrate(`Lane ${ref} — mint: run ${record.runId} (cycle ${cycle} of ${cap}, attempt ${record.attempt}).`);

        // ---- the fix rides a file under the aof home (ADR-005 §3) ----
        if (fix != null) {
          fixFile = loopFixFilePath(record.runId, { env: ctx.globalWorkStoreOptions?.env });
          await mkdir(path.dirname(fixFile), { recursive: true });
          await writeFile(fixFile, `${JSON.stringify(fix, null, 2)}\n`, "utf8");
        }

        // ---- DRIVE: the child (ADR-005 §1). A RE-drive with the operator's answer (131/03, task 02)
        // names the run's ask file and rides without the fix, which was the session's first turn. ----
        const drive = async (driveRecord, reply = null) => {
          const answer = await spawnLaneDrive({
            ref,
            phase: "continue",
            runId: driveRecord.runId,
            lane: open.worktree,
            ...(reply != null ? { answerFile: askFileFor(driveRecord.runId, askEnvFor(ctx)) } : fixFile == null ? {} : { fixFile }),
            // The isolated home rides EXPLICITLY (ADR-005 §1): `AOF_GLOBAL_HOME` from this process or
            // the injected store env, so a child's stores are the parent's, never the real home.
            env: {
              ...(typeof process.env.AOF_GLOBAL_HOME === "string" ? { AOF_GLOBAL_HOME: process.env.AOF_GLOBAL_HOME } : {}),
              ...(ctx.globalWorkStoreOptions?.env ?? {}),
            },
            deadlineMs: bounds.startToCloseMs + bounds.startupGraceMs,
            signal: lane.controller.signal,
            graceMs: LANE_CANCEL_GRACE_MS,
          });
          const document = answer?.document ?? null;
          const outcome = childDriveOutcome(answer);
          const tail = Array.isArray(answer?.stderrTail) ? answer.stderrTail : [];
          await narrate(`Lane ${ref} — drive: ${outcome.sessionId ? `session ${outcome.sessionId}` : "no session id"} (${answer?.outcome ?? "died"}${outcome.refusal ? `, ${outcome.refusal}` : ""}).`);
          for (const line of tail) await narrate(`Lane ${ref} — stderr: ${line}`);
          return {
            item: laneItem,
            record: driveRecord,
            outcome,
            cycle,
            phase: "continue",
            changeBaseline: null,
            progressBaseCommit: lane.baseCommit,
            settlementContext: document?.settlementContext ?? null,
            gradeAbsent: null,
            lane: { worktree: open.worktree, branch: open.branch, baseCommit: lane.baseCommit },
          };
        };
        // THE LANE'S WAIT (131/03, task 02): the composer over the lane's item and tree, re-driving
        // the lane's own child with `--answer`. Another lane's halt drains the wave, and a waiting
        // lane under that drain parks at its next check silently, as the operator's stop does.
        const waitInLane = async (waiting, { reenter = false } = {}) => {
          const waited = await awaitAnswer(waiting, {
            ...laneAsk.site,
            drive: (reply) => drive(waiting.record, reply),
            ref,
            phase: "continue",
            item: laneItem,
            cwd: open.worktree,
            reenter,
          }, laneAsk.deps);
          if (waited.parked != null) return waited;
          const answered = await settleDriven(waited.phaseRun, laneCtx, { now: clock(), narrate, transitionOptions: laneOpts });
          await narrate(`Lane ${ref} — settle: ${answered.record.state}${answered.record.failureReason ? ` (${answered.record.failureReason})` : ""}.`);
          driven.push(drivenRow(answered));
          return { phaseRun: answered };
        };
        let phaseRun;
        try {
          // A re-entered run is not driven again before its answer: it stands where it parked.
          phaseRun = reentry != null
            ? { item: laneItem, record, outcome: { outcome: "needs-input", sessionId: record.sessionId }, cycle, phase: "continue", changeBaseline: null, progressBaseCommit: lane.baseCommit, settlementContext: null, gradeAbsent: null, lane: { worktree: open.worktree, branch: open.branch, baseCommit: lane.baseCommit } }
            : await drive(record);
          phaseRun = await settleDriven(phaseRun, laneCtx, { now: clock(), narrate, transitionOptions: laneOpts });
          await narrate(`Lane ${ref} — settle: ${phaseRun.record.state}${phaseRun.record.failureReason ? ` (${phaseRun.record.failureReason})` : ""}.`);
          driven.push(drivenRow(phaseRun));
          // 131/03 (ADR-001 §1(a), ADR-004 §2) — A LANE THAT ASKS WAITS IN ITS SLOT while the others
          // build: the lane promise simply stays open, so nothing about scheduling changes.
          if (phaseRun.outcome.outcome === "needs-input") {
            const waited = await waitInLane(phaseRun, { reenter: reentry != null });
            if (waited.parked != null) return await parkedLane(waited.parked);
            phaseRun = waited.phaseRun;
          }
          if (phaseRun.outcome.outcome === "cancelled") {
            cancelled.push(ref);
            return { ref, outcome: "cancelled", lane, committed: false };
          }
          const retried = await retryUntilTerminal(phaseRun, {
            drive: (retryRecord, reply = null) => {
              if (reply == null) lane.runIds.push(retryRecord.runId);
              return drive(retryRecord, reply);
            },
            ref,
            phase: "continue",
            brief,
            item: laneItem,
            transitionOptions: laneOpts,
          }, bookkeeping, { ...ladderOptions, ctx: laneCtx, now: clock, ask: laneAsk });
          phaseRun = retried.phaseRun;
          // The ladder hands a park back (task 01, ruling 8): the lane closes `parked`, as a park at
          // its own site does. A needs-input run the ladder returned under a standing stop is handed
          // to the composer, which parks it silently (task 02, ruling 13).
          if (retried.parked != null) return await parkedLane(retried.parked);
          if (retried.halt == null && phaseRun.outcome.outcome === "needs-input") {
            const waited = await waitInLane(phaseRun);
            if (waited.parked != null) return await parkedLane(waited.parked);
            phaseRun = waited.phaseRun;
          }
          if (retried.halt != null) {
            return await committedHalt(retried.halt.act, retried.halt.details);
          }
          if (phaseRun.outcome.outcome === "cancelled") {
            cancelled.push(ref);
            return { ref, outcome: "cancelled", lane, committed: false };
          }
          if (phaseRun.outcome.outcome !== "done") {
            return await committedHalt(haltDecision("run-not-retryable", ref, "run-store:not-retryable"), { failureReason: phaseRun.record.failureReason });
          }
        } finally {
          await removeFixFile();
        }

        // ---- the LADDER, in the lane workspace (ADR-003 §2) ----
        const laneBaseline = await baselineEntry.promise;
        const settled = await settleStoryCycle(phaseRun, bookkeeping, laneCtx, {
          ...ladderOptions,
          ctx: laneCtx,
          crossToVerify: false,
          now: clock(),
          next: laneNext,
          facts: laneFacts,
          gradeBaseline: laneBaseline,
          transitionOptions: laneOpts,
          worktreePath: open.worktree,
        });
        await narrate(`Lane ${ref} — grade: ${settled.gradedSummary == null ? "no rubric declared" : `${settled.gradedSummary.verdict}, ${settled.gradedSummary.cases.failed} of ${settled.gradedSummary.cases.total} case(s) failing`}; next ${settled.next}.`);
        if (settled.next === "halt") return await committedHalt(settled.halt.act, settled.halt.details);
        if (settled.next === "continue") continue;
        break;
      }

      // ---- COMMIT (ADR-004 §5) ----
      const committed = await commitLane();
      return { ref, outcome: "closed", lane, ...committed };
    } catch (error) {
      reportDegrade("loop-lane", error);
      return halt(haltDecision("lane-open-failed", ref, `lane:${error?.code ?? "error"}`), { error: String(error?.message ?? error), lane: open.worktree });
    } finally {
      lane.releasePrelude?.();
      await removeFixFile();
    }

    async function commitLane() {
      const { committed, tip } = await commitDispatchLane(open.worktree, { message: `aof(loop): ${ref} — lane commit\n\nRecord docs and run records of the lane's drive (129/ADR-004 §5).`, node, exec });
      await narrate(`Lane ${ref} — commit: ${committed ? `tip ${tip}` : `clean, tip ${tip}`}.`);
      return { committed, tip };
    }
    // A LANE IS COMMITTED BEFORE ANY HALT RETURNS once its run is settled (129/04 ruling), so a
    // halt inside the ladder leaves a committed, unmerged lane the reconcile reads as such.
    async function committedHalt(act, details) {
      let committed = { committed: false, tip: null };
      try {
        committed = await commitLane();
      } catch (error) {
        reportDegrade("loop-lane-commit", error);
      }
      return { ...halt(act, details), ...committed, committedBeforeHalt: true };
    }
    // A LANE WHOSE ASK PARKED (131/03, task 02) is committed on its branch — the lane commit — and
    // closes `parked`: not merged, not cleaned up, its worktree left for `--resume` to re-enter.
    async function parkedLane(entry) {
      let committed = { committed: false, tip: null };
      try {
        committed = await commitLane();
      } catch (error) {
        reportDegrade("loop-lane-commit", error);
      }
      return { ref, outcome: "parked", lane, parked: entry, ...committed };
    }
  }

  // ---- a closed lane: merge home, cleanup, the rows, the wave run's epoch ----
  async function mergeLane(closed) {
    const { ref, lane } = closed;
    const milestoneItem = await milestoneFor(ref);
    const merge = await mergeHome(primaryRoot, ref, { milestoneDir: milestoneItem?.dir, node, exec });
    await narrate(`Lane ${ref} — merge: ${merge.outcome}${merge.code ? ` (${merge.code})` : ""}, commit ${merge.commit}.`);
    for (const row of driven) {
      if (lane.runIds.includes(row.runId) && row.ref === ref) row.merge = { outcome: merge.outcome, commit: merge.commit ?? null };
    }
    const halt = mergeHalt(merge, ref, lane, haltDecision);
    return halt == null ? { merge } : { halt, merge };
  }
  async function closeLane(closed) {
    const { ref, lane } = closed;
    if (closed.outcome === "closed") {
      const merged = await mergeLane(closed);
      if (merged.halt != null) {
        if (halted == null) halted = merged.halt;
        else drained.push({ ref, merge: merged.merge.outcome, halt: merged.halt.act.stop });
        return;
      }
      await cleanupLane(ref, lane, ctx, narrate);
      // Every lane that merged in this wave is named beside a halt (the drained set): a lane that
      // closed a beat before the halting one was still part of the wave the halt ended.
      drained.push({ ref, merge: merged.merge.outcome });
      // THE WAVE RUN IS AN EPOCH BETWEEN MERGES (129/04 ruling): settled here — `failed` when the
      // wave is ending on a halt or a signal, `done` otherwise — and RE-MINTED AT ONCE while any
      // lane stays open, naming the lanes in flight, so a merged lane's newer `done` run never
      // hides a live loop from the supervisor and the milestone never holds two non-terminal runs.
      // A dispatch that admits more members while this epoch runs settles it and mints the next,
      // so every epoch's brief names exactly the lanes it carried.
      await settleWaveRun(halted != null || stopping() ? "failed" : "done");
      if (lanes.size > 0 && halted == null && !stopping()) {
        const minted = await mintWaveRun([...lanes.keys()], lastBound);
        if (minted?.halt != null && halted == null) halted = minted.halt;
      }
      return;
    }
    if (closed.outcome === "halt") {
      if (halted == null) halted = closed.halt;
      else drained.push({ ref, halt: closed.halt.act.stop });
      return;
    }
    if (closed.outcome === "handoff") {
      if (handoff == null) handoff = closed.act;
      return;
    }
    if (closed.outcome === "parked") {
      // Committed, not merged, not cleaned up, and set aside for this invocation (task 02, ruling 1).
      // Under another lane's drain it rides the drained list as parked (QA ruling 2).
      parkedLanes.push(closed.parked);
      setAside.add(ref);
      if (halted != null || stopping()) drained.push({ ref, parked: true });
      return;
    }
    if (closed.outcome === "cancelled") {
      // A child that answered `aborted` was cancelled by someone: under the operator's second
      // signal the loop already halts `operator-interrupt`; an abort nobody here raised is still
      // that stop, attributed to the driver, never a lane to re-dispatch. The lane is kept.
      if (halted == null && !stopping()) halted = { act: haltDecision("operator-interrupt", ref, "driver:aborted"), details: { cancelled: [...cancelled] } };
    }
  }

  // ---- the ask + dispatch tick ----
  async function tick() {
    const answer = await invokeRegistered("work:next", { scope: resolved.scope, throughReview: true }, ctx);
    // A level that arrived while the ask was pending — a signal, or a request the poll here reads
    // — stops the tick: nothing is dispatched after the first level (ADR-005 §4), and the halt
    // is reported at the next turn as today.
    await stopSource.poll();
    if (stopping()) return { wait: true };
    const wait = async () => {
      // Lanes still open and nothing new to admit: the epoch a merge settled is re-minted now,
      // naming the lanes in flight, so the loop is never hidden while a lane works.
      if (waveRun == null && lanes.size > 0) {
        const minted = await mintWaveRun([...lanes.keys()], lastBound);
        if (minted?.halt != null) return { halt: minted.halt };
      }
      return { wait: true };
    };
    // 131/03 (task 02, ruling 2) — THE PARKED HALT COMES FIRST: with no open lane and a lane parked
    // on its question, every nothing-to-dispatch branch halts on the question, not its symptom. A
    // tick that can dispatch something still dispatches it; a malformed wave keeps its own halt.
    const questionFirst = () => (lanes.size === 0 && parkedLanes.length > 0 ? { halt: parkedHalt(parkedLanes, haltDecision) } : null);
    if (answer?.state === "done") {
      if (lanes.size === 0) {
        const question = questionFirst();
        if (question != null) return question;
        await narrate("Build phase complete — every story in review.");
        return { done: true };
      }
      return await wait();
    }
    if (answer?.state === "blocked" || answer?.state === "held") {
      if (lanes.size > 0) return await wait();
      const question = questionFirst();
      if (question != null) return question;
      const decision = requireDecision(decideLoop({ scope: resolved.scope, level: resolved.level, l3Gate: resolved.l3Gate, cap, next: answer }));
      const act = decision.act.act === "halt" ? decision.act : haltDecision("dependency-blocked", answer.ref ?? resolved.scope, `work:next:state=${answer.state}`);
      return { halt: { act: { ...act, ref: act.ref ?? answer.ref ?? resolved.scope }, details: { waitingOn: answer.waitingOn, skipped: answer.skipped } } };
    }
    const wave = decideWave({ wave: answer?.wave, heldSet: answer?.heldSet, live: [...lanes.keys(), ...liveElsewhere], setAside });
    if (wave == null) {
      return { halt: { act: haltDecision("unmapped-item-type", resolved.scope, "work:next:wave-malformed"), details: {} } };
    }
    if (wave.dispatch.length === 0) {
      if (lanes.size > 0) return await wait();
      const question = questionFirst();
      if (question != null) return question;
      // A wave whose members are all LIVE IN A LANE THIS LOOP DID NOT OPEN (a reconcile found a
      // still-heartbeating record there) cannot be dispatched and cannot be waited on — the loop
      // never polls foreign state — so it is the open's own refusal, by name.
      const foreign = (answer.wave ?? []).map((m) => m?.ref).filter((ref) => liveElsewhere.has(ref));
      if (foreign.length > 0) {
        return { halt: { act: haltDecision("lane-open-failed", foreign[0], "run-store:duplicate-run"), details: { live: foreign, remedy: "aof work dispatch --list" } } };
      }
      if (wave.hold.length > 0) {
        return { halt: { act: haltDecision("dependency-blocked", wave.hold[0], "engine:wave-empty-held"), details: { skipped: [...wave.hold] } } };
      }
      const exhausted = decideReadySetExhausted({ ref: [...setAside].at(-1) ?? null, cap });
      return { halt: { act: exhausted, details: { cap } } };
    }

    // THE WAVE RUN IS MINTED BEFORE THE FIRST DISPATCH (ADR-007 §2). The bound on its brief is
    // dispatch's own answer — read off `--list` when no dispatch has answered yet this loop. The
    // loop's own lane bound (129/07, `bounds.laneBound`) rides both asks when it is a number:
    // dispatch narrows the pool's bound by it and answers the EFFECTIVE bound, so what the loop
    // narrates and records is what admission ran under; unset, nothing is passed.
    if (lastBound == null) readBound(await invokeRegistered("work:dispatch", { list: true, ...laneBoundAsk }, ctx));
    if (waveRun != null) await settleWaveRun("done");
    {
      const minted = await mintWaveRun([...lanes.keys(), ...wave.dispatch], lastBound);
      if (minted?.halt != null) return { halt: minted.halt };
    }
    const baseCommit = await headCommit(primaryRoot, { exec });

    const dispatchCtx = {
      ...ctx,
      runDispatchLane: typeof ctx.runDispatchLane === "function"
        ? ctx.runDispatchLane
        : (member) => openLane(member.ref, baseCommit),
    };
    let dispatched;
    try {
      dispatched = await invokeRegistered("work:dispatch", { refs: wave.dispatch, ...laneBoundAsk }, dispatchCtx);
    } catch (error) {
      const producer = error?.code === "duplicate-run" ? "run-store:duplicate-run" : `work:dispatch:${error?.code ?? "dispatch-lane-open-error"}`;
      return { halt: { act: haltDecision("lane-open-failed", wave.dispatch[0], producer), details: { error: String(error?.message ?? error) } } };
    }
    const bound = readBound(dispatched);
    waveOrdinal += 1;
    const entries = dispatchEntries(dispatched);
    const admitted = entries.filter((entry) => entry.ok && entry.value?.outcome !== "refused");
    const refused = entries.filter((entry) => entry.ok && entry.value?.outcome === "refused");
    await narrate(`Wave ${waveOrdinal} — dispatching ${admitted.map((entry) => entry.ref).join(", ") || "nothing"} (bound ${bound})${wave.hold.length > 0 ? `; held: ${wave.hold.join(", ")}` : ""}.`);
    for (const entry of entries) {
      if (!entry.ok) {
        const producer = entry.error?.code === "duplicate-run" ? "run-store:duplicate-run" : `work:dispatch:${entry.error?.code ?? "dispatch-lane-open-error"}`;
        return { halt: { act: haltDecision("lane-open-failed", entry.ref, producer), details: { error: String(entry.error?.message ?? entry.error) } } };
      }
      if (entry.value?.outcome === "refused") {
        const occupied = Number.isSafeInteger(dispatched?.occupancy?.afterAdmission) ? dispatched.occupancy.afterAdmission : bound;
        await narrate(`${entry.ref} — at capacity (${occupied}/${bound}), waiting for a lane to close.`);
        continue;
      }
      if (entry.value?.advanced?.outcome === "refused") {
        return { halt: { act: haltDecision("lane-open-failed", entry.ref, `work:dispatch:${entry.value.advanced.code ?? "lane-open-failed"}`), details: { branch: entry.value.branch, head: baseCommit, cause: entry.value.advanced.cause ?? null } } };
      }
      const member = (answer.wave ?? []).find((row) => row?.ref === entry.ref) ?? { ref: entry.ref };
      const lane = { ref: entry.ref, worktree: entry.value.worktree, branch: entry.value.branch, baseCommit: null, controller: new AbortController(), runIds: [], promise: null, turn: preludeTurn };
      lanes.set(entry.ref, lane);
      preludeTurn = new Promise((release) => { lane.releasePrelude = release; });
      lane.promise = runLane(entry.value, member, lane).then((result) => ({ ...result, ref: entry.ref }));
    }
    if (admitted.length === 0 && lanes.size === 0 && refused.length > 0) {
      const question = questionFirst();
      if (question != null) return question;
      const holders = refused[0].value?.holders ?? [];
      return {
        halt: {
          act: haltDecision("lane-open-failed", refused[0].ref, "work:dispatch:at-capacity"),
          details: { holders: holders.map((lane) => ({ ref: lane.ref ?? null, lastActivityAt: lane.lastActivityAt ?? null })), occupied: refused[0].value?.occupied ?? null, bound, remedy: "aof work dispatch --list" },
        },
      };
    }
    if (lanes.size > 0) armHeartbeat();
    return { dispatched: admitted.length };
  }

  try {
    for (;;) {
      if (halted == null && handoff == null && !stopping()) {
        const ticked = await tick();
        if (ticked.done) break;
        if (ticked.halt != null) { halted = ticked.halt; if (lanes.size === 0) break; }
      }
      if (lanes.size === 0) break;
      const closed = await Promise.race([...lanes.values()].map((lane) => lane.promise));
      lanes.delete(closed.ref);
      if (lanes.size === 0) disarmHeartbeat();
      // The source is read again as a lane closes, so the epoch this close settles reads the
      // level that stands now rather than the one the last ask saw.
      await stopSource.poll();
      await closeLane(closed);
    }
  } finally {
    disarmHeartbeat();
    stopSource.signal?.removeEventListener?.("abort", abortLanes);
  }

  const drainedBeside = (ref) => drained.filter((entry) => entry.ref !== ref);
  // 131/03 — the lanes parked on a question ride every halt's Details, so the account prints each
  // ask block (task 05, QA ruling 1); a halt that is the question's own already carries them.
  const parkedBeside = (details) => (details?.parked == null && parkedLanes.length > 0 ? { parked: [...parkedLanes] } : {});
  if (halted != null) {
    await settleWaveRun("failed");
    const others = drainedBeside(halted.act.ref);
    return { outcome: "halt", act: halted.act, details: { ...halted.details, ...(others.length > 0 ? { drained: others } : {}), ...parkedBeside(halted.details) } };
  }
  if (stopping()) {
    // The producer is the source's — a VALUE (`"SIGINT"`, `"SIGTERM"` or `"stop-request"`), never
    // a message match; the shell adds the request's facts beside the drained and cancelled lanes.
    const signal = stopSource.producer();
    await settleWaveRun("failed");
    return {
      outcome: "halt",
      act: haltDecision("operator-interrupt", resolved.scope, signal),
      details: { signal, ...(drained.length > 0 ? { drained } : {}), ...(cancelled.length > 0 ? { cancelled } : {}), ...parkedBeside(null) },
    };
  }
  // A wave that ends `done` or hands off with a lane parked still halts on the question: the phase
  // is not complete while a story waits on a human (task 02, ruling 3).
  if (parkedLanes.length > 0) {
    await settleWaveRun("failed");
    const question = parkedHalt(parkedLanes, haltDecision);
    const others = drainedBeside(question.act.ref).filter((entry) => entry.parked !== true);
    return { outcome: "halt", act: question.act, details: { ...question.details, ...(others.length > 0 ? { drained: others } : {}) } };
  }
  if (handoff != null) {
    await settleWaveRun("done");
    return { outcome: "handoff", act: handoff };
  }
  await settleWaveRun("done");
  return { outcome: "complete" };
}

// reconcileLanes(shell) → { halt? , laneRetries, liveElsewhere, laneRuns }
//
// ADR-007 §4: every lane under the dispatch root whose ref is in scope, in dispatch-root order,
// classified and handled BEFORE the walk resumes. Runs in this loop's primary; every git act is
// a composed verb of `src/work/dispatch.mjs`.
export async function reconcileLanes(shell) {
  const { ctx, scopeRefs, narrate = NO_PRINT, now: injectedNow, bounds, resolveItem, haltDecision } = shell;
  const primaryRoot = ctx.workspace.projectRoot;
  const exec = ctx.exec;
  const node = shell.node;
  const clock = () => injectedNow ?? new Date().toISOString();
  const laneRetries = new Map();
  const liveElsewhere = new Set();
  const laneReentries = new Map();
  const laneRuns = [];
  const inScope = new Set(scopeRefs);
  const inspected = await inspectDispatchLanes(primaryRoot, scopeRefs, { exec });
  const lanes = inspected.filter((lane) => lane.ref != null && inScope.has(lane.ref));
  const unclassified = inspected.filter((lane) => lane.ref == null);
  await narrate(`Reconciling ${lanes.length} live lane(s).`);
  for (const lane of unclassified) {
    await narrate(`Lane ? — unclassified: ${lane.worktree} matches no known ref; left.`);
  }
  for (const lane of lanes) {
    const { ref } = lane;
    if (lane.state === "prunable") {
      await narrate(`Lane ${ref} — prunable: ${lane.worktree} left for aof work dispatch --sweep.`);
      continue;
    }
    const laneItem = await resolveRefInWorktree(primaryRoot, ctx.workspace.workDir, lane.worktree, ref);
    if (laneItem == null) {
      await narrate(`Lane ${ref} — unclassified: ${ref} does not resolve in ${lane.worktree}; left.`);
      continue;
    }
    await consumeHeartbeatQueue(laneItem);
    const runs = await readRuns(laneItem);
    laneRuns.push(...runs);
    const running = runs.find(isRunning);
    // 131/03 (ADR-004 §5, task 04 rulings 3 and 13) — A LANE WAITING ON A HUMAN IS RE-ENTERED, NEVER
    // RECLAIMED: its owner gave up (the ask is parked) or died (the run is stale), so the wave reopens
    // its slot and re-enters the wait in the lane's own tree. An unparked ask on a fresh run has a live
    // owner, and is left exactly as a heartbeating lane is.
    if (running != null && standingAsk(running) != null) {
      if (liveOwnerHolds(running, { stalenessMs: bounds.stalenessMs, nowMs: Date.parse(clock()) })) {
        liveElsewhere.add(ref);
        await narrate(`Lane ${ref} — live: run ${running.runId} is still heartbeating; left.`);
        continue;
      }
      laneReentries.set(ref, { run: running });
      continue;
    }
    if (running != null) {
      const laneWorkspace = await loadWorkspace(lane.worktree, undefined, { env: ctx.globalWorkStoreOptions?.env });
      const reclaimed = await transitionStaleRunsReclaimed([laneItem], { now: clock(), stalenessThreshold: bounds.stalenessMs }, transitionOptionsFor(ctx, { workspace: laneWorkspace, lockWorkspace: ctx.workspace }));
      if (reclaimed.length === 0) {
        liveElsewhere.add(ref);
        await narrate(`Lane ${ref} — live: run ${running.runId} is still heartbeating; left.`);
        continue;
      }
      for (const entry of reclaimed) {
        laneRetries.set(ref, { prior: entry.record });
        await narrate(`Reclaimed ${ref} — run ${entry.record.runId} (${entry.record.failureReason}).`);
      }
      await narrate(`Lane ${ref} — reclaimed: re-driven from its own tree${lane.dirty ? " with its dirt in place" : ""}.`);
      continue;
    }
    let tip = lane.head;
    if (lane.dirty) {
      const committed = await commitDispatchLane(lane.worktree, { message: `aof(loop): ${ref} reconciled`, node, exec });
      tip = committed.tip;
      await narrate(`Lane ${ref} — dirty: committed ${tip}.`);
    }
    const git = resolveExec({ exec });
    const ancestor = tip != null && (await git(["merge-base", "--is-ancestor", tip, "HEAD"], { cwd: primaryRoot })).status === 0;
    if (!ancestor) {
      const milestoneItem = await resolveItem(parentOf(ref));
      const merge = await mergeHome(primaryRoot, ref, { milestoneDir: milestoneItem?.dir, node, exec });
      await narrate(`Lane ${ref} — merge: ${merge.outcome}${merge.code ? ` (${merge.code})` : ""}, commit ${merge.commit}.`);
      const halt = mergeHalt(merge, ref, lane, haltDecision);
      if (halt != null) return { halt, laneRetries, liveElsewhere, laneRuns, laneReentries };
    } else {
      await narrate(`Lane ${ref} — merged: tip ${tip} is already an ancestor of HEAD.`);
    }
    await cleanupLane(ref, lane, ctx, narrate);
  }
  return { laneRetries, liveElsewhere, laneRuns, laneReentries };
}
