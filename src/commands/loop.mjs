// work:loop — the code-owned loop shell (milestone 53 / story 02).
//
// The registered command is deliberately a read-only probe. The foreground
// body rides the generic launcher seam and owns only command-edge concerns:
// invoking registered reads/drivers, run transitions, signals and rendering.
// Every decision about scope, level, phase, gate, stops and retry refusals stays
// in the pure src/work/loop.mjs engine.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   milestone 53 / story 02 — launcher probe/body plus the executor family.
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { loadWorkspace } from "../work.mjs";
import {
  LOOP_STOPS,
  buildLoopDeclaration,
  decideLoop,
  decideLoopProgress,
  decideScheduleToClose,
  decideReviewGate,
  // milestone 124 / story 01 (ADR-005 §2) — the cycle-cap decision, and the walk's own
  // "nothing left to offer". Both live in the engine, which is why this module no longer
  // spells `cap-exhausted` anywhere: the shell consults, it does not decide.
  decideCycleCapExhaustion,
  decideReadySetExhausted,
  loopPlanRef,
  // milestone 126 / story 00 (ADR-001, AMENDED) — the ONE `retryOf` walk lives in the engine;
  // this shell keeps no traversal and no clock arithmetic. The summer is reached through
  // `budgetElapsedMs` in `src/loop/cycle.mjs`, the one home of every deadline site's arithmetic.
  isReviewBlockerClaim,
  loopScopeIncludes,
  mapStoreRefusal,
  readLoopDeclaration,
  resolveLoopBound,
  resolveLoopLevel,
  resolveLoopLevelGate,
  decideLoopScope,
  resolveLoopResume,
} from "../work/loop.mjs";
import {
  MAX_REVIEW_ROUNDS,
  buildNoProgressRoundsFromConfig,
  REFINE_FIRST_CONCURRENCY,
  heartbeatFromConfig,
  loopConcurrencyFromConfig,
  loopDispatchConcurrencyFromConfig,
  progressMaxResetsFromConfig,
  reviewRoundsFromConfig,
  scheduleToCloseFromConfig,
  startToCloseFromConfig,
  startupGraceFromConfig,
} from "../loop-bounds.mjs";
import {
  decideBuildProgress,
  evaluateProgressPolicy,
  readProgressSamples,
} from "../loop-progress.mjs";
// milestone 54 / story 02 — the doctor rung's admitted set is DERIVED from 66's frozen code
// array (54/ADR-007 §2d), never restated beside it. This is a pure DATA import of a frozen
// vocabulary; the lane itself stays where it is and gains nothing (FF-5407 holds the reverse
// direction — the lane must never reach the grade).
import { CONTROL_FINDING_CODES } from "../work/doctor-controls.mjs";
// 129/04 (ADR-008 §3) — THE LADDER IS A SUBTRACTION FROM THIS SHELL. The grade helpers, the
// fix transport, the drive/settle/row trio, the retry ladder and the post-drive block all live
// in `src/loop/cycle.mjs` now, parameterised by the workspace they grade in; this shell calls
// `settleStoryCycle` with the primary and `crossToVerify: true`, and the wave (`src/loop/wave.mjs`)
// calls it per lane. Every symbol a suite reached through this module is RE-EXPORTED below, so
// no importer moves. The grade VOCABULARIES (`GRADE_CODES`, FF-5409's never-from-a-message-match
// rule) ride the same move: the one consumer of `ADVISORY_CODES`/`GRADE_VERDICTS` is the ladder.
import {
  LOOP_FIX_TRANSPORT_KEYS,
  accumulatedRecord,
  admitResumeBuildRun,
  applyGradeBaseline,
  budgetElapsedMs,
  drivePhase,
  drivenRow,
  failingCountFromGrade,
  fixTransport,
  gradeFindings,
  gradeRoute,
  gradeStopCode,
  gradeStopProducer,
  gradeSummary,
  measureGradeBaseline,
  mergeGateFindings,
  progressReportFacts,
  readGradeBaseline,
  recordBuildProgress,
  retryUntilTerminal,
  runBrief,
  settleDriven,
  settleStoryCycle,
  transitionOptionsFor,
} from "../loop/cycle.mjs";
export {
  LOOP_FIX_TRANSPORT_KEYS,
  admitResumeBuildRun,
  applyGradeBaseline,
  failingCountFromGrade,
  fixTransport,
  gradeFindings,
  gradeRoute,
  gradeStopCode,
  gradeStopProducer,
  gradeSummary,
  mergeGateFindings,
  readGradeBaseline,
  recordBuildProgress,
};
import { commandError } from "../command-error.mjs";
import { resolveItemExact } from "./resolve.mjs";
// 54/03 review finding D3 — "was a rubric DECLARED" is `work:grade`'s own predicate, and it
// is read here rather than re-derived, so a declared-but-unrunnable grade cannot be mistaken
// for an unconfigured repository at the one door that tells them apart.
import { declaredRubric } from "./grade.mjs";
import { meshNodeIdOf } from "./mesh/gate.mjs";
import { readRuns, staleRunningRuns } from "../run-store.mjs";
import {
  transitionRunStart,
  transitionStaleRunsReclaimed,
} from "../effects/run-transitions.mjs";
import { reportDegrade } from "../degrade.mjs";
// 129/04 (ADR-002 §2, ADR-008 §4) — the REFINE-end commit goes through the ONE commit verb in its
// home; the BUILD phase and the resume reconciliation are the wave module's.
import { commitWorktreeChanges, resolveExec } from "../mesh/worktree.mjs";
import { reconcileLanes, runWaveBuild } from "../loop/wave.mjs";
// 2026-09-11 — the loop's exit-reason recorder; installed only at the launch seam below.
import { installLoopDiagnostics } from "../loop-diag.mjs";
// 130/02 (ADR-002, ADR-003) — THE STOP. `--stop` rides `run` through the ONE verb core below the
// command layer; the shell reads the ONE interrupt source (`ctx.stopSource ?? createStopSource`)
// instead of a `process.once` flag, and every write to the request goes through
// `stop-request.mjs`'s exports — this module spells no path under the aof home and calls no fs.
import { stopLoop } from "../loop/stop.mjs";
import {
  clearStopRequest,
  createStopSource,
  loopStopsDir,
  markStopHonoured,
  readStopRequest,
  stopRequestPath,
} from "../loop/stop-request.mjs";

const DEFAULT_LEVEL = "L2";
const execFileAsync = promisify(execFile);

// The silent report collector (m42 wave (d) d1's `NO_PRINT`): a core that nobody
// injected a printer into says nothing. Its caller supplies the real one.
const NO_PRINT = () => {};

async function gitOutput(cwd, args, { env = process.env } = {}) {
  const { stdout } = await execFileAsync("git", args, { cwd, env, timeout: 10_000, windowsHide: true, encoding: "utf8" });
  return stdout;
}

// Snapshot the complete visible worktree into a git tree without touching the real
// index. This makes pre-build staged, unstaged, and untracked content part of the
// baseline, so the later review diff contains only content introduced by the build.
// If the snapshot cannot be made, attribution is not reliable and the caller omits
// the diff rather than charging ambient operator changes to the build.
async function readBuildBaseline(cwd) {
  let temporaryIndexDir = null;
  try {
    const head = await gitOutput(cwd, ["rev-parse", "--verify", "HEAD"]);
    if (typeof head !== "string" || !/^[0-9a-f]{40,64}$/iu.test(head.trim())) return null;
    temporaryIndexDir = await mkdtemp(path.join(os.tmpdir(), "aof-loop-index-"));
    const env = { ...process.env, GIT_INDEX_FILE: path.join(temporaryIndexDir, "index") };
    await gitOutput(cwd, ["read-tree", head.trim()], { env });
    await gitOutput(cwd, ["add", "-A", "--"], { env });
    const tree = await gitOutput(cwd, ["write-tree"], { env });
    return typeof tree === "string" && /^[0-9a-f]{40,64}$/iu.test(tree.trim())
      ? { tree: tree.trim(), commit: head.trim() }
      : null;
  } catch (error) {
    reportDegrade("loop-change-baseline-unavailable", error);
    return null;
  } finally {
    if (temporaryIndexDir != null) {
      await rm(temporaryIndexDir, { recursive: true, force: true })
        .catch((error) => reportDegrade("loop-change-baseline-cleanup", error));
    }
  }
}

// Scope review context between the complete worktree snapshots immediately before
// and after this particular continue/build. A resumed process cannot reconstruct the
// initial tree without a stored baseline, so an absent baseline omits the diff.
async function readChangeUnderReview(cwd, baseline) {
  const baselineTree = typeof baseline === "string" ? baseline : baseline?.tree;
  if (typeof baselineTree !== "string" || baselineTree.length === 0) return "";
  try {
    const current = await readBuildBaseline(cwd);
    if (current?.tree == null) return "";
    const diff = await gitOutput(cwd, ["diff", "--no-ext-diff", baselineTree, current.tree, "--"]);
    return typeof diff === "string" ? diff.trim() : "";
  } catch (error) {
    reportDegrade("loop-change-context-unavailable", error);
    return "";
  }
}

// Deferred by design: command-core imports this module to register work:loop,
// so a static import back into command-core would close the registry ring.
async function invokeRegistered(id, input, ctx) {
  // 129/04 — `ctx.invokeRegistered` is the loop family's ONE injectable invoke seam (the ladder
  // and the wave honour it too), so a suite scripting a registered answer for a lane sees the
  // gate ladder's rungs through the same door. Absent, the registry answers as it always has.
  if (typeof ctx?.invokeRegistered === "function") return await ctx.invokeRegistered(id, input, ctx);
  const { invoke } = await import("../command-core.mjs");
  return await invoke(id, input, ctx);
}

