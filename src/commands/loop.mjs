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
  // milestone 126 / story 00 (ADR-001, AMENDED) — the ONE `retryOf` walk and the attempt summer.
  // Both live in the engine because 126/02's declaration predicate is engine-resident too and
  // cannot import a command module; this shell keeps no traversal and no clock arithmetic.
  lineageElapsedMs,
  retryLineage,
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
  heartbeatFromConfig,
  progressMaxResetsFromConfig,
  reviewRoundsFromConfig,
  scheduleToCloseFromConfig,
} from "../loop-bounds.mjs";
import {
  appendProgressSample,
  decideBuildProgress,
  evaluateProgressPolicy,
  readProgressSamples,
  sampleWorktreeProgress,
} from "../loop-progress.mjs";
// milestone 54 / story 02 — the doctor rung's admitted set is DERIVED from 66's frozen code
// array (54/ADR-007 §2d), never restated beside it. This is a pure DATA import of a frozen
// vocabulary; the lane itself stays where it is and gains nothing (FF-5407 holds the reverse
// direction — the lane must never reach the grade).
import { CONTROL_FINDING_CODES } from "../work/doctor-controls.mjs";
// milestone 54 / story 03 — the grade's VOCABULARIES, imported as frozen DATA from the pure
// leaf (ADR-005 §1, §3). The same derive-never-restate move the doctor rung above makes over
// `CONTROL_FINDING_CODES`: the stop's producer and the routing predicate are both drawn from
// `GRADE_CODES` members, so a tenth code cannot silently acquire or lose a loop consequence,
// and FF-5409's "never from a message match" holds by construction rather than by review.
// Importing `work-grade.mjs` executes precisely as much as importing a frozen array does —
// FF-5406 pins that it imports only a pure leaf, spawns nothing and reads no clock. The RUNNER
// (`commands/grade.mjs`, the one spawn) is reached only through the registry, as a command.
// 81/01 adds `boundGradeFailures` to that same pure-data import: the ONE bound every payload
// this shell writes goes through. It is a function rather than a vocabulary, but it is the
// same kind of thing — a pure leaf that reaches for nothing, so the ceiling is HANDED IN.
import { ADVISORY_CODES, GRADE_CODES, GRADE_VERDICTS, boundGradeFailures } from "../work/grade.mjs";
// 81/01 — THE CHARACTER CEILING IS 70's, READ FROM 70's OWN HOME AND NOT RESTATED. It is the
// budget a payload handed to a maker is spent against (`70/ADR-003`), which is exactly what
// the `## REVIEW FINDINGS` block is. `src/phase-brief.mjs` imports nothing, so this costs a
// frozen number and no module graph.
import { PHASE_BRIEF_MAX_CHARS } from "../phase-brief.mjs";
import { commandError } from "../command-error.mjs";
import { resolveItemExact, requireLocalCheckout } from "./resolve.mjs";
// 54/03 review finding D3 — "was a rubric DECLARED" is `work:grade`'s own predicate, and it
// is read here rather than re-derived, so a declared-but-unrunnable grade cannot be mistaken
// for an unconfigured repository at the one door that tells them apart.
import { declaredRubric } from "./grade.mjs";
import { lockContextFor } from "../item-lock.mjs";
import { meshNodeIdOf } from "./mesh/gate.mjs";
import { isStale, parseResumeAfter, readRuns, staleRunningRuns } from "../run-store.mjs";
import {
  transitionRunComplete,
  transitionRunStart,
  transitionStaleRunsReclaimed,
} from "../effects/run-transitions.mjs";
import { reportDegrade } from "../degrade.mjs";
import { settleSpendFromTranscript } from "../run-spend-ingest.mjs";
// 2026-09-11 — the loop's exit-reason recorder; installed only at the launch seam below.
import { installLoopDiagnostics } from "../loop-diag.mjs";

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

