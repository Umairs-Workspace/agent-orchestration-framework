// src/loop/cycle.mjs — THE PER-STORY POST-DRIVE LADDER, EXTRACTED (milestone 129 / story 04;
// ADR-008 §3, ADR-003 §2).
//
// What lived inline in `runLoopBody` after a completed `continue` drive — the grade delta
// against the baseline, the progress sampler, the review gate and its rounds, the four
// bookkeeping maps (`pendingFixes`, `pendingGrades`, `progressStates`, `reviewRounds`) and the
// cross to `verify` — is `settleStoryCycle` here, parameterised by the WORKSPACE it grades in
// (`ctx.workspace`) so the wave (`wave.mjs`) can run it per lane with a lane workspace while the
// shell runs it with the primary and `crossToVerify: true`. Under `sequential` every
// observable of the loop is byte-identical; the standing loop suites are the proof.
//
// WHAT STAYS IN THE SHELL, BY RULING (129/04, 2026-09-13): the gate ladder (`invokeGateLadder`,
// `DOCTOR_GATE_CODES`), `haltDecision`, and the git helpers (`readBuildBaseline`,
// `readChangeUnderReview`) — they reach this module through the options bag and are never
// re-spelled here. FF-12902 (05) makes `child-drive.mjs` the ONLY family module that reaches
// `node:child_process`; this one spawns nothing and touches no git.
//
// `narrate` and `report` are PARAMETERS, never a second printer: nothing here reaches
// `console.log`, `console.error` or `process.stdout` (task 00's narration scenario, and
// FF-12602's needle scan extended over the family). A caller that injects one collector
// receives every line this module prints.
import { resolveItemExact, requireLocalCheckout } from "../commands/resolve.mjs";
import {
  decideLoop,
  decideLoopProgress,
  decideReviewGate,
  decideScheduleToClose,
  isReviewBlockerClaim,
  lineageElapsedMs,
  mapStoreRefusal,
  retryLineage,
} from "../work/loop.mjs";
import { MAX_REVIEW_ROUNDS } from "../loop-bounds.mjs";
import {
  appendProgressSample,
  decideBuildProgress,
  evaluateProgressPolicy,
  readProgressSamples,
  sampleWorktreeProgress,
} from "../loop-progress.mjs";
import { ADVISORY_CODES, GRADE_CODES, GRADE_VERDICTS, boundGradeFailures } from "../work/grade.mjs";
import { PHASE_BRIEF_MAX_CHARS } from "../phase-brief.mjs";
import { declaredRubric } from "../commands/grade.mjs";
import { lockContextFor } from "../item-lock.mjs";
import { meshNodeIdOf } from "../commands/mesh/gate.mjs";
import { isStale, parseResumeAfter, readRuns } from "../run-store.mjs";
import { transitionRunComplete, transitionRunStart } from "../effects/run-transitions.mjs";
import { reportDegrade } from "../degrade.mjs";
import { settleSpendFromTranscript } from "../run-spend-ingest.mjs";

const NO_PRINT = () => {};

// Deferred by design, exactly as the shell defers it: command-core registers the loop, so a
// static import back into it would close the registry ring. `ctx.invokeRegistered` is the
// family's one injectable invoke seam — a suite scripting `work:grade` / `work:validate` /
// `work:doctor` answers for a lane hands it in the way it hands in `spawnLaneDrive`.
async function invokeRegistered(id, input, ctx) {
  if (typeof ctx?.invokeRegistered === "function") return await ctx.invokeRegistered(id, input, ctx);
  const { invoke } = await import("../command-core.mjs");
  return await invoke(id, input, ctx);
}

// Foreign-node admission belongs to the loop/door that knows WHERE the prior run
// happened. The executor receives either an admitted local run or null and never
// makes a node-placement decision of its own (m53/FF-5303).
export function admitResumeBuildRun(buildRun, currentNode) {
  const runNode = typeof buildRun?.node === "string" && buildRun.node.length > 0 ? buildRun.node : null;
  if (runNode == null) return buildRun ?? null;
  return typeof currentNode === "string" && currentNode.length > 0 && currentNode === runNode
    ? buildRun
    : null;
}

// 81/01 — THE GRADE AS IT IS WRITTEN, wherever the loop writes one.
//
// `compileGrade`'s record is unchanged and still carries the runner's failures WHOLE — that
// is what `aof work grade <ref> --json` reports and where the complete truth belongs. What
// crosses into a durable record, a report line or a maker's prompt is this projection, and it
// is bounded: three writers with no bound and one reader with one is the bound in the only
// place it does not matter, because a human can stop reading and a run record cannot.
//
// THE RECORD'S KEY SET DOES NOT MOVE. The truncation statement rides INSIDE `failures`, as
// its own `{ truncation }` entry, so `brief.grade` gains no key, the run record gains no
// top-level key, and a reader tells the statement from a runner-emitted case by a KEY rather
// than by parsing prose. A payload that already fits is returned unchanged.
function writtenGrade(grade) {
  if (grade == null || typeof grade !== "object") return grade;
  const bounded = boundGradeFailures(grade.failures, { maxChars: PHASE_BRIEF_MAX_CHARS });
  return bounded.truncated ? { ...grade, failures: [...bounded.failures] } : grade;
}