function reviewClaimsFor(input, ref, completedRounds) {
  // Claims are explicit review evidence keyed to the measured gate. Never mine
  // the validator's path/problem prose for one.
  const rows = Array.isArray(input?.reviewClaims) ? input.reviewClaims : [];
  const row = rows.find((candidate) => candidate?.ref === ref && candidate?.completedRounds === completedRounds);
  if (row == null) return undefined;
  const candidates = [
    ...(Array.isArray(row.claims) ? row.claims : []),
    ...(Object.prototype.hasOwnProperty.call(row, "claim") ? [row.claim] : []),
  ];
  const seen = new Set();
  return candidates.filter((claim) => {
    if (!isReviewBlockerClaim(claim)) return false;
    const key = `${claim.class}\0${claim.finding.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// THE DOCTOR RUNG'S ADMITTED CODE SET — DERIVED BY FILTER, NEVER RESTATED AS A LITERAL
// (54/ADR-007 §2d, FF-5410). A ninth control code cannot silently join or leave the gate:
// whatever `CONTROL_FINDING_CODES` comes to hold, this set is that array minus exactly two
// exclusions, each with its own reason.
//
//   - the two `verification-*` members, because `verify.md:130-132` makes the red-probe
//     register an artefact THE VERIFY PHASE ITSELF AUTHORS, and this gate sits at the entry
//     to verify. Gating entry to verify on verify's own output is circular and unsatisfiable
//     for every milestone, forever, however honest its register. The obligation is not
//     weakened but MOVED — from "before verify", where it could never be met, to "before
//     accept", where it always can; `70/ADR-007`'s accepting gate still reads the full error
//     set, so a red probe is still demanded before acceptance.
//   - `control-runner-unchecked`, which is `warn` BY CONSTRUCTION (it reports that a leg did
//     not run, never a violation to be graded) and so could never have gated anyway.
//
// What is left is five codes, each a fact about the item's own CODE.
export const DOCTOR_GATE_CODES = Object.freeze(
  CONTROL_FINDING_CODES.filter((code) => !code.startsWith("verification-") && code !== "control-runner-unchecked"),
);

// A doctor finding this gate admits: an admitted CODE at `error`.
//
// SEVERITY IS TAKEN, NEVER RE-DERIVED (`66/ADR-002`'s horizon, FF-5410). `severityFor`
// answers `error` inside the acceptance horizon — the item is open, which is exactly what a
// loop drives — and `warn` outside it, and a `pending` control is already `warn`. Measured at
// refine: `aof work doctor --json` returns 397 findings stream-wide and 396 of them are
// `warn`, dominated by `mtime-ahead-of-updated` (243) and `doc-over-budget` (69) on `done`
// items. A gate that read warns would block every loop in this repository on a numbering
// artefact. THE LOOP-READY SCORE IS NOT CONSULTED AT ALL (`53/ADR-007`).
export function admittedDoctorFindings(findings) {
  const rows = Array.isArray(findings) ? findings : [];
  return rows.filter((finding) => finding?.severity === "error" && DOCTOR_GATE_CODES.includes(finding?.code));
}

// THE LADDER, WALKED (54/ADR-007 §1). Each rung is invoked at the DRIVEN ITEM'S OWN SCOPE,
// exactly as this shell already invoked `work:validate` — without that, one un-authored
// register anywhere under `wiki/work` would stop every loop in the repository, the
// inherited-red pathology `70/ADR-007` refuses by name.
//
// Each rung SHORT-CIRCUITS the ones after it, so the returned findings are the FIRST red
// rung's and the loop re-drives `continue` carrying them. A clean walk returns no findings
// and the caller crosses to verify exactly as it does today.
// The envelope is the LADDER'S OWN, never a rung's result wearing another rung's findings:
// `{ gate, findings }`, where `gate` names the rung that answered. Spreading `work:validate`'s
// result and swapping its `findings` for the doctor's would have produced a document whose
// other keys described a different rung's run — the class of quiet inconsistency a later
// reader has no way to detect.
async function invokeGateLadder(ref, ctx, narrate) {
  const validate = await invokeRegistered("work:validate", { scope: ref }, ctx);
  const validateFindings = Array.isArray(validate?.findings) ? validate.findings : [];
  await narrate(`Gate work:validate ${ref} — ${validateFindings.length} finding(s).`);
  if (validateFindings.length > 0) return { gate: "work:validate", findings: validateFindings };

  const doctor = await invokeRegistered("work:doctor", { scope: ref }, ctx);
  // Only `findings` is read. `loopReady` and every other key the doctor returns are left
  // where they are — a gate that consulted the score would gate below L3, which
  // `53/ADR-007` already rules out.
  const admitted = admittedDoctorFindings(doctor?.findings);
  await narrate(`Gate work:doctor ${ref} — ${admitted.length} admitted finding(s).`);
  return { gate: "work:doctor", findings: admitted };
}

async function invokeReviewGate(ref, completedRounds, input, ctx, persistedBlockerClaims, narrate = NO_PRINT) {
  const suppliedBlockerClaims = reviewClaimsFor(input, ref, completedRounds);
  const blockerClaims = suppliedBlockerClaims === undefined ? persistedBlockerClaims : suppliedBlockerClaims;
  const gate = await invokeGateLadder(ref, ctx, narrate);
  return blockerClaims === undefined ? gate : { ...gate, blockerClaims };
}

function persistedGateBlockerClaims(run) {
  const claims = run?.brief?.review?.blockerClaims;
  if (Array.isArray(claims)) return claims.filter(isReviewBlockerClaim);
  const legacy = run?.brief?.review?.blockerClaim;
  return isReviewBlockerClaim(legacy) ? [legacy] : undefined;
}

function throwRefusal(refusal) {
  const code = refusal?.code ?? "loop-bound-unresolved";
  const error = commandError(
    refusal?.message ?? refusal?.reason ?? `The loop invocation was refused (${code}).`,
    code,
    400,
  );
  const detail = refusal?.detail ?? Object.fromEntries(
    Object.entries(refusal ?? {}).filter(([key]) => !["code", "message"].includes(key)),
  );
  if (detail && Object.keys(detail).length > 0) error.detail = detail;
  throw error;
}

function requireDecision(decision) {
  if (decision?.refusal) throwRefusal(decision.refusal);
  if (decision?.admitted !== true && decision?.code) throwRefusal(decision);
  return decision;
}

function actShape(act) {
  const shaped = { act: act?.act ?? "done" };
  // milestone 124 / story 01 (ADR-005 §6) — `plan` JOINS THE HALT SHAPE, and it joins
  // unconditionally rather than behind a check on the stop's name. A terminal cap exhaustion is
  // now terminal for one of two reasons — the plan is outside the declared scope, or it has
  // already been re-entered `cap` times — and both are questions about a ref the reader has not
  // been shown; a halt that hides the ref it refused sends the operator to the wrong file. Every
  // other halt simply carries no `plan`, and the filter below drops what is absent, so this
  // needs no stop-specific branch — and this module must not grow one, because the shell no
  // longer spells that stop's name anywhere (124/01 task 00).
  const keys = shaped.act === "halt" ? ["ref", "stop", "producer", "plan"] : ["ref", "phase", "stop", "producer"];
  if (shaped.act === "halt" && typeof act?.producer === "string" && act.producer.startsWith("review:")) {
    keys.push(
      "round", "cap", "hardCap", "blockerCount", "previousBlockerCount", "blockers",
      "blockerClasses", "findings", "workItems",
    );
  }
  if (shaped.act === "halt" && act?.stop === "deadline-exhausted") {
    keys.push("deadline", "ceilingMs", "elapsedMs", "disposition");
  }
  if (shaped.act === "halt" && act?.stop === "progress-exhausted") {
    keys.push("resets", "stalls", "resetBound", "summary", "disposition");
  }
  if (shaped.act === "halt" && act?.stop === "no-progress") {
    keys.push("failingCount", "noProgressRounds", "progressBound");
  }
  for (const key of keys) {
    if (act?.[key] != null) shaped[key] = act[key];
  }
  return shaped;
}

function stateFor(act, next) {
  if (act?.act === "done") return "done";
  if (act?.act === "halt") {
    return next?.state === "blocked" || next?.state === "held" ? "blocked" : "halted";
  }
  return "ready";
}

function loopState({ scope, level, cap, loopRunId, next, act, resumable, driven = [] }) {
  return {
    scope,
    level,
    cap,
    loopRunId,
    state: stateFor(act, next),
    next: next ?? null,
    act: actShape(act),
    stops: [...LOOP_STOPS],
    resumable,
    driven,
  };
}

function storiesFact(rows, ref) {
  const stories = rows.filter((row) => row.parent === ref && row.type === "story");
  return { total: stories.length, done: stories.filter((row) => row.status === "done").length };
}

function hasUat(tasks) {
  return tasks.some((task) => Number(task?.counts?.uat ?? 0) > 0);
}

function uatCount(tasks) {
  return tasks.reduce((total, task) => total + Number(task?.counts?.uat ?? 0), 0);
}

async function factsFor(next, ctx, rows = null) {
  if (next?.state !== "ready") return { rows, tasks: undefined, stories: undefined };
  if (next.type === "story") {
    const result = await invokeRegistered("work:tasks", { ref: next.ref }, ctx);
    return { rows, tasks: result, stories: undefined };
  }
  if (next.type === "milestone") {
    const listed = rows ?? await invokeRegistered("work:list", {}, ctx);
    return { rows: listed, tasks: undefined, stories: storiesFact(listed, next.ref) };
  }
  return { rows, tasks: undefined, stories: undefined };
}

async function localScopeItems(scope, ctx, rows = null) {
  const listed = rows ?? await invokeRegistered("work:list", {}, ctx);
  const items = [];
  for (const row of listed) {
    if (!loopScopeIncludes(scope, row.ref) || !row.dir) continue;
    const item = await resolveItemExact(ctx, row.ref);
    if (item?.dir) items.push(item);
  }
  return { rows: listed, items };
}

async function resumableState(scope, ctx, { now, stalenessThreshold } = {}) {
  const { items } = await localScopeItems(scope, ctx);
  const runs = [];
  for (const item of items) runs.push(...await readRuns(item));
  const stale = await staleRunningRuns(items, {
    now,
    stalenessThreshold: stalenessThreshold ?? heartbeatFromConfig(ctx.workspace),
  });
  const staleIds = new Set(stale.map((run) => run.runId));
  return {
    items,
    runs,
    stranded: stale.map((run) => ({ ref: run.itemRef, runId: run.runId, node: run.node ?? null })),
    live: runs
      .filter((run) => run.state === "running" && !staleIds.has(run.runId))
      .map((run) => ({ ref: run.itemRef, runId: run.runId, node: run.node ?? null })),
    lastDeclaration: readLoopDeclaration(runs) ?? null,
  };
}

function requestedSettings(input, ctx) {
  return {
    scope: typeof input?.scope === "string" ? input.scope.trim() : "",
    level: input?.level ?? DEFAULT_LEVEL,
    cap: input?.cap ?? ctx.workspace.config?.work?.autonomous?.maxAttempts ?? 3,
  };
}

async function resolveInvocation(input, ctx) {
  const requested = requestedSettings(input, ctx);

  // Reject malformed settings before paying for any registered read. L3's
  // workspace facts are gathered only after these vocabulary guards pass.
  const requestedLevel = requireDecision(resolveLoopLevel(requested.level));
  const requestedScope = requireDecision(decideLoopScope(requested.scope));
  const requestedCap = requireDecision(resolveLoopBound(requested.cap));
  // 126/02: a LAUNCH carries the flag straight through; a RESUME hands it to the engine's
  // explicit-wins / absent-inherits rule below, which is the same rule level and cap take.
  let resolved = {
    scope: requestedScope.scope,
    level: requestedLevel.level,
    cap: requestedCap.cap,
    supervised: input?.supervised === true,
  };
  let resume = { items: [], runs: [], stranded: [], lastDeclaration: null };

  if (input?.resume === true) {
    resume = await resumableState(resolved.scope, ctx, { now: input.now });
    const inherited = resolveLoopResume({
      scope: resolved.scope,
      level: input.level ?? (resume.lastDeclaration ? undefined : resolved.level),
      cap: input.cap ?? (resume.lastDeclaration ? undefined : resolved.cap),
      supervised: input.supervised,
      declaration: resume.lastDeclaration,
    });
    if (inherited?.refusal) throwRefusal(inherited.refusal);
    if (inherited && typeof inherited === "object") {
      resolved = {
        scope: inherited.scope ?? resolved.scope,
        level: inherited.level ?? resolved.level,
        cap: inherited.cap ?? resolved.cap,
        supervised: inherited.supervised === true,
      };
    }
  } else {
    resume = await resumableState(resolved.scope, ctx, { now: input.now });
  }

  let l3Gate = null;
  if (resolved.level === "L3") {
    const [doctor, groundedness] = await Promise.all([
      invokeRegistered("work:doctor", { scope: resolved.scope }, ctx),
      invokeRegistered("work:loops-groundedness", {}, ctx),
    ]);
    l3Gate = { loopReady: doctor?.loopReady ?? null, groundedness: groundedness ?? null };
    requireDecision(resolveLoopLevelGate(resolved.level, l3Gate));
  }

  return { ...resolved, l3Gate, resume };
}

// milestone 124 / story 01 (ADR-005 §5) — THE SET-ASIDE, APPLIED TO THE OFFER.
//
// `work:next` answers with the head of the ready set PLUS the set itself (`src/work.mjs:1563`,
// each member in `ready()`'s shape at `:1301-1308`). A unit handed back to its plan is still
// `ready`, so the very next tick offers it again — forever. Set-aside is therefore not a bound
// but the walk's own memory, and it is what makes the hand-off progress rather than a livelock
// dressed as one.
//
// It selects a DIFFERENT MEMBER of the set the walk already received. It does not re-ask
// `work:next`, does not widen the scope, and does not suppress the set-aside unit's dependants
// — which would silently shrink the range while reporting that it ran.
//
// `null` means every ready member has been set aside. That is the walk's terminus, and the
// halt for it is the ENGINE's (`decideReadySetExhausted`) rather than one minted here.
function offerFrom(answer, setAside) {
  if (!(setAside instanceof Set) || setAside.size === 0) return answer;
  if (answer?.state !== "ready" || !setAside.has(answer.ref)) return answer;
  const member = (Array.isArray(answer.readySet) ? answer.readySet : []).find((row) => !setAside.has(row?.ref));
  return member === undefined ? null : { ...answer, ...member };
}

async function nextDecision(scope, level, cap, ctx, extra = {}) {
  // `setAside` is the WALK's bookkeeping and never an engine input — it is lifted out here so
  // it cannot ride `...extra` into `decideLoop` and become a ninth fact the decider reads.
  // 129/04 (ADR-001 §3) — `throughReview` is the ASK's, not the engine's: the BUILD phase walks
  // `work:next --through-review` and the engine reads the answer it is handed. `concurrency` and
  // `unrefined` (ADR-001 §4's two additive inputs) stay in `engineExtra` and ride into the decider.
  const { setAside = null, throughReview = false, ...engineExtra } = extra;
  const answer = await invokeRegistered("work:next", { scope, ...(throughReview === true ? { throughReview: true } : {}) }, ctx);
  const next = offerFrom(answer, setAside);
  if (next === null) {
    return { next: answer, facts: { rows: engineExtra.rows ?? null, tasks: undefined, stories: undefined }, decision: null, exhausted: true };
  }
  const facts = await factsFor(next, ctx, engineExtra.rows ?? null);
  const decision = requireDecision(decideLoop({
    scope,
    level,
    cap,
    next,
    ...(facts.tasks !== undefined ? { tasks: facts.tasks } : {}),
    ...(facts.stories !== undefined ? { stories: facts.stories } : {}),
    ...engineExtra,
  }));
  return { next, facts, decision, exhausted: false };
}

async function probeLoop(input, ctx) {
  const { scope, level, cap, l3Gate, resume } = await resolveInvocation(input, ctx);
  const { next, decision } = await nextDecision(scope, level, cap, ctx, { l3Gate });
  return loopState({
    scope,
    level,
    cap,
    loopRunId: randomUUID(),
    next,
    act: decision.act,
    resumable: { stranded: resume.stranded, lastDeclaration: resume.lastDeclaration },
  });
}

// 130/02 (ADR-002 §1, §5) — THE COMMAND FACE OF THE STOP. `run` dispatches here on
// `input.stop === true` alone: `dryRun` and `quiet` are the launch predicate's concern (they
// select `run` over the body) and never a guard on the write — there is no dry stop; `level` and
// `cap` play no part, the verb reads run records only. `--stop` with `--resume` is refused by
// code BEFORE any read: the two are opposite requests about one loop. The core answers a
// document and never throws for a refusal; this face maps `ok: false` to the command-error
// contract (stderr + non-zero on the CLI, the `{ ok: false, error, code }` envelope on a route):
// 404 for a scope with no loop to stop, 409 otherwise.
async function stopLoopCommand(input, ctx) {
  if (input.resume === true) {
    throw commandError("--stop and --resume are exclusive: a stop asks the loop to halt, a resume asks for it back. Pass one.", "loop-stop-exclusive", 400);
  }
  const answer = await stopLoop(ctx.workspace, { scope: input.scope, now: input.now });
  if (answer.ok === false) {
    throw commandError(answer.message, answer.code, answer.code === "loop-stop-no-declaration" ? 404 : 409);
  }
  return answer;
}

// 102/01 — THE LOOP THIS SHELL *IS*, as one exported literal with one home.
//
// DISCOVERED, not chosen. Three facts measured at this repository's HEAD put the shell on
// `loop:autonomous-cascade` and on no other registry record:
//
//   - the record declares `reference: [command:work:next]` and `measurement: [command:work:next]`,
//     and this shell's every decision tick is `invokeRegistered("work:next", { scope }, ctx)`
//     (`nextDecision`, below);
//   - it declares `cadence: event:per-item`, and this shell dispatches refine/continue/verify per
//     ready item through `decideLoopPhase` (`src/work/loop.mjs`);
//   - it declares `ceiling: [config:work.autonomous.maxAttempts]`, and that is literally the bound
//     `requestedSettings` resolves this shell's cap from.
//
// The inner loops the cascade supervises — `loop:build-to-green` and `loop:review-fix-rereview`,
// named on the cascade's own `target-setting` edges — are PHASES inside one engagement here. Giving
// them their own ids would need their own loop run ids, and that is not this story.
//
// It is a CONSTANT, never derived from `scope` (a work-ref range) or `level` (`L1`/`L2`/`L3`) —
// neither of which ever resolves to a registry record, which is the whole of F-78-A — and no flag
// sets it. It is EXPORTED because the drift check reads this binding rather than a second spelling
// of the same string: one literal, one home, the hand-copied-glyph species F-78-E records.
export const SHELL_LOOP_ID = "loop:autonomous-cascade";

function declarationFor({ loopRunId, scope, level, cap, l3Gate, phase, cycle, startedAt, supervised }) {
  // The id is an INPUT to the engine, exactly as `loopRunId` and `startedAt` are. Nothing here
  // opens `.aof/loops/` to obtain or validate it: whether it resolves to a declared node is the
  // reader's question, answered as a `ran-undeclared` gap and never as a run-time refusal.
  //
  // `supervised` arrives the same way, already resolved by `resolveLoopResume`'s explicit-wins /
  // absent-inherits rule (126/02) — this seam carries it, it does not decide it.
  return buildLoopDeclaration({ loopRunId, scope, level, cap, l3Gate, phase, cycle, startedAt, supervised, id: SHELL_LOOP_ID });
}

function haltDecision(stop, ref, producer) {
  return { act: "halt", stop, ref, producer };
}

function storeStop(error) {
  const mapped = mapStoreRefusal(error);
  return mapped == null ? null : haltDecision(mapped.stop, null, mapped.producer);
}

// ===================== 129/04 — THE THREE PHASES OF `refine_first` (ADR-001 §3) =====================

// THE IN-SCOPE STORIES WITH NO TASKS, NOT `done`, IN STREAM ORDER — the engine's `unrefined`
// input, gathered by the shell (ADR-001 §7: the shell hands facts, the engine decides). Asked
// through `work:tasks`, the same read `factsFor` already makes for the head.
async function unrefinedStories(scope, ctx) {
  const listed = await invokeRegistered("work:list", {}, ctx);
  const refs = [];
  for (const row of listed) {
    if (row?.type !== "story" || row.status === "done" || !loopScopeIncludes(scope, row.ref)) continue;
    const tasks = await invokeRegistered("work:tasks", { ref: row.ref }, ctx);
    if ((Array.isArray(tasks?.tasks) ? tasks.tasks : []).length === 0) refs.push(row.ref);
  }
  return refs;
}

// THE LOOP COMMITS ITS OWN WRITES (ADR-002 §2) at the end of REFINE, so the lanes — cut from
// HEAD — see the contracts: `git add -- <milestone dir>` + `commit --no-verify` under the mesh
// identity, scoped to the in-scope drivers' folders and NOTHING else; what remains dirty is
// the operator's. Through `commitWorktreeChanges` with `paths` — the one commit verb, in its
// home — and never a second spelling here. A refusal RESTORES the index for the paths it staged
// (the primary is never left half-staged) and halts `lane-merge-refused` with producer
// `dispatch:commit-own-writes:<code>` naming git's message.
async function commitOwnWrites(scope, ctx, { node, exec, message = `aof(loop): refine ${scope}` } = {}) {
  const { items } = await localScopeItems(scope, ctx);
  const root = ctx.workspace.projectRoot;
  const paths = items
    .filter((item) => /^\d+$/u.test(item.ref) && typeof item.dir === "string")
    .map((item) => path.relative(root, item.dir).replaceAll("\\", "/"))
    .filter((rel) => rel.length > 0 && !rel.startsWith(".."));
  if (paths.length === 0) return { committed: false, sha: null };
  const git = resolveExec({ exec });
  try {
    const { committed } = await commitWorktreeChanges(root, { message, node, exec, paths });
    if (!committed) return { committed: false, sha: null };
    const head = await git(["rev-parse", "HEAD"], { cwd: root });
    return { committed: true, sha: String(head.stdout ?? "").trim() };
  } catch (error) {
    try {
      await git(["reset", "-q", "--", ...paths], { cwd: root });
    } catch (resetError) {
      reportDegrade("loop-own-writes", resetError);
    }
    return { committed: false, sha: null, refused: { code: error?.code ?? "commit-failed", message: String(error?.message ?? error) } };
  }
}

// THE FRESH GATE (129/04, ADR-001 §4; RULINGS 2026-09-13). Validate + doctor through the
// ladder that STAYS here, then the RECORDED grade, read in order and never re-run:
//   1. `brief.grade` on the story's latest run — `work:grade` without `run` answers it as
//      `recorded` (the sequential shape, a successor run carrying the grade);
//   2. else the last progress sample of the story's latest `continue` run — the lane's final
//      clean delta has no successor in the lane, so the ledger's `failingScenarios` is the
//      verdict: `0` clean, `> 0` a fail whose findings are the fix's;
//   3. else — a story moved to `in-review` outside any loop — validate + doctor alone.
// A recorded `indeterminate` that is not `rubric-unconfigured` halts `grade-indeterminate` as
// rung 3 does. The gate is asked with the story's own continue cycle (1 for a story this loop
// never drove), so its re-drive is the cycle after; the story's counter is seeded to say so.
async function freshGate(ref, { next, facts }, ctx, {
  input, narrate, reviewRounds, reviewBlockerCounts, cycles, resolved, reviewCap, pendingFixes, pendingGrades, loopRunId,
}) {
  const completedRounds = reviewRounds.get(ref) ?? 0;
  const gate = await invokeReviewGate(ref, completedRounds, input, ctx, undefined, narrate);

  let recordedGrade = null;
  let gradedFindings = [];
  let route = "proceed";
  let stopCode = null;
  let recorded = null;
  try {
    recorded = await invokeRegistered("work:grade", { ref }, ctx);
  } catch (error) {
    reportDegrade("loop-recorded-grade", error);
  }
  // THE RECORDED GRADE COUNTS ONLY ON A SUCCESSOR of the story's latest continue run: a grade on
  // the continue run ITSELF is the one that CAUSED that drive (ADR-008 §3 writes it on the run it
  // re-drove), never that drive's own verdict — a lane's re-driven story would otherwise read its
  // pre-fix failure as its verdict. The run ids are lexically creation-ordered.
  const item = await resolveItemExact(ctx, ref);
  const runs = item?.dir == null ? [] : await readRuns(item);
  const lastContinue = [...runs].reverse().find((run) => run?.brief?.loop?.phase === "continue");
  const onSuccessor = typeof recorded?.recordedRunId === "string"
    && (lastContinue == null || recorded.recordedRunId > lastContinue.runId);
  const recordedAnswer = recorded?.recorded == null || !onSuccessor ? null : { configured: true, grade: recorded.recorded };
  const summary = gradeSummary(recordedAnswer);
  if (summary != null) {
    recordedGrade = recordedAnswer.grade;
    gradedFindings = gradeFindings(recordedAnswer);
    const act = gradeRoute(recordedAnswer);
    route = act === "redrive" ? "redrive" : act === "halt" ? "halt" : "proceed";
    stopCode = gradeStopCode(recordedAnswer);
    await narrate(
      summary.verdict === "indeterminate"
        ? `Gate work:grade ${ref} — indeterminate${summary.codes.length > 0 ? ` (${summary.codes.join(", ")})` : ""}.`
        : `Gate work:grade ${ref} — ${summary.verdict}${summary.codes.length > 0 ? ` (${summary.codes.join(", ")})` : ""}, ${summary.cases.failed} of ${summary.cases.total} case(s) failing.`,
    );
  } else {
    // THE LEDGER IS THE ATTEMPT RUN'S: a progress-continuation re-drive samples into the run its
    // lineage started on (`brief.progress.attemptRunId`), so the latest continue run's verdict is
    // read off that ledger — its own would be empty.
    const attemptRun = runs.find((run) => run.runId === lastContinue?.brief?.progress?.attemptRunId) ?? lastContinue;
    const samples = lastContinue == null ? [] : await readProgressSamples(item, attemptRun, {
      ...(typeof ctx.onProgressFault === "function" ? { onFault: ctx.onProgressFault } : {}),
    });
    const last = samples.at(-1) ?? null;
    if (last != null) {
      const delta = last.failingScenarios;
      route = delta > 0 ? "redrive" : "proceed";
      if (delta > 0) gradedFindings = [{ gate: "work:grade", code: "build-still-failing", failingCount: delta, runId: lastContinue.runId }];
      await narrate(`Gate work:grade ${ref} — ${delta > 0 ? "fail" : "pass"} (recorded delta ${delta} on run ${lastContinue.runId}).`);
    } else {
      await narrate(`Gate work:grade ${ref} — no recorded grade; verify's ceremony grades the tree.`);
    }
  }

  const gatedFindings = mergeGateFindings(gate, gradedFindings);
  const gradedGate = { ...gate, findings: gatedFindings };
  const key = `${ref}\0continue`;
  const cycle = Math.max(1, cycles.get(key) ?? 0);
  const gateDecision = requireDecision(decideLoop({
    scope: resolved.scope,
    level: resolved.level,
    l3Gate: resolved.l3Gate,
    cap: resolved.cap,
    next,
    tasks: facts.tasks,
    lastPhase: "continue",
    cycle,
    gate: gradedGate,
  }));
  if (gateDecision.act?.act === "halt") {
    return { halt: { act: gateDecision.act, details: { cap: resolved.cap, findings: await accumulatedRecord(ctx, ref, loopRunId, { gate, trailing: recordedGrade }) } } };
  }
  if (gatedFindings.length > 0 || route === "redrive") {
    const reviewDecision = decideReviewGate({
      completedRounds,
      cap: reviewCap,
      hardCap: MAX_REVIEW_ROUNDS,
      previousBlockerCount: reviewBlockerCounts.get(ref),
      findings: gatedFindings,
      ...(Object.prototype.hasOwnProperty.call(gate, "blockerClaims") ? { blockerClaims: gate.blockerClaims } : {}),
    });
    if (reviewDecision.act === "halt") {
      return { halt: { act: { ...reviewDecision, ref }, details: { round: reviewDecision.round, reviewCap: reviewDecision.cap, blockerClasses: reviewDecision.blockerClasses, workItems: reviewDecision.workItems } } };
    }
    reviewRounds.set(ref, reviewDecision.round);
    if (reviewDecision.blockerCount > 0) reviewBlockerCounts.set(ref, reviewDecision.blockerCount);
    // THE FIX IS OF THE LATEST BUILD: the driver applies a fix only when it names the build run
    // it fixes (`fixSource.buildRun`), and resumes that build's session only when this node
    // drove it (`admitResumeBuildRun`) — a lane's child session is never resumable from the primary.
    // A story moved to `in-review` with no build run at all (by hand, or in a lane whose records
    // never came home) still receives its findings: the driver applies a fix only under a named
    // `buildRun`, so the gate names ITSELF — no session to resume, the launch degrades cold.
    pendingFixes.set(ref, fixTransport({
      buildRun: lastContinue ?? { runId: null, sessionId: null, node: null, phase: "gate" },
      resumeBuildRun: lastContinue == null ? null : admitResumeBuildRun(lastContinue, meshNodeIdOf(ctx.workspace.config)),
      findings: gatedFindings,
      changeBaseline: null,
      blocker: reviewDecision.blocker,
      blockers: reviewDecision.blockers,
      blockerCount: reviewDecision.blockerCount,
    }));
    if (recordedGrade != null) pendingGrades.set(ref, recordedGrade);
    // The counter is SEEDED at the cycle the gate was asked with, so the drive path's own
    // arithmetic (`prior + 1`) lands the re-drive on the cycle the engine named.
    if (!cycles.has(key)) cycles.set(key, cycle);
    return { act: { act: "drive", ref, phase: "continue", cycle: cycle + 1 } };
  }
  if (route === "halt") {
    return { halt: { act: haltDecision("grade-indeterminate", ref, gradeStopProducer(stopCode)), details: { verdict: summary?.verdict, codes: summary?.codes, cases: summary?.cases } } };
  }
  if (recordedGrade != null) pendingGrades.set(ref, recordedGrade);
  return { act: { act: "drive", ref, phase: "verify", cycle: 1 } };
}