// Deferred by design: command-core imports this module to register work:loop,
// so a static import back into command-core would close the registry ring.
async function invokeRegistered(id, input, ctx) {
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

// 81/01 — THE GRADE AS IT IS WRITTEN, wherever this shell writes one.
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
// than by parsing prose. A payload that already fits is returned unchanged, which is what
// keeps every untruncated document byte-identical to today's.
function writtenGrade(grade) {
  if (grade == null || typeof grade !== "object") return grade;
  const bounded = boundGradeFailures(grade.failures, { maxChars: PHASE_BRIEF_MAX_CHARS });
  return bounded.truncated ? { ...grade, failures: [...bounded.failures] } : grade;
}

// THE DURABLE GRADE RECORD RIDES THIS BAG, AND NOTHING ELSE MOVES (54/03, ADR-008 §3).
// `brief.grade` is written through the ONE seam that already writes `brief.loop` —
// `transitionRunStart`'s `edge.brief` — so `src/effects/run-transitions.mjs` (17 dependents)
// and `src/run-store.mjs` (46) are passed THROUGH and not edited: no new key, no new state,
// no new transition, and no persistence code at all (`68/ADR-009`, `53/ADR-004`). The store
// never reads the grade and never branches on it, which is why `m20/ADR-001`'s objection to
// the opaque bag — scoped to *"resilience control fields the store READS and BRANCHES on"* —
// does not reach it. The bag already carries sibling keys from independent producers
// (`brief.review`, `brief.progress`, `brief.assignmentId`); this is one more.
//
// It is the FULL `GradeRecord`, because `commands/grade.mjs`'s reader (`gradesFromRuns`) is
// already written against that shape and feeds ADR-005 §2's ratchet from its `cases`. The
// driven row carries the SUMMARY instead (ADR-008 §2) — two readers, two shapes, one writer.
function runBrief(declaration, {
  admittedBlockerClaim,
  admittedBlockerClaims,
  admittedBlockerCount,
  gateBlockerClaim,
  gateBlockerClaims,
  progress,
  progressContinuation = false,
  grade = null,
  gradeBaseline = null,
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
    ...(gradeBaseline == null ? {} : { gradeBaseline: { measuredAt: gradeBaseline.measuredAt, priorDrives: gradeBaseline.priorDrives, failures: [...gradeBaseline.failures] } }),
    ...(Object.keys(review).length === 0 ? {} : { review }),
    ...(progress == null ? {} : {
      progress: {
        resets: progress.resets,
        attemptRunId: progress.attemptRun?.runId ?? null,
        summary: progress.summary ?? null,
        continuation: progressContinuation,
      },
    }),
  };
}

// ===================== THE GRADE BASELINE — a story is graded on what it changed =====================
//
// MEASURED 2026-09-12 on milestone 127's first story, driven by this shell on a SHARED checkout:
// the rubric (`work.rubric`, this repository's whole fitness tier, 1,931 cases) was red on seven
// cases and not one was in the story's write set — two red at HEAD, three from other lanes'
// uncommitted work, and two from the milestone's OWN ARCHITECTURE citing the modules its later
// stories create (FF-11903, whose ceiling may never rise). The shell read every one as the
// story's: `fail` → fix re-drive → the agent reports "none of these is mine" → `needs-input`,
// four times in a row, and a foreign lane clearing one red read as this story's PROGRESS. That is
// a deadlock the shell built for itself: story 01 cannot grade green until stories 02/03 land,
// and the loop will not reach 02/03 until 01 grades green.
//
// THE RULE. A story is graded on the DELTA from a baseline: the rubric's failing-case set,
// measured ONCE before the story's first `continue` drive in its lineage, through the same
// `work:grade` the grade itself uses (no run claimed — a baseline is a measurement of the tree,
// not a verdict on a drive). Every grade after it is reduced to the cases the baseline did not
// carry; the rest are INHERITED — named in the narration, carried in the count, and excluded from
// the verdict, the progress sampler and the fix payload. Nothing persisted the raw answer before
// this rule either (`--claim-run` stamps provenance; the grade that reaches a record is the one
// the shell writes on the re-drive it decided): that record now carries the DELTA it decided on
// beside the baseline it was measured against, so what was excluded is readable, not inferred. 54/ADR-004 §3's intent — "a story runs its own scenarios plus
// the fitness functions; never silently widen to everything" — is what this restores for a
// declaration that runs the tier whole.
//
// PERSISTED ON THE DRIVE'S BRIEF (`brief.gradeBaseline`, beside `brief.grade` and `brief.fix`)
// so a `--resume` reads the lineage's baseline back rather than paying for it again, and so the
// record says what was excluded. A baseline taken after the story has already been driven
// (a lineage that predates this rule, or a resume whose earlier records carry none) is measured
// with the story's own work in the tree, and says so (`priorDrives`): cases the story itself
// broke before that instant are excluded too, which the operator can read off the record. An
// unconfigured rubric measures nothing and grades exactly as before.
export function readGradeBaseline(runs, ref) {
  let latest = null;
  for (const record of Array.isArray(runs) ? runs : []) {
    if (record?.itemRef !== ref) continue;
    const baseline = record?.brief?.gradeBaseline;
    if (baseline == null || typeof baseline !== "object" || !Array.isArray(baseline.failures)) continue;
    if (latest == null || String(record.createdAt ?? "") > String(latest.createdAt ?? "")) latest = record;
  }
  if (latest == null) return null;
  const baseline = latest.brief.gradeBaseline;
  return {
    measuredAt: typeof baseline.measuredAt === "string" ? baseline.measuredAt : null,
    priorDrives: Number.isSafeInteger(baseline.priorDrives) ? baseline.priorDrives : null,
    failures: baseline.failures.filter((name) => typeof name === "string"),
    runId: latest.runId,
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

// ===================== 54/03 — THE GRADE'S OWN HALF OF THE GATE =====================
//
// Rung 3 of the cost ladder (ADR-007 §1) reads an answer this shell has ALREADY taken for
// the continue it is gating — one `work:grade --run`, one bounded child process, per
// completed build. Nothing below invokes the grade a second time: a rung that paid twice for
// the same answer would break the very cost property the ladder exists to hold.
//
// FOUR FACTS, THREE READERS, each derived here exactly once. The verdict + codes + observed
// counts are the SUMMARY (the driven row, ADR-008 §2); the failing cases are the fix
// payload's entries (70's transport, ADR-008 §5); the whole record is `brief.grade` on the
// run the grade drove (ADR-008 §3).

// The grade's SUMMARY, or null when this repository graded nothing.
//
// `configured !== true` IS THE HONEST-NO-OP GUARD, and it is the whole of ADR-002 §3's
// no-regression rule as one predicate: a repository declaring no `work.rubric` gets
// `indeterminate` / `rubric-unconfigured` from `work:grade` — never a `pass`, on any path —
// and the loop must then behave BYTE-FOR-BYTE as it does today. So no summary rides its
// driven row, no `grade` key reaches its run's brief, and no rung announces itself.
export function gradeSummary(answer) {
  if (answer?.configured !== true) return null;
  const grade = answer?.grade;
  if (grade == null || typeof grade !== "object" || !GRADE_VERDICTS.includes(grade.verdict)) return null;
  const cases = grade.cases ?? {};
  return {
    verdict: grade.verdict,
    // REPORTED IN `GRADE_CODES`' OWN FROZEN ORDER — which is already the order the compiler
    // emits them in (ADR-005 §3), ordered here rather than trusted, so two grades carrying
    // the same set read identically however they were observed.
    codes: (Array.isArray(grade.codes) ? [...grade.codes] : [])
      .filter((code) => GRADE_CODES.includes(code))
      .sort((left, right) => GRADE_CODES.indexOf(left) - GRADE_CODES.indexOf(right)),
    // THE OBSERVED COUNTS ARE THE EVIDENCE, AND THEY ARE REPORTED WHATEVER THE VERDICT —
    // including on the verdicts that stop the loop, which are exactly the ones an operator
    // otherwise has no way to see.
    cases: {
      total: Number.isSafeInteger(cases.total) ? cases.total : 0,
      failed: Number.isSafeInteger(cases.failed) ? cases.failed : 0,
      skipped: Number.isSafeInteger(cases.skipped) ? cases.skipped : 0,
    },
  };
}

// The grade's failing cases, as entries for the payload 70/04 already carries
// (`pendingFixes` -> `ctx.loopDrive.fix` -> `composeFixInput`'s `## REVIEW FINDINGS`).
// 54 SUPPLIES THE RECORDS; 70 CARRIES THEM (ADR-008 §5): no second transport is built here,
// no driver input schema is widened, and `brief` is coined no third meaning.
//
// Only a `fail` contributes. An `indeterminate` told us NOTHING about whether the item is
// correct, so handing a maker its codes as though they were failures would be this
// milestone's own defect shape pointed at the maker.
// 81/01 — THE MEASURE THE FIX TRANSPORT IS SPENT AGAINST. "Within the ceiling" is a claim
// about the block a maker actually receives, and `composeFixInput` renders each entry with
// `JSON.stringify(finding, null, 2)` joined by a blank line — so the payload is measured the
// way it is written, not the way it is stored. Measuring the raw strings instead would bound
// a document nobody sends.
// It also measures the `gate` key the statement entry GAINS below, after the bound returns:
// a real entry already carries it, so the spread is idempotent for those, and the statement is
// measured as it will actually be written rather than as it leaves the bound.
const measureRenderedFinding = (entry) => JSON.stringify({ gate: "work:grade", ...entry }, null, 2).length + 2;

export function gradeFindings(answer) {
  const summary = gradeSummary(answer);
  if (summary == null || summary.verdict !== "fail") return [];
  const code = summary.codes.find((entry) => !ADVISORY_CODES.includes(entry)) ?? null;
  const failures = Array.isArray(answer?.grade?.failures) ? answer.grade.failures : [];
  const entries = failures.map((failure) => ({
    gate: "work:grade",
    code,
    // EMITTED VERBATIM (ADR-006 §1). The case identity and the message are the runner's own
    // words; nothing here derives either from prose.
    case: failure?.case ?? null,
    message: failure?.message ?? null,
    scenario: failure?.scenario ?? null,
  }));
  // BOUNDED WHERE IT IS WRITTEN (81/01, `70/ADR-003`). The entries are built first so the
  // bound measures what the maker will read, and the statement — when there is one — names
  // its producing gate like every other entry on the payload does.
  const bounded = boundGradeFailures(entries, { maxChars: PHASE_BRIEF_MAX_CHARS, measure: measureRenderedFinding });
  return bounded.failures.map((entry) => (entry.truncation == null ? entry : { gate: "work:grade", ...entry }));
}

// The stop CODE an `indeterminate` grade halts on, or null when it does not halt.
//
// ADR-007 §3's closed routing table, minus the rows that are not stops. `rubric-unconfigured`
// is the ONE `indeterminate` that PROCEEDS EXACTLY AS TODAY — and that is not "indeterminate
// read as pass": no path anywhere records a `pass` for it, the record says `indeterminate`,
// and the loop behaves as it did. The two ADVISORY codes (ADR-005 §3) never move a verdict,
// so they can never be a stop's cause either.
//
// THE CODE IS THE PRODUCER'S SOURCE, VALIDATED AGAINST THE FROZEN VOCABULARY (FF-5409).
// `acd-loop-probe-contract` already forbids stop attribution by rendered prose and `68/03`
// retired that instrument by name; nothing here reads the grade's `message`.
export function gradeStopCode(answer) {
  const summary = gradeSummary(answer);
  if (summary == null || summary.verdict !== "indeterminate") return null;
  return summary.codes.find((code) => code !== "rubric-unconfigured" && !ADVISORY_CODES.includes(code)) ?? null;
}

// The `grade-indeterminate` stop's producer — the grade command, and the code it returned.
//
// A record whose verdict is `indeterminate` but whose codes name NO admissible stop is
// MALFORMED (`compileGrade` emits a code with every indeterminate), and the verdict still
// decides the act — so the halt is still produced and its producer names the command alone,
// which is the honest attribution when there is no code to name. Nothing is invented here:
// no tenth code, and no prose.
export function gradeStopProducer(code) {
  return code == null ? "work:grade" : `work:grade:${code}`;
}

// ===================== THE VERDICT DECIDES THE ACT (ADR-007 §3) =====================
//
// 54/03 review defect D2: routing was derived from the grade's DETAIL — how many entries it
// contributed, and whether its codes yielded a stop — rather than from its VERDICT. That is
// this milestone's own defect shape pointed at the milestone: a `fail` carrying an empty
// `failures` list crossed to verify, and an `indeterminate` carrying an empty `codes` list
// did too. Both are the "absence of evidence read as a green light" this story exists to
// refuse.
//
// The table is closed and it is read off ONE fact:
//
//   pass          -> "proceed"  (cross to verify)
//   fail          -> "redrive"  (re-drive the build, however many entries it contributed)
//   indeterminate -> "halt"     (grade-indeterminate), EXCEPT the one named exception
//   (unconfigured)-> null       (behave byte-for-byte as today; ADR-002 §3, ADR-004 §4)
//
// `rubric-unconfigured` is that exception and it is identified BY THE CODE, exactly as
// `gradeStopCode` identifies it — an indeterminate that names it and names no admissible
// stop beside it proceeds as today; every other indeterminate halts, INCLUDING one whose
// codes name nothing at all.
export function gradeRoute(answer) {
  const summary = gradeSummary(answer);
  if (summary == null) return null;
  if (summary.verdict === "pass") return "proceed";
  if (summary.verdict === "fail") return "redrive";
  if (summary.verdict !== "indeterminate") return null;
  const proceedsAsToday = gradeStopCode(answer) == null && summary.codes.includes("rubric-unconfigured");
  return proceedsAsToday ? "proceed" : "halt";
}

// THE PAYLOAD IS THE ONE THE SHELL ALREADY BUILDS, NOT A SECOND ONE (ADR-008 §5).
//
// When the grade contributes nothing the ladder's findings pass through VERBATIM — which is
// what keeps an unconfigured repository's re-drive byte-identical to today's, and the three
// shipped loop suites observing the payload they already observe. When it does contribute,
// the payload becomes a UNION and every entry names the rung that produced it, so a reader
// tells a validate finding from a graded case by a KEY rather than by parsing prose.
//
// The producer tag is conditional for exactly that reason: a single-producer payload is
// already unambiguous (the ladder's own envelope names the rung that answered), and tagging
// it anyway would change a document ADR-002 §3 promises is unchanged.
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
// `54/ADR-009 §3` says the transport is 70's — *"no second payload, no widened driver input
// schema"* — and `54/ADR-008 §5` says *"54 supplies the records; 70 carries them."* Both were
// satisfied only because `composeFixInput` happens to destructure two keys and ignore a third:
// `pendingFixes` carried the whole `GradeRecord` into `ctx.loopDrive.fix`, so the rule held in
// LETTER while the bag held a second milestone's document. That is a guarantee kept by a
// caller's omission rather than by the bag's shape, and the next reader of `ctx.loopDrive.fix`
// — a warm-resume decision, a telemetry projection, 78's execution record — would inherit a
// `GradeRecord` nobody meant to give it. A boundary that carries a neighbour's document has
// already stopped being one.
//
// SO THE SHAPE IS DECLARED, AND EVERY SITE PREPARES IT THROUGH ONE CONSTRUCTOR. There are four
// sites that prepare a pending fix — the gate re-drive, the progress `reset`, the progress
// `continue`, and the resume path's reconstruction — and before this they produced three
// different key sets. One constructor is what makes "exactly the keys the transport declares"
// a fact about the bag rather than a claim about its callers.
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
// RUN rather than the result (`runner`'s argv/cwd/duration, and the declared `report`), which
// an operator reading a halt does not need and which would bury the part they do. `runId`
// names the run whose brief this grade was read off, and is null for the one grade no run
// carries — the exhausting cycle's own.
function gradeRecordEntry(grade, runId) {
  return {
    gate: "work:grade",
    verdict: grade?.verdict ?? null,
    codes: Array.isArray(grade?.codes) ? [...grade.codes] : [],
    cases: grade?.cases ?? null,
    // 81/01 — THE CAP-EXHAUSTED REPORT LINE IS A WRITER TOO, and it was the one that carried
    // the record whole. It goes through the same bound as the run's brief, so the account of
    // what the loop could not close states what it dropped rather than burying it.
    failures: writtenGrade(grade)?.failures ?? [],
    gradedAt: grade?.gradedAt ?? null,
    // Keep the evidence stamp when the durable grade is projected into the halt record.
    // The projection may omit runner/report detail; it must not erase who made the claim.
    provenance: grade?.provenance ?? null,
    runId,
  };
}

// Does this run's RETRY LINEAGE already carry the same grade? Walks `retryOf` up through the
// runs that are candidates for this record; answers true the moment an ancestor carries a
// grade minted at the same instant. Cycle-guarded, and it stops at the first ancestor that is
// not itself a candidate — a lineage that leaves this loop's graded runs contributes nothing
// to say about this one.
// 126/00 (ADR-001, AMENDED): this walked `retryOf` itself until the traversal acquired ONE
// engine-resident home. It now ASKS for the lineage and reads the answer — a subtraction, not a
// re-point for its own sake: two walks agree until one of them is edited, and the walk this one
// used to keep terminated on exactly the same two conditions (a `retryOf` naming a run no
// candidate carries, and a cycle) as the engine's does. The ancestors are the lineage minus this
// run itself, which is the last element because the walk answers oldest-first.
function retryOfContributor(run, candidates) {
  const gradedAt = run?.brief?.grade?.gradedAt ?? null;
  const lineage = retryLineage({ runs: candidates, record: run });
  return lineage
    .slice(0, -1)
    .some((prior) => (prior.brief?.grade?.gradedAt ?? null) === gradedAt);
}

// THE ACCUMULATED RECORD (ADR-008 §4, ruled from RESEARCH's one genuinely open question).
//
// "Accumulated" means THE UNION OVER THIS LOOP'S OWN RUNS, KEYED BY `loopRunId` — nothing
// more. `53/ADR-004` already says a loop's aggregate history *"is a query over run records
// rather than a single document"* and that `loopRunId` makes it *"a one-key filter"*, so this
// builds no store, no document and no second aggregation: it filters the runs this loop
// minted and unions the grades their briefs already carry. Another loop over the same item
// carries a different id and is therefore absent, by the filter rather than by a convention.
//
// THE EXHAUSTING CYCLE HAS NO SUCCESSOR RUN TO RIDE, which is precisely why the halt carries
// the final record itself: `trailing` is that grade, and there is no re-drive to hand it to.
//
// An item that was never graded contributes NOTHING rather than a fictional entry — the
// merge rule above then returns the gate's own accumulated findings verbatim.
async function accumulatedRecord(ctx, ref, loopRunId, { gate = null, trailing = null } = {}) {
  const grades = [];
  try {
    const item = ref == null ? null : await resolveItemExact(ctx, ref);
    const mine = [];
    for (const run of item?.dir == null ? [] : await readRuns(item)) {
      // THE ONE-KEY FILTER. A run this loop did not mint is another loop's evidence.
      if (run?.brief?.loop?.loopRunId !== loopRunId) continue;
      const grade = run?.brief?.grade;
      if (grade == null || typeof grade !== "object") continue;
      mine.push(run);
    }
    // THE UNION IS OVER GRADES, NOT OVER RUN RECORDS (review defect D1). A build attempt
    // that FAILED and was retried mints a SECOND run on the same lineage carrying the SAME
    // brief (`retryRun` -> `mintRun`, `brief ?? prior.brief`), so one grade lands on two
    // records under one `loopRunId` — and a naive filter counted it twice, which is not a
    // union. A run whose `retryOf` lineage already contributes the same grade (identified by
    // its `gradedAt`, the record's own minting instant) is therefore skipped, keeping the
    // run the grade FIRST rode.
    for (const run of mine) {
      if (retryOfContributor(run, mine)) continue;
      grades.push(gradeRecordEntry(run.brief.grade, run.runId ?? null));
    }
  } catch (error) {
    // A record that cannot be read is reported as the record we could read, never as a
    // failure of the halt: the operator's stop is the fact, and the account is beside it.
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

// THE BUDGET'S ELAPSED, at both deadline sites and nowhere else (126/00 ADR-001, AMENDED).
// `retryLineageStartedAt`'s walk moved into the engine as `retryLineage`; this shell keeps NO
// second traversal. The staleness threshold is read from the ONE bound home the shell already
// reads it from for `transitionStaleRunsReclaimed` — never resolved or defaulted at a call site,
// which is `69/FF-6901` honoured rather than annexed — and the store's own `isStale` is handed
// in beside it, so the staleness definition is ASKED FOR rather than restated a fourth time.
//
// Both sites pass `stalenessMs`. The threshold is OPTIONAL to the summer because a render asks a
// different question with the same arithmetic, so a budget site that omitted it would get a
// well-formed number that charges a dead runtime to `now` — the original defect, restored
// silently, with nothing red. That is why it is asserted structurally and not left to the figures.
// A BAG, not four positionals: `stalenessMs` and `now` are adjacent scalars, and a call that
// swapped them would compute a well-formed wrong number rather than throwing. Same reason the
// engine's own deciders take `f(input = {})`.
function budgetElapsedMs({ runs, record, stalenessMs, now }) {
  return lineageElapsedMs({
    runs: retryLineage({ runs, record }),
    now,
    stalenessMs,
    isStale,
  });
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
  const { setAside = null, ...engineExtra } = extra;
  const answer = await invokeRegistered("work:next", { scope }, ctx);
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

function transitionOptions(ctx) {
  return {
    workspace: ctx.workspace,
    lock: lockContextFor(ctx.workspace, ctx),
    publisherOptions: ctx.publisherOptions ?? null,
    journalOptions: ctx.effectsJournalOptions ?? {},
  };
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

async function drivePhase({ ref, phase, cycle, declaration, brief = runBrief(declaration), retryRecord = null, fix = null, gradeAbsent = null, changeBaseline = null, progressBaseCommit = null, now }, ctx) {
  const item = requireLocalCheckout(await resolveItemExact(ctx, ref), ref);
  const opts = transitionOptions(ctx);
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

function progressReportFacts(act) {
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

async function settleDriven(driven, ctx, { now, narrate = NO_PRINT } = {}) {
  const { item, record, outcome } = driven;
  if (outcome.outcome === "needs-input") return driven;
  const terminal = outcome.outcome === "done" ? "done" : "failed";
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
      transitionOptions(ctx),
    );
    return { ...driven, record: completed.record };
  } catch (error) {
    // A SETTLE THAT LOSES A RACE IS A CONFLICT TO REPORT, NEVER A DEATH. This shell minted
    // the run and is its settler, but the record is a file another process can reach —
    // the agent's own `run-complete` (closed at the verb since 2026-09-12, see
    // resolveDrivenRun), a peer's stale-run reclaim scan, an operator's hand. Before this
    // catch the store's honest `illegal-transition` rode uncaught to the CLI's top-level
    // `console.error(e.message)` and a 21-minute drive took a multi-hour loop down with
    // one unstacked line. The store stays strict (an illegal transition writes nothing);
    // the shell reads what is on disk, says so in the narration, and carries on with the
    // DRIVER'S observation as the outcome that steers it — a record already `done` under a
    // `failed` observation makes the retry mint refuse `not-retryable`, which is a coded
    // stop the shell already reports, not a crash.
    if (error?.code !== "illegal-transition") throw error;
    const current = (await readRuns(item)).find((run) => run.runId === record.runId) ?? record;
    reportDegrade("loop-settle-conflict", error);
    await narrate(
      `Settle conflict on ${item.ref} — run ${record.runId} was already ${current.state}${current.failureReason ? ` (${current.failureReason})` : ""} at ${current.updatedAt}; the driver observed ${terminal}. Record left as it stands.`,
    );
    return { ...driven, record: current, settleConflict: { recorded: current.state, observed: terminal } };
  }
}

// THE GRADE RIDES THE `driven` ROW (54/03, ADR-008 §1-2), and NOTHING ABOVE IT MOVES.
//
// `LoopState`'s top-level key set stays TEN and `actShape()`'s whitelist is untouched: an
// eleventh key, or a `findings` key on `act`, is a renegotiation with three milestones (62,
// 63, 78) for a fact none of them asked for, and `acd-loop-probe-contract` asserts
// `Object.keys(state)` deep-equals the ten, order included. The `driven` array is the one
// place in that frozen document which is per-drive, ADDITIVE, and pinned by nobody —
// re-measured at HEAD, every assertion on `state.driven` in this tree is either
// `deepEqual(driven, [])` or a `.map()` projection over `ref`/`phase`/`cycle`/`attempt`.
//
// The row carries the grade's SUMMARY, never its failures: what a reader of `LoopState`
// needs is what the verdict was, which codes produced it and how much was actually observed.
// The failure texts ride the fix payload and the run's brief — the two places that already
// carry per-run detail.
// 81/02 — AND SO DOES THE DECLARED ABSENCE, ON THE SAME ROW AND FOR THE SAME REASON.
//
// The resume path never walks rung 3 (`54/03/OUTCOME.md` § Gaps), so a re-drive it
// reconstructed carries no grade of the build that caused it — and 62, 63 and 78 consume
// `LoopState` without being told the key is conditional. The two limbs offered were
// re-grading on resume or DECLARING the absence, and the first is refused twice over:
// `54/ADR-007 §1` fixes rung 3's answer as taken *once per completed build* and a resume
// completes none, and carrying the PRE-INTERRUPTION grade forward would present evidence
// about the old tree as evidence about the new one — this milestone's own defect shape
// pointed at itself. The honest answer is cheap and is the one a consumer can act on: those
// three do not need a grade on every drive, they need to know WHICH drives carry one.
//
// IT RIDES THE SAME ROW, so `LoopState` keeps its ten keys and `actShape()`'s whitelist is
// untouched — no eleventh key is negotiated with three milestones for a fact none of them
// asked for. And it appears ONLY where a rubric is declared: `54/ADR-002 §3` promises an
// unconfigured repository a document byte-identical to the pre-54 shell's, and today's row
// omits the grade keys both when no rubric is declared and when a grade was owed and not
// taken — indistinguishable, which is the whole defect.
//
// The absence describes this drive's INPUT (was the build that caused it graded?); the
// verdict keys describe the grade taken OF this drive. They are different facts about
// different runs, so they neither overwrite nor exclude one another.
function drivenRow(entry) {
  const grade = entry.grade ?? null;
  return {
    ref: entry.item.ref,
    phase: entry.phase,
    runId: entry.record.runId,
    outcome: entry.outcome.outcome,
    attempt: entry.record.attempt,
    cycle: entry.cycle,
    ...(grade == null ? {} : { verdict: grade.verdict, codes: grade.codes, cases: grade.cases }),
    ...(entry.gradeAbsent == null ? {} : { graded: false, gradeAbsence: entry.gradeAbsent }),
  };
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
  const ctx = suppliedCtx.workspace
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
    let resumedProgressHalt = null;
    const reclaimed = await transitionStaleRunsReclaimed(
      resolved.resume.items,
      {
        now: input.now,
        stalenessThreshold: stalenessMs,
      },
      transitionOptions(ctx),
    );
    for (const entry of reclaimed) {
      resumeRetries.set(entry.item.ref, { item: entry.item, prior: entry.record });
      await narrate(`Reclaimed ${entry.item.ref} — run ${entry.record.runId} (${entry.record.failureReason}).`);
    }
    for (const item of resolved.resume.items) {
      const itemRuns = await readRuns(item);
      const failed = [...itemRuns].reverse().find((record) =>
        record.state === "failed"
        && record.brief?.loop?.loopRunId === resolved.resume.lastDeclaration?.loopRunId);
      if (failed) resumeRetries.set(item.ref, { item, prior: failed });

      // A completed continue plus still-current findings is enough persisted lineage
      // to reconstruct a pending fix after interruption. The exact findings are read
      // again from their authoritative producer; change context is omitted because
      // the pre-build git baseline was intentionally not added to the run schema.
      const buildRun = [...itemRuns].reverse().find((record) =>
        record.state === "done"
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

  if (resolved.level === "L1") {
    return await runL1({ ...resolved, loopRunId, startedAt }, ctx, report);
  }

  const driven = [];
  // milestone 124 / story 01 (ADR-005 §5) — THE UNITS HANDED BACK TO THEIR PLAN, set aside for
  // the remainder of THIS invocation. In-process on purpose: the bound that survives a resume is
  // the plan counter below (rebuilt by `reconstructCycleCounts` from the run records), and this
  // one is the walk's memory of what it has already asked a planner about. A new invocation is
  // entitled to offer the unit again — that is the outer limit ADR-005 §6 names.
  const setAside = new Set();
  let lastSetAside = null;
  let inFlightRef = null;
  let interrupted = null;
  const onSigint = () => { interrupted = "SIGINT"; };
  const onSigterm = () => { interrupted = "SIGTERM"; };
  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);

  try {
    for (;;) {
      const { next, facts, decision, exhausted } = await nextDecision(resolved.scope, resolved.level, resolved.cap, ctx, { l3Gate: resolved.l3Gate, setAside });
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

      if (interrupted) act = haltDecision("operator-interrupt", inFlightRef ?? next?.ref ?? resolved.scope, interrupted);
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
              : act.stop === "operator-interrupt"
                ? { signal: interrupted }
                : {};
        await reportLine(report, state, details);
        return state;
      }

      // `gate` actions are produced after continue below; a fresh `work:next`
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
      // 81/03 — the grade travels BESIDE the transport, read here and nowhere else.
      let pendingGrade = act.phase === "continue" ? pendingGrades.get(act.ref) ?? null : null;
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
          const priorDrives = resolved.resume.runs.filter((run) => run?.itemRef === act.ref && run?.brief?.loop?.phase === "continue").length;
          try {
            const measured = await invokeRegistered("work:grade", { ref: act.ref, run: true }, ctx);
            const measuredSummary = gradeSummary(measured);
            if (measuredSummary != null && (measuredSummary.verdict === "pass" || measuredSummary.verdict === "fail")) {
              const failures = (Array.isArray(measured.grade?.failures) ? measured.grade.failures : [])
                .map((failure) => failure?.case)
                .filter((name) => typeof name === "string" && name.length > 0);
              gradeBaseline = { measuredAt: input.now ?? new Date().toISOString(), priorDrives, failures };
              await narrate(
                `Baseline work:grade ${act.ref} — ${failures.length} failing case(s) inherited, ${measuredSummary.cases.total} case(s) measured`
                + `${priorDrives > 0 ? ` (taken after ${priorDrives} prior drive(s) of this story — its own earlier reds are excluded too)` : ""}.`,
              );
            }
          } catch (error) {
            reportDegrade("loop-grade-baseline", error);
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
            transitionOptions(ctx),
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
      if (interrupted) {
        const halt = haltDecision("operator-interrupt", act.ref, interrupted);
        const state = loopState({ ...resolved, loopRunId, next, act: halt, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
        await reportLine(report, state, { signal: interrupted });
        return state;
      }
      phaseRun = await settleDriven(phaseRun, ctx, { now: input.now, narrate });
      driven.push(drivenRow(phaseRun));

      if (phaseRun.outcome.outcome === "needs-input") {
        const halt = haltDecision("session-needs-input", act.ref, "driver:needs-input");
        const state = loopState({ ...resolved, loopRunId, next, act: halt, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
        await reportLine(report, state, { sessionId: phaseRun.outcome.sessionId });
        return state;
      }

      while (phaseRun.outcome.outcome === "failed") {
        try {
          // The in-process site carries no instant forward: it sums the lineage over the item's
          // runs AS THEY STAND AT THIS MOMENT, which is what lets it charge the attempts this
          // invocation has already driven. With an injected `now` those cost 0 — `drivePhase` and
          // `settleDriven` both pass it, so a run minted and settled inside one invocation has
          // `createdAt === updatedAt` — which is precisely what makes "the eleven hours are not
          // charged" observable in a fixture.
          const itemRuns = await readRuns(phaseRun.item);
          const head = itemRuns.find((run) => run.runId === phaseRun.record.runId) ?? phaseRun.record;
          const retryDeadline = decideScheduleToClose({
            elapsedMs: budgetElapsedMs({
              runs: itemRuns,
              record: head,
              stalenessMs,
              now: input.now ?? new Date().toISOString(),
            }),
            ceilingMs: scheduleToCloseMs,
          });
          if (retryDeadline.act === "halt") {
            const halt = { ...retryDeadline, ref: act.ref };
            const state = loopState({ ...resolved, loopRunId, next, act: halt, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
            await reportLine(report, state, { deadline: halt.deadline, ceilingMs: halt.ceilingMs, elapsedMs: halt.elapsedMs, disposition: halt.disposition });
            return state;
          }
          const retried = await transitionRunStart(
            phaseRun.item,
            {
              mode: "retry",
              maxAttempts: resolved.cap,
              brief,
              node: meshNodeIdOf(ctx.workspace.config),
              now: input.now,
            },
            transitionOptions(ctx),
          );
          // The retry record is already minted. Drive the same phase on that
          // lineage without going through the fresh-mint branch.
          //
          // A drive through THIS site is announced by `Retrying` rather than `Driving`, carrying
          // the same ref and phase plus the attempt and the reason — so no drive is silent and
          // none is announced twice. It is printed after the mint is admitted, for the same
          // reason `Resumed` is.
          await narrate(`Retrying ${act.ref} — ${act.phase}, attempt ${retried.record.attempt} of ${resolved.cap} (${phaseRun.record.failureReason}).`);
          let retryRun = await drivePhase({ ref: act.ref, phase: act.phase, cycle, declaration, brief, retryRecord: retried.record, fix, gradeAbsent, changeBaseline, progressBaseCommit, now: input.now }, ctx);
          retryRun = await settleDriven(retryRun, ctx, { now: input.now, narrate });
          driven.push(drivenRow(retryRun));
          phaseRun = retryRun;
          if (retryRun.outcome.outcome === "needs-input") {
            const halt = haltDecision("session-needs-input", act.ref, "driver:needs-input");
            const state = loopState({ ...resolved, loopRunId, next, act: halt, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
            await reportLine(report, state, { sessionId: retryRun.outcome.sessionId });
            return state;
          }
        } catch (error) {
          const stop = storeStop(error);
          if (stop != null) {
            stop.ref = act.ref;
            const state = loopState({ ...resolved, loopRunId, next, act: stop, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
            await reportLine(report, state, {
              readyAt: error.readyAt,
              attempt: phaseRun.record.attempt,
              failureReason: phaseRun.record.failureReason,
            });
            return state;
          }
          break;
        }
      }

      if (phaseRun.outcome.outcome !== "done") continue;

      if (act.phase === "continue") {
        let gradeResult = null;
        let gradeFault = null;
        try {
          gradeResult = await invokeRegistered("work:grade", {
            ref: act.ref,
            run: true,
            claimRun: phaseRun.record.runId,
          }, ctx);
        } catch (error) {
          reportDegrade("loop-progress-grade", error);
          gradeFault = error;
        }
        // A GRADE THAT COULD NOT BE TAKEN IS NOT A REPOSITORY THAT DECLARED NO RUBRIC
        // (54/03 review finding D3, root cause). This catch left `gradeResult` null, and a
        // null answer reads as `configured !== true` at every door below — which is EXACTLY
        // the `rubric-unconfigured` row of ADR-007 §3, the ONE indeterminate that proceeds
        // as today. So a declared rubric whose grade THREW was indistinguishable from a
        // repository that never declared one, and a `fail` crossed straight to verify with
        // the loop reporting `done`. Measured with the registered command made to throw
        // `EPERM`: directives `["/aof:continue 03/01", "/aof:verify 03/01", "/aof:verify
        // 03"]`, `state=done`, 0 of 2 runs carrying a grade — this milestone's own thesis
        // (an absence of evidence read as a green light) reachable from its own shell, and
        // silent, because `reportDegrade` throttles the second occurrence in a process to
        // nothing at all.
        //
        // The DECLARATION is what tells the two apart, read through `work:grade`'s own
        // single-home predicate rather than a second copy of it. When one is declared and
        // the answer could not be taken, the run told us NOTHING about whether the item is
        // correct — which is ADR-007 §3's `indeterminate` row, and it halts. NO record is
        // fabricated: there is no verdict, no code and no `brief.grade`, exactly as for an
        // item that was never graded.
        // THE DELTA, applied ONCE, ahead of every reader below — the sampler's count, the summary
        // on the driven row, the fix payload and the route all read the same reduced answer.
        gradeResult = applyGradeBaseline(gradeResult, gradeBaselines.get(act.ref) ?? null);
        const gradeUnavailable = gradeFault != null && declaredRubric(ctx.workspace?.config) != null;
        const failingScenarios = failingCountFromGrade(gradeResult);
        // 54/03 — THE GRADE, DERIVED ONCE, READ EVERYWHERE BELOW. `gradedSummary` is null
        // for a repository that declares no `work.rubric`, and every consequence in this
        // block is gated on that one predicate, so an unconfigured repository's cycle is
        // byte-for-byte the cycle it runs today (ADR-002 §3).
        const gradedSummary = gradeSummary(gradeResult);
        const gradedRecord = gradedSummary == null ? null : gradeResult.grade;
        // 81/03 — DERIVED ONCE, AND EVERY SITE THAT PREPARES A RE-DRIVE USES IT. It was
        // derived at the rung-3 site only, and the progress `continue` branch below put the
        // runner's RAW `grade.failures` on the bag instead — entries naming no producer at
        // all. So the same maker, re-driven for the same reason, was handed two different
        // documents depending on which branch decided it, and `54/ADR-008 §5`'s property (a
        // reader tells a validate finding from a graded case BY A KEY) held on one branch and
        // not the other. One derivation, hoisted to where every branch can reach it.
        const gradedFindings = gradeFindings(gradeResult);
        // THE ROW OF THE DRIVE THAT WAS GRADED, found by the RUN ID it carries and never by
        // position, so no drive's grade can overwrite another drive's row (a build retried on
        // the same lineage keeps its own row, and the failed attempt keeps its own absence of
        // one). The row was pushed before the grade was taken — the grade is OF that drive.
        if (gradedSummary != null) {
          const index = driven.findIndex((row) => row.runId === phaseRun.record.runId);
          if (index >= 0) driven[index] = drivenRow({ ...phaseRun, grade: gradedSummary });
        }
        const priorProgress = progressStates.get(act.ref) ?? { resets: 0, attemptRun: null, summary: null };
        const attemptRun = priorProgress.attemptRun ?? phaseRun.record;
        const sample = await recordBuildProgress({
          item: phaseRun.item,
          run: attemptRun,
          worktreePath: ctx.workspace.projectRoot,
          baseCommit: phaseRun.progressBaseCommit,
          failingScenarios,
          at: input.now ?? new Date().toISOString(),
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
            // The engine imports nothing (F-69-V11); the deciders ride in from here,
            // which is the layer that already holds src/loop-progress.mjs.
            evaluateProgressPolicy,
            decideBuildProgress,
          });
          progressStates.set(act.ref, {
            resets: progressDecision.resets ?? priorProgress.resets,
            attemptRun,
            summary: priorProgress.summary,
          });

          if (progressDecision.act === "halt") {
            const halt = { ...progressDecision, ref: act.ref };
            const state = loopState({ ...resolved, loopRunId, next, act: halt, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
            await reportLine(report, state, progressReportFacts(halt));
            return state;
          }
          if (progressDecision.act === "reset") {
            progressStates.set(act.ref, {
              resets: progressDecision.resets,
              attemptRun: null,
              summary: progressDecision.summary,
            });
            pendingFixes.set(act.ref, fixTransport({
              buildRun: phaseRun.record,
              resumeBuildRun: null,
              findings: [{ code: "progress-reset", summary: progressDecision.summary }],
              changeBaseline: phaseRun.changeBaseline,
              progressContinuation: true,
            }));
            // 54/03 — a re-drive is a re-drive however it was decided, so the grade taken for
            // this cycle rides the run it re-drove here too (ADR-008 §3). 81/03 — it rides the
            // grade map beside the transport, never on it.
            if (gradedRecord != null) pendingGrades.set(act.ref, gradedRecord);
            continue;
          }
          if (progressDecision.act === "continue") {
            const currentNode = meshNodeIdOf(ctx.workspace.config);
            pendingFixes.set(act.ref, fixTransport({
              buildRun: phaseRun.record,
              resumeBuildRun: admitResumeBuildRun(phaseRun.record, currentNode),
              // 81/03 — THE SAME DOCUMENT THE GATE BRANCH PREPARES. This site put the runner's
              // raw `grade.failures` here, whose entries name no producing gate; the entries
              // are identical, and now every one of them names `work:grade` as the gate that
              // produced it, on this branch as on the other.
              findings: gradedFindings,
              changeBaseline: phaseRun.changeBaseline,
              progressContinuation: true,
            }));
            if (gradedRecord != null) pendingGrades.set(act.ref, gradedRecord);
            continue;
          }
        }

        const completedRounds = reviewRounds.get(act.ref) ?? 0;
        const gate = await invokeReviewGate(act.ref, completedRounds, input, ctx, undefined, narrate);

        // ---- RUNG 3: THE GRADE (54/03; ADR-007 §1, §3) --------------------------------
        //
        // The rung announces itself on the operator's own report line, exactly as rungs 1
        // and 2 do (`53/ADR-016`) — and ONLY when a rubric was declared, because a rung that
        // did nothing announcing itself would be the byte an unconfigured repository is
        // promised it will not see. The grade itself was taken above; this reads that
        // answer rather than paying for a second child process.
        if (gradedSummary != null) {
          await narrate(
            `Gate work:grade ${act.ref} — ${gradedSummary.verdict}`
            + `${gradedSummary.codes.length > 0 ? ` (${gradedSummary.codes.join(", ")})` : ""}`
            + `, ${gradedSummary.cases.failed} of ${gradedSummary.cases.total} case(s) failing`
            + `${Number.isSafeInteger(gradeResult?.inherited) && gradeResult.inherited > 0 ? ` (${gradeResult.inherited} inherited, excluded by the baseline)` : ""}.`,
          );
        }

        // THE PAYLOAD THE MAKER IS RE-DRIVEN WITH — the ladder's findings and the grade's
        // failing cases, in ONE list, each entry naming the rung that produced it. This is
        // the payload the shell already builds (`pendingFixes`, 70/04's transport); no
        // second one is minted, and when the grade contributes nothing it is the list the
        // ladder returned, verbatim.
        const gatedFindings = mergeGateFindings(gate, gradedFindings);
        const gradedGate = { ...gate, findings: gatedFindings };
        // THE ACT RUNG 3 DECIDES, READ OFF THE VERDICT AND NOTHING ELSE (ADR-007 §3, review
        // defect D2). Derived once, beside the payload, and consulted at both routing sites
        // below so neither can drift back to counting entries.
        const gradeAct = gradeRoute(gradeResult);

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
          // CAP EXHAUSTION CARRIES THE RECORD IT COULD NOT CLOSE (ADR-008 §4). This cycle's
          // grade has no successor run to ride — that is precisely why the halt carries it —
          // so it is passed as the trailing entry beside the union over the runs this loop
          // minted.
          const state = loopState({ ...resolved, loopRunId, next, act: gateDecision.act, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
          await reportLine(report, state, {
            cap: resolved.cap,
            findings: await accumulatedRecord(ctx, act.ref, loopRunId, { gate, trailing: gradedRecord }),
          });
          return state;
        }
        // A `fail` RE-DRIVES ON ITS VERDICT, NOT ON ITS ENTRY COUNT (ADR-007 §3, review
        // defect D2). A grade that says the item is wrong and names no case still says the
        // item is wrong; crossing to verify on an empty `failures` list would be exactly the
        // vacuous green this milestone refuses. The ladder's own findings keep deciding
        // first, which is ADR-007 §1's decision order.
        if (gatedFindings.length > 0 || gradeAct === "redrive") {
          const reviewDecision = decideReviewGate({
            completedRounds,
            cap: reviewCap,
            hardCap: MAX_REVIEW_ROUNDS,
            previousBlockerCount: reviewBlockerCounts.get(act.ref),
            findings: gatedFindings,
            ...(Object.prototype.hasOwnProperty.call(gate, "blockerClaims")
              ? { blockerClaims: gate.blockerClaims }
              : {}),
          });
          if (reviewDecision.act === "halt") {
            const halt = { ...reviewDecision, ref: act.ref };
            const state = loopState({ ...resolved, loopRunId, next, act: halt, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
            await reportLine(report, state, {
              round: reviewDecision.round,
              reviewCap: reviewDecision.cap,
              blockerClasses: reviewDecision.blockerClasses,
              workItems: reviewDecision.workItems,
            });
            return state;
          }
          reviewRounds.set(act.ref, reviewDecision.round);
          if (reviewDecision.blockerCount > 0) reviewBlockerCounts.set(act.ref, reviewDecision.blockerCount);
          const changeUnderReview = typeof ctx.readChangeUnderReview === "function"
            ? await ctx.readChangeUnderReview(ctx.workspace.projectRoot, phaseRun.changeBaseline)
            : await readChangeUnderReview(ctx.workspace.projectRoot, phaseRun.changeBaseline);
          const currentNode = meshNodeIdOf(ctx.workspace.config);
          pendingFixes.set(act.ref, fixTransport({
            buildRun: phaseRun.record,
            resumeBuildRun: admitResumeBuildRun(phaseRun.record, currentNode),
            findings: gatedFindings,
            changeUnderReview,
            changeBaseline: phaseRun.changeBaseline,
            blocker: reviewDecision.blocker,
            blockers: reviewDecision.blockers,
            blockerCount: reviewDecision.blockerCount,
          }));
          // The record the re-driven run's brief will carry (ADR-008 §3) — beside the
          // transport, not on it (81/03).
          if (gradedRecord != null) pendingGrades.set(act.ref, gradedRecord);
          continue;
        }

        // THE LADDER IS CLEAN THROUGH RUNG 2 AND THE GRADE FOUND NOTHING FAILING. The one
        // routing answer left is rung 3's `indeterminate`: the run told us NOTHING about
        // whether the item is correct, so it HALTS rather than crossing to a review turn on
        // an absence of evidence — the last place this milestone could quietly turn a gap
        // into a green light. `rubric-unconfigured` is not one of these (it proceeds exactly
        // as today), and the producer is drawn from the CODE, never from a message match.
        //
        // THE HALT IS DECIDED BY THE VERDICT (review defect D2). It was decided by whether
        // the codes yielded an admissible stop, so an `indeterminate` naming no code at all
        // crossed to verify — the very green this rung exists to refuse. The CODE still
        // names the producer, and is simply absent when the record named none.
        // …AND SO IS A GRADE THAT COULD NOT BE TAKEN AT ALL (review finding D3). Same stop,
        // same rung, and the report says which of the two happened: an `indeterminate`
        // record names its verdict and code, while an unavailable one names the fault that
        // stopped it being taken. Neither fabricates a record.
        if (gradeAct === "halt" || gradeUnavailable) {
          const halt = haltDecision("grade-indeterminate", act.ref, gradeStopProducer(gradeStopCode(gradeResult)));
          const state = loopState({ ...resolved, loopRunId, next, act: halt, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
          await reportLine(report, state, gradedSummary == null
            ? { unavailable: String(gradeFault?.message ?? gradeFault ?? "the grade could not be taken") }
            : { verdict: gradedSummary.verdict, codes: gradedSummary.codes, cases: gradedSummary.cases });
          return state;
        }

        // A clean deterministic gate immediately crosses to verify; asking
        // work:next here would offer the unchanged story and choose continue.
        const verifyKey = `${act.ref}\0verify`;
        const verifyCycle = (cycles.get(verifyKey) ?? 0) + 1;
        cycles.set(verifyKey, verifyCycle);
        const verifyDeclaration = declarationFor({ ...resolved, loopRunId, phase: "verify", cycle: verifyCycle, startedAt });
        // A PASSING GRADE PUTS NOTHING ON A RE-DRIVE, BECAUSE THERE IS NO RE-DRIVE — and it
        // is still recorded, on the run it drove (ADR-008 §3). The verify run is the
        // successor this grade caused to start, so the seam that writes `brief.loop` writes
        // the grade beside it, exactly as it does on a re-driven continue.
        const verifyBrief = runBrief(verifyDeclaration, { grade: gradedRecord });
        // THE CROSS TO VERIFY IS A DRIVE, so it announces itself like one. This is the THIRD
        // drive site — a clean gate crosses here without asking `work:next`, so an act line
        // written only at the main site would leave the verify wait silent, which is the wait a
        // milestone-scoped invocation spends nearly all of its time in.
        await narrate(`Driving ${act.ref} — verify, cycle ${verifyCycle} of ${resolved.cap}, ${resolved.level}.`);
        let verified = await drivePhase({ ref: act.ref, phase: "verify", cycle: verifyCycle, declaration: verifyDeclaration, brief: verifyBrief, now: input.now }, ctx);
        verified = await settleDriven(verified, ctx, { now: input.now, narrate });
        driven.push(drivenRow(verified));
        if (verified.outcome.outcome === "needs-input") {
          const halt = haltDecision("session-needs-input", act.ref, "driver:needs-input");
          const state = loopState({ ...resolved, loopRunId, next, act: halt, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
          await reportLine(report, state, { sessionId: verified.outcome.sessionId });
          return state;
        }
        if (verified.outcome.outcome === "done" && hasUat(facts.tasks?.tasks ?? [])) {
          const halt = haltDecision("uat-gate", act.ref, "work:tasks:counts.uat");
          const state = loopState({ ...resolved, loopRunId, next, act: halt, resumable: { stranded: resolved.resume.stranded, lastDeclaration: resolved.resume.lastDeclaration }, driven });
          await reportLine(report, state, { uatCount: uatCount(facts.tasks?.tasks ?? []) });
          return state;
        }
      }
    }
  } finally {
    process.removeListener("SIGINT", onSigint);
    process.removeListener("SIGTERM", onSigterm);
  }
}

export function renderLoopState(state) {
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
    },
    required: ["scope"],
    additionalProperties: false,
  },
  run: probeLoop,
  cli: {
    route: ["work", "loop"],
    spec: {
      usage: "aof work loop <driver|NN-MM> [--level L1|L2|L3] [--cap N] [--review-claims JSON] [--resume] [--dry-run] [--quiet] [--supervised] [--json]",
      flags: {
        level: { type: "string", description: "loop level (L1 report-only, L2 assisted, or L3 unattended when its computed gate passes)" },
        cap: { type: "string", description: "override the per-(ref, phase) drive ceiling" },
        reviewClaims: { type: "string", description: "JSON structured blocker claims keyed by ref and completed review rounds" },
        resume: { type: "boolean", description: "settle stranded runs and resume the last declaration" },
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
      ...(options.dryRun === true ? { dryRun: true } : {}),
      ...(options.quiet === true ? { quiet: true } : {}),
      ...(options.supervised === true ? { supervised: true } : {}),
    }),
    launch: (options) => options.dryRun === true
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