// THE DURABLE GRADE RECORD RIDES THIS BAG, AND NOTHING ELSE MOVES (54/03, ADR-008 §3).
// `brief.grade` is written through the ONE seam that already writes `brief.loop` —
// `transitionRunStart`'s `edge.brief` — so the run store and the transition seam are passed
// THROUGH and not edited: no new key, no new state, no new transition. The bag already
// carries sibling keys from independent producers (`brief.review`, `brief.progress`,
// `brief.assignmentId`); this is one more.
//
// 129/04 (ADR-003 §1, ADR-004 §2) — `gradeBaseline.baseCommit` and `lane` are ADDITIVE: a
// baseline measured per base commit carries the sha it was measured at, and a lane run names
// its worktree, branch and base. A `sequential` brief carries neither key and is byte-identical.
export function runBrief(declaration, {
  admittedBlockerClaim,
  admittedBlockerClaims,
  admittedBlockerCount,
  gateBlockerClaim,
  gateBlockerClaims,
  progress,
  progressContinuation = false,
  grade = null,
  gradeBaseline = null,
  lane = null,
  wave = null,
} = {}) {
  const review = {
    ...(isReviewBlockerClaim(admittedBlockerClaim) ? { admittedBlockerClaim } : {}),
    ...(Array.isArray(admittedBlockerClaims) && admittedBlockerClaims.length > 0 ? { admittedBlockerClaims } : {}),
    ...(Number.isSafeInteger(admittedBlockerCount) && admittedBlockerCount > 0 ? { admittedBlockerCount } : {}),
    ...(isReviewBlockerClaim(gateBlockerClaim) ? { blockerClaim: gateBlockerClaim } : {}),
    ...(Array.isArray(gateBlockerClaims) && gateBlockerClaims.length > 0 ? { blockerClaims: gateBlockerClaims } : {}),
  };
  return {
    loop: declaration,
    ...(grade == null ? {} : { grade: writtenGrade(grade) }),
    ...(gradeBaseline == null ? {} : {
      gradeBaseline: {
        measuredAt: gradeBaseline.measuredAt,
        priorDrives: gradeBaseline.priorDrives,
        failures: [...gradeBaseline.failures],
        ...(typeof gradeBaseline.baseCommit === "string" && gradeBaseline.baseCommit.length > 0 ? { baseCommit: gradeBaseline.baseCommit } : {}),
      },
    }),
    ...(Object.keys(review).length === 0 ? {} : { review }),
    ...(progress == null ? {} : {
      progress: {
        resets: progress.resets,
        attemptRunId: progress.attemptRun?.runId ?? null,
        summary: progress.summary ?? null,
        continuation: progressContinuation,
      },
    }),
    ...(lane == null ? {} : { lane: { worktree: lane.worktree, branch: lane.branch, baseCommit: lane.baseCommit } }),
    ...(wave == null ? {} : { wave: { members: [...wave.members], baseCommit: wave.baseCommit, bound: wave.bound } }),
  };
}

// ===================== THE GRADE BASELINE — a story is graded on what it changed =====================
//
// MEASURED 2026-09-12 on milestone 127's first story, driven on a SHARED checkout: the rubric
// was red on seven cases and not one was in the story's write set. The shell read every one as
// the story's — a deadlock the shell built for itself.
//
// THE RULE. A story is graded on the DELTA from a baseline: the rubric's failing-case set,
// measured ONCE through the same `work:grade` the grade itself uses (no run claimed). Every
// grade after it is reduced to the cases the baseline did not carry; the rest are INHERITED —
// named in the narration, carried in the count, and excluded from the verdict, the progress
// sampler and the fix payload.
//
// PERSISTED ON THE DRIVE'S BRIEF (`brief.gradeBaseline`) so a `--resume` reads it back rather
// than paying for it again. 129/04 (ADR-003 §1): under `refine_first` the baseline is a property
// of the BASE COMMIT, measured once per wave in a lane and persisted on every lane run of that
// wave with the additive `baseCommit`; the selector below reads it back BY SHA across stories.
//
// `readGradeBaseline(runs, ref)` — by ref, as today: the latest run of that item carrying a
// baseline, `baseCommit` carried through (null when the record has none).
// `readGradeBaseline(runs, { baseCommit })` — by sha: the latest run of ANY item whose baseline
// names that base. A baseline with no `baseCommit` never answers a sha selector, and a sha never
// answers a ref: the two selectors never cross.
export function readGradeBaseline(runs, selector) {
  const byBase = selector !== null && typeof selector === "object";
  const baseCommit = byBase && typeof selector.baseCommit === "string" && selector.baseCommit.length > 0 ? selector.baseCommit : null;
  if (byBase && baseCommit == null) return null;
  let latest = null;
  for (const record of Array.isArray(runs) ? runs : []) {
    const baseline = record?.brief?.gradeBaseline;
    if (baseline == null || typeof baseline !== "object" || !Array.isArray(baseline.failures)) continue;
    if (byBase ? baseline.baseCommit !== baseCommit : record?.itemRef !== selector) continue;
    if (latest == null || String(record.createdAt ?? "") > String(latest.createdAt ?? "")) latest = record;
  }
  if (latest == null) return null;
  const baseline = latest.brief.gradeBaseline;
  return {
    measuredAt: typeof baseline.measuredAt === "string" ? baseline.measuredAt : null,
    priorDrives: Number.isSafeInteger(baseline.priorDrives) ? baseline.priorDrives : null,
    failures: baseline.failures.filter((name) => typeof name === "string"),
    runId: latest.runId,
    baseCommit: typeof baseline.baseCommit === "string" && baseline.baseCommit.length > 0 ? baseline.baseCommit : null,
  };
}

export function applyGradeBaseline(answer, baseline) {
  if (baseline == null || !Array.isArray(baseline.failures) || baseline.failures.length === 0) return answer;
  const summary = gradeSummary(answer);
  if (summary == null || summary.verdict !== "fail") return answer;
  const grade = answer.grade;
  const failures = Array.isArray(grade.failures) ? grade.failures : [];
  const inherited = new Set(baseline.failures);
  const own = failures.filter((failure) => !(typeof failure?.case === "string" && inherited.has(failure.case)));
  const inheritedCount = failures.length - own.length;
  if (inheritedCount === 0) return answer;
  const cases = { ...(grade.cases ?? {}), failed: own.length };
  // No own failure left: the verdict is a pass on the delta. `case-failed` is the one code the
  // delta retires; the advisory codes describe the join and stand. No tenth code is invented —
  // the inherited count rides beside the answer, never inside `GradeRecord`.
  const verdict = own.length > 0 ? "fail" : "pass";
  const codes = (Array.isArray(grade.codes) ? grade.codes : []).filter((code) => own.length > 0 || code !== "case-failed");
  return { ...answer, grade: { ...grade, verdict, codes, cases, failures: own }, inherited: inheritedCount };
}

export function failingCountFromGrade(answer) {
  const grade = answer?.grade;
  if (grade?.verdict !== "pass" && grade?.verdict !== "fail") return null;
  const failed = grade?.cases?.failed;
  return Number.isSafeInteger(failed) && failed >= 0 ? failed : null;
}