function reportFacts(details = {}) {
  const entries = Object.entries(details).filter(([, value]) => value != null);
  if (entries.length === 0) return "";
  return ` Details: ${entries.map(([key, value]) => `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`).join("; ")}.`;
}

async function reportLine(report, state, details = {}) {
  for (const row of state.driven) {
    await report(`Driven ${row.ref} — ${row.phase} (${row.outcome}).`);
  }
  const acceptedMilestones = [...new Set(state.driven
    .filter((row) => row.phase === "verify" && row.outcome === "done" && /^\d+$/u.test(row.ref))
    .map((row) => row.ref))];
  for (const ref of acceptedMilestones) {
    await report(`Accepted milestone ${ref}.`);
  }
  await report(`${renderLoopState(state)}${reportFacts(details)}`);
}

async function runL1({ scope, level, cap, loopRunId, startedAt, resume }, ctx, report) {
  const { rows } = await localScopeItems(scope, ctx);
  const first = await nextDecision(scope, level, cap, ctx, { rows });
  const reports = [];
  for (const row of rows) {
    if (!loopScopeIncludes(scope, row.ref) || row.status === "done") continue;
    const next = { ...row, state: "ready" };
    const facts = await factsFor(next, ctx, rows);
    const decision = requireDecision(decideLoop({
      scope,
      level,
      cap,
      next,
      ...(facts.tasks !== undefined ? { tasks: facts.tasks } : {}),
      ...(facts.stories !== undefined ? { stories: facts.stories } : {}),
    }));
    reports.push({ ref: row.ref, ...actShape(decision.act) });
    if (row.type === "story") await invokeRegistered("work:validate", { scope: row.ref }, ctx);
  }
  const state = loopState({
    scope,
    level,
    cap,
    loopRunId,
    next: first.next,
    act: first.decision.act,
    resumable: { stranded: resume.stranded, lastDeclaration: resume.lastDeclaration },
  });
  for (const row of reports) await report(`${row.ref} — ${row.act}${row.phase ? ` ${row.phase}` : ""}${row.stop ? ` (${row.stop})` : ""}`);
  return state;
}

