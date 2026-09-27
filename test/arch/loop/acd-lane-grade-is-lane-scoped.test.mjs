// Fitness function: acd-lane-grade-is-lane-scoped (milestone 129 / story 05; FF-12905;
// ADR-003) —
//
//   "A lane's grade is taken in the lane."
//
// MEASURED 2026-09-12: 127/01 stalled six rounds on seven reds, six of them not its own, because
// the rubric ran over the SHARED checkout. ADR-003 closes that class by construction — every
// grade, gate and progress sample of a lane runs in the lane's own workspace, and the baseline
// is a property of the BASE COMMIT, measured once per wave in a lane.
//
// STRUCTURAL LEG, over `src/loop/cycle.mjs` and `src/loop/wave.mjs` (comment-stripped, cut on
// the language's own structure): no `process.cwd()` anywhere in either; in `cycle.mjs` every
// `invokeRegistered("work:grade" | "work:validate" | "work:doctor"` call hands on the `ctx` its
// enclosing function was HANDED, and every `recordBuildProgress(` call passes the `worktreePath`
// option; the only `ctx.workspace.projectRoot` in the ladder is `settleStoryCycle`'s default for
// that option — the SEQUENTIAL call site, allow-listed by name, where the shell passes the primary
// on purpose. In `wave.mjs` the lane path is `runLane`: its grade and ladder calls
// (`measureGradeBaseline(`, `settleStoryCycle(`, `invokeRegistered(`) receive `laneCtx` and never
// the loop's `ctx`, `settleStoryCycle(` carries `worktreePath: open.worktree`, and the body names
// neither `process.cwd()` nor `ctx.workspace.projectRoot`. `gradeBaselines` is keyed by a
// `baseCommit` binding on every `.get(` / `.set(`, and `readGradeBaseline` answers a
// `{ baseCommit }` selector. NON-VACUOUS: the leg must FIND the grade call, the lane's ladder call
// and the keyed map before it judges them.
//
// FIXTURE LEG — a two-member wave driven through `runLoopBody` over the lane fixture with a FAKE
// `work:grade` that records the `ctx.workspace.projectRoot` it was asked in: it was asked at least
// twice (found), the baseline (no `claimRun`) ran exactly once, and every lane grade (a
// `claimRun`) names its lane's path — never the primary's.
//
// Red probe (VERIFICATION.md's register): hand `settleStoryCycle` the loop's own `ctx` in place
// of the lane ctx for each lane.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { functionBody, matchedParenSpan, stripComments, topLevelArguments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CYCLE = "src/loop/cycle.mjs";
const WAVE = "src/loop/wave.mjs";
const LANE_PATH_FUNCTION = "runLane";
// The sequential call site: `settleStoryCycle`'s `worktreePath` default is the one place the
// ladder names `ctx.workspace.projectRoot`, and there `ctx` is whatever workspace the caller
// handed it — the primary for the sequential shell, the lane for a lane.
const SEQUENTIAL_DEFAULT = "worktreePath = ctx.workspace.projectRoot";

const GATE_CALL_RE = /invokeRegistered\(\s*"work:(?:grade|validate|doctor)"/gu;

// Innermost function declaration containing an offset — nested declarations included.
function ownerOf(code, offset) {
  let owner = null;
  for (const match of code.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gu)) {
    const header = `function ${match[1]}(`;
    const at = code.indexOf(header, match.index);
    const params = matchedParenSpan(code, at);
    if (params == null) continue;
    const open = code.indexOf("{", params.close);
    const body = functionBody(code.slice(at), header);
    if (body == null) continue;
    const end = open + body.length + 2;
    if (open <= offset && offset < end && (owner == null || end - open < owner.size)) owner = { name: match[1], params: params.body, body, size: end - open };
  }
  return owner;
}