// MEASURE A BASELINE through `work:grade --run` with no run claimed — a baseline is a
// measurement of the tree, not a verdict on a drive. Answers the baseline record, or null
// when the rubric measured nothing (unconfigured, indeterminate) or threw — the fault is
// reported through the one degrade sink and the story grades raw, exactly as before.
// The caller supplies `priorDrives` (sequential: the story's earlier continue drives; a lane
// on a clean base: 0) and the additive `baseCommit` (a lane's base; absent for sequential).
export async function measureGradeBaseline(ref, ctx, { now, priorDrives = 0, baseCommit = null } = {}) {
  try {
    const measured = await invokeRegistered("work:grade", { ref, run: true }, ctx);
    const measuredSummary = gradeSummary(measured);
    if (measuredSummary == null || (measuredSummary.verdict !== "pass" && measuredSummary.verdict !== "fail")) return null;
    const failures = (Array.isArray(measured.grade?.failures) ? measured.grade.failures : [])
      .map((failure) => failure?.case)
      .filter((name) => typeof name === "string" && name.length > 0);
    return {
      baseline: {
        measuredAt: now ?? new Date().toISOString(),
        priorDrives,
        failures,
        ...(baseCommit == null ? {} : { baseCommit }),
      },
      measured: measuredSummary,
    };
  } catch (error) {
    reportDegrade("loop-grade-baseline", error);
    return null;
  }
}

// ===================== 54/03 — THE GRADE'S OWN HALF OF THE GATE =====================
//
// Rung 3 of the cost ladder reads an answer the loop has ALREADY taken for the continue it is
// gating — one `work:grade --run`, one bounded child process, per completed build. Nothing
// below invokes the grade a second time.

// The grade's SUMMARY, or null when this repository graded nothing.
//
// `configured !== true` IS THE HONEST-NO-OP GUARD (ADR-002 §3): a repository declaring no
// `work.rubric` gets `indeterminate` / `rubric-unconfigured` — never a `pass` — and the loop
// must then behave BYTE-FOR-BYTE as it does today.
export function gradeSummary(answer) {
  if (answer?.configured !== true) return null;
  const grade = answer?.grade;
  if (grade == null || typeof grade !== "object" || !GRADE_VERDICTS.includes(grade.verdict)) return null;
  const cases = grade.cases ?? {};
  return {
    verdict: grade.verdict,
    // REPORTED IN `GRADE_CODES`' OWN FROZEN ORDER, ordered here rather than trusted.
    codes: (Array.isArray(grade.codes) ? [...grade.codes] : [])
      .filter((code) => GRADE_CODES.includes(code))
      .sort((left, right) => GRADE_CODES.indexOf(left) - GRADE_CODES.indexOf(right)),
    cases: {
      total: Number.isSafeInteger(cases.total) ? cases.total : 0,
      failed: Number.isSafeInteger(cases.failed) ? cases.failed : 0,
      skipped: Number.isSafeInteger(cases.skipped) ? cases.skipped : 0,
    },
  };
}

// The grade's failing cases, as entries for the payload 70/04 already carries. Only a `fail`
// contributes. 81/01 — measured the way it is written (`composeFixInput` renders each entry
// with `JSON.stringify(finding, null, 2)` joined by a blank line), and bounded where written.
const measureRenderedFinding = (entry) => JSON.stringify({ gate: "work:grade", ...entry }, null, 2).length + 2;

export function gradeFindings(answer) {
  const summary = gradeSummary(answer);
  if (summary == null || summary.verdict !== "fail") return [];
  const code = summary.codes.find((entry) => !ADVISORY_CODES.includes(entry)) ?? null;
  const failures = Array.isArray(answer?.grade?.failures) ? answer.grade.failures : [];
  const entries = failures.map((failure) => ({
    gate: "work:grade",
    code,
    // EMITTED VERBATIM (ADR-006 §1). The case identity and the message are the runner's own words.
    case: failure?.case ?? null,
    message: failure?.message ?? null,
    scenario: failure?.scenario ?? null,
  }));
  const bounded = boundGradeFailures(entries, { maxChars: PHASE_BRIEF_MAX_CHARS, measure: measureRenderedFinding });
  return bounded.failures.map((entry) => (entry.truncation == null ? entry : { gate: "work:grade", ...entry }));
}

// The stop CODE an `indeterminate` grade halts on, or null when it does not halt.
// `rubric-unconfigured` is the ONE `indeterminate` that PROCEEDS EXACTLY AS TODAY. THE CODE IS
// THE PRODUCER'S SOURCE, VALIDATED AGAINST THE FROZEN VOCABULARY (FF-5409); nothing here reads
// the grade's `message`.
export function gradeStopCode(answer) {
  const summary = gradeSummary(answer);
  if (summary == null || summary.verdict !== "indeterminate") return null;
  return summary.codes.find((code) => code !== "rubric-unconfigured" && !ADVISORY_CODES.includes(code)) ?? null;
}

// The `grade-indeterminate` stop's producer — the grade command, and the code it returned. A
// record whose verdict is `indeterminate` but whose codes name NO admissible stop is MALFORMED
// and still halts; its producer names the command alone.
export function gradeStopProducer(code) {
  return code == null ? "work:grade" : `work:grade:${code}`;
}

// ===================== THE VERDICT DECIDES THE ACT (ADR-007 §3) =====================
//
//   pass          -> "proceed"  (cross to verify)
//   fail          -> "redrive"  (re-drive the build, however many entries it contributed)
//   indeterminate -> "halt"     (grade-indeterminate), EXCEPT `rubric-unconfigured` → "proceed"
//   (unconfigured)-> null       (behave byte-for-byte as today)
export function gradeRoute(answer) {
  const summary = gradeSummary(answer);
  if (summary == null) return null;
  if (summary.verdict === "pass") return "proceed";
  if (summary.verdict === "fail") return "redrive";
  if (summary.verdict !== "indeterminate") return null;
  const proceedsAsToday = gradeStopCode(answer) == null && summary.codes.includes("rubric-unconfigured");
  return proceedsAsToday ? "proceed" : "halt";
}