function reconstructCycleCounts(runs, loopRunId) {
  const cycles = new Map();
  for (const record of runs ?? []) {
    const declaration = record?.brief?.loop;
    if (declaration?.loopRunId !== loopRunId) continue;
    if (typeof record.itemRef !== "string" || typeof declaration.phase !== "string") continue;
    if (!Number.isInteger(declaration.cycle) || declaration.cycle < 1) continue;
    const key = `${record.itemRef}\0${declaration.phase}`;
    cycles.set(key, Math.max(cycles.get(key) ?? 0, declaration.cycle));
  }
  return cycles;
}

function recoveredReviewRounds(runs, loopRunId) {
  const rounds = new Map();
  for (const run of Array.isArray(runs) ? runs : []) {
    if (run?.state !== "done"
      || run?.brief?.loop?.loopRunId !== loopRunId
      || run?.brief?.loop?.phase !== "continue"
      || run?.brief?.progress?.continuation === true) continue;
    rounds.set(run.itemRef, (rounds.get(run.itemRef) ?? 0) + 1);
  }
  for (const [ref, completedContinues] of rounds) rounds.set(ref, Math.max(0, completedContinues - 1));
  return rounds;
}

function recoveredReviewBlockerCounts(runs, loopRunId) {
  const counts = new Map();
  for (const run of Array.isArray(runs) ? runs : []) {
    if (run?.state !== "done"
      || run?.brief?.loop?.loopRunId !== loopRunId
      || run?.brief?.loop?.phase !== "continue") continue;
    const count = run?.brief?.review?.admittedBlockerCount;
    if (Number.isSafeInteger(count) && count > 0) counts.set(run.itemRef, count);
  }
  return counts;
}

function recoveredProgressStates(runs, loopRunId) {
  const records = (Array.isArray(runs) ? runs : []).filter((run) =>
    run?.brief?.loop?.loopRunId === loopRunId
    && run?.brief?.loop?.phase === "continue");
  const byId = new Map(records.map((run) => [run.runId, run]));
  const states = new Map();
  for (const run of records) {
    const progress = run?.brief?.progress;
    if (!Number.isSafeInteger(progress?.resets) || progress.resets < 0) continue;
    states.set(run.itemRef, {
      resets: progress.resets,
      attemptRun: typeof progress.attemptRunId === "string" ? byId.get(progress.attemptRunId) ?? null : run,
      summary: progress.summary ?? null,
    });
  }
  return states;
}