// PURE — the ladder's rule over `src/loop/cycle.mjs`.
export function cycleGradeScopeProblems(code) {
  const problems = [];
  const found = { gateCalls: 0, samplerCalls: 0 };
  if (/\bprocess\.cwd\(\)/u.test(code)) problems.push(`${CYCLE}: names process.cwd() — a lane's grade runs in the lane's workspace, never the process's directory (129/ADR-003 §2)`);
  for (const match of code.matchAll(GATE_CALL_RE)) {
    found.gateCalls += 1;
    const span = matchedParenSpan(code, match.index);
    const args = topLevelArguments(span?.body ?? "");
    const last = args.at(-1) ?? "";
    const owner = ownerOf(code, match.index);
    const handed = owner != null && /(?:^|[,\s{])ctx\b/u.test(owner.params);
    if (last !== "ctx" || !handed) {
      problems.push(`${CYCLE}: ${owner?.name ?? "(module scope)"} asks ${match[0].slice("invokeRegistered(".length)} with \`${last}\` — the ladder grades in the ctx its caller HANDED it (the lane's), never one it built or reached for (129/ADR-003 §2)`);
    }
  }
  for (const match of code.matchAll(/(?<!function\s)\brecordBuildProgress\(/gu)) {
    const owner = ownerOf(code, match.index);
    found.samplerCalls += 1;
    const span = matchedParenSpan(code, match.index);
    if (!/(?:^|[,\s{])worktreePath\s*[,}:]/u.test(span?.body ?? "") || /worktreePath\s*:\s*(?!worktreePath\b)/u.test(span?.body ?? "")) {
      problems.push(`${CYCLE}: ${owner?.name ?? "(module scope)"} samples progress without passing the \`worktreePath\` option through — the sampler samples the lane, never the process's tree`);
    }
  }
  // Judged per LINE — the allow-list names a declaration line, and a line is the language's own
  // unit for it; no cut is made.
  let offset = 0;
  for (const line of code.split("\n")) {
    if (line.includes("ctx.workspace.projectRoot") && !line.includes(SEQUENTIAL_DEFAULT)) {
      problems.push(`${CYCLE}: ${ownerOf(code, offset)?.name ?? "(module scope)"} reads ctx.workspace.projectRoot outside the allow-listed sequential default (\`${SEQUENTIAL_DEFAULT}\`) — the ladder is handed its path`);
    }
    offset += line.length + 1;
  }
  return { problems, found };
}

// PURE — the lane path's rule over `src/loop/wave.mjs`.
export function waveGradeScopeProblems(code) {
  const problems = [];
  const found = { laneLadder: 0, laneBaseline: 0, keyedGets: 0, keyedSets: 0 };
  if (/\bprocess\.cwd\(\)/u.test(code)) problems.push(`${WAVE}: names process.cwd() — a lane's grade runs in the lane's workspace (129/ADR-003 §2)`);
  const lane = functionBody(code, `function ${LANE_PATH_FUNCTION}(`);
  if (lane == null) {
    problems.push(`${WAVE}: NOT FOUND — no ${LANE_PATH_FUNCTION}( declaration; there is no lane path to judge`);
    return { problems, found };
  }
  for (const match of lane.matchAll(/\b(measureGradeBaseline|settleStoryCycle|invokeRegistered)\s*\(/gu)) {
    const span = matchedParenSpan(lane, match.index);
    const args = topLevelArguments(span?.body ?? "");
    const verb = match[1];
    const ctxArg = verb === "measureGradeBaseline" ? args[1] : verb === "settleStoryCycle" ? args[2] : args.at(-1);
    if (verb === "settleStoryCycle") found.laneLadder += 1;
    if (verb === "measureGradeBaseline") found.laneBaseline += 1;
    if (ctxArg !== "laneCtx") {
      problems.push(`${WAVE}: ${LANE_PATH_FUNCTION} calls ${verb}( with \`${ctxArg}\` as its ctx — every grade, gate and ladder of a lane receives the lane's workspace (laneCtx), never the loop's ctx (129/ADR-003 §2)`);
    }
    if (verb === "settleStoryCycle") {
      const options = args[3] ?? "";
      if (!/\bworktreePath\s*:\s*open\.worktree\b/u.test(options)) problems.push(`${WAVE}: ${LANE_PATH_FUNCTION}'s settleStoryCycle( does not carry \`worktreePath: open.worktree\` — the sampler and the change reader must see the lane`);
      if (!/\bctx\s*:\s*laneCtx\b/u.test(options)) problems.push(`${WAVE}: ${LANE_PATH_FUNCTION}'s settleStoryCycle( options do not carry \`ctx: laneCtx\` — the ladder's review gate must run in the lane`);
    }
  }
  if (/ctx\.workspace\.projectRoot/u.test(lane)) problems.push(`${WAVE}: ${LANE_PATH_FUNCTION} reads ctx.workspace.projectRoot — the loop's own root has no place on the lane path`);
  for (const match of code.matchAll(/\bgradeBaselines\.(get|set)\(\s*([^,)]+)/gu)) {
    if (match[1] === "get") found.keyedGets += 1;
    else found.keyedSets += 1;
    if (match[2].trim() !== "baseCommit") problems.push(`${WAVE}: gradeBaselines.${match[1]}( is keyed by \`${match[2].trim()}\` — the baseline is a property of the BASE COMMIT and the map is keyed by a baseCommit binding (129/ADR-003 §1)`);
  }
  return { problems, found };
}

async function driveTwoMemberWaveWithFakeGrade() {
  const fixture = await import("../../support/loop/lane-fixture.mjs");
  const { runLoopBody } = await import("../../../src/commands/loop.mjs");
  const { meshDispatchWorktreePath } = await import("../../../src/mesh/worktree.mjs");
  const NOW = "2026-09-14T12:00:00.000Z";
  const provenance = { node: "fixture", run: null, commit: null, at: NOW };
  const passing = () => ({ configured: true, grade: { verdict: "pass", codes: [], cases: { total: 1, failed: 0, skipped: 0 }, failures: [], gradedAt: NOW, provenance: { ...provenance } } });
  return await fixture.withLaneRepo(async (fx) => {
    const graded = [];
    const registry = fixture.scriptedRegistry({
      grade: async (input, ctx) => {
        graded.push({ ref: input.ref, run: input.run === true, claimRun: input.claimRun ?? null, projectRoot: ctx.workspace.projectRoot });
        return passing();
      },
    });
    const driver = fixture.primaryDriver(fx, { onCommand: fixture.verifyCompleter(fx) });
    const child = fixture.fakeLaneChild(fx);
    const ctx = fixture.laneCtx(fx, { child, registry, driver, report: fixture.collector(), timers: fixture.fakeTimers(), signals: fixture.fakeSignals(), now: NOW });
    const state = await runLoopBody({ scope: fx.milestone }, ctx);
    return { state, graded, childCalls: child.calls, primaryRoot: fx.root, lanePath: (ref) => meshDispatchWorktreePath(fx.root, ref), members: ["07/01", "07/03"] };
  });
}

export const archTests = [
  {
    name: "arch/129/05 FF-12905 structural leg: the ladder grades, gates and samples in the ctx and worktreePath it is handed, the lane path hands it the lane, and the baseline map is keyed by base commit",
    run: async () => {
      const cycle = stripComments(await readFile(path.join(repoRoot, CYCLE), "utf8"));
      const wave = stripComments(await readFile(path.join(repoRoot, WAVE), "utf8"));

      const ladder = cycleGradeScopeProblems(cycle);
      assert.ok(ladder.found.gateCalls > 0, `${CYCLE}: NOT FOUND — no invokeRegistered("work:grade" / "work:validate" / "work:doctor" call; the ladder grades nothing this leg can judge`);
      assert.ok(cycle.includes('invokeRegistered("work:grade"'), `${CYCLE}: NOT FOUND — the work:grade call is absent`);
      assert.ok(ladder.found.samplerCalls > 0, `${CYCLE}: NOT FOUND — no recordBuildProgress( call site`);
      assert.ok(cycle.includes(SEQUENTIAL_DEFAULT), `${CYCLE}: NOT FOUND — the allow-listed sequential default \`${SEQUENTIAL_DEFAULT}\` is absent; the allow-list names nothing`);
      assert.deepEqual(ladder.problems, [], `the ladder is handed its workspace:\n${ladder.problems.join("\n")}`);

      const lane = waveGradeScopeProblems(wave);
      assert.ok(lane.found.laneLadder > 0, `${WAVE}: NOT FOUND — ${LANE_PATH_FUNCTION} makes no settleStoryCycle( call; there is no lane ladder to judge`);
      assert.ok(lane.found.laneBaseline > 0, `${WAVE}: NOT FOUND — ${LANE_PATH_FUNCTION} makes no measureGradeBaseline( call`);
      assert.ok(lane.found.keyedGets > 0 && lane.found.keyedSets > 0, `${WAVE}: NOT FOUND — no gradeBaselines.get( / .set( keyed by baseCommit; the baseline map is absent`);
      assert.deepEqual(lane.problems, [], `a lane's grade is taken in the lane:\n${lane.problems.join("\n")}`);

      // `readGradeBaseline` answers a `{ baseCommit }` selector — behaviourally, through the leaf.
      const { readGradeBaseline } = await import("../../../src/loop/cycle.mjs");
      const runs = [
        { runId: "r1", itemRef: "07/01", createdAt: "2026-09-14T10:00:00.000Z", brief: { gradeBaseline: { measuredAt: "2026-09-14T10:00:00.000Z", priorDrives: 0, failures: ["alpha"], baseCommit: "a".repeat(40) } } },
        { runId: "r2", itemRef: "07/03", createdAt: "2026-09-14T11:00:00.000Z", brief: { gradeBaseline: { measuredAt: "2026-09-14T11:00:00.000Z", priorDrives: 0, failures: ["beta"], baseCommit: "b".repeat(40) } } },
      ];
      assert.equal(readGradeBaseline(runs, { baseCommit: "a".repeat(40) })?.runId, "r1", "the sha selector answers the run measured at that base, across stories");
      assert.deepEqual(readGradeBaseline(runs, { baseCommit: "a".repeat(40) })?.failures, ["alpha"]);
      assert.equal(readGradeBaseline(runs, { baseCommit: "c".repeat(40) }), null, "an unmeasured base answers null");
      assert.equal(readGradeBaseline(runs, "07/03")?.runId, "r2", "the ref selector still answers by ref");
    },
  },
  {
    name: "arch/129/05 FF-12905 fixture leg: with a fake work:grade recording its workspace, both lane grades report their lane paths and the baseline ran once — never over the primary",
    run: async () => {
      const wave = await driveTwoMemberWaveWithFakeGrade();
      assert.equal(wave.state.state, "done", "the wave ran to the build phase's end");
      assert.equal(wave.childCalls.length, 2, "two spawnLaneDrive calls, one per member, and no real child process");
      // FOUND before CLAIMED.
      assert.ok(wave.graded.length >= 2, `NOT FOUND — the fake work:grade was invoked ${wave.graded.length} time(s); the wave graded nothing this leg can judge`);
      // A grade TAKEN (`run: true`) is the baseline (no claim) or a lane grade (a claim); a read of
      // the RECORDED grade (no `run`) is the VERIFY phase's gate over the merged primary, which
      // re-grades nothing (129/ADR-003 §4) and is not this leg's subject.
      const taken = wave.graded.filter((call) => call.run);
      const baselines = taken.filter((call) => call.claimRun == null);
      const laneGrades = taken.filter((call) => call.claimRun != null);
      assert.equal(baselines.length, 1, `the baseline (a work:grade with no claimRun) ran exactly once for the wave's one base — ${baselines.length} ran`);
      assert.equal(laneGrades.length, 2, `one lane grade per member — ${laneGrades.length} ran`);
      const lanes = new Set(wave.members.map((ref) => path.resolve(wave.lanePath(ref))));
      for (const call of taken) {
        assert.notEqual(path.resolve(call.projectRoot), path.resolve(wave.primaryRoot), `${call.ref}${call.claimRun ? ` (run ${call.claimRun})` : " (baseline)"}: work:grade was asked with projectRoot ${call.projectRoot} — the primary's root; a lane's grade is taken in the lane (129/ADR-003 §2)`);
        assert.ok(lanes.has(path.resolve(call.projectRoot)), `${call.ref}: projectRoot ${call.projectRoot} is one of the two lanes`);
      }
      for (const ref of wave.members) {
        const own = laneGrades.find((call) => call.ref === ref);
        assert.ok(own != null, `${ref}: graded`);
        assert.equal(path.resolve(own.projectRoot), path.resolve(wave.lanePath(ref)), `${ref}: its grade names ITS lane, not its sibling's`);
      }
    },
  },
  {
    name: "arch/129/05 FF-12905 self-check: each planted defect is caught by the structural detector the real tree is measured by",
    run: async () => {
      const cycle = stripComments(await readFile(path.join(repoRoot, CYCLE), "utf8"));
      const wave = stripComments(await readFile(path.join(repoRoot, WAVE), "utf8"));

      // The probe: the loop's own ctx handed to settleStoryCycle.
      const probed = wave.replace(/settleStoryCycle\(phaseRun, bookkeeping, laneCtx, \{/u, "settleStoryCycle(phaseRun, bookkeeping, ctx, {");
      assert.notEqual(probed, wave, "the plant applied");
      const probedProblems = waveGradeScopeProblems(probed).problems;
      assert.ok(probedProblems.some((problem) => problem.includes(WAVE) && problem.includes("settleStoryCycle")), `the loop's ctx on the lane ladder is named:\n${probedProblems.join("\n")}`);
      // The primary's path as the sampler's.
      const primaryPath = wave.replace(/worktreePath: open\.worktree,/u, "worktreePath: ctx.workspace.projectRoot,");
      assert.ok(waveGradeScopeProblems(primaryPath).problems.some((problem) => problem.includes("worktreePath") || problem.includes("projectRoot")), "the primary's root as the sampler's path is named");
      // A cwd read.
      assert.ok(waveGradeScopeProblems(`${wave}\nexport const plant = () => process.cwd();\n`).problems.some((problem) => problem.includes("process.cwd()")), "process.cwd() in the wave is named");
      assert.ok(cycleGradeScopeProblems(`${cycle}\nexport const plant = () => process.cwd();\n`).problems.some((problem) => problem.includes("process.cwd()")), "process.cwd() in the ladder is named");
      // The baseline map keyed by ref.
      const byRef = wave.replace(/gradeBaselines\.get\(baseCommit\)/u, "gradeBaselines.get(ref)");
      assert.ok(waveGradeScopeProblems(byRef).problems.some((problem) => problem.includes("gradeBaselines.get(") && problem.includes("baseCommit")), "a map keyed by ref is named");
      // A grade in a ctx the ladder built.
      const built = cycle.replace(/invokeRegistered\("work:grade", \{ ref, run: true \}, ctx\)/u, 'invokeRegistered("work:grade", { ref, run: true }, { ...ctx, workspace: loaded })');
      assert.notEqual(built, cycle, "the plant applied");
      assert.ok(cycleGradeScopeProblems(built).problems.some((problem) => problem.includes("work:grade")), "a grade asked in a ctx the ladder assembled is named");
      // The lane path removed: NOT FOUND, never a green.
      const noLane = waveGradeScopeProblems(wave.replace(new RegExp(`function ${LANE_PATH_FUNCTION}\\(`, "u"), "function runElsewhere("));
      assert.ok(noLane.problems.some((problem) => problem.includes("NOT FOUND")), "with runLane renamed the leg is NOT FOUND");
      assert.equal(waveGradeScopeProblems(wave.replace(/settleStoryCycle\(/gu, "settleElsewhere(")).found.laneLadder, 0, "with the lane ladder call gone there is nothing to find");
      assert.equal(cycleGradeScopeProblems(cycle.replace(GATE_CALL_RE, 'invokeRegistered("work:list"')).found.gateCalls, 0, "with the gate calls gone there is nothing to find");
      assert.deepEqual(waveGradeScopeProblems(wave).problems, [], "the shipped wave is clean");
      assert.deepEqual(cycleGradeScopeProblems(cycle).problems, [], "the shipped ladder is clean");
    },
  },
];