// THE PAYLOAD IS THE ONE THE SHELL ALREADY BUILDS, NOT A SECOND ONE (ADR-008 §5). When the grade
// contributes nothing the ladder's findings pass through VERBATIM; when it does, the payload
// becomes a UNION and every entry names the rung that produced it.
export function mergeGateFindings(gate, contributed) {
  const findings = Array.isArray(gate?.findings) ? gate.findings : [];
  if (!Array.isArray(contributed) || contributed.length === 0) return findings;
  const produced = typeof gate?.gate === "string" && gate.gate.length > 0 ? gate.gate : null;
  const tagged = produced == null
    ? findings
    : findings.map((finding) => (
      finding != null && typeof finding === "object" && !Array.isArray(finding)
        ? { gate: produced, ...finding }
        : finding
    ));
  return [...tagged, ...contributed];
}

// ===================== 81/03 — THE FIX TRANSPORT IS 70's, AND ONLY 70's =====================
//
// THE SHAPE IS DECLARED, AND EVERY SITE PREPARES IT THROUGH ONE CONSTRUCTOR: the gate re-drive,
// the progress `reset`, the progress `continue`, and the resume path's reconstruction.
export const LOOP_FIX_TRANSPORT_KEYS = Object.freeze([
  "buildRun",
  "resumeBuildRun",
  "findings",
  "changeUnderReview",
  "changeBaseline",
  "blocker",
  "blockers",
  "blockerCount",
  "progressContinuation",
]);

export function fixTransport({
  buildRun = null,
  resumeBuildRun = null,
  findings = [],
  changeUnderReview = "",
  changeBaseline = null,
  blocker = null,
  blockers = [],
  blockerCount = 0,
  progressContinuation = false,
} = {}) {
  return {
    buildRun,
    resumeBuildRun,
    findings: Array.isArray(findings) ? findings : [],
    changeUnderReview,
    changeBaseline,
    blocker,
    blockers: Array.isArray(blockers) ? blockers : [],
    blockerCount: Number.isSafeInteger(blockerCount) ? blockerCount : 0,
    progressContinuation,
  };
}

// One accumulated-record entry for one grade: the record minus the two keys that describe the
// RUN rather than the result. `runId` names the run whose brief this grade was read off, and is
// null for the one grade no run carries — the exhausting cycle's own.
function gradeRecordEntry(grade, runId) {
  return {
    gate: "work:grade",
    verdict: grade?.verdict ?? null,
    codes: Array.isArray(grade?.codes) ? [...grade.codes] : [],
    cases: grade?.cases ?? null,
    failures: writtenGrade(grade)?.failures ?? [],
    gradedAt: grade?.gradedAt ?? null,
    provenance: grade?.provenance ?? null,
    runId,
  };
}

// Does this run's RETRY LINEAGE already carry the same grade? The ONE `retryOf` walk is the
// engine's (`retryLineage`, 126/00); this module keeps no traversal of its own.
function retryOfContributor(run, candidates) {
  const gradedAt = run?.brief?.grade?.gradedAt ?? null;
  const lineage = retryLineage({ runs: candidates, record: run });
  return lineage
    .slice(0, -1)
    .some((prior) => (prior.brief?.grade?.gradedAt ?? null) === gradedAt);
}

// THE ACCUMULATED RECORD (ADR-008 §4): THE UNION OVER THIS LOOP'S OWN RUNS, KEYED BY
// `loopRunId` — nothing more. The union is over GRADES, not over run records (a retried
// attempt carries the same brief). An item never graded contributes NOTHING.
export async function accumulatedRecord(ctx, ref, loopRunId, { gate = null, trailing = null } = {}) {
  const grades = [];
  try {
    const item = ref == null ? null : await resolveItemExact(ctx, ref);
    const mine = [];
    for (const run of item?.dir == null ? [] : await readRuns(item)) {
      if (run?.brief?.loop?.loopRunId !== loopRunId) continue;
      const grade = run?.brief?.grade;
      if (grade == null || typeof grade !== "object") continue;
      mine.push(run);
    }
    for (const run of mine) {
      if (retryOfContributor(run, mine)) continue;
      grades.push(gradeRecordEntry(run.brief.grade, run.runId ?? null));
    }
  } catch (error) {
    reportDegrade("loop-grade-record-unavailable", error);
  }
  if (trailing != null) grades.push(gradeRecordEntry(trailing, null));
  return mergeGateFindings(gate, grades);
}

export async function recordBuildProgress(input, options = {}) {
  if (!Number.isSafeInteger(input?.failingScenarios) || input.failingScenarios < 0) return null;
  const sample = options.sampleWorktreeProgress ?? sampleWorktreeProgress;
  const append = options.appendProgressSample ?? appendProgressSample;
  try {
    const measured = await sample({
      at: input.at,
      runId: input.run.runId,
      worktreePath: input.worktreePath,
      baseCommit: input.baseCommit,
      failingScenarios: input.failingScenarios,
    });
    return await append(input.item, input.run, measured);
  } catch (error) {
    if (typeof options.onFault === "function") {
      try {
        options.onFault(error);
      } catch (reportError) {
        reportDegrade("loop-progress", reportError);
      }
    } else {
      reportDegrade("loop-progress", error);
    }
    return null;
  }
}

// THE BUDGET'S ELAPSED, at both deadline sites and nowhere else (126/00 ADR-001, AMENDED). The
// staleness threshold is HANDED IN from the one bound home beside the store's own `isStale`.
export function budgetElapsedMs({ runs, record, stalenessMs, now }) {
  return lineageElapsedMs({
    runs: retryLineage({ runs, record }),
    now,
    stalenessMs,
    isStale,
  });
}

// The transition options for a run written under `workspace` and locked under `lockWorkspace`
// (129/04 ruling: `transitionOptions` splits into the lane workspace + the primary's lock). The
// sequential shell passes one workspace for both.
export function transitionOptionsFor(ctx, { workspace = ctx.workspace, lockWorkspace = ctx.workspace } = {}) {
  return {
    workspace,
    lock: lockContextFor(lockWorkspace, ctx),
    publisherOptions: ctx.publisherOptions ?? null,
    journalOptions: ctx.effectsJournalOptions ?? {},
  };
}