export async function runLoopBody(input, suppliedCtx = {}) {
  // `let`, for exactly one reassignment below: once the stop source is composed, every drive's
  // ctx carries its signal (130/02, ADR-003 §1), and the ctx the body drives with IS that one.
  let ctx = suppliedCtx.workspace
    ? suppliedCtx
    : {
      ...suppliedCtx,
      workspace: await loadWorkspace(process.cwd(), suppliedCtx.config ?? input.config),
    };
  // An un-injected core is SILENT, never a second printer (m42 wave (d) d1). The
  // default was `console.log` and that broke `acd-console-log-confined`'s collector
  // lane (VERIFICATION F-16): a core that prints by default is a printer whatever its
  // caller wants. The launcher body below injects the real one — the `cli.launch`
  // seam owns its own announce lines, and the machine face is the probe, which never
  // launches and so never reaches here.
  const report = suppliedCtx.report ?? NO_PRINT;
  // THE NARRATE SEAM (126/00 ADR-002, AMENDED) — DERIVED from the one injected printer, never a
  // second one and never a second parameter. Derived matters twice: no new `console.log` and so
  // no new PRINTERS row (the roster may only shrink, m42 category 2), and a caller that injects
  // ONE collector receives BOTH classes of line rather than half of them.
  //
  // The classification is by ROLE, not by call site. An ACCOUNT line is what an invocation
  // RETURNS to the operator — every `reportLine` site, the L1 row lines, and `Nothing to resume`
  // — and stays on `report`, printed under `--quiet` exactly as today. An IN-FLIGHT line is one
  // printed while a drive or a gate is still PENDING, and goes here. The call-site proxy fails on
  // its own list twice: `runL1` reaches no `reportLine` at all and its rows are an L1
  // invocation's ENTIRE output, so silencing them would make `--level L1 --quiet` print zero
  // bytes — the precise opposite of what `--quiet` promises.
  const narrate = input.quiet === true ? NO_PRINT : report;
  const resolved = await resolveInvocation(input, ctx);
  const startedAt = input.startedAt
    ?? resolved.resume.lastDeclaration?.startedAt
    ?? new Date().toISOString();
  const loopRunId = input.resume === true
    ? resolved.resume.lastDeclaration?.loopRunId ?? randomUUID()
    : randomUUID();
  const reviewCap = reviewRoundsFromConfig(ctx.workspace);
  const progressBound = buildNoProgressRoundsFromConfig(ctx.workspace);
  const progressResetBound = progressMaxResetsFromConfig(ctx.workspace);
  const scheduleToCloseMs = scheduleToCloseFromConfig(ctx.workspace);
  // THE STALENESS THRESHOLD, resolved ONCE per invocation beside the other bounds and passed to
  // every consumer: the reclaim sweep below and both deadline sites. `69/FF-6901` is that this
  // module resolves it only through `loop-bounds`, and one resolution honours that more cheaply
  // than three identical ones — the reclaim and the budget must agree by construction, since a
  // run the sweep calls stale and the clock calls alive is exactly the disagreement that
  // reproduces the bill.
  const stalenessMs = heartbeatFromConfig(ctx.workspace);
  const resumeRetries = new Map();
  const pendingFixes = new Map();
  // 81/03 — THE GRADE RIDES ITS OWN MAP, KEYED BY REF, and is read at exactly the one place
  // that needs it: the seam that writes `brief.grade` on the run being started
  // (`54/ADR-008 §3`). `pendingFixes` returns to the shape `70/04` declared, and
  // `ctx.loopDrive.fix` is that shape verbatim. Nothing about what lands on the run's brief
  // changes — the durable record is written where it is written today, by the same seam,
  // through `transitionRunStart`'s `edge.brief`.
  const pendingGrades = new Map();
  // 81/02 — WHICH PENDING FIXES THE RESUME PATH RECONSTRUCTED. It is a set of refs rather than
  // a key on the transport for the reason above: the bag is 70's and gains nothing. The fact
  // it carries is this shell's own bookkeeping, and it leaves the loop as a declared absence
  // on the driven row.
  const reconstructedFixes = new Set();
  // Engine cycles and findings-driven review rounds are independent budgets.
  // Only explicit resume reconstructs either from this loop lineage; an
  // ordinary invocation's fresh id makes both maps start empty.
  const cycles = reconstructCycleCounts(resolved.resume.runs, loopRunId);
  const reviewRounds = recoveredReviewRounds(resolved.resume.runs, loopRunId);
  const reviewBlockerCounts = recoveredReviewBlockerCounts(resolved.resume.runs, loopRunId);
  const progressStates = recoveredProgressStates(resolved.resume.runs, loopRunId);
  // Baselines this process has measured or read back, keyed by ref — runs minted in this process
  // are not in `resolved.resume.runs`, so the map is what stops a second measurement.
  const gradeBaselines = new Map();

  // 130/02 (ADR-003 §1) — ONE SOURCE, COMPOSED HERE, once `loopRunId` is resolved: the process's
  // own SIGINT/SIGTERM and the request file under the aof home, read through one object. The
  // `process.once` pair this shell used to register is gone — the source owns the listeners,
  // persistent ones, and removes them itself at level 2 so a THIRD signal reaches node's default
  // (first drains, second cancels and settles, third kills). Composed in the BODY, not the launch
  // seam, so a foreground loop, a loop under `AOF_LOOP_DIAG=0` and a test-driven `runLoopBody`
  // all read it; a suite injects `ctx.stopSource` (the same seven members). `pollMs` is ADR-001
  // §5's default decision, spelled at the call as the ADR spells it. `stop()` is balanced against
  // `start()` on EVERY exit below — done, halt, L1 and a throw — by the one `finally` that closes
  // this body; an interval left armed after an L1 return would be a leak.
  const stopsDir = loopStopsDir();
  const source = ctx.stopSource ?? createStopSource({ loopRunId, dir: stopsDir, process, pollMs: 2000 });
  // The instant the halt's mark and the resume's clear are stamped at: the invocation's injected
  // `now` when it has one (the suites'), real time otherwise.
  const stopClock = () => (input.now == null ? new Date() : new Date(input.now));
  // The FACTS of the source at a halt, for the account's `Details` (through `reportLine`, never
  // `actShape`): the producer as a VALUE, the level, the request's path and its writer. Null
  // members are dropped by `reportFacts`, so a signal-only halt names no request and no writer.
  const stopFacts = () => {
    const request = source.request();
    const by = request?.by == null ? null : [request.by.node, request.by.pid].filter((part) => part != null).join(":");
    return {
      signal: source.producer(),
      level: source.level(),
      request: request == null ? null : stopRequestPath(stopsDir, loopRunId),
      by: by === "" ? null : by,
    };
  };
  // ADR-003 §5 — THE HALT AND THE MARK. Before the halt for a request is returned the request is
  // marked honoured, naming the run the source's abort settled `cancelled` (or `null` on a
  // drain); only the loop knows it has halted, so only the loop marks it. The mark keys on the
  // REQUEST, never the producer: a halt whose producer is a signal while a request also stands
  // is still marked. A signal-only halt writes nothing — there is no request to mark.
  const markHonoured = async (cancelled = null) => {
    if (source.request() == null) return;
    await markStopHonoured(stopsDir, loopRunId, { now: stopClock, cancelled });
  };
  // The halt itself — `operator-interrupt`, the stop id unchanged and the producer read off the
  // source (`"SIGINT"`, `"SIGTERM"` or `"stop-request"`), never a message match. `drive` is the
  // settled phase run the halt stands over, when there is one: a cancelled record names itself
  // on the mark and in `Details`; a `needs-input` drive is not settled and names its session.
  const haltOnStop = async (next, ref, drive = null) => {
    const cancelled = drive?.record?.state === "cancelled" ? drive.record.runId : null;
    const sessionId = drive?.outcome?.outcome === "needs-input" ? drive.outcome.sessionId ?? null : null;
    await markHonoured(cancelled);
    const state = loopState({ ...resolved, loopRunId, next, act: haltDecision("operator-interrupt", ref, source.producer()), resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
    await reportLine(report, state, { ...stopFacts(), cancelled, sessionId });
    return state;
  };
  // Every drive's ctx carries the source's `signal` beside the caller's own driver options
  // (ADR-003 §1): the driver honours it through the same stop bracket every other stop takes,
  // and the diag seam's `onSessionStop` survives the spread. Composed HERE, in the body, so a
  // foreground loop, a loop under `AOF_LOOP_DIAG=0` and a test-driven `runLoopBody` all carry
  // it — to the in-process drive, the retry ladder, the cross to verify and the wave alike.
  ctx = { ...ctx, agentSessionDriverOptions: { ...(ctx.agentSessionDriverOptions ?? {}), signal: source.signal } };
  const driven = [];

  try {
    if (input.resume === true && !resolved.resume.lastDeclaration) {
      const { next, decision } = await nextDecision(resolved.scope, resolved.level, resolved.cap, ctx, { l3Gate: resolved.l3Gate });
      const state = loopState({
        ...resolved,
        loopRunId,
        next,
        act: decision.act,
        resumable: { stranded: [], lastDeclaration: null },
      });
      await report(`Nothing to resume in ${resolved.scope} — no run carries a loop declaration.`);
      return state;
    }

    if (input.resume === true) {
      // 130/02 (ADR-003 §6; ADR-001 §4) — `--resume` CLEARS A STANDING REQUEST, and says so once.
      // A request is keyed by the loop's own id, so the only invocation that can find one is the
      // resume of the loop it stopped — the operator asking for that loop back — and it clears
      // whatever it finds, `requested` or `honoured`, before the walk. The stale rule holds by
      // construction: a fresh invocation mints a fresh id and can inherit nothing. In flight by
      // the role rule (126/ADR-002): it is not part of what the invocation returns.
      const standing = await readStopRequest(stopsDir, loopRunId);
      if (standing != null) {
        await clearStopRequest(stopsDir, loopRunId);
        await narrate(`Cleared stop request for ${loopRunId} (${standing.state}, level ${standing.level}) — resumed.`);
      }
      let resumedProgressHalt = null;
      const reclaimed = await transitionStaleRunsReclaimed(
        resolved.resume.items,
        {
          now: input.now,
          stalenessThreshold: stalenessMs,
        },
        transitionOptionsFor(ctx),
      );
      for (const entry of reclaimed) {
        // A RECLAIMED WAVE RUN IS NEVER RETRIED AS THE MILESTONE'S ACT (129/04): it carried the
        // loop's liveness for a wave (ADR-007 §2), not a drive of the milestone; the BUILD phase
        // mints a NEW one before its first dispatch. Announced like every reclaim, retried by none.
        if (entry.record?.brief?.wave == null) resumeRetries.set(entry.item.ref, { item: entry.item, prior: entry.record });
        await narrate(`Reclaimed ${entry.item.ref} — run ${entry.record.runId} (${entry.record.failureReason}).`);
      }
      for (const item of resolved.resume.items) {
        const itemRuns = await readRuns(item);
        const failed = [...itemRuns].reverse().find((record) =>
          record.state === "failed"
          && record.brief?.wave == null
          && record.brief?.loop?.loopRunId === resolved.resume.lastDeclaration?.loopRunId);
        if (failed) resumeRetries.set(item.ref, { item, prior: failed });

        // A completed continue plus still-current findings is enough persisted lineage
        // to reconstruct a pending fix after interruption. The exact findings are read
        // again from their authoritative producer; change context is omitted because
        // the pre-build git baseline was intentionally not added to the run schema.
        // 129/04 — a WAVE run is a `continue`-phase run of the milestone that drove nothing itself
        // (ADR-007 §2); it is never a build to reconstruct a fix for.
        const buildRun = [...itemRuns].reverse().find((record) =>
          record.state === "done"
          && record.brief?.wave == null
          && record.brief?.loop?.loopRunId === resolved.resume.lastDeclaration?.loopRunId
          && record.brief?.loop?.phase === "continue");
        if (buildRun) {
          const priorProgress = progressStates.get(item.ref) ?? { resets: 0, attemptRun: buildRun, summary: null };
          const attemptRun = priorProgress.attemptRun ?? buildRun;
          const samples = await readProgressSamples(item, attemptRun, {
            ...(typeof ctx.onProgressFault === "function" ? { onFault: ctx.onProgressFault } : {}),
          });
          if (samples.length > 0 && samples.at(-1).failingScenarios > 0) {
            const progressDecision = decideLoopProgress({
              samples,
              resets: priorProgress.resets,
              maxStalls: progressBound,
              maxResets: progressResetBound,
              // The engine imports nothing (F-69-V11); the deciders ride in from here,
              // which is the layer that already holds src/loop-progress.mjs.
              evaluateProgressPolicy,
              decideBuildProgress,
            });
            if (progressDecision.act === "halt") {
              resumedProgressHalt = { ...progressDecision, ref: item.ref };
              break;
            }
            if (progressDecision.act === "reset" || progressDecision.act === "continue") {
              const reset = progressDecision.act === "reset";
              progressStates.set(item.ref, {
                resets: progressDecision.resets ?? priorProgress.resets,
                attemptRun: reset ? null : attemptRun,
                summary: reset ? progressDecision.summary : priorProgress.summary,
              });
              const currentNode = meshNodeIdOf(ctx.workspace.config);
              pendingFixes.set(item.ref, fixTransport({
                buildRun,
                resumeBuildRun: reset ? null : admitResumeBuildRun(buildRun, currentNode),
                findings: reset
                  ? [{ code: "progress-reset", summary: progressDecision.summary }]
                  : [{ code: "build-still-failing", failingCount: progressDecision.failingCount }],
                changeBaseline: null,
                progressContinuation: true,
              }));
              // 81/02 — RECONSTRUCTED, AND NO GRADE WAS TAKEN FOR IT. Nothing is added to
              // `pendingGrades`: re-grading here would put a rung-3 spawn on a path
              // `54/ADR-007 §1` prices as once per completed build, and carrying the
              // pre-interruption grade forward would present evidence about the old tree as
              // evidence about the new one.
              reconstructedFixes.add(item.ref);
              continue;
            }
          }
          const completedRounds = reviewRounds.get(item.ref) ?? 0;
          const gate = await invokeReviewGate(
            item.ref,
            completedRounds,
            input,
            ctx,
            persistedGateBlockerClaims(buildRun),
            narrate,
          );
          if (Array.isArray(gate?.findings) && gate.findings.length > 0) {
            const reviewDecision = decideReviewGate({
              completedRounds,
              cap: reviewCap,
              hardCap: MAX_REVIEW_ROUNDS,
              previousBlockerCount: reviewBlockerCounts.get(item.ref),
              findings: gate.findings,
              ...(Object.prototype.hasOwnProperty.call(gate, "blockerClaims")
                ? { blockerClaims: gate.blockerClaims }
                : {}),
            });
            if (reviewDecision.act === "halt") {
              const { next } = await nextDecision(resolved.scope, resolved.level, resolved.cap, ctx, { l3Gate: resolved.l3Gate });
              const halt = { ...reviewDecision, ref: item.ref };
              const state = loopState({
                ...resolved,
                loopRunId,
                next,
                act: halt,
                resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration },
              });
              await reportLine(report, state, {
                round: reviewDecision.round,
                reviewCap: reviewDecision.cap,
                blockerClasses: reviewDecision.blockerClasses,
                workItems: reviewDecision.workItems,
              });
              return state;
            }
            reviewRounds.set(item.ref, reviewDecision.round);
            if (reviewDecision.blockerCount > 0) reviewBlockerCounts.set(item.ref, reviewDecision.blockerCount);
            const currentNode = meshNodeIdOf(ctx.workspace.config);
            pendingFixes.set(item.ref, fixTransport({
              buildRun,
              resumeBuildRun: admitResumeBuildRun(buildRun, currentNode),
              findings: gate.findings,
              changeBaseline: null,
              blocker: reviewDecision.blocker,
              blockers: reviewDecision.blockers,
              blockerCount: reviewDecision.blockerCount,
            }));
            // 81/02 — reconstructed by the resume path, so no grade was taken for it either.
            reconstructedFixes.add(item.ref);
          }
        }
      }
      if (resumedProgressHalt != null) {
        const { next } = await nextDecision(resolved.scope, resolved.level, resolved.cap, ctx, { l3Gate: resolved.l3Gate });
        const state = loopState({
          ...resolved,
          loopRunId,
          next,
          act: resumedProgressHalt,
          resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration },
        });
        await reportLine(report, state, progressReportFacts(resumedProgressHalt));
        return state;
      }
    }

    // The source is started after the resume handling, once, and stopped by the `finally` that
    // closes this body. An L1 invocation drives nothing and reaches no tick head, so it reads no
    // level: its output at level 1 is byte-identical to its output at level 0.
    source.start();
    if (resolved.level === "L1") {
      return await runL1({ ...resolved, loopRunId, startedAt }, ctx, report);
    }

    // milestone 124 / story 01 (ADR-005 §5) — THE UNITS HANDED BACK TO THEIR PLAN, set aside for
    // the remainder of THIS invocation. In-process on purpose: the bound that survives a resume is
    // the plan counter below (rebuilt by `reconstructCycleCounts` from the run records), and this
    // one is the walk's memory of what it has already asked a planner about. A new invocation is
    // entitled to offer the unit again — that is the outer limit ADR-005 §6 names.
    const setAside = new Set();
    let lastSetAside = null;
    let inFlightRef = null;

    // 129/04 (ADR-008 §3) — THE BOOKKEEPING THE LADDER WRITES, handed to `settleStoryCycle` as
    // one bag so the four maps it mutates are the shell's own and nothing is copied; and THE
    // OPTIONS every ladder call shares — the rungs that STAY here (`invokeReviewGate`,
    // `haltDecision`, `readChangeUnderReview`, `requireDecision`) reach it as parameters, never
    // as a second spelling in `src/loop/`.
    const bookkeeping = { pendingFixes, pendingGrades, progressStates, reviewRounds, reviewBlockerCounts, cycles, driven };
    const ladderOptions = {
      ctx,
      // 130/02 (ADR-003 §7) — the retry ladder reads the source after every attempt it settles, so
      // the order settle → interrupt → needs-input → retry holds at that drive site too.
      stopSource: source,
      narrate,
      report,
      input,
      resolved,
      loopRunId,
      startedAt,
      cap: resolved.cap,
      scheduleToCloseMs,
      stalenessMs,
      node: meshNodeIdOf(ctx.workspace.config),
      invokeReviewGate,
      haltDecision,
      requireDecision,
      readChangeUnderReview,
      bounds: { reviewCap, progressBound, progressResetBound },
      declarationFor,
      hasUat,
      uatCount,
    };

    // 129/04 (ADR-001 §2-§3) — THE MODE, resolved once in the bounds home, and the PHASE it
    // drives. `sequential` (unset) is today's loop, `phase` null throughout: one act per tick in
    // the primary. `refine_first` is three phases in order — REFINE (every unrefined story, in the
    // primary, then the loop's own writes committed), BUILD (the wave, in lanes — `src/loop/wave.mjs`)
    // and VERIFY (today's ladder over the in-review stories, in the primary).
    const concurrency = loopConcurrencyFromConfig(ctx.workspace);
    const refineFirst = concurrency === REFINE_FIRST_CONCURRENCY;
    let phase = refineFirst ? "refine" : null;
    let refined = 0;
    // A plan hand-off a lane returned (124/ADR-005 §5, at the wave grain): the act the next tick
    // performs INSTEAD of asking `work:next` — the plan's refine, in the primary.
    let pendingAct = null;
    const waveBounds = {
      heartbeatMs: stalenessMs,
      stalenessMs,
      scheduleToCloseMs,
      startToCloseMs: startToCloseFromConfig(ctx.workspace),
      startupGraceMs: startupGraceFromConfig(ctx.workspace),
      // 129/07 — the loop's OWN lane bound (`work.loop.dispatch.concurrency`), resolved once in the
      // bounds home and handed to the wave, which passes it to `work:dispatch` as a narrowing of
      // the pool's bound; `null` (unset) passes nothing, and admission is the pool's as at HEAD.
      laneBound: loopDispatchConcurrencyFromConfig(ctx.workspace),
    };
    const laneMemory = { laneRetries: new Map(), liveElsewhere: new Set(), laneRuns: [] };
    const scopeRefs = (await localScopeItems(resolved.scope, ctx)).items.map((item) => item.ref);

    // RECONCILE LIVE LANES BEFORE THE FIRST ASK (ADR-007 §4) — a resume under `refine_first` walks
    // nothing until every lane under the dispatch root is classified and handled; `sequential`
    // runs no reconciliation and touches no lane.
    if (input.resume === true && refineFirst) {
      const reconciled = await reconcileLanes({
        ctx,
        scopeRefs,
        narrate,
        now: input.now,
        bounds: waveBounds,
        node: ladderOptions.node,
        resolveItem: (ref) => resolveItemExact(ctx, ref),
        haltDecision,
      });
      if (reconciled.halt != null) {
        const state = loopState({ ...resolved, loopRunId, next: null, act: reconciled.halt.act, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
        await reportLine(report, state, reconciled.halt.details);
        return state;
      }
      laneMemory.laneRetries = reconciled.laneRetries;
      laneMemory.liveElsewhere = reconciled.liveElsewhere;
      laneMemory.laneRuns = reconciled.laneRuns;
    }

    for (;;) {
      // 130/02 (ADR-003 §2) — THE TICK HEAD READS THE SOURCE: one poll of the request file per
      // tick, beside the interval the source arms; the level is read below, once the tick knows
      // which ref it would have driven.
      await source.poll();
      // ---- BUILD: the wave, in lanes (ADR-001 §3, ADR-008 §1) ----
      if (phase === "build") {
        const built = await runWaveBuild({
          ctx,
          resolved,
          loopRunId,
          startedAt,
          declarationFor,
          bookkeeping,
          ladderOptions,
          setAside,
          narrate,
          report,
          now: input.now,
          bounds: waveBounds,
          scopeRuns: resolved.resume.runs,
          laneRuns: laneMemory.laneRuns,
          laneRetries: laneMemory.laneRetries,
          liveElsewhere: laneMemory.liveElsewhere,
          resolveItem: (ref) => resolveItemExact(ctx, ref),
          haltDecision,
          requireDecision,
          // 130/02 — the wave reads the SAME source (ADR-001 §6): its first level drains the
          // lanes, its signal aborts every child, and the request file reaches it through the
          // wave's own polls.
          stopSource: source,
          commitOwnWrites: () => commitOwnWrites(resolved.scope, ctx, { node: ladderOptions.node, exec: ctx.exec, message: `aof(loop): wave ${resolved.scope}` }),
        });
        if (built.outcome === "halt") {
          // A wave halted on the operator's stop carries the source's facts beside its own
          // (the drained and cancelled lanes) and marks the request honoured; the lanes it
          // cancelled are named by ref in its details, so the mark carries no single run.
          const onStop = built.act.stop === "operator-interrupt";
          if (onStop) await markHonoured(null);
          const state = loopState({ ...resolved, loopRunId, next: null, act: built.act, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
          await reportLine(report, state, onStop ? { ...stopFacts(), ...built.details } : built.details);
          return state;
        }
        if (built.outcome === "handoff") {
          // A lane's cycle cap handed its unit to the plan (124/ADR-005): the plan's refine is
          // the shell's to drive, in the primary, exactly as REFINE drives one — then the loop's
          // own writes are committed and the wave re-asks.
          lastSetAside = built.act.ref;
          pendingAct = built.act;
          phase = "refine";
          continue;
        }
        phase = "verify";
        continue;
      }

      const unrefined = phase === "refine" && pendingAct == null ? await unrefinedStories(resolved.scope, ctx) : undefined;
      const { next, facts, decision, exhausted } = pendingAct != null
        ? { next: null, facts: { tasks: undefined, stories: undefined }, decision: { act: pendingAct }, exhausted: false }
        : await nextDecision(resolved.scope, resolved.level, resolved.cap, ctx, {
          l3Gate: resolved.l3Gate,
          setAside,
          ...(refineFirst ? { concurrency, ...(unrefined === undefined ? {} : { unrefined }) } : {}),
        });
      pendingAct = null;
      // ---- REFINE ends when the engine stops answering refine: the loop commits its own
      // writes so the lanes, cut from HEAD, see the contracts (ADR-002 §2) ----
      if (phase === "refine" && !(decision?.act?.act === "drive" && decision.act.phase === "refine") && source.level() < 1) {
        const committed = refined > 0 ? await commitOwnWrites(resolved.scope, ctx, { node: ladderOptions.node, exec: ctx.exec }) : { committed: false, sha: null };
        if (committed.refused != null) {
          const halt = haltDecision("lane-merge-refused", resolved.scope, `dispatch:commit-own-writes:${committed.refused.code}`);
          const state = loopState({ ...resolved, loopRunId, next, act: halt, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
          await reportLine(report, state, { message: committed.refused.message });
          return state;
        }
        await narrate(`Refine phase complete — ${refined} ${refined === 1 ? "story" : "stories"} refined${committed.committed ? `; committed ${committed.sha}` : ""}.`);
        phase = "build";
        continue;
      }
      // EVERY READY MEMBER HAS BEEN HANDED BACK TO A PLAN. There is no act left to take, so the
      // walk returns rather than asking `work:next` a further time. `halted`, never `done`: a
      // range whose units were all handed to a planner is not a range anybody closed.
      if (exhausted === true) {
        const halt = decideReadySetExhausted({ ref: lastSetAside, cap: resolved.cap });
        const state = loopState({
          ...resolved,
          loopRunId,
          next,
          act: halt,
          resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration },
          driven,
        });
        await reportLine(report, state, { cap: resolved.cap, findings: await accumulatedRecord(ctx, halt.ref, loopRunId) });
        return state;
      }
      let act = decision.act;

      // A level at the tick head halts BEFORE any drive (ADR-003 §2), at the ref the tick would
      // have driven — the last driven ref when a level rose after its post-drive read, else the
      // offer's, else the scope.
      if (source.level() >= 1) return await haltOnStop(next, inFlightRef ?? next?.ref ?? resolved.scope);
      if (act.act === "halt" && act.ref == null) act = { ...act, ref: next?.ref ?? resolved.scope };
      if (act.act === "done" || act.act === "halt") {
        const state = loopState({
          ...resolved,
          loopRunId,
          next,
          act,
          resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration },
          driven,
        });
        const details = act.stop === "uat-gate"
          ? { humanSignoff: "required", itemType: next?.type }
          : act.stop === "dependency-blocked"
            ? { waitingOn: next?.waitingOn, skipped: next?.skipped }
            : act.stop === "unmapped-item-type"
              ? { itemType: next?.type }
              : {};
        await reportLine(report, state, details);
        return state;
      }

      // ---- 129/04 (ADR-001 §4) — A FRESH `gate` ACT IS HONOURED, not halted. The engine routes
      // an `in-review` story to the gate whatever `lastPhase` says (127's restart defect); the
      // shell runs validate + doctor and reads the RECORDED grade — `work:grade` WITHOUT `run`,
      // never a re-run — and routes on what the three say: clean → the `verify` drive, findings →
      // the existing review-gate decision and a `continue` re-drive. A `gate` act arriving for
      // any other status is still the unexpected act it always was. ----
      if (act.act === "gate" && next?.status === "in-review") {
        const gated = await freshGate(act.ref, { next, facts }, ctx, {
          input, narrate, reviewRounds, reviewBlockerCounts, cycles, resolved, reviewCap,
          pendingFixes, pendingGrades, loopRunId,
        });
        if (gated.halt != null) {
          const state = loopState({ ...resolved, loopRunId, next, act: gated.halt.act, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
          await reportLine(report, state, gated.halt.details);
          return state;
        }
        // The drive the gate decided travels the ordinary drive path below — one existing act
        // aimed at the story, not a second dispatch — with the fix and the grade already on
        // their maps, and the story's continue counter seeded at the cycle the gate was asked
        // with, so its re-drive is the cycle the engine named.
        act = gated.act;
      }
      // `gate` actions are otherwise produced after continue below; a fresh `work:next`
      // decision always starts at drive/halt/done.
      if (act.act !== "drive") {
        act = haltDecision("unmapped-item-type", next?.ref ?? resolved.scope, "unexpected-engine-act");
        const state = loopState({ ...resolved, loopRunId, next, act, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
        await reportLine(report, state, { itemType: next?.type });
        return state;
      }
      // milestone 124 / story 01 — `let` rather than `const` from here to `cycles.set` below,
      // because the cycle-cap branch may REPLACE `act` with the plan hand-off the engine
      // returns, and every one of these is a fact ABOUT the act. Re-derived there, never
      // carried across: a continue's pending fix riding a refine drive is exactly the
      // "computed and then discarded on one branch" defect the contract names.
      let fix = act.phase === "continue" ? pendingFixes.get(act.ref) ?? null : null;
      // 81/03 — the grade travels BESIDE the transport, read here and nowhere else. 129/04 — a
      // `verify` drive reads it too: the fresh gate (ADR-001 §4) puts the RECORDED grade there so
      // the verify run's brief carries it exactly as the cross to verify writes it.
      let pendingGrade = act.phase === "continue" || act.phase === "verify" ? pendingGrades.get(act.ref) ?? null : null;
      // 81/02 — the declaration this drive's row will carry, resolved BEFORE the pending maps
      // are consumed below. It is written ONLY where a rubric is declared: an unconfigured
      // repository gains no byte (`54/ADR-002 §3`), which is the one thing the declaration
      // must not do.
      let gradeAbsent = act.phase === "continue"
        && reconstructedFixes.has(act.ref)
        && declaredRubric(ctx.workspace?.config) != null
        ? "reconstructed-on-resume"
        : null;
      let key = `${act.ref}\0${act.phase}`;
      const priorCycle = cycles.get(key) ?? 0;
      let cycle = fix?.progressContinuation === true ? Math.max(1, priorCycle) : priorCycle + 1;
      if (cycle > resolved.cap) {
        // milestone 124 / story 01 (ADR-005 §2) — THE SHELL ASKS INSTEAD OF DECIDING. This site
        // minted its own `cap-exhausted` halt and returned, which is how the range ended one
        // function away from a refine branch the engine already dispatches live today. It now
        // hands the engine the facts it holds — including its OWN `cycle` and `cap`, never the
        // engine's always-`undefined` one (124/ADR-006) — and performs the act it gets back.
        //
        // THE PLAN'S RE-ENTRY COUNT IS READ OFF THE MAP THAT ALREADY EXISTS, under
        // `${planRef}\0refine`, so the second bound needs no counter of its own and survives a
        // resume for free: the refine drive mints its run against the PLAN ref, and
        // `reconstructCycleCounts` rebuilds exactly that key from the records.
        const exhaustedRef = act.ref;
        const plan = loopPlanRef({ ref: exhaustedRef, type: next?.type, parent: next?.parent });
        const capDecision = decideCycleCapExhaustion({
          ref: exhaustedRef,
          type: next?.type,
          parent: next?.parent,
          phase: act.phase,
          cycle,
          cap: resolved.cap,
          scope: resolved.scope,
          planReEntries: cycles.get(`${plan}\0refine`) ?? 0,
        });
        if (capDecision.act === "halt") {
          // THE STOP-AND-FLAG, WITH SOMETHING FLAGGED (54/03, ADR-008 §4). This site reported a
          // hardcoded `findings: []` — the loop tried its bounded number of times, failed to
          // close, and then threw away the only account of what it could not close. Nothing was
          // graded in THIS iteration (no build ran yet), so there is no trailing grade: the
          // record is the union over the runs this loop already minted.
          const halt = { ...capDecision, ref: capDecision.ref ?? exhaustedRef };
          const state = loopState({ ...resolved, loopRunId, next, act: halt, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
          await reportLine(report, state, { cap: resolved.cap, findings: await accumulatedRecord(ctx, exhaustedRef, loopRunId) });
          return state;
        }
        // THE HAND-OFF. The unit is set aside for the rest of this invocation and the act
        // becomes the plan's refine drive, which then travels the ordinary drive path below —
        // one existing act aimed at a different ref, not a new act kind and not a second
        // dispatch. Every fact ABOUT the act is re-derived for the act that will actually run;
        // the exhausted unit's own status is not written here, and its build cycles are not
        // reset (ADR-005 §6: a cap an agent's action can clear is not a cap).
        setAside.add(exhaustedRef);
        lastSetAside = exhaustedRef;
        act = capDecision;
        fix = null;
        pendingGrade = null;
        gradeAbsent = null;
        key = `${act.ref}\0${act.phase}`;
        cycle = act.cycle;
      }
      cycles.set(key, cycle);
      inFlightRef = act.ref;
      const declaration = declarationFor({ ...resolved, loopRunId, phase: act.phase, cycle, startedAt });
      if (act.phase === "continue") {
        pendingFixes.delete(act.ref);
        // The grade and the reconstruction marker are consumed with the fix they belong to —
        // one drive spends one pending re-drive, whichever map the fact rode in.
        pendingGrades.delete(act.ref);
        reconstructedFixes.delete(act.ref);
      }
      if (act.phase === "verify") pendingGrades.delete(act.ref);
      // A valid claim explicitly supplied for this continue's eventual gate is
      // persisted with the run before that gate executes. If the gate admits a
      // further re-drive and the process is interrupted before it starts, resume
      // can reconstruct the already-admitted pending fix without asking again.
      const gateBlockerClaims = act.phase === "continue"
        ? reviewClaimsFor(input, act.ref, reviewRounds.get(act.ref) ?? 0)
        : undefined;
      const gateBlockerClaim = gateBlockerClaims?.[0];
      let gradeBaseline = null;
      if (act.phase === "continue" && declaredRubric(ctx.workspace?.config) != null) {
        gradeBaseline = gradeBaselines.get(act.ref) ?? readGradeBaseline(resolved.resume.runs, act.ref) ?? null;
        if (gradeBaseline == null) {
          // THE SEQUENTIAL BASELINE IS PER STORY, ON THE PRIMARY (129/ADR-003 §5): measured
          // through the ladder's one measurer, keyed by ref, with no `baseCommit` — the shipped
          // line, byte-identical. The per-base-commit baseline is the wave's (`src/loop/wave.mjs`).
          const priorDrives = resolved.resume.runs.filter((run) => run?.itemRef === act.ref && run?.brief?.loop?.phase === "continue").length;
          const taken = await measureGradeBaseline(act.ref, ctx, { now: input.now, priorDrives });
          if (taken != null) {
            gradeBaseline = taken.baseline;
            await narrate(
              `Baseline work:grade ${act.ref} — ${taken.baseline.failures.length} failing case(s) inherited, ${taken.measured.cases.total} case(s) measured`
              + `${priorDrives > 0 ? ` (taken after ${priorDrives} prior drive(s) of this story — its own earlier reds are excluded too)` : ""}.`,
            );
          }
        }
        if (gradeBaseline != null) gradeBaselines.set(act.ref, gradeBaseline);
      }
      const brief = runBrief(declaration, {
        admittedBlockerClaim: fix?.blocker,
        admittedBlockerClaims: fix?.blockers,
        admittedBlockerCount: fix?.blockerCount,
        gateBlockerClaim,
        gateBlockerClaims,
        progress: progressStates.get(act.ref),
        progressContinuation: fix?.progressContinuation === true,
        // THE DURABLE RECORD, AT THE SEAM THAT ALREADY WRITES THE LOOP DECLARATION (ADR-008
        // §3): the grade that caused this re-drive rides the brief of the run it re-drove.
        // Absent on a first cycle and on any resumed re-drive whose grade this process never
        // took — an honest absence, never a fabricated entry.
        //
        // 81/03 — READ FROM ITS OWN MAP. This is the one place the pending grade is read, and
        // `ctx.loopDrive.fix` is never its carrier.
        grade: pendingGrade,
        gradeBaseline,
      });
      const roundBaseline = act.phase !== "continue"
        ? null
        : typeof ctx.readChangeBaseline === "function"
          ? await ctx.readChangeBaseline(ctx.workspace.projectRoot)
          : await readBuildBaseline(ctx.workspace.projectRoot);
      const changeBaseline = act.phase !== "continue"
        ? null
        : fix?.changeBaseline ?? (typeof roundBaseline === "string" ? roundBaseline : roundBaseline?.tree ?? null);
      const progressBaseCommit = typeof roundBaseline === "object" ? roundBaseline?.commit ?? null : null;

      let retryRecord = null;
      const resumedLineage = resumeRetries.get(act.ref);
      if (resumedLineage) {
        try {
          const resumeDeadline = decideScheduleToClose({
            elapsedMs: budgetElapsedMs({
              runs: resolved.resume.runs,
              record: resumedLineage.prior,
              stalenessMs,
              now: input.now ?? new Date().toISOString(),
            }),
            ceilingMs: scheduleToCloseMs,
          });
          if (resumeDeadline.act === "halt") {
            const halt = { ...resumeDeadline, ref: act.ref };
            const state = loopState({ ...resolved, loopRunId, next, act: halt, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
            await reportLine(report, state, { deadline: halt.deadline, ceilingMs: halt.ceilingMs, elapsedMs: halt.elapsedMs, disposition: halt.disposition });
            return state;
          }
          const resumed = await transitionRunStart(
            resumedLineage.item,
            {
              mode: "retry",
              runId: resumedLineage.prior.runId,
              maxAttempts: resolved.cap,
              brief,
              node: meshNodeIdOf(ctx.workspace.config),
              now: input.now,
            },
            transitionOptionsFor(ctx),
          );
          retryRecord = resumed.record;
          // AFTER the store admits the mint, never before it: a retry the store refuses
          // (`not-retryable`, `retry-parked`, `attempts-exhausted`) must not announce itself.
          await narrate(`Resumed ${act.ref} — attempt ${resumed.record.attempt} of ${resolved.cap} on run ${resumed.record.runId}.`);
          resumeRetries.delete(act.ref);
        } catch (error) {
          const stop = storeStop(error);
          if (stop != null) {
            stop.ref = act.ref;
            const state = loopState({ ...resolved, loopRunId, next, act: stop, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
            await reportLine(report, state, {
              readyAt: error.readyAt,
              attempt: resumedLineage.prior.attempt,
            });
            return state;
          }
          resumeRetries.delete(act.ref);
          continue;
        }
      }
      // THE ACT LINE — printed at the one place a multi-hour wait begins. `drivePhase` mints the
      // run and then awaits the PTY session; every fact worth reading is already in scope here.
      await narrate(`Driving ${act.ref} — ${act.phase}, cycle ${cycle} of ${resolved.cap}, ${resolved.level}.`);
      let phaseRun = await drivePhase({ ref: act.ref, phase: act.phase, cycle, declaration, brief, retryRecord, fix, gradeAbsent, changeBaseline, progressBaseCommit, now: input.now }, ctx);
      // 130/02 (ADR-003 §3, §7) — THE INTERRUPT PATH ALWAYS SETTLES. The order after a drive is
      // settle → interrupt → needs-input → retry: a drive that ended on its own settles as it
      // ended, a drive the source cancelled settles `cancelled`, and only then is the source
      // read. The early return that stood here before the settle is what left 129/04's run
      // `running` with the driver's observation discarded — the leaked non-terminal row the
      // dedup guard walls the next mint on (20/ADR-006).
      phaseRun = await settleDriven(phaseRun, ctx, { now: input.now, narrate });
      driven.push(drivenRow(phaseRun));
      await source.poll();
      if (source.level() >= 1) return await haltOnStop(next, act.ref, phaseRun);

      if (phaseRun.outcome.outcome === "needs-input") {
        const halt = haltDecision("session-needs-input", act.ref, "driver:needs-input");
        const state = loopState({ ...resolved, loopRunId, next, act: halt, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
        await reportLine(report, state, { sessionId: phaseRun.outcome.sessionId });
        return state;
      }

      {
        const retried = await retryUntilTerminal(phaseRun, {
          drive: (retryRecord) => drivePhase({ ref: act.ref, phase: act.phase, cycle, declaration, brief, retryRecord, fix, gradeAbsent, changeBaseline, progressBaseCommit, now: input.now }, ctx),
          ref: act.ref,
          phase: act.phase,
          brief,
        }, bookkeeping, { ...ladderOptions, now: input.now });
        phaseRun = retried.phaseRun;
        if (retried.halt != null) {
          const state = loopState({ ...resolved, loopRunId, next, act: retried.halt.act, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
          await reportLine(report, state, retried.halt.details);
          return state;
        }
        // The ladder returns to this shell on a level it read after an attempt it settled (ADR-003
        // §7 at the retry site): the halt names that attempt's run.
        if (source.level() >= 1) return await haltOnStop(next, act.ref, phaseRun);
      }

      if (phaseRun.outcome.outcome !== "done") continue;
      // REFINE's tally — what the phase's closing line reports and what decides whether the
      // loop has own writes to commit before the lanes are cut.
      if (phase === "refine" && act.phase === "refine") refined += 1;

      if (act.phase === "continue") {
        // THE LADDER, EXTRACTED (129/04, ADR-008 §3): grade delta, sampler, review gate, the
        // bookkeeping maps and the cross to verify live in `src/loop/cycle.mjs` and run here
        // against the PRIMARY workspace with `crossToVerify: true` — byte-identical under
        // `sequential`. A halt is returned, never printed there: this shell prints the account.
        const settled = await settleStoryCycle(phaseRun, bookkeeping, ctx, {
          ...ladderOptions,
          crossToVerify: true,
          now: input.now,
          next,
          facts,
          gradeBaseline: gradeBaselines.get(act.ref) ?? null,
        });
        // The cross to verify is the third drive site (ADR-003 §7): its settled run is read here
        // against the source before the ladder's own halt, so an interrupt over a `needs-input`
        // verify names the session, and a cancelled verify names its run.
        await source.poll();
        if (source.level() >= 1) return await haltOnStop(next, act.ref, settled.verified ?? null);
        if (settled.next === "halt") {
          const state = loopState({ ...resolved, loopRunId, next, act: settled.halt.act, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
          await reportLine(report, state, settled.halt.details);
          return state;
        }
      }
    }
  } finally {
    source.stop();
  }
}

export function renderLoopState(state) {
  // 130/02 (ADR-002 §5) — the stop's one line: the document `stopLoopCommand` answered, read by
  // the key only it carries.
  if (typeof state?.request === "string") {
    return `${state.scope} — stop requested (${state.request}) for loop ${state.loopRunId}, ${state.live === true ? "live" : "not live"}. ${state.path}`;
  }
  const resume = `aof work loop ${state.scope} --resume`;
  if (state.act.act === "done") return `${state.scope} — loop done.`;
  if (state.act.act === "halt") {
    return `${state.scope} — halted on ${state.act.stop} at ${state.act.ref ?? state.scope} (producer ${state.act.producer ?? "unknown"}). Resume with: ${resume}`;
  }
  const target = state.act.ref ? ` ${state.act.ref}` : "";
  const phase = state.act.phase ? ` ${state.act.phase}` : "";
  return `${state.scope} — ${state.level}, cap ${state.cap}: ${state.act.act}${phase}${target}.`;
}

export const loopCommand = {
  id: "work:loop",
  input: {
    type: "object",
    properties: {
      scope: { type: "string" },
      level: { type: "string" },
      resume: { type: "boolean" },
      cap: { type: "number" },
      reviewClaims: { type: "array" },
      dryRun: { type: "boolean" },
      // 126/00 ADR-002 §6 — the flag lands in three places or it does not exist: this closed
      // schema, `cli.spec.flags` and `cli.argv`. The ratchet is its direction: silence is the
      // behaviour that has to be asked for, so there is no `--verbose` anywhere.
      quiet: { type: "boolean" },
      // 126/02 ADR-004 §5-§6 — the supervision opt-in, in the same three homes every flag lands in.
      supervised: { type: "boolean" },
      // 130/02 ADR-002 §1 — the stop, in the same three homes. `run` dispatches on it alone.
      stop: { type: "boolean" },
    },
    required: ["scope"],
    additionalProperties: false,
  },
  // 130/02 (ADR-002 §2) — `run` DISPATCHES: `stop: true` is the verb, otherwise the byte-identical
  // read-only probe (FF-5304's ten keys). Nothing else on the input selects the stop.
  run: (input, ctx) => (input?.stop === true ? stopLoopCommand(input, ctx) : probeLoop(input, ctx)),
  cli: {
    route: ["work", "loop"],
    spec: {
      usage: "aof work loop <driver|NN-MM> [--level L1|L2|L3] [--cap N] [--review-claims JSON] [--resume] [--stop] [--dry-run] [--quiet] [--supervised] [--json]",
      flags: {
        level: { type: "string", description: "loop level (L1 report-only, L2 assisted, or L3 unattended when its computed gate passes)" },
        cap: { type: "string", description: "override the per-(ref, phase) drive ceiling" },
        reviewClaims: { type: "string", description: "JSON structured blocker claims keyed by ref and completed review rounds" },
        resume: { type: "boolean", description: "settle stranded runs and resume the last declaration" },
        stop: { type: "boolean", description: "ask the scope's running loop to stop: the first request drains, a second cancels the in-flight session; --resume clears it" },
        dryRun: { type: "boolean", description: "render the read-only probe instead of entering the loop" },
        quiet: { type: "boolean", description: "silence the in-flight progress lines; the terminal account is printed unchanged" },
        supervised: { type: "boolean", description: "declare this loop supervised, so a restarted node relaunches it; off by default" },
      },
    },
    argv: (positionals, options) => ({
      scope: positionals[0],
      ...(options.level != null ? { level: options.level } : {}),
      ...(options.cap != null ? { cap: Number(options.cap) } : {}),
      ...(options.reviewClaims != null ? { reviewClaims: JSON.parse(options.reviewClaims) } : {}),
      ...(options.resume === true ? { resume: true } : {}),
      ...(options.stop === true ? { stop: true } : {}),
      ...(options.dryRun === true ? { dryRun: true } : {}),
      ...(options.quiet === true ? { quiet: true } : {}),
      ...(options.supervised === true ? { supervised: true } : {}),
    }),
    // 130/02 (ADR-002 §1) — a `--stop` stays on the probe side exactly as `--dry-run` does: it
    // never enters the foreground body, never installs the diag recorder, never reaches a PTY.
    // It prints through `render`.
    launch: (options) => options.dryRun === true || options.stop === true
      ? null
      : (input, faceCtx) => {
        // The EXIT-REASON recorder (2026-09-11, `src/loop-diag.mjs`) — installed HERE, at the
        // one seam only an operator's foreground loop reaches: never by the `--json` probe,
        // never by `runLoopBody` (tests drive it in-process), never by a daemon. Two loops died
        // silently in one afternoon, after the driver's own kill of a finished session, and
        // nothing was listening; this is what listens. On by default while that is being
        // debugged; `AOF_LOOP_DIAG=0` opts out. It tees stdout and stderr into its log and
        // announces the log's path on stderr, so the printer below stays the one it was.
        const diag = installLoopDiagnostics({ argv: process.argv.slice(2) });
        return runLoopBody(input, {
          config: faceCtx.options.config,
          // THE SESSION STOP, BRACKETED (2026-09-12): the driver reports each step of ending a
          // session — stop requested, tree terminated, pty released, exit confirmed — into the
          // same log as the exit reasons, so a death inside that sequence names its line.
          ...(diag == null ? {} : {
            agentSessionDriverOptions: {
              onSessionStop: (event) => diag.write("driver", JSON.stringify(event)),
            },
          }),
          // The launcher seam's own printer — the ONE console.log in this module, and
          // the reason `commands/loop.mjs` is a declared `cli.launch` printer rather
          // than a core that prints (m42 PRINTERS category 2).
          report: (line) => console.log(line),
        });
      },
    render: renderLoopState,
    json: (result) => result,
  },
};