// drivePhase — mint (or take the minted retry record) and drive one phase IN-PROCESS through
// the registered driver. The sequential shell's one drive; the wave never calls it (a lane's
// drive is a child process, ADR-005 §1).
export async function drivePhase({ ref, phase, cycle, declaration, brief = runBrief(declaration), retryRecord = null, fix = null, gradeAbsent = null, changeBaseline = null, progressBaseCommit = null, now }, ctx) {
  const item = requireLocalCheckout(await resolveItemExact(ctx, ref), ref);
  const opts = transitionOptionsFor(ctx);
  const { record } = retryRecord == null
    ? await transitionRunStart(
      item,
      {
        brief,
        node: meshNodeIdOf(ctx.workspace.config),
        now,
      },
      opts,
    )
    : { record: retryRecord };

  let settlementContext = null;
  const outcome = await invokeRegistered(
    `work:drive-${phase}`,
    { ref },
    {
      ...ctx,
      loopDrive: {
        runId: record.runId,
        ...(fix == null ? {} : { fix }),
        recordSettlementContext(value) {
          settlementContext = value;
        },
      },
    },
  );
  return { item, record, outcome, cycle, phase, changeBaseline, progressBaseCommit, settlementContext, gradeAbsent };
}

export function progressReportFacts(act) {
  if (act?.stop === "progress-exhausted") {
    return {
      resets: act.resets,
      resetBound: act.resetBound,
      summary: act.summary,
    };
  }
  if (act?.stop === "no-progress") {
    return {
      failingCount: act.failingCount,
      progressBound: act.progressBound,
    };
  }
  return {};
}

// settleDriven — the run's terminal write. `options.transitionOptions` names the workspace the
// record is written under (a lane's, for a lane run); the default is the ctx's own.
// 129/04 (ADR-004 §4): `outcome.outcome === "cancelled"` settles `cancelled` with no reason —
// the operator's second signal on a lane child. 130/02 (130/ADR-003 §4): the in-process driver
// answers a caller's abort as `{ outcome: "failed", failureReason: "cancelled" }` through its
// own stop bracket, and that settles `cancelled` too — `running>cancelled` is the edge, a clean
// cancel records `failureReason: null` and reads `not-retryable`, and the store is untouched.
// DEFAULT DECISION: the spend settle's `exitReason` for a cancel stays `"error"` (the existing
// non-done word; the transcript is partial).
export async function settleDriven(driven, ctx, { now, narrate = NO_PRINT, transitionOptions = transitionOptionsFor(ctx) } = {}) {
  const { item, record, outcome } = driven;
  if (outcome.outcome === "needs-input") return driven;
  const terminal = outcome.outcome === "done"
    ? "done"
    : outcome.outcome === "cancelled" || outcome.failureReason === "cancelled" ? "cancelled" : "failed";
  const resumeAfter = terminal === "failed" && outcome.failureReason === "session_limit"
    ? parseResumeAfter(null, { now }).resumeAfter
    : null;
  if (driven.settlementContext?.projectsDir && driven.settlementContext.spendBaselineAvailable !== false) {
    try {
      const spend = await settleSpendFromTranscript(item, {
        runId: record.runId,
        projectsDir: driven.settlementContext.projectsDir,
        baseline: driven.settlementContext.transcriptBaseline,
        exitReason: terminal === "done" ? "final_output" : "error",
        now,
      });
      if (!spend.stamped && spend.reason !== "already-settled") {
        reportDegrade("loop-spend-unavailable", new Error(spend.reason ?? "unknown"));
      }
    } catch (error) {
      reportDegrade("loop-spend-unavailable", error);
    }
  }
  try {
    const completed = await transitionRunComplete(
      item,
      {
        runId: record.runId,
        outcome: terminal,
        failureReason: terminal === "failed" ? outcome.failureReason ?? "agent_error" : null,
        resumeAfter,
        now,
      },
      transitionOptions,
    );
    return { ...driven, record: completed.record };
  } catch (error) {
    // A SETTLE THAT LOSES A RACE IS A CONFLICT TO REPORT, NEVER A DEATH (2026-09-12). The store
    // stays strict; the loop reads what is on disk, says so, and carries on with the DRIVER'S
    // observation as the outcome that steers it.
    if (error?.code !== "illegal-transition") throw error;
    const current = (await readRuns(item)).find((run) => run.runId === record.runId) ?? record;
    reportDegrade("loop-settle-conflict", error);
    await narrate(
      `Settle conflict on ${item.ref} — run ${record.runId} was already ${current.state}${current.failureReason ? ` (${current.failureReason})` : ""} at ${current.updatedAt}; the driver observed ${terminal}. Record left as it stands.`,
    );
    return { ...driven, record: current, settleConflict: { recorded: current.state, observed: terminal } };
  }
}

// THE GRADE RIDES THE `driven` ROW (54/03, ADR-008 §1-2), and NOTHING ABOVE IT MOVES. The row
// carries the grade's SUMMARY, never its failures; 81/02 — and the declared absence, on the
// same row. 129/04 (ADR-004 §6) — a LANE row gains `lane`, `baseCommit` and `merge`, appended
// last, and only on the lane path; a `sequential` row is byte-identical. 130/02 — a drive the
// source cancelled reads `outcome: "cancelled"`, the row 129/04 task 06 defines for lanes,
// produced here for the in-process drive too: the record's terminal word, never the driver's
// `failed` wearing a reason.
export function drivenRow(entry) {
  const grade = entry.grade ?? null;
  return {
    ref: entry.item.ref,
    phase: entry.phase,
    runId: entry.record.runId,
    outcome: entry.record.state === "cancelled" ? "cancelled" : entry.outcome.outcome,
    attempt: entry.record.attempt,
    cycle: entry.cycle,
    ...(grade == null ? {} : { verdict: grade.verdict, codes: grade.codes, cases: grade.cases }),
    ...(entry.gradeAbsent == null ? {} : { graded: false, gradeAbsence: entry.gradeAbsent }),
    ...(entry.lane == null ? {} : { lane: { worktree: entry.lane.worktree, branch: entry.lane.branch } }),
    ...(entry.lane == null ? {} : { baseCommit: entry.lane.baseCommit ?? null }),
    ...(entry.merge == null ? {} : { merge: { outcome: entry.merge.outcome, commit: entry.merge.commit ?? null } }),
  };
}

function storeStop(error, haltDecision) {
  const mapped = mapStoreRefusal(error);
  return mapped == null ? null : haltDecision(mapped.stop, null, mapped.producer);
}

// THE RETRY LADDER — a `failed` drive is retried on its lineage up to the cap, each attempt
// bounded by the compute budget (`decideScheduleToClose`, one of the two deadline sites).
//
//   phaseRun  — the settled drive to retry from
//   drive(retryRecord) — performs the same phase on the admitted retry record and answers an
//               UNSETTLED phase run; the shell's is `drivePhase`, the wave's is a child spawn
//               in the SAME lane (ADR-004 §4)
//
// Answers `{ phaseRun }` at a terminal outcome, or `{ phaseRun, halt: { act, details } }` when
// the budget, the store or a `needs-input` stopped it. Every retried attempt pushes its own row.
//
// 130/02 (130/ADR-003 §7) — THE ORDER HOLDS AT THIS SITE TOO: settle → interrupt → needs-input →
// retry. A `cancelled` record is never retried (it is `not-retryable` in any case, and the halt
// for it is the caller's), and when `options.stopSource` is handed in it is polled after every
// attempt settles — a level read there returns `{ phaseRun }` to the caller, whose own read of
// the source halts `operator-interrupt` naming that attempt's run rather than minting another.
export async function retryUntilTerminal(phaseRun, { drive, ref, phase, brief, item = phaseRun.item, transitionOptions }, bookkeeping, options) {
  const { narrate = NO_PRINT, cap, scheduleToCloseMs, stalenessMs, haltDecision, node, stopSource = null } = options;
  // The instant is a VALUE (the shell's injected `now`, or none) or a CLOCK the wave hands in so
  // each attempt of a lane is stamped at its own instant and the lineage budget sums real time.
  const clock = () => (typeof options.now === "function" ? options.now() : options.now);
  const stopped = async () => {
    if (stopSource == null) return false;
    await stopSource.poll();
    return stopSource.level() >= 1;
  };
  while (phaseRun.outcome.outcome === "failed" && phaseRun.record?.state !== "cancelled") {
    const now = clock();
    try {
      // The in-process site carries no instant forward: it sums the lineage over the item's
      // runs AS THEY STAND AT THIS MOMENT, which is what lets it charge the attempts this
      // invocation has already driven.
      const itemRuns = await readRuns(item);
      const head = itemRuns.find((run) => run.runId === phaseRun.record.runId) ?? phaseRun.record;
      const retryDeadline = decideScheduleToClose({
        elapsedMs: budgetElapsedMs({
          runs: itemRuns,
          record: head,
          stalenessMs,
          now: now ?? new Date().toISOString(),
        }),
        ceilingMs: scheduleToCloseMs,
      });
      if (retryDeadline.act === "halt") {
        const halt = { ...retryDeadline, ref };
        return { phaseRun, halt: { act: halt, details: { deadline: halt.deadline, ceilingMs: halt.ceilingMs, elapsedMs: halt.elapsedMs, disposition: halt.disposition } } };
      }
      const retried = await transitionRunStart(
        item,
        {
          mode: "retry",
          maxAttempts: cap,
          brief,
          node,
          now,
        },
        transitionOptions ?? transitionOptionsFor(options.ctx),
      );
      // A drive through THIS site is announced by `Retrying` rather than `Driving`, printed after
      // the mint is admitted, for the same reason `Resumed` is.
      await narrate(`Retrying ${ref} — ${phase}, attempt ${retried.record.attempt} of ${cap} (${phaseRun.record.failureReason}).`);
      let retryRun = await drive(retried.record);
      // Settled at ITS OWN instant, so the attempt's span (mint → settle) is what the lineage
      // budget charges — a fixed injected `now` still prices every attempt at 0, as the shell's
      // sequential suites rely on.
      retryRun = await settleDriven(retryRun, options.ctx, { now: clock(), narrate, ...(transitionOptions == null ? {} : { transitionOptions }) });
      bookkeeping.driven.push(drivenRow(retryRun));
      phaseRun = retryRun;
      if (await stopped()) return { phaseRun };
      if (retryRun.outcome.outcome === "needs-input") {
        return { phaseRun, halt: { act: haltDecision("session-needs-input", ref, "driver:needs-input"), details: { sessionId: retryRun.outcome.sessionId } } };
      }
    } catch (error) {
      const stop = storeStop(error, haltDecision);
      if (stop != null) {
        stop.ref = ref;
        return {
          phaseRun,
          halt: {
            act: stop,
            details: {
              readyAt: error.readyAt,
              attempt: phaseRun.record.attempt,
              failureReason: phaseRun.record.failureReason,
            },
          },
        };
      }
      break;
    }
  }
  return { phaseRun };
}

// ===================== THE LADDER: settleStoryCycle =====================
//
// settleStoryCycle(phaseRun, bookkeeping, ctx, options) → answer
//
//   phaseRun     — a settled `continue` drive: { item, record, outcome, cycle, phase,
//                  changeBaseline, progressBaseCommit, gradeAbsent, lane? }
//   bookkeeping  — the shell's maps, MUTATED here exactly as the shell wrote them:
//                  { pendingFixes, pendingGrades, progressStates, reviewRounds,
//                    reviewBlockerCounts, cycles, driven }
//   ctx          — the command ctx whose `workspace` is THE WORKSPACE THE LADDER GRADES IN
//                  (ADR-003 §2): the primary for the shell, `loadWorkspace(lane)` for a lane.
//                  Every `work:grade` / `work:validate` / `work:doctor` / sampler invocation
//                  below runs against it and nothing else.
//   options      — { crossToVerify, narrate, report, now, input, resolved, loopRunId, startedAt,
//                    next, facts, gradeBaseline, invokeReviewGate, haltDecision,
//                    readChangeUnderReview, bounds, declarationFor, hasUat, uatCount,
//                    transitionOptions, worktreePath }
//
// Answers `{ next: "verify" | "continue" | "halt", gradeRecord, gradedSummary, halt?, verified? }`:
//   "continue" — a red rung or a failing grade; the fix and the grade ride the bookkeeping maps
//                and the caller re-drives (the shell on its next tick, the lane in place)
//   "verify"   — the ladder is clean; under `crossToVerify: true` the verify drive was made
//                (`verified` is its settled run) and under `false` the caller acts on it
//   "halt"     — `halt: { act, details }` for the caller to report; NO account line is printed
//                here (the wave drains its other lanes first, ADR-005 §4)
export async function settleStoryCycle(phaseRun, bookkeeping, ctx, options = {}) {
  const {
    crossToVerify = true,
    narrate = NO_PRINT,
    now,
    input = {},
    resolved,
    loopRunId,
    startedAt,
    next,
    facts = {},
    gradeBaseline = null,
    invokeReviewGate,
    haltDecision,
    requireDecision = (decision) => decision,
    readChangeUnderReview,
    bounds,
    declarationFor,
    hasUat = () => false,
    uatCount = () => 0,
    transitionOptions,
    worktreePath = ctx.workspace.projectRoot,
  } = options;
  const { pendingFixes, pendingGrades, progressStates, reviewRounds, reviewBlockerCounts, cycles, driven } = bookkeeping;
  const { reviewCap, progressBound, progressResetBound } = bounds;
  const ref = phaseRun.item.ref;
  const cycle = phaseRun.cycle;
  const halt = (act, details = {}) => ({ next: "halt", halt: { act, details }, gradeRecord: null, gradedSummary: null });

  let gradeResult = null;
  let gradeFault = null;
  try {
    gradeResult = await invokeRegistered("work:grade", {
      ref,
      run: true,
      claimRun: phaseRun.record.runId,
    }, ctx);
  } catch (error) {
    reportDegrade("loop-progress-grade", error);
    gradeFault = error;
  }
  // A GRADE THAT COULD NOT BE TAKEN IS NOT A REPOSITORY THAT DECLARED NO RUBRIC (54/03 D3).
  // The DECLARATION tells the two apart, read through `work:grade`'s own predicate.
  // THE DELTA, applied ONCE, ahead of every reader below.
  gradeResult = applyGradeBaseline(gradeResult, gradeBaseline);
  const gradeUnavailable = gradeFault != null && declaredRubric(ctx.workspace?.config) != null;
  const failingScenarios = failingCountFromGrade(gradeResult);
  const gradedSummary = gradeSummary(gradeResult);
  const gradedRecord = gradedSummary == null ? null : gradeResult.grade;
  const gradedFindings = gradeFindings(gradeResult);
  // THE ROW OF THE DRIVE THAT WAS GRADED, found by the RUN ID it carries and never by position.
  if (gradedSummary != null) {
    const index = driven.findIndex((row) => row.runId === phaseRun.record.runId);
    if (index >= 0) driven[index] = drivenRow({ ...phaseRun, grade: gradedSummary });
  }
  const priorProgress = progressStates.get(ref) ?? { resets: 0, attemptRun: null, summary: null };
  const attemptRun = priorProgress.attemptRun ?? phaseRun.record;
  const sample = await recordBuildProgress({
    item: phaseRun.item,
    run: attemptRun,
    worktreePath,
    baseCommit: phaseRun.progressBaseCommit,
    failingScenarios,
    at: now ?? new Date().toISOString(),
  }, {
    ...(typeof ctx.sampleWorktreeProgress === "function" ? { sampleWorktreeProgress: ctx.sampleWorktreeProgress } : {}),
    ...(typeof ctx.appendProgressSample === "function" ? { appendProgressSample: ctx.appendProgressSample } : {}),
    ...(typeof ctx.onProgressFault === "function" ? { onFault: ctx.onProgressFault } : {}),
  });

  if (sample != null) {
    const samples = await readProgressSamples(phaseRun.item, attemptRun, {
      ...(typeof ctx.onProgressFault === "function" ? { onFault: ctx.onProgressFault } : {}),
    });
    const progressDecision = decideLoopProgress({
      samples,
      resets: priorProgress.resets,
      maxStalls: progressBound,
      maxResets: progressResetBound,
      evaluateProgressPolicy,
      decideBuildProgress,
    });
    progressStates.set(ref, {
      resets: progressDecision.resets ?? priorProgress.resets,
      attemptRun,
      summary: priorProgress.summary,
    });

    if (progressDecision.act === "halt") {
      return halt({ ...progressDecision, ref }, progressReportFacts({ ...progressDecision, ref }));
    }
    if (progressDecision.act === "reset") {
      progressStates.set(ref, {
        resets: progressDecision.resets,
        attemptRun: null,
        summary: progressDecision.summary,
      });
      pendingFixes.set(ref, fixTransport({
        buildRun: phaseRun.record,
        resumeBuildRun: null,
        findings: [{ code: "progress-reset", summary: progressDecision.summary }],
        changeBaseline: phaseRun.changeBaseline,
        progressContinuation: true,
      }));
      if (gradedRecord != null) pendingGrades.set(ref, gradedRecord);
      return { next: "continue", gradeRecord: gradedRecord, gradedSummary };
    }
    if (progressDecision.act === "continue") {
      const currentNode = meshNodeIdOf(ctx.workspace.config);
      pendingFixes.set(ref, fixTransport({
        buildRun: phaseRun.record,
        resumeBuildRun: admitResumeBuildRun(phaseRun.record, currentNode),
        findings: gradedFindings,
        changeBaseline: phaseRun.changeBaseline,
        progressContinuation: true,
      }));
      if (gradedRecord != null) pendingGrades.set(ref, gradedRecord);
      return { next: "continue", gradeRecord: gradedRecord, gradedSummary };
    }
  }

  const completedRounds = reviewRounds.get(ref) ?? 0;
  const gate = await invokeReviewGate(ref, completedRounds, input, ctx, undefined, narrate);

  // ---- RUNG 3: THE GRADE (54/03; ADR-007 §1, §3) -------------------------------- announced
  // ONLY when a rubric was declared; taken above, read here.
  if (gradedSummary != null) {
    await narrate(
      `Gate work:grade ${ref} — ${gradedSummary.verdict}`
      + `${gradedSummary.codes.length > 0 ? ` (${gradedSummary.codes.join(", ")})` : ""}`
      + `, ${gradedSummary.cases.failed} of ${gradedSummary.cases.total} case(s) failing`
      + `${Number.isSafeInteger(gradeResult?.inherited) && gradeResult.inherited > 0 ? ` (${gradeResult.inherited} inherited, excluded by the baseline)` : ""}.`,
    );
  }

  const gatedFindings = mergeGateFindings(gate, gradedFindings);
  const gradedGate = { ...gate, findings: gatedFindings };
  const gradeAct = gradeRoute(gradeResult);

  // THE SHELL'S OWN REFUSAL DOOR (`requireDecision`) is handed in beside `haltDecision`: a
  // malformed decision throws the same coded refusal here as it did inline.
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
    // CAP EXHAUSTION CARRIES THE RECORD IT COULD NOT CLOSE (ADR-008 §4): this cycle's grade has
    // no successor run to ride, so it is passed as the trailing entry.
    return halt(gateDecision.act, {
      cap: resolved.cap,
      findings: await accumulatedRecord(ctx, ref, loopRunId, { gate, trailing: gradedRecord }),
    });
  }
  // A `fail` RE-DRIVES ON ITS VERDICT, NOT ON ITS ENTRY COUNT (ADR-007 §3, D2).
  if (gatedFindings.length > 0 || gradeAct === "redrive") {
    const reviewDecision = decideReviewGate({
      completedRounds,
      cap: reviewCap,
      hardCap: MAX_REVIEW_ROUNDS,
      previousBlockerCount: reviewBlockerCounts.get(ref),
      findings: gatedFindings,
      ...(Object.prototype.hasOwnProperty.call(gate, "blockerClaims")
        ? { blockerClaims: gate.blockerClaims }
        : {}),
    });
    if (reviewDecision.act === "halt") {
      return halt({ ...reviewDecision, ref }, {
        round: reviewDecision.round,
        reviewCap: reviewDecision.cap,
        blockerClasses: reviewDecision.blockerClasses,
        workItems: reviewDecision.workItems,
      });
    }
    reviewRounds.set(ref, reviewDecision.round);
    if (reviewDecision.blockerCount > 0) reviewBlockerCounts.set(ref, reviewDecision.blockerCount);
    const changeUnderReview = typeof ctx.readChangeUnderReview === "function"
      ? await ctx.readChangeUnderReview(worktreePath, phaseRun.changeBaseline)
      : await readChangeUnderReview(worktreePath, phaseRun.changeBaseline);
    const currentNode = meshNodeIdOf(ctx.workspace.config);
    pendingFixes.set(ref, fixTransport({
      buildRun: phaseRun.record,
      resumeBuildRun: admitResumeBuildRun(phaseRun.record, currentNode),
      findings: gatedFindings,
      changeUnderReview,
      changeBaseline: phaseRun.changeBaseline,
      blocker: reviewDecision.blocker,
      blockers: reviewDecision.blockers,
      blockerCount: reviewDecision.blockerCount,
    }));
    if (gradedRecord != null) pendingGrades.set(ref, gradedRecord);
    return { next: "continue", gradeRecord: gradedRecord, gradedSummary };
  }

  // THE LADDER IS CLEAN THROUGH RUNG 2 AND THE GRADE FOUND NOTHING FAILING. The one routing
  // answer left is rung 3's `indeterminate`, which HALTS — and so does a grade that could not
  // be taken at all. Neither fabricates a record.
  if (gradeAct === "halt" || gradeUnavailable) {
    return halt(haltDecision("grade-indeterminate", ref, gradeStopProducer(gradeStopCode(gradeResult))), gradedSummary == null
      ? { unavailable: String(gradeFault?.message ?? gradeFault ?? "the grade could not be taken") }
      : { verdict: gradedSummary.verdict, codes: gradedSummary.codes, cases: gradedSummary.cases });
  }

  if (crossToVerify !== true) {
    return { next: "verify", gradeRecord: gradedRecord, gradedSummary };
  }

  // A clean deterministic gate immediately crosses to verify; asking work:next here would
  // offer the unchanged story and choose continue.
  const verifyKey = `${ref}\0verify`;
  const verifyCycle = (cycles.get(verifyKey) ?? 0) + 1;
  cycles.set(verifyKey, verifyCycle);
  const verifyDeclaration = declarationFor({ ...resolved, loopRunId, phase: "verify", cycle: verifyCycle, startedAt });
  // A PASSING GRADE PUTS NOTHING ON A RE-DRIVE, BECAUSE THERE IS NO RE-DRIVE — and it is still
  // recorded, on the successor run this grade caused to start (ADR-008 §3).
  const verifyBrief = runBrief(verifyDeclaration, { grade: gradedRecord });
  // THE CROSS TO VERIFY IS A DRIVE, so it announces itself like one.
  await narrate(`Driving ${ref} — verify, cycle ${verifyCycle} of ${resolved.cap}, ${resolved.level}.`);
  let verified = await drivePhase({ ref, phase: "verify", cycle: verifyCycle, declaration: verifyDeclaration, brief: verifyBrief, now }, ctx);
  verified = await settleDriven(verified, ctx, { now, narrate, ...(transitionOptions == null ? {} : { transitionOptions }) });
  driven.push(drivenRow(verified));
  // 130/02 — the settled verify rides EVERY answer from here, a halt's included, so the caller's
  // read of the stop source (settle → interrupt → needs-input, at this site as at the others) can
  // name the run it stands over.
  if (verified.outcome.outcome === "needs-input") {
    return { ...halt(haltDecision("session-needs-input", ref, "driver:needs-input"), { sessionId: verified.outcome.sessionId }), verified };
  }
  if (verified.outcome.outcome === "done" && hasUat(facts.tasks?.tasks ?? [])) {
    return { ...halt(haltDecision("uat-gate", ref, "work:tasks:counts.uat"), { uatCount: uatCount(facts.tasks?.tasks ?? []) }), verified };
  }
  return { next: "verify", gradeRecord: gradedRecord, gradedSummary, verified };
}
