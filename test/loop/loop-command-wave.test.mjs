// Traceability wiring for milestone 129 / story 04 — THE WAVE TICK.
//
// Every @executable scenario (and every Examples row) of
//   tasks/00_the-ladder-is-extracted.feature        — the ladder in `src/loop/cycle.mjs`
//   tasks/02_a-lane-runs-its-story.feature           — open → mint → child → settle → ladder → commit → merge → cleanup
//   tasks/03_the-baseline-is-per-base-commit.feature — one baseline per base, measured in the first lane
//   tasks/04_the-wave-run-carries-the-liveness.feature — the milestone-level wave run and its heartbeat
//   tasks/05_held-members-dispatch-after-the-merge.feature — decideWave → work:dispatch, the bound, capacity
//
// Driven over a REAL git repo (`test/support/loop/lane-fixture.mjs`): real worktrees, the real
// run store, the real transition seam, the real `work:next` / `work:dispatch` / `work:validate` /
// `work:doctor` — only the CHILD (`ctx.spawnLaneDrive`) and the rubric runner (`ctx.spawnRubric`)
// are doubles, exactly the two seams ADR-005 §6 and 54/03 name. A scripted registry records the
// workspace each rung was asked in, which is the ADR-003 §2 claim made observable.
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";

import { runLoopBody, admittedDoctorFindings } from "../../src/commands/loop.mjs";
import { readGradeBaseline, settleStoryCycle } from "../../src/loop/cycle.mjs";
import { decideSupervisedDeclarations, LOOP_STOPS } from "../../src/work/loop.mjs";
import { completeRun, isRunning, isStale, readRuns, retryReadiness, startRun, heartbeat } from "../../src/run-store.mjs";
import { resolveItemExact } from "../../src/commands/resolve.mjs";
import { resolveRefInWorktree } from "../../src/work/dispatch.mjs";
import { meshDispatchWorktreePath } from "../../src/mesh/worktree.mjs";
import {
  withLaneRepo, fakeLaneChild, stubRubric, emits, passingTap, failingTap, collector, fakeTimers, fakeSignals,
  primaryDriver, verifyCompleter, laneCtx, statusOf, git, headSha, deferred, scriptedRegistry, laneStoryFile, replaceStatus,
} from "../support/loop/lane-fixture.mjs";

const TOP_KEYS = Object.freeze(["scope", "level", "cap", "loopRunId", "state", "next", "act", "stops", "resumable", "driven"]);
const LOOP_KEYS = Object.freeze(["loopRunId", "scope", "level", "cap", "phase", "cycle", "startedAt", "id", "supervised"]);
const NOW = "2026-09-14T12:00:00.000Z";
// A grade record as `compileGrade` writes one — the provenance stamp is what the store's writer
// demands of every claim a brief carries.
const PROVENANCE = Object.freeze({ node: "fixture", run: null, commit: null, at: NOW });
const grade = (verdict, { codes = [], total = 2, failed = 0, failures = [] } = {}) => ({ verdict, codes, cases: { total, failed, skipped: 0 }, failures, gradedAt: NOW, provenance: { ...PROVENANCE } });
// A settled continue drive over the fixture's story: minted, then completed done.
async function settledDrive(fx, ref = "07/01") {
  const item = await resolveItemExact({ workspace: fx.workspace }, ref);
  const minted = await startRun(item, { brief: { loop: {} }, now: NOW });
  const record = await completeRun(item, { runId: minted.runId, outcome: "done", now: NOW });
  return { item, record };
}

/** One refine_first loop over the fixture's `07`, every seam injected; answers the state and the seams. */
async function runWave(fx, { child, rubric, registry, report = collector(), timers = fakeTimers(), signals = fakeSignals(), input = {}, now = NOW, extra = {}, driver } = {}) {
  const drive = driver ?? primaryDriver(fx, { onCommand: verifyCompleter(fx) });
  const ctx = laneCtx(fx, { child, rubric, registry, report, driver: drive, timers, signals, now, extra });
  const state = await runLoopBody({ scope: fx.milestone, ...input }, ctx);
  return { state, report, ctx, driver: drive, timers, signals };
}

// The gate ladder the shell keeps, composed over the scripted registry for the direct tests.
const ladderOf = (registry) => async (ref, rounds, input, c, claims, narrate = () => {}) => {
  const validate = await registry("work:validate", { scope: ref }, c);
  const validateFindings = Array.isArray(validate?.findings) ? validate.findings : [];
  await narrate(`Gate work:validate ${ref} — ${validateFindings.length} finding(s).`);
  if (validateFindings.length > 0) return { gate: "work:validate", findings: validateFindings };
  const doctor = await registry("work:doctor", { scope: ref }, c);
  const admitted = admittedDoctorFindings(doctor?.findings);
  await narrate(`Gate work:doctor ${ref} — ${admitted.length} admitted finding(s).`);
  return { gate: "work:doctor", findings: admitted };
};
const laneRows = (state, ref) => state.driven.filter((row) => row.ref === ref && row.phase === "continue");
const waveRows = (state) => state.driven.filter((row) => row.wave != null);
const laneRunsOf = async (fx, ref) => await readRuns(await resolveItemExact({ workspace: fx.workspace }, ref));

export const loopCommandWaveTests = [
  // ── task 00 · the ladder is extracted ────────────────────────────────────────────────
  {
    name: "129/04 task00 settleStoryCycle is the one home of the ladder — the shell reaches work:grade and the sampler only through it",
    run: async () => {
      const cycle = await import("../../src/loop/cycle.mjs");
      assert.equal(typeof cycle.settleStoryCycle, "function");
      const shell = await readFile(new URL("../../src/commands/loop.mjs", import.meta.url), "utf8");
      assert.equal(shell.includes('invokeRegistered("work:grade", { ref: act.ref, run: true'), false, "no rubric run of its own");
      assert.equal(/recordBuildProgress\(/u.test(shell), false, "no sampler call of its own");
      assert.match(shell, /settleStoryCycle\(phaseRun, bookkeeping, ctx, \{/u, "…both reached through settleStoryCycle");
      assert.match(shell, /measureGradeBaseline\(act\.ref, ctx/u, "the sequential baseline is measured through the ladder's one measurer");
    },
  },
  {
    name: "129/04 task00 the ladder grades in the workspace it is handed, and the sampler and the change reader see the same path",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const { item, record } = await settledDrive(fx);
        const asked = [];
        const registry = scriptedRegistry({
          grade: async (input, ctx) => { asked.push(["work:grade", ctx.workspace.projectRoot]); return { configured: true, grade: grade("pass", { total: 1 }) }; },
          validate: async (input, ctx) => { asked.push(["work:validate", ctx.workspace.projectRoot]); return { findings: [] }; },
          doctor: async (input, ctx) => { asked.push(["work:doctor", ctx.workspace.projectRoot]); return { findings: [] }; },
        });
        const laneRoot = "C:/lanes/dispatch-127-02";
        const sampled = [];
        const changeAsked = [];
        const ctx = {
          workspace: { ...fx.workspace, projectRoot: laneRoot },
          invokeRegistered: registry,
          sampleWorktreeProgress: async (input) => { sampled.push(input); return { at: NOW, runId: input.runId, filesTouched: [], linesChanged: 0, commitsMade: 0, failingScenarios: input.failingScenarios }; },
          readChangeUnderReview: async (cwd) => { changeAsked.push(cwd); return ""; },
        };
        const bookkeeping = { pendingFixes: new Map(), pendingGrades: new Map(), progressStates: new Map(), reviewRounds: new Map(), reviewBlockerCounts: new Map(), cycles: new Map(), driven: [] };
        const phaseRun = { item, record, outcome: { outcome: "done" }, cycle: 1, phase: "continue", changeBaseline: null, progressBaseCommit: null, gradeAbsent: null };
        const invokeReviewGate = ladderOf(registry);
        const answer = await settleStoryCycle(phaseRun, bookkeeping, ctx, {
          crossToVerify: false, narrate: () => {}, now: NOW, resolved: { scope: "07", level: "L2", cap: 3, l3Gate: null }, loopRunId: "lr", startedAt: NOW,
          next: { state: "ready", ref: "07/01", type: "story" }, facts: { tasks: { tasks: [{ counts: { uat: 0 } }] } },
          invokeReviewGate, haltDecision: (stop, ref, producer) => ({ act: "halt", stop, ref, producer }), requireDecision: (d) => d,
          bounds: { reviewCap: 1, progressBound: 2, progressResetBound: 2 }, declarationFor: () => ({}),
        });
        assert.equal(answer.next, "verify");
        assert.deepEqual([...new Set(asked.map(([, root]) => root))], [laneRoot], "every rung recorded the lane workspace");
        assert.deepEqual(asked.map(([id]) => id), ["work:grade", "work:validate", "work:doctor"], "grade first, then the ladder in rung order");
        assert.equal(sampled[0].worktreePath, laneRoot, "the sampler received the lane path");
        assert.deepEqual(changeAsked, [], "a clean ladder never asks for the change under review");
      });
    },
  },
  {
    name: "129/04 task00 [outline] the ladder's answer is decided by its rungs in rung order, whichever workspace it grades in (11 rows)",
    run: async () => {
      const rows = [
        { cycle: 1, grade: "pass", validate: 0, doctor: "none", next: "verify", findings: undefined, halt: null },
        { cycle: 1, grade: "unconfigured", validate: 0, doctor: "none", next: "verify", findings: undefined, halt: null },
        { cycle: 1, grade: "pass", validate: 2, doctor: "not-asked", next: "continue", findings: "validate", halt: null },
        { cycle: 1, grade: "pass", validate: 0, doctor: "error", next: "continue", findings: "doctor", halt: null },
        { cycle: 1, grade: "pass", validate: 0, doctor: "warn", next: "verify", findings: undefined, halt: null },
        { cycle: 1, grade: "fail", validate: "not-asked", doctor: "not-asked", next: "continue", findings: "grade-continuation", halt: null },
        { cycle: 1, grade: "fail-sampler-faulted", validate: 1, doctor: "not-asked", next: "continue", findings: "validate-then-grade", halt: null },
        { cycle: 1, grade: "fail-empty", validate: 0, doctor: "none", next: "continue", findings: "empty", halt: null },
        { cycle: 1, grade: "report-missing", validate: 0, doctor: "none", next: "halt", findings: undefined, halt: ["grade-indeterminate", "work:grade:report-missing"] },
        { cycle: 1, grade: "throws", validate: 0, doctor: "none", next: "halt", findings: undefined, halt: ["grade-indeterminate", "work:grade", "unavailable"] },
        { cycle: 3, grade: "pass", validate: 2, doctor: "not-asked", next: "halt", findings: undefined, halt: ["cap-exhausted", "engine:cycle>=cap"] },
      ];
      await withLaneRepo(async (fx) => {
        for (const row of rows) {
          const { item, record } = await settledDrive(fx);
          const gradeAnswer = () => {
            if (row.grade === "throws") throw Object.assign(new Error("EPERM"), { code: "EPERM" });
            if (row.grade === "unconfigured") return { configured: true, grade: grade("indeterminate", { codes: ["rubric-unconfigured"], total: 0 }) };
            if (row.grade === "report-missing") return { configured: true, grade: grade("indeterminate", { codes: ["report-missing"], total: 0 }) };
            if (row.grade === "fail-empty") return { configured: true, grade: grade("fail", { codes: ["case-failed"], failed: 0 }) };
            if (row.grade.startsWith("fail")) return { configured: true, grade: grade("fail", { codes: ["case-failed"], failed: 1, failures: [{ case: "own-red", message: "own-red failed", scenario: "s" }] }) };
            return { configured: true, grade: grade("pass") };
          };
          const calls = [];
          const registry = scriptedRegistry({
            grade: async (input) => { calls.push(["work:grade", input]); return gradeAnswer(); },
            validate: async () => { calls.push(["work:validate"]); return { findings: Array.from({ length: row.validate === "not-asked" ? 0 : row.validate }, (_, i) => ({ code: `v-${i}`, path: "x" })) }; },
            doctor: async () => { calls.push(["work:doctor"]); return { findings: row.doctor === "error" ? [{ code: "control-unresolved", severity: "error" }] : row.doctor === "warn" ? [{ code: "control-unresolved", severity: "warn" }] : [] }; },
          });
          const sampler = row.grade === "fail-sampler-faulted"
            ? async () => { throw new Error("sampler faulted"); }
            : async (input) => ({ at: NOW, runId: input.runId, filesTouched: [], linesChanged: 0, commitsMade: 0, failingScenarios: input.failingScenarios });
          const ctx = { workspace: fx.workspace, invokeRegistered: registry, sampleWorktreeProgress: sampler, readChangeUnderReview: async () => "" };
          const bookkeeping = { pendingFixes: new Map(), pendingGrades: new Map(), progressStates: new Map(), reviewRounds: new Map(), reviewBlockerCounts: new Map(), cycles: new Map(), driven: [] };
          const phaseRun = { item, record, outcome: { outcome: "done" }, cycle: row.cycle, phase: "continue", changeBaseline: null, progressBaseCommit: null, gradeAbsent: null };
          const invokeReviewGate = ladderOf(registry);
          const answer = await settleStoryCycle(phaseRun, bookkeeping, ctx, {
            crossToVerify: false, narrate: () => {}, now: NOW, resolved: { scope: "07", level: "L2", cap: 3, l3Gate: null }, loopRunId: "lr", startedAt: NOW,
            next: { state: "ready", ref: "07/01", type: "story" }, facts: { tasks: { tasks: [{ counts: { uat: 0 } }] } },
            invokeReviewGate, haltDecision: (stop, ref, producer) => ({ act: "halt", stop, ref, producer }), requireDecision: (d) => d,
            bounds: { reviewCap: 9, progressBound: 2, progressResetBound: 2 }, declarationFor: () => ({}),
          });
          const label = `grade=${row.grade} validate=${row.validate} doctor=${row.doctor} cycle=${row.cycle}`;
          const gradeCalls = calls.filter(([id]) => id === "work:grade");
          assert.equal(gradeCalls.length, 1, `${label}: work:grade invoked exactly once`);
          assert.equal(gradeCalls[0][1].run, true, `${label}: …with run: true`);
          assert.equal(gradeCalls[0][1].claimRun, record.runId, `${label}: …claiming the drive's run`);
          assert.equal(calls[0][0], "work:grade", `${label}: …before any other rung`);
          assert.equal(answer.next, row.next, `${label}: next`);
          if (row.validate === "not-asked") assert.equal(calls.some(([id]) => id === "work:validate"), false, `${label}: validate not asked`);
          if (row.doctor === "not-asked") assert.equal(calls.some(([id]) => id === "work:doctor"), false, `${label}: doctor not asked`);
          const fix = bookkeeping.pendingFixes.get("07/01");
          if (row.findings === undefined) assert.equal(fix, undefined, `${label}: no pending fix`);
          if (row.findings === "validate") assert.deepEqual(fix.findings.map((f) => f.code), ["v-0", "v-1"], `${label}: the validate findings verbatim`);
          if (row.findings === "doctor") assert.deepEqual(fix.findings.map((f) => f.code), ["control-unresolved"], `${label}: the doctor finding`);
          if (row.findings === "grade-continuation") {
            assert.deepEqual(fix.findings, [{ gate: "work:grade", code: "case-failed", case: "own-red", message: "own-red failed", scenario: "s" }], `${label}: the grade entry`);
            assert.equal(fix.progressContinuation, true, `${label}: a progress continuation`);
          }
          if (row.findings === "validate-then-grade") {
            assert.deepEqual(fix.findings.map((f) => f.gate), ["work:validate", "work:grade"], `${label}: validate then the grade entry`);
            assert.equal(fix.progressContinuation, false, `${label}: progressContinuation absent`);
          }
          if (row.findings === "empty") assert.deepEqual(fix.findings, [], `${label}: an empty list still re-drives`);
          if (row.halt == null) assert.equal(answer.halt, undefined, `${label}: no halt`);
          else {
            assert.equal(answer.halt.act.stop, row.halt[0], `${label}: stop`);
            assert.equal(answer.halt.act.producer, row.halt[1], `${label}: producer`);
            if (row.halt[2] === "unavailable") assert.match(answer.halt.details.unavailable, /EPERM/u, `${label}: detail unavailable`);
          }
        }
      });
    },
  },
  {
    name: "129/04 task00 crossToVerify false stops at the gate; true drives verify as today",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const { item, record } = await settledDrive(fx);
        const registry = scriptedRegistry({
          grade: async () => ({ configured: true, grade: grade("pass", { total: 1 }) }),
          validate: async () => ({ findings: [] }),
          doctor: async () => ({ findings: [] }),
        });
        const lines = [];
        const driver = primaryDriver(fx);
        const ctx = { workspace: fx.workspace, invokeRegistered: registry, agentSessionDriverOptions: driver.options, sampleWorktreeProgress: async (i) => ({ at: NOW, runId: i.runId, filesTouched: [], linesChanged: 0, commitsMade: 0, failingScenarios: i.failingScenarios }) };
        const bookkeeping = { pendingFixes: new Map(), pendingGrades: new Map(), progressStates: new Map(), reviewRounds: new Map(), reviewBlockerCounts: new Map(), cycles: new Map(), driven: [] };
        const phaseRun = { item, record, outcome: { outcome: "done" }, cycle: 1, phase: "continue", changeBaseline: null, progressBaseCommit: null, gradeAbsent: null };
        const invokeReviewGate = ladderOf(registry);
        const options = (crossToVerify) => ({
          crossToVerify, narrate: (line) => lines.push(line), report: () => { throw new Error("report must not be printed by the ladder"); }, now: NOW,
          resolved: { scope: "07", level: "L2", cap: 3, l3Gate: null }, loopRunId: "lr", startedAt: NOW,
          next: { state: "ready", ref: "07/01", type: "story" }, facts: { tasks: { tasks: [{ counts: { uat: 0 } }] } },
          invokeReviewGate, haltDecision: (stop, ref, producer) => ({ act: "halt", stop, ref, producer }), requireDecision: (d) => d,
          bounds: { reviewCap: 1, progressBound: 2, progressResetBound: 2 },
          declarationFor: ({ phase, cycle }) => ({ loopRunId: "lr", scope: "07", level: "L2", cap: 3, phase, cycle, startedAt: NOW, id: "loop:autonomous-cascade", supervised: false }),
        });
        const stopped = await settleStoryCycle(phaseRun, bookkeeping, ctx, options(false));
        assert.equal(stopped.next, "verify");
        assert.equal(stopped.verified, undefined, "no verify drive was made");
        assert.equal(bookkeeping.cycles.get("07/01\0verify"), undefined, "the verify cycle is unchanged");
        assert.equal(stopped.gradeRecord.verdict, "pass", "the grade record the caller must put on the verify run's brief");
        assert.deepEqual(lines.filter((line) => line.startsWith("Gate ")).map((line) => line.split(" ")[1]), ["work:validate", "work:doctor", "work:grade"], "the three Gate lines, through narrate only");
        assert.equal(driver.spawnCalls.length, 0);

        lines.length = 0;
        const crossed = await settleStoryCycle(phaseRun, bookkeeping, ctx, options(true));
        assert.equal(crossed.next, "verify");
        assert.ok(crossed.verified, "the verify drive was made");
        assert.equal(driver.directives()[0], "/aof:verify 07/01");
        assert.ok(lines.includes("Driving 07/01 — verify, cycle 1 of 3, L2."));
        assert.equal(bookkeeping.cycles.get("07/01\0verify"), 1);
      });
    },
  },
  {
    name: "129/04 task00 [outline] the bookkeeping maps are written by the ladder exactly as the shell wrote them (4 rows)",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const rows = [
          { branch: "clean", pendingGrade: false, round: undefined, resets: 0, attemptRunIsDrive: true, summaryNull: true },
          { branch: "validate", pendingGrade: true, round: 1, resets: 0, attemptRunIsDrive: true, summaryNull: true },
          { branch: "grade-fail", pendingGrade: true, round: undefined, resets: 0, attemptRunIsDrive: true, summaryNull: true },
          { branch: "reset", pendingGrade: true, round: undefined, resets: 1, attemptRunIsDrive: false, summaryNull: false },
        ];
        for (const row of rows) {
          const { item, record } = await settledDrive(fx);
          const failing = row.branch === "grade-fail" || row.branch === "reset";
          const registry = scriptedRegistry({
            grade: async () => ({ configured: true, grade: failing
              ? grade("fail", { codes: ["case-failed"], failed: 1, failures: [{ case: "own-red", message: "m", scenario: "s" }] })
              : grade("pass") }),
            validate: async () => ({ findings: row.branch === "validate" ? [{ code: "v", path: "x" }] : [] }),
            doctor: async () => ({ findings: [] }),
          });
          // A stall the sampler reports as no progress twice over is what makes the policy `reset`.
          const stalled = { at: NOW, runId: record.runId, filesTouched: [], linesChanged: 0, commitsMade: 0, failingScenarios: 1 };
          const samples = row.branch === "reset" ? [stalled, stalled, stalled] : [];
          const ctx = {
            workspace: fx.workspace, invokeRegistered: registry,
            sampleWorktreeProgress: async (i) => ({ ...stalled, failingScenarios: i.failingScenarios }),
            readChangeUnderReview: async () => "",
          };
          if (row.branch === "reset") {
            const { appendProgressSample } = await import("../../src/loop-progress.mjs");
            for (const sample of samples.slice(0, 2)) await appendProgressSample(item, record, sample);
          }
          const bookkeeping = { pendingFixes: new Map(), pendingGrades: new Map(), progressStates: new Map(), reviewRounds: new Map(), reviewBlockerCounts: new Map(), cycles: new Map(), driven: [] };
          const phaseRun = { item, record, outcome: { outcome: "done" }, cycle: 1, phase: "continue", changeBaseline: null, progressBaseCommit: null, gradeAbsent: null };
          const invokeReviewGate = ladderOf(registry);
          await settleStoryCycle(phaseRun, bookkeeping, ctx, {
            crossToVerify: false, narrate: () => {}, now: NOW, resolved: { scope: "07", level: "L2", cap: 3, l3Gate: null }, loopRunId: "lr", startedAt: NOW,
            next: { state: "ready", ref: "07/01", type: "story" }, facts: { tasks: { tasks: [{ counts: { uat: 0 } }] } },
            invokeReviewGate, haltDecision: (stop, ref, producer) => ({ act: "halt", stop, ref, producer }), requireDecision: (d) => d,
            bounds: { reviewCap: 9, progressBound: 2, progressResetBound: 2 }, declarationFor: () => ({}),
          });
          const label = row.branch;
          assert.equal(bookkeeping.pendingGrades.get("07/01") != null, row.pendingGrade, `${label}: pendingGrades`);
          assert.equal(bookkeeping.reviewRounds.get("07/01"), row.round, `${label}: reviewRounds`);
          const progress = bookkeeping.progressStates.get("07/01");
          assert.equal(progress.resets, row.resets, `${label}: resets`);
          assert.equal(progress.attemptRun?.runId === record.runId, row.attemptRunIsDrive, `${label}: attemptRun`);
          assert.equal(progress.summary == null, row.summaryNull, `${label}: summary`);
        }
      });
    },
  },
  {
    name: "129/04 task00 narration rides the parameter — cycle.mjs and wave.mjs own no printer, and the needle scan finds the Gate lines at the narrate seam",
    run: async () => {
      for (const rel of ["../../src/loop/cycle.mjs", "../../src/loop/wave.mjs"]) {
        const text = await readFile(new URL(rel, import.meta.url), "utf8");
        assert.doesNotMatch(text, /console\.(?:log|error)\(|process\.stdout\.write\(/u, `${rel} prints through no printer of its own`);
      }
      const control = await readFile(new URL("../arch/loop/acd-loop-narrates-in-flight.test.mjs", import.meta.url), "utf8");
      assert.match(control, /src\/loop\/cycle\.mjs/u, "the needle scan is extended over the family");
      for (const needle of ["Gate work:validate", "Gate work:doctor", "Gate work:grade"]) assert.ok(control.includes(needle), `${needle} is a needle`);
    },
  },
  {
    name: "129/04 task00 sequential mode is byte-identical — LoopState keeps its ten keys and a sequential driven row its six",
    run: async () => {
      // The standing loop suites are the proof (every one green with no assertion changed); the
      // two shapes are pinned here as well so the extraction cannot widen either.
      await withLaneRepo(async (fx) => {
        const report = collector();
        const driver = primaryDriver(fx, { onCommand: verifyCompleter(fx) });
        const registry = scriptedRegistry({ grade: async () => ({ configured: false, grade: null, recorded: null }) });
        const ctx = laneCtx(fx, { driver, report, registry, extra: { readChangeUnderReview: async () => "" } });
        const state = await runLoopBody({ scope: "07" }, ctx);
        assert.deepEqual(Object.keys(state), [...TOP_KEYS]);
        const continueRow = state.driven.find((row) => row.phase === "continue" && row.ref !== "07");
        assert.ok(continueRow, "guard: a story was driven continue");
        assert.deepEqual(Object.keys(continueRow), ["ref", "phase", "runId", "outcome", "attempt", "cycle"], "a sequential row: no lane, baseCommit or merge key");
      }, { rubric: false, config: { loop: { concurrency: "sequential" } } });
    },
  },
  {
    name: "129/04 task00 the shell is measured smaller",
    run: async () => {
      const shell = await readFile(new URL("../../src/commands/loop.mjs", import.meta.url), "utf8");
      const lines = shell.split(/\r?\n/u).length;
      assert.ok(lines < 2311, `src/commands/loop.mjs is ${lines} lines, below the 2311 it was before 129/04`);
    },
  },

  // ── task 02 · a lane runs its story ─────────────────────────────────────────────────
  {
    name: "129/04 task02 the lane's item is resolved and minted in the lane, never in the primary; the primary holds no record until the merge",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const seenBeforeMerge = new Map();
        const child = fakeLaneChild(fx, {
          onSpawn: async (input) => {
            const primaryItem = await resolveItemExact({ workspace: fx.workspace }, input.ref);
            const laneItem = await resolveRefInWorktree(fx.root, fx.workDir, input.lane, input.ref);
            seenBeforeMerge.set(input.ref, { primary: await readRuns(primaryItem), lane: await readRuns(laneItem) });
          },
        });
        const base = await headSha(fx.root);
        const { state } = await runWave(fx, { child, rubric: stubRubric(emits(passingTap())) });
        assert.equal(state.state, "done");
        for (const ref of ["07/01", "07/03"]) {
          const before = seenBeforeMerge.get(ref);
          assert.equal(before.primary.length, 0, `${ref}: the primary's story dir holds NO run record until the merge`);
          assert.equal(before.lane.length, 1, `${ref}: the lane holds one run record`);
          const laneRecord = before.lane[0];
          assert.equal(laneRecord.brief.lane.branch, `aof/mesh/${ref.replace("/", "-")}`);
          assert.equal(path.resolve(laneRecord.brief.lane.worktree), path.resolve(meshDispatchWorktreePath(fx.root, ref)));
          assert.ok(/^[0-9a-f]{40}$/u.test(laneRecord.brief.lane.baseCommit), "the lane's base is a sha");
          assert.deepEqual(Object.keys(laneRecord.brief.loop), [...LOOP_KEYS]);
          assert.equal(laneRecord.brief.loop.phase, "continue");
          assert.equal(laneRecord.brief.loop.cycle, 1);
          assert.equal(laneRecord.brief.loop.loopRunId, state.loopRunId);
          const merged = await laneRunsOf(fx, ref);
          const home = merged.find((run) => run.runId === laneRecord.runId);
          assert.ok(home, `${ref}: after the merge the primary holds the run the lane minted`);
          assert.equal(home.state, "done");
        }
        assert.notEqual(await headSha(fx.root), base, "the primary moved by the merges");
      });
    },
  },
  {
    name: "129/04 task02 the primary's story docs are untouched while the lane is open",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const gate = deferred();
        let inspected = null;
        const child = fakeLaneChild(fx, {
          pause: { "07/01": gate.promise },
          onSpawn: async (input) => {
            if (input.ref !== "07/01") return;
            // Inspect AFTER the child's own status move — the pause holds it there.
            setTimeout(async () => {
              const laneFile = await laneStoryFile(fx, input.lane, "07/01");
              inspected = {
                primary: await statusOf(path.join(fx.storyDir("07/01"), "STORY.md")),
                lane: await statusOf(laneFile),
                porcelain: (await git(["status", "--porcelain"], fx.root)).stdout,
              };
              gate.resolve();
            }, 50);
          },
        });
        const { state } = await runWave(fx, { child, rubric: stubRubric(emits(passingTap())) });
        assert.equal(state.state, "done");
        assert.equal(inspected.primary, "not-started", "the primary's STORY.md still says not-started");
        assert.equal(inspected.lane, "in-review", "the lane's says in-review (the child moved it after the mint's in-progress)");
        assert.equal(inspected.porcelain.includes("stories/"), false, "git status in the primary names nothing under the stories");
      });
    },
  },
  {
    name: "129/04 task02 the child is spawned in the lane with the lent id, the parent deadline and the isolated home",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const child = fakeLaneChild(fx);
        const { state } = await runWave(fx, { child, rubric: stubRubric(emits(passingTap())) });
        assert.equal(state.state, "done");
        assert.equal(child.calls.length, 2);
        for (const call of child.calls) {
          assert.equal(call.phase, "continue");
          assert.equal(path.resolve(call.lane), path.resolve(meshDispatchWorktreePath(fx.root, call.ref)));
          const laneRow = state.driven.find((row) => row.ref === call.ref && row.phase === "continue");
          assert.equal(call.runId, laneRow.runId, "the lent id is the lane's record");
          assert.equal(call.fixFile, undefined, "no fix on a first drive");
          assert.equal(call.deadlineMs, 1000 + 100, "startToCloseMs + startupGraceMs from the fixture config");
          assert.equal(call.env.AOF_GLOBAL_HOME, process.env.AOF_GLOBAL_HOME, "the child inherits the isolated home");
        }
      }, { config: { loop: { startToCloseMs: 1000, startupGraceMs: 100 } } });
    },
  },
  {
    name: "129/04 task02 the ladder runs in the lane workspace — every grade, validate and doctor recorded a lane path, never the primary's",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const rubric = stubRubric(emits(passingTap()));
        const registry = scriptedRegistry({
          validate: async (input, ctx, real) => await real(),
          doctor: async (input, ctx, real) => await real(),
        });
        const sampled = [];
        const { state } = await runWave(fx, {
          child: fakeLaneChild(fx), rubric, registry,
          extra: { sampleWorktreeProgress: async (i) => { sampled.push(i); return { at: NOW, runId: i.runId, filesTouched: [], linesChanged: 0, commitsMade: 0, failingScenarios: i.failingScenarios }; } },
        });
        assert.equal(state.state, "done");
        const laneRoots = new Set(["07/01", "07/03"].map((ref) => path.resolve(meshDispatchWorktreePath(fx.root, ref))));
        const complete = registry.calls.findIndex((call) => call.id === "work:next" && call.input?.throughReview !== true && registry.calls.slice(0, registry.calls.indexOf(call)).some((c) => c.id === "work:next" && c.input?.throughReview === true));
        const build = registry.calls.slice(0, complete).filter((call) => ["work:validate", "work:doctor", "work:grade"].includes(call.id));
        assert.ok(build.filter((c) => c.id === "work:validate").length >= 2 && build.filter((c) => c.id === "work:doctor").length >= 2, "guard: the lane rungs were asked");
        for (const call of build) assert.ok(laneRoots.has(path.resolve(call.projectRoot)), `${call.id} ran in a lane, not ${call.projectRoot}`);
        for (const call of rubric.calls) assert.ok(laneRoots.has(path.resolve(call.cwd)), "the rubric spawned in a lane");
        for (const sample of sampled) {
          assert.ok(laneRoots.has(path.resolve(sample.worktreePath)), "the sampler received the lane");
          assert.ok(/^[0-9a-f]{40}$/u.test(sample.baseCommit), "…and the lane's base");
        }
      });
    },
  },
  {
    name: "129/04 task02 the lane is committed and merged, and the row names it; the first lane fast-forwards and the state keeps ten keys",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const { state, report } = await runWave(fx, { child: fakeLaneChild(fx), rubric: stubRubric(emits(passingTap())) });
        assert.equal(state.state, "done");
        assert.deepEqual(Object.keys(state), [...TOP_KEYS]);
        const log = (await git(["log", "--format=%s", "main"], fx.root)).stdout;
        assert.match(log, /aof\(loop\): 07\/01 — lane commit/u);
        assert.match(log, /aof\(loop\): 07\/03 — lane commit/u);
        assert.equal((await git(["worktree", "list"], fx.root)).stdout.includes("dispatch-worktrees"), false, "the lane worktrees are gone");
        assert.equal((await git(["branch", "--list", "aof/mesh/*"], fx.root)).stdout.trim(), "", "…and the branches");
        const rows = state.driven.filter((row) => row.lane != null);
        assert.equal(rows.length, 2);
        const outcomes = [];
        for (const row of rows) {
          assert.deepEqual(Object.keys(row).slice(-3), ["lane", "baseCommit", "merge"]);
          assert.deepEqual(Object.keys(row.lane), ["worktree", "branch"]);
          assert.ok(/^[0-9a-f]{40}$/u.test(row.baseCommit));
          assert.deepEqual(Object.keys(row.merge), ["outcome", "commit"]);
          outcomes.push(row.merge.outcome);
        }
        // In MERGE order (the narration), not row order: a row is pushed when its drive settles.
        const merges = report.lines.filter((line) => / — merge: /u.test(line)).map((line) => / — merge: ([a-z-]+),/u.exec(line)[1]);
        assert.equal(merges[0], "fast-forwarded", `the first lane merged fast-forwards: ${merges.join(", ")}`);
        assert.ok(["merged", "fast-forwarded"].includes(merges[1]));
        assert.deepEqual([...outcomes].sort(), [...merges].sort(), "the rows carry the merge outcomes");
        for (const ref of ["07/01", "07/03"]) {
          const runs = await laneRunsOf(fx, ref);
          assert.ok(runs.some((run) => run.brief?.lane != null), `${ref}: the lane's run record came home`);
        }
      });
    },
  },
  {
    name: "129/04 task02 [outline] a child's non-document outcome settles the lane run as the vocabulary says (5 rows)",
    run: async () => {
      const rows = [
        { spawn: [{ outcome: "died", stderrTail: ["boom", "stack"] }, undefined], reason: "runtime_offline", state: "failed", retried: true, tail: ["boom", "stack"] },
        { spawn: [{ outcome: "timeout" }, undefined], reason: "timeout", state: "failed", retried: true, tail: [] },
        { spawn: [{ outcome: "aborted" }], reason: null, state: "cancelled", retried: false, tail: [] },
        { spawn: [{ outcome: "document", document: { outcome: "failed", failureReason: "session_limit" } }], reason: "session_limit", state: "failed", retried: false, stop: "retry-parked", tail: [] },
        { spawn: [{ outcome: "refused", document: { ok: false, code: "ref-not-found" } }], reason: "agent_error", state: "failed", retried: false, stop: "run-not-retryable", producer: "run-store:not-retryable", tail: ["ref-not-found"] },
      ];
      for (const row of rows) {
        await withLaneRepo(async (fx) => {
          const child = fakeLaneChild(fx, { answers: { "07/01": row.spawn } });
          const { state, report } = await runWave(fx, { child, rubric: stubRubric(emits(passingTap())) });
          const label = row.spawn[0].outcome;
          const runs = await readRuns(await resolveRefInWorktree(fx.root, fx.workDir, meshDispatchWorktreePath(fx.root, "07/01"), "07/01").then((item) => item ?? resolveItemExact({ workspace: fx.workspace }, "07/01")));
          const first = runs.find((run) => run.attempt === 1 && run.brief?.lane != null) ?? runs[0];
          assert.equal(first.state, row.state, `${label}: state`);
          assert.equal(first.failureReason, row.reason, `${label}: failureReason`);
          if (row.retried) {
            assert.ok(report.lines.includes(`Retrying 07/01 — continue, attempt 2 of 3 (${row.reason}).`), `${label}: retried in the same lane`);
            assert.equal(child.calls.filter((c) => c.ref === "07/01").length, 2, `${label}: two spawns`);
            assert.equal(child.calls[0].lane, child.calls.find((c, i) => i > 0 && c.ref === "07/01").lane, `${label}: the SAME lane worktree`);
          } else {
            assert.equal(child.calls.filter((c) => c.ref === "07/01").length, 1, `${label}: no retry`);
          }
          for (const line of row.tail) assert.ok(report.lines.some((printed) => printed.includes(line)), `${label}: narration carries ${line}`);
          if (row.stop != null) {
            assert.equal(state.act.stop, row.stop, `${label}: halt`);
            if (row.producer) assert.equal(state.act.producer, row.producer, `${label}: producer`);
            if (row.stop === "retry-parked") assert.match(report.lines.at(-1), /readyAt=/u, `${label}: readyAt in the account`);
          }
        }, { stories: [{ number: "01" }] });
      }
    },
  },
  {
    name: "129/04 task02 [outline] the lane sequence stops at the step that fails and names it (10 rows)",
    run: async () => {
      // OPEN — a dispatch entry answering ok:false
      await withLaneRepo(async (fx) => {
        const registry = scriptedRegistry({
          dispatch: async (input, ctx, real) => {
            if (!Array.isArray(input.refs) && input.ref == null) return await real();
            return { action: "dispatch", bound: 3, dispatched: (input.refs ?? [input.ref]).map((ref) => ({ ref, ok: false, error: Object.assign(new Error("worktree add exploded"), { code: "dispatch-lane-open-error" }) })), peak: 0, ranAtOnce: 0 };
          },
        });
        const { state, report } = await runWave(fx, { child: fakeLaneChild(fx), rubric: stubRubric(emits(passingTap())), registry });
        assert.equal(state.act.stop, "lane-open-failed");
        assert.equal(state.act.producer, "work:dispatch:dispatch-lane-open-error");
        assert.match(report.lines.at(-1), /worktree add exploded/u);
        assert.equal(existsSync(meshDispatchWorktreePath(fx.root, "07/01")), false, "no lane");
      });
      // OPEN — the reused lane refuses its advance
      await withLaneRepo(async (fx) => {
        const registry = scriptedRegistry({
          dispatch: async (input, ctx, real) => {
            const answer = await real();
            if (answer.action === "open" && answer.ref === "07/01") return { ...answer, advanced: { outcome: "refused", code: "lane-open-failed", cause: "assignment-gate-propagation-conflict" } };
            if (!Array.isArray(answer.dispatched)) return answer;
            return { ...answer, dispatched: answer.dispatched.map((entry) => entry.ref === "07/01" && entry.ok ? { ...entry, value: { ...entry.value, advanced: { outcome: "refused", code: "lane-open-failed", cause: "assignment-gate-propagation-conflict" } } } : entry) };
          },
        });
        const { state, report } = await runWave(fx, { child: fakeLaneChild(fx), rubric: stubRubric(emits(passingTap())), registry });
        assert.equal(state.act.stop, "lane-open-failed");
        assert.equal(state.act.producer, "work:dispatch:lane-open-failed");
        assert.match(report.lines.at(-1), /branch=aof\/mesh\/07-01/u);
        assert.match(report.lines.at(-1), /head=/u);
        assert.equal(existsSync(path.join(fx.root, ".git", "MERGE_HEAD")), false);
        const laneRuns = await readRuns(await resolveRefInWorktree(fx.root, fx.workDir, meshDispatchWorktreePath(fx.root, "07/01"), "07/01"));
        assert.equal(laneRuns.length, 0, "not minted");
      }, { stories: ["01"] });
      // DRIVE — needs-input
      await withLaneRepo(async (fx) => {
        const child = fakeLaneChild(fx, { answers: { "07/01": { outcome: "document", document: { outcome: "needs-input", sessionId: "s-1" } } } });
        const { state, report } = await runWave(fx, { child, rubric: stubRubric(emits(passingTap())) });
        assert.equal(state.act.stop, "session-needs-input");
        assert.equal(state.act.producer, "driver:needs-input");
        assert.match(report.lines.at(-1), /sessionId=s-1/u);
        const lane = meshDispatchWorktreePath(fx.root, "07/01");
        assert.ok(existsSync(lane), "the lane is kept");
        const runs = await readRuns(await resolveRefInWorktree(fx.root, fx.workDir, lane, "07/01"));
        assert.equal(runs[0].state, "running", "left running");
      }, { stories: ["01"] });
      // DRIVE — died on every attempt
      await withLaneRepo(async (fx) => {
        const child = fakeLaneChild(fx, { answers: { "07/01": { outcome: "died", stderrTail: [] } } });
        const { state } = await runWave(fx, { child, rubric: stubRubric(emits(passingTap())) });
        assert.equal(state.act.stop, "cap-exhausted");
        assert.equal(state.act.producer, "run-store:attempts-exhausted");
        const lane = meshDispatchWorktreePath(fx.root, "07/01");
        assert.ok(existsSync(lane), "the lane is kept");
        const runs = await readRuns(await resolveRefInWorktree(fx.root, fx.workDir, lane, "07/01"));
        assert.deepEqual(runs.map((run) => [run.state, run.failureReason]), [["failed", "runtime_offline"], ["failed", "runtime_offline"], ["failed", "runtime_offline"]]);
      }, { stories: ["01"] });
      // LADDER — indeterminate
      await withLaneRepo(async (fx) => {
        const rubric = stubRubric([emits(passingTap()), emits("", 0)]);
        const { state } = await runWave(fx, { child: fakeLaneChild(fx), rubric });
        assert.equal(state.act.stop, "grade-indeterminate");
        assert.equal(state.act.producer, "work:grade:report-missing");
        const lane = meshDispatchWorktreePath(fx.root, "07/01");
        assert.ok(existsSync(lane), "the lane is kept");
        const runs = await readRuns(await resolveRefInWorktree(fx.root, fx.workDir, lane, "07/01"));
        assert.equal(runs[0].state, "done");
      }, { stories: ["01"] });
      // COMMIT — clean lane → already-current, cleanup runs
      await withLaneRepo(async (fx) => {
        const child = fakeLaneChild(fx, { answers: { "07/01": async (input) => {
          // The child commits its own work in the lane, so the loop's commit finds a clean tree.
          const file = await laneStoryFile(fx, input.lane, "07/01");
          await replaceStatus(file, "in-review");
          await git(["add", "-A"], input.lane);
          await git(["commit", "-q", "-m", "child: done"], input.lane);
          return { outcome: "document", document: { outcome: "done", sessionId: "s-07/01", settlementContext: {} } };
        } } });
        const { state, report } = await runWave(fx, { child, rubric: stubRubric(emits(passingTap())) });
        assert.equal(state.state, "done");
        const row = state.driven.find((r) => r.ref === "07/01" && r.phase === "continue");
        assert.ok(["fast-forwarded", "merged"].includes(row.merge.outcome), "the child's commit still merges home");
        assert.ok(report.lines.some((line) => /Lane 07\/01 — commit: /u.test(line)));
        assert.equal(existsSync(meshDispatchWorktreePath(fx.root, "07/01")), false, "cleanup ran");
      }, { stories: ["01"] });
      // MERGE — refused on a dirty file the lane touched
      await withLaneRepo(async (fx) => {
        const child = fakeLaneChild(fx, { answers: { "07/01": async (input) => {
          const { writeFile } = await import("node:fs/promises");
          await writeFile(path.join(input.lane, "src", "cli.mjs"), "// lane edit\n", "utf8");
          await writeFile(path.join(fx.root, "src", "cli.mjs"), "// operator edit\n", "utf8");
          const file = await laneStoryFile(fx, input.lane, "07/01");
          await replaceStatus(file, "in-review");
          return { outcome: "document", document: { outcome: "done", sessionId: "s", settlementContext: {} } };
        } } });
        const { state, report } = await runWave(fx, { child, rubric: stubRubric(emits(passingTap())) });
        assert.equal(state.act.stop, "lane-merge-refused");
        assert.equal(state.act.producer, "dispatch:merge-home:refused");
        assert.match(report.lines.at(-1), /files=\["src\/cli.mjs"\]/u);
        assert.ok(existsSync(meshDispatchWorktreePath(fx.root, "07/01")), "the lane is kept");
        assert.match((await git(["log", "--format=%s", "aof/mesh/07-01"], fx.root)).stdout, /lane commit/u, "…committed");
      }, { stories: ["01"], commit: { "src/cli.mjs": "// base\n" } });
      // MERGE — detached head
      await withLaneRepo(async (fx) => {
        const registry = scriptedRegistry({
          dispatch: async (input, ctx, real) => {
            const answer = await real();
            if (Array.isArray(input.refs) || input.ref != null) await git(["checkout", "-q", "--detach"], fx.root);
            return answer;
          },
        });
        const { state, report } = await runWave(fx, { child: fakeLaneChild(fx), rubric: stubRubric(emits(passingTap())), registry });
        assert.equal(state.act.stop, "lane-merge-refused");
        assert.match(report.lines.at(-1), /reason=detached-head/u);
      }, { stories: ["01"] });
      // MERGE — the verb THROWS (129/03 `F-44`: `commit-failed` / `gate-propagation-failed`): git refusing
      // the primary is the same halt as a returned refusal, `reason` carrying the thrown code, and the
      // loop does not die on it — the lane is kept, committed, for the resume's reconcile.
      await withLaneRepo(async (fx) => {
        const child = fakeLaneChild(fx, { answers: { "07/01": async (input) => {
          const { writeFile } = await import("node:fs/promises");
          await writeFile(path.join(input.lane, "src", "cli.mjs"), "// lane edit\n", "utf8");
          const file = await laneStoryFile(fx, input.lane, "07/01");
          await replaceStatus(file, "in-review");
          // the primary's index is locked by "another process" from here on: its own-writes commit
          // and its merge both need it, and git refuses with a non-conflict error
          await writeFile(path.join(fx.root, ".git", "index.lock"), "", "utf8");
          return { outcome: "document", document: { outcome: "done", sessionId: "s", settlementContext: {} } };
        } } });
        const { state, report } = await runWave(fx, { child, rubric: stubRubric(emits(passingTap())) });
        await rm(path.join(fx.root, ".git", "index.lock"), { force: true });
        assert.equal(state.state, "halted", report.lines.join("\n"));
        assert.equal(state.act.stop, "lane-merge-refused");
        assert.equal(state.act.producer, "dispatch:merge-home:refused");
        assert.match(report.lines.at(-1), /reason=(commit-failed|gate-propagation-failed)/u, report.lines.at(-1));
        assert.ok(report.lines.some((line) => /Lane 07\/01 — merge: refused \(lane-merge-refused\)/u.test(line)), "narrated as a refusal");
        assert.ok(existsSync(meshDispatchWorktreePath(fx.root, "07/01")), "the lane is kept");
        assert.match((await git(["log", "--format=%s", "aof/mesh/07-01"], fx.root)).stdout, /lane commit/u, "…committed");
        assert.equal(existsSync(path.join(fx.root, ".git", "MERGE_HEAD")), false, "no MERGE_HEAD in the primary");
        const waveRuns = (await laneRunsOf(fx, "07")).filter((r) => r.brief?.wave != null);
        assert.ok(waveRuns.length > 0 && waveRuns.every((r) => r.state !== "running"), "the wave run is settled, not stranded");
      }, { stories: ["01"], commit: { "src/cli.mjs": "// base\n" } });
      // MERGE — conflict
      await withLaneRepo(async (fx) => {
        const child = fakeLaneChild(fx, { answers: { "07/01": async (input) => {
          const { writeFile } = await import("node:fs/promises");
          await writeFile(path.join(input.lane, "src", "cli.mjs"), "// lane edit\n", "utf8");
          await writeFile(path.join(fx.root, "src", "cli.mjs"), "// operator edit\n", "utf8");
          await git(["commit", "-q", "-am", "operator: moved"], fx.root);
          const file = await laneStoryFile(fx, input.lane, "07/01");
          await replaceStatus(file, "in-review");
          return { outcome: "document", document: { outcome: "done", sessionId: "s", settlementContext: {} } };
        } } });
        const { state, report } = await runWave(fx, { child, rubric: stubRubric(emits(passingTap())) });
        assert.equal(state.act.stop, "lane-merge-conflict");
        assert.equal(state.act.producer, "dispatch:merge-home:conflict");
        for (const key of ["lane=", "branch=", "base=", "tip="]) assert.ok(report.lines.at(-1).includes(key), `detail ${key}`);
        assert.ok(existsSync(meshDispatchWorktreePath(fx.root, "07/01")), "the lane is kept");
        assert.equal(existsSync(path.join(fx.root, ".git", "MERGE_HEAD")), false, "no MERGE_HEAD in the primary");
      }, { stories: ["01"], commit: { "src/cli.mjs": "// base\n" } });
      // CLEANUP — refused
      await withLaneRepo(async (fx) => {
        const registry = scriptedRegistry({
          dispatch: async (input, ctx, real) => input.cleanup ? { action: "cleanup", bound: 3, ref: input.ref, outcome: "refused", code: "dispatch-lane-uncommitted-work" } : await real(),
        });
        const { state } = await runWave(fx, { child: fakeLaneChild(fx), rubric: stubRubric(emits(passingTap())), registry });
        assert.equal(state.state, "done", "continues to the next act");
        const row = state.driven.find((r) => r.ref === "07/01" && r.phase === "continue");
        assert.ok(["fast-forwarded", "merged"].includes(row.merge.outcome));
        assert.ok(existsSync(meshDispatchWorktreePath(fx.root, "07/01")), "the lane is kept");
      }, { stories: ["01"] });
    },
  },
  {
    name: "129/04 task02 a failing grade re-drives in the same lane before any merge, and the fix rides a file under the aof home that is removed after the child",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const rubric = stubRubric([emits(passingTap(["alpha"])), emits(failingTap([["own-red", "own-red failed"]], ["alpha"]), 1), emits(passingTap(["alpha", "own-red"]))]);
        const fixFiles = [];
        const child = fakeLaneChild(fx, { onSpawn: async (input) => {
          if (input.fixFile != null) fixFiles.push({ path: input.fixFile, text: await readFile(input.fixFile, "utf8"), existed: existsSync(input.fixFile) });
        } });
        const merges = [];
        const registry = scriptedRegistry({ dispatch: async (input, ctx, real) => { const a = await real(); if (input.cleanup) merges.push(input.ref); return a; } });
        const { state } = await runWave(fx, { child, rubric, registry });
        assert.equal(state.state, "done");
        const runs = await laneRunsOf(fx, "07/01");
        const laneRuns = runs.filter((run) => run.brief?.lane != null);
        // The shipped ladder re-drives a first failing grade as a PROGRESS CONTINUATION at the
        // same cycle (127 STATE: "a progress-continuation re-drive does not advance the cycle");
        // the feature's "cycle 1 and 2" is recorded as a contract note for the PO.
        assert.deepEqual(laneRuns.map((run) => run.brief.loop.cycle), [1, 1]);
        assert.deepEqual(laneRuns[1].brief.grade.failures.map((f) => f.case), ["own-red"], "the second carries the first's grade");
        assert.deepEqual(laneRuns[1].brief.gradeBaseline, laneRuns[0].brief.gradeBaseline, "…and the same baseline");
        const calls = child.calls.filter((c) => c.ref === "07/01");
        assert.equal(calls.length, 2);
        assert.equal(calls[0].fixFile, undefined);
        assert.ok(calls[1].fixFile, "the second spawn carried fixFile");
        assert.equal(calls[1].lane, calls[0].lane, "the same lane");
        assert.equal(fixFiles.length, 1);
        assert.ok(fixFiles[0].path.startsWith(path.join(process.env.AOF_GLOBAL_HOME, "mesh", "loop-fixes")), `the fix file lives under the aof home: ${fixFiles[0].path}`);
        assert.ok(fixFiles[0].path.endsWith(`${laneRuns[1].runId}.json`));
        const parsed = JSON.parse(fixFiles[0].text);
        assert.deepEqual(parsed.findings.map((f) => f.case), ["own-red"]);
        assert.equal(existsSync(fixFiles[0].path), false, "removed after the child returned");
        assert.equal(merges.filter((ref) => ref === "07/01").length, 1, "merged once, after the second drive");
        assert.equal(laneRows(state, "07/01").length, 2, "two rows for 07/01");
        assert.equal(laneRows(state, "07/01")[0].lane.worktree, laneRows(state, "07/01")[1].lane.worktree);
        assert.equal((await git(["status", "--porcelain"], fx.root)).stdout.includes("loop-fixes"), false, "nothing under the checkout was written for it");
      }, { stories: ["01"] });
    },
  },
  {
    name: "129/04 task02 a cleanup refusal is narrated, never a halt; the lane sequence is narrated step by step through narrate only",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const registry = scriptedRegistry({
          dispatch: async (input, ctx, real) => input.cleanup && input.ref === "07/03" ? { action: "cleanup", bound: 3, ref: input.ref, outcome: "refused", code: "dispatch-lane-projection-unpublished" } : await real(),
        });
        const { state, report } = await runWave(fx, { child: fakeLaneChild(fx), rubric: stubRubric(emits(passingTap())), registry });
        assert.equal(state.state, "done");
        const lane = meshDispatchWorktreePath(fx.root, "07/03");
        assert.ok(report.lines.includes(`Lane 07/03 — cleanup refused (dispatch-lane-projection-unpublished): ${lane} left for aof work dispatch --sweep.`));
        const steps = report.lines.filter((line) => line.startsWith("Lane 07/01 — ")).map((line) => line.slice("Lane 07/01 — ".length).split(":")[0]);
        assert.deepEqual(steps.filter((s) => ["open", "mint", "drive", "settle", "grade", "commit", "merge", "cleanup"].includes(s)), ["open", "mint", "drive", "settle", "grade", "commit", "merge", "cleanup"]);
        const open = report.lines.find((line) => line.startsWith("Lane 07/01 — open:"));
        assert.match(open, /dispatch-07-01/u);
        assert.match(open, / at [0-9a-f]{40}/u);
        assert.match(report.lines.find((line) => line.startsWith("Lane 07/01 — mint:")), /run \d{8}T/u);
        assert.match(report.lines.find((line) => line.startsWith("Lane 07/01 — drive:")), /session s-07\/01/u);
        assert.match(report.lines.find((line) => line.startsWith("Lane 07/01 — settle:")), /done/u);
        assert.match(report.lines.find((line) => line.startsWith("Lane 07/01 — commit:")), /tip [0-9a-f]{40}/u);
        assert.match(report.lines.find((line) => line.startsWith("Lane 07/01 — merge:")), /(fast-forwarded|merged), commit [0-9a-f]{40}/u);
        assert.match(report.lines.find((line) => line.startsWith("Lane 07/01 — cleanup:")), /removed/u);
        // With --quiet the narrate seam is silent, so no `Lane` line reaches the one printer.
        const quiet = collector();
        await withLaneRepo(async (fx2) => {
          await runWave(fx2, { child: fakeLaneChild(fx2), rubric: stubRubric(emits(passingTap())), report: quiet, input: { quiet: true } });
        }, { stories: ["01"] });
        assert.equal(quiet.lines.some((line) => line.startsWith("Lane ")), false, "no Lane line is printed through report");
      });
    },
  },
  {
    name: "129/04 task02 [outline] a halt in one lane drains the others before the loop returns (4 rows)",
    run: async () => {
      const rows = [
        { fails: "conflict", stop: "lane-merge-conflict" },
        { fails: "refused", stop: "lane-merge-refused" },
        { fails: "indeterminate", stop: "grade-indeterminate" },
        { fails: "needs-input", stop: "session-needs-input" },
      ];
      for (const row of rows) {
        await withLaneRepo(async (fx) => {
          const release03 = deferred();
          const child = fakeLaneChild(fx, {
            pause: { "07/03": release03.promise },
            answers: {
              "07/01": async (input) => {
                if (row.fails === "needs-input") { setTimeout(release03.resolve, 30); return { outcome: "document", document: { outcome: "needs-input", sessionId: "s-1" } }; }
                const { writeFile } = await import("node:fs/promises");
                if (row.fails === "conflict" || row.fails === "refused") {
                  await writeFile(path.join(input.lane, "src", "x.mjs"), "// lane\n", "utf8");
                  await writeFile(path.join(fx.root, "src", "x.mjs"), "// operator\n", "utf8");
                  if (row.fails === "conflict") await git(["commit", "-q", "-am", "operator: moved"], fx.root);
                }
                const file = await laneStoryFile(fx, input.lane, "07/01");
                await replaceStatus(file, "in-review");
                setTimeout(release03.resolve, 30);
                return { outcome: "document", document: { outcome: "done", sessionId: "s-07/01", settlementContext: {} } };
              },
            },
          });
          const rubric = stubRubric((at, options) => (row.fails === "indeterminate" && String(options.cwd).includes("dispatch-07-01") ? emits("", 0) : emits(passingTap())));
          const asked = [];
          const registry = scriptedRegistry({ dispatch: async (input, ctx, real) => { if (input.refs) asked.push(input.refs); return await real(); } });
          const { state, report } = await runWave(fx, { child, rubric, registry });
          assert.equal(state.act.stop, row.stop, `${row.fails}: stop`);
          assert.equal(state.act.ref, "07/01", `${row.fails}: the first halting lane is the act's ref`);
          const row03 = state.driven.find((r) => r.ref === "07/03" && r.phase === "continue");
          assert.ok(row03, `${row.fails}: 07/03's child finished`);
          assert.ok(["fast-forwarded", "merged"].includes(row03.merge?.outcome), `${row.fails}: 07/03 merged`);
          assert.equal(asked.length, 1, `${row.fails}: no further work:dispatch ask`);
          assert.match(report.lines.at(-1), /drained=\[\{"ref":"07\/03","merge":"(fast-forwarded|merged)"\}\]/u, `${row.fails}: the drained detail names 07/03 with its merge outcome`);
        }, { commit: { "src/x.mjs": "// base\n" } });
      }
    },
  },
  {
    name: "129/04 task02 a lane is committed before a ladder halt returns, a stale running record in a reopened lane is reclaimed, and a fresh one refuses the open",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const rubric = stubRubric([emits(passingTap()), emits("", 0)]);
        const { state } = await runWave(fx, { child: fakeLaneChild(fx), rubric });
        assert.equal(state.act.stop, "grade-indeterminate");
        const branchLog = (await git(["log", "--format=%s", "aof/mesh/07-01"], fx.root)).stdout;
        assert.match(branchLog, /lane commit/u, "the lane branch carries a commit holding its settled record");
        const lane = meshDispatchWorktreePath(fx.root, "07/01");
        const runs = await readRuns(await resolveRefInWorktree(fx.root, fx.workDir, lane, "07/01"));
        assert.equal(runs[0].state, "done", "settled before the halt");
        assert.equal((await git(["merge-base", "--is-ancestor", "aof/mesh/07-01", "HEAD"], fx.root)).status !== 0, true, "…and unmerged");
      }, { stories: ["01"] });
      // stale running → reclaimed before the mint
      await withLaneRepo(async (fx) => {
        const { state: first } = await runWave(fx, { child: fakeLaneChild(fx, { answers: { "07/01": { outcome: "document", document: { outcome: "needs-input", sessionId: "s-1" } } } }), rubric: stubRubric(emits(passingTap())) });
        assert.equal(first.act.stop, "session-needs-input", "guard: a lane was left with a running record");
        const lane = meshDispatchWorktreePath(fx.root, "07/01");
        const laneItem = await resolveRefInWorktree(fx.root, fx.workDir, lane, "07/01");
        const stale = (await readRuns(laneItem))[0];
        await heartbeat(laneItem, stale.runId, { now: "2026-09-14T10:00:00.000Z" });
        const { state, report } = await runWave(fx, { child: fakeLaneChild(fx), rubric: stubRubric(emits(passingTap())), input: { resume: true } });
        assert.ok(report.lines.includes(`Reclaimed 07/01 — run ${stale.runId} (runtime_offline).`), "the stale record was reclaimed by name");
        assert.equal(state.state, "done");
      }, { stories: ["01"], config: { loop: { heartbeatMs: 60000 } } });
      // fresh running → refuses the open
      await withLaneRepo(async (fx) => {
        const { state: first } = await runWave(fx, { child: fakeLaneChild(fx, { answers: { "07/01": { outcome: "document", document: { outcome: "needs-input", sessionId: "s-1" } } } }), rubric: stubRubric(emits(passingTap())) });
        assert.equal(first.act.stop, "session-needs-input");
        const lane = meshDispatchWorktreePath(fx.root, "07/01");
        const laneItem = await resolveRefInWorktree(fx.root, fx.workDir, lane, "07/01");
        const running = (await readRuns(laneItem))[0];
        await heartbeat(laneItem, running.runId, { now: new Date().toISOString() });
        const child = fakeLaneChild(fx);
        const { state } = await runWave(fx, { child, rubric: stubRubric(emits(passingTap())), now: new Date().toISOString() });
        assert.equal(state.act.stop, "lane-open-failed");
        assert.equal(state.act.producer, "run-store:duplicate-run");
        assert.equal(child.calls.length, 0, "no run is minted, no child spawned");
        assert.equal((await readRuns(laneItem)).length, 1, "the lane is untouched");
      }, { stories: ["01"], config: { loop: { heartbeatMs: 3600000 } } });
    },
  },

  // ── task 03 · the baseline is per base commit ────────────────────────────────────────
  {
    name: "129/04 task03 one baseline per wave, measured in the first lane, keyed by the base and riding every lane run of the wave",
    run: async () => {
      await withLaneRepo(async (fx) => {
        // The baseline: two reds. Each lane's FIRST grade adds `own-red`; its second is the two
        // base reds again (its own fix landed), so the wave completes and merges home.
        const rubric = stubRubric((at, options) => {
          if (at === 0) return emits(failingTap([["base-red-1", "r1"], ["base-red-2", "r2"]], ["alpha"]), 1);
          const priorHere = rubric.calls.slice(1, at).filter((c) => c.cwd === options.cwd).length;
          return priorHere === 0
            ? emits(failingTap([["base-red-1", "r1"], ["base-red-2", "r2"], ["own-red", "own"]], ["alpha"]), 1)
            : emits(failingTap([["base-red-1", "r1"], ["base-red-2", "r2"]], ["alpha"]), 1);
        });
        const spawned = [];
        const child = fakeLaneChild(fx, { onSpawn: (input) => spawned.push({ ref: input.ref, rubricCalls: rubric.calls.length }), answers: { "07/01": [undefined, undefined], "07/03": [undefined, undefined] } });
        const registry = scriptedRegistry({ grade: async (input, ctx, real) => await real() });
        const { state, report } = await runWave(fx, { child, rubric, registry });
        const baselineAsks = registry.of("work:grade").filter((call) => call.input.run === true && call.input.claimRun == null);
        assert.equal(baselineAsks.length, 1, "work:grade --run with no claimRun exactly once");
        assert.equal(path.resolve(baselineAsks[0].projectRoot), path.resolve(meshDispatchWorktreePath(fx.root, "07/01")), "…in the FIRST lane");
        assert.ok(spawned.every((s) => s.rubricCalls >= 1), "…before any child was spawned");
        for (const call of registry.of("work:grade").filter((c) => c.input.run === true && c.input.claimRun != null)) assert.ok(call.input.claimRun, "every later run carries a claimRun");
        const base = (await laneRunsOf(fx, "07/01")).find((run) => run.brief?.lane != null).brief.lane.baseCommit;
        assert.ok(report.lines.some((line) => line === `Baseline work:grade at ${base.slice(0, 7)} — 2 failing case(s) inherited, 3 case(s) measured, measured in lane 07/01.`), report.lines.filter((l) => l.startsWith("Baseline")).join("\n"));
        for (const ref of ["07/01", "07/03"]) {
          const runs = (await laneRunsOf(fx, ref)).filter((run) => run.brief?.lane != null);
          assert.ok(runs.length >= 1);
          assert.deepEqual(Object.keys(runs[0].brief.gradeBaseline), ["measuredAt", "priorDrives", "failures", "baseCommit"]);
          assert.deepEqual(runs[0].brief.gradeBaseline.failures, ["base-red-1", "base-red-2"]);
          assert.equal(runs[0].brief.gradeBaseline.priorDrives, 0);
          assert.equal(runs[0].brief.gradeBaseline.baseCommit, base);
          const row = laneRows(state, ref)[0];
          assert.equal(row.verdict, "fail", `${ref}: its own delta`);
          assert.equal(row.cases.failed, 1);
          assert.deepEqual(row.codes, ["case-failed"]);
        }
        // A first failing grade re-drives from the PROGRESS rung (the sampler decides before the
        // gate rung announces itself — the shipped ladder, unchanged), so the fail is read off the
        // row above; the inherited count is narrated on the grade that reaches the gate rung.
        assert.ok(report.lines.some((line) => /Gate work:grade 07\/01 — pass, 0 of 3 case\(s\) failing \(2 inherited, excluded by the baseline\)\./u.test(line)), report.lines.filter((l) => l.startsWith("Gate work:grade")).join("\n"));
        const fix = child.calls.find((c) => c.ref === "07/01" && c.fixFile != null);
        assert.ok(fix, "07/01 was re-driven");
      });
    },
  },
  {
    name: "129/04 task03 [outline] the delta is applied per lane against the one baseline (5 rows)",
    run: async () => {
      const rows = [
        { graded: [["base-red-1", "r"], ["base-red-2", "r"], ["own-red", "o"]], verdict: "fail", failed: 1, redrive: true },
        { graded: [["base-red-1", "r"], ["base-red-2", "r"]], verdict: "pass", failed: 0, redrive: false },
        { graded: [["base-red-1", "r"]], verdict: "pass", failed: 0, redrive: false },
        { graded: [], verdict: "pass", failed: 0, redrive: false },
        { graded: [["own-red", "o"]], verdict: "fail", failed: 1, redrive: true },
      ];
      for (const row of rows) {
        await withLaneRepo(async (fx) => {
          const rubric = stubRubric((at, options) => {
            if (at === 0) return emits(failingTap([["base-red-1", "r1"], ["base-red-2", "r2"]], ["alpha"]), 1);
            if (String(options.cwd).includes("dispatch-07-03") && rubric.calls.filter((c) => String(c.cwd).includes("dispatch-07-03")).length <= 1) {
              return row.graded.length === 0 ? emits(passingTap(["alpha"])) : emits(failingTap(row.graded, ["alpha"]), 1);
            }
            return emits(passingTap(["alpha"]));
          });
          const child = fakeLaneChild(fx);
          const { state } = await runWave(fx, { child, rubric });
          const label = JSON.stringify(row.graded.map((g) => g[0]));
          const first = laneRows(state, "07/03")[0];
          assert.equal(first.verdict, row.verdict, `${label}: verdict`);
          assert.equal(first.cases.failed, row.failed, `${label}: failed`);
          const spawns = child.calls.filter((c) => c.ref === "07/03");
          assert.equal(spawns.length, row.redrive ? 2 : 1, `${label}: ${row.redrive ? "re-driven" : "commit, merge, cleanup"}`);
          if (row.redrive) {
            const text = JSON.parse(await readFile(spawns[1].fixFile, "utf8").catch(() => "null"));
            assert.ok(text == null || text.findings.every((f) => f.case === "own-red"), `${label}: the fix names own-red and neither base red`);
          }
        });
      }
    },
  },
  {
    name: "129/04 task03 the first lane's child waits for the baseline and the second lane's does not",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const baselineTaken = deferred();
        const order = [];
        const rubric = stubRubric((at) => {
          if (at === 0) return baselineTaken.promise.then(() => { order.push("baseline"); return emits(passingTap(["alpha"])); });
          return emits(passingTap(["alpha"]));
        });
        const child = fakeLaneChild(fx, { onSpawn: (input) => { order.push(`spawn ${input.ref}`); if (input.ref === "07/03") setTimeout(baselineTaken.resolve, 20); } });
        const registry = scriptedRegistry({ grade: async (input, ctx, real) => await real() });
        const { state } = await runWave(fx, { child, rubric, registry });
        assert.equal(state.state, "done");
        assert.ok(order.indexOf("spawn 07/03") < order.indexOf("baseline"), `07/03 spawned before the baseline resolved: ${order}`);
        assert.ok(order.indexOf("spawn 07/01") > order.indexOf("baseline"), `07/01 spawned only after: ${order}`);
        assert.equal(registry.of("work:grade").filter((c) => c.input.run === true && c.input.claimRun == null).length, 1);
        const b01 = (await laneRunsOf(fx, "07/01")).find((r) => r.brief?.lane).brief.gradeBaseline;
        const b03 = (await laneRunsOf(fx, "07/03")).find((r) => r.brief?.lane).brief.gradeBaseline;
        assert.equal(b01.baseCommit, b03?.baseCommit ?? b01.baseCommit, "both graded against the same base");
      });
    },
  },
  {
    name: "129/04 task03 a baseline that cannot be taken degrades once and grades raw",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const degrades = [];
        const rubric = stubRubric(emits(failingTap([["a", "x"], ["b", "y"], ["c", "z"]], []), 1));
        const registry = scriptedRegistry({ grade: async (input, ctx, real) => {
          if (input.run === true && input.claimRun == null) { degrades.push("loop-grade-baseline"); throw Object.assign(new Error("EPERM"), { code: "EPERM" }); }
          return await real();
        } });
        const { state } = await runWave(fx, { child: fakeLaneChild(fx, { answers: { "07/01": [undefined, undefined, undefined], "07/03": [undefined, undefined, undefined] } }), rubric, registry });
        assert.deepEqual(degrades, ["loop-grade-baseline"], "the baseline fault was raised exactly once");
        for (const ref of ["07/01", "07/03"]) {
          const runs = (await laneRunsOf(fx, ref)).filter((r) => r.brief?.lane);
          assert.ok(runs.every((run) => run.brief.gradeBaseline == null), `${ref}: no baseline on the brief`);
          assert.equal(laneRows(state, ref)[0].cases.failed, 3, `${ref}: graded raw`);
        }
      });
    },
  },
  {
    name: "129/04 task03 [outline] readGradeBaseline answers by sha or by ref, never across the two (6 rows)",
    run: () => {
      const B0 = "b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0";
      const B1 = "b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1";
      const lane = (ref, t, extra = {}) => ({ itemRef: ref, runId: `run-${ref}-${t}`, createdAt: `2026-09-14T0${t}:00:00.000Z`, brief: { gradeBaseline: { measuredAt: "m", priorDrives: 0, failures: ["x"], baseCommit: B0, ...extra } } });
      const sequential = (ref) => ({ itemRef: ref, runId: `seq-${ref}`, createdAt: "2026-09-14T00:00:00.000Z", brief: { gradeBaseline: { measuredAt: "m", priorDrives: 1, failures: ["y"] } } });
      const rows = [
        { runs: [lane("07/01", 1), lane("07/03", 2)], selector: { baseCommit: B0 }, answer: { runId: "run-07/03-2", baseCommit: B0 } },
        { runs: [lane("07/01", 1)], selector: { baseCommit: B1 }, answer: null },
        { runs: [sequential("07/01")], selector: { baseCommit: B0 }, answer: null },
        { runs: [sequential("07/01")], selector: "07/01", answer: { runId: "seq-07/01", baseCommit: null } },
        { runs: [lane("07/01", 1)], selector: "07/01", answer: { runId: "run-07/01-1", baseCommit: B0 } },
        { runs: [{ ...lane("07/01", 1), brief: { gradeBaseline: { failures: "not-an-array", baseCommit: B0 } } }], selector: { baseCommit: B0 }, answer: null },
      ];
      for (const row of rows) {
        const answer = readGradeBaseline(row.runs, row.selector);
        if (row.answer == null) assert.equal(answer, null, JSON.stringify(row.selector));
        else {
          assert.equal(answer.runId, row.answer.runId, JSON.stringify(row.selector));
          assert.equal(answer.baseCommit, row.answer.baseCommit, JSON.stringify(row.selector));
        }
      }
    },
  },
  {
    name: "129/04 task03 a resumed loop reads the baseline back by base commit, a held member on a new base measures a new one, and VERIFY never re-grades",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const rubric = stubRubric((at) => (at === 0 ? emits(failingTap([["base-red-1", "r"]], ["alpha"]), 1) : emits(passingTap(["alpha"]))));
        const registry = scriptedRegistry({ grade: async (input, ctx, real) => await real() });
        // 07/01 and 07/03 share the wave; 07/02 collides with 07/01 on files and is held until 01 merges.
        const { state, report } = await runWave(fx, { child: fakeLaneChild(fx), rubric, registry });
        assert.equal(state.state, "done");
        const baselines = registry.of("work:grade").filter((c) => c.input.run === true && c.input.claimRun == null);
        assert.equal(baselines.length, 2, "one baseline per base commit: the first wave's and the held member's new base");
        const b02 = (await laneRunsOf(fx, "07/02")).find((r) => r.brief?.lane).brief.gradeBaseline;
        const b01 = (await laneRunsOf(fx, "07/01")).find((r) => r.brief?.lane).brief.gradeBaseline;
        assert.notEqual(b02.baseCommit, b01.baseCommit, "the held member measured on its own base");
        assert.equal(report.lines.filter((line) => line.startsWith("Baseline work:grade at")).length, 2);
        // VERIFY: no work:grade with run:true after the build phase completed
        const complete = report.lines.indexOf("Build phase complete — every story in review.");
        assert.ok(complete >= 0);
        const verifyGrades = registry.calls.filter((c) => c.id === "work:grade").slice(-3);
        assert.ok(verifyGrades.every((c) => c.input.run !== true), "VERIFY reads the recorded grade and never re-grades");
        assert.ok(report.lines.some((line) => /Gate work:grade 07\/01 — pass \(recorded delta 0 on run /u.test(line)), "…from the last progress sample of its merged lane run");
      }, { stories: [{ number: "01", files: ["src/a.mjs"] }, { number: "02", files: ["src/a.mjs"] }, { number: "03", files: ["src/c.mjs"] }] });
      // a resumed loop reads it back by sha — a live, unmerged lane holds it and nothing in the primary does
      await withLaneRepo(async (fx) => {
        const rubric = stubRubric((at) => (at === 0 ? emits(failingTap([["base-red-1", "r"]], ["alpha"]), 1) : emits(passingTap(["alpha"]))));
        const { state: first } = await runWave(fx, { child: fakeLaneChild(fx, { answers: { "07/01": { outcome: "document", document: { outcome: "needs-input", sessionId: "s-1" } } } }), rubric });
        assert.equal(first.act.stop, "session-needs-input", "guard: died mid-wave with 07/01's lane open");
        const lane = meshDispatchWorktreePath(fx.root, "07/01");
        const laneItem = await resolveRefInWorktree(fx.root, fx.workDir, lane, "07/01");
        const held = (await readRuns(laneItem))[0].brief.gradeBaseline;
        assert.ok(held?.baseCommit, "guard: the lane's run carries the baseline");
        assert.ok((await laneRunsOf(fx, "07/01")).every((r) => r.brief?.gradeBaseline == null), "guard: nothing in the primary carries it");
        await heartbeat(laneItem, (await readRuns(laneItem))[0].runId, { now: "2026-09-14T09:00:00.000Z" });
        const rubric2 = stubRubric(emits(passingTap(["alpha"])));
        const registry = scriptedRegistry({ grade: async (input, ctx, real) => await real() });
        const { state, report } = await runWave(fx, { child: fakeLaneChild(fx), rubric: rubric2, registry, input: { resume: true } });
        assert.equal(state.state, "done", report.lines.join("\n"));
        assert.equal(registry.of("work:grade").filter((c) => c.input.run === true && c.input.claimRun == null).length, 0, "no baseline rubric runs");
        assert.equal(report.lines.some((line) => line.startsWith("Baseline work:grade")), false);
        const redrive = (await laneRunsOf(fx, "07/01")).filter((r) => r.brief?.lane).at(-1);
        assert.deepEqual(redrive.brief.gradeBaseline, held, "the re-drive's baseline deep-equals the one the lane held");
      }, { stories: ["01"], config: { loop: { heartbeatMs: 60000 } } });
    },
  },
  {
    name: "129/04 task03 sequential keeps the per-story baseline on the primary",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const rubric = stubRubric(emits(passingTap(["alpha"])));
        const registry = scriptedRegistry({ grade: async (input, ctx, real) => await real() });
        const report = collector();
        const driver = primaryDriver(fx, { onCommand: verifyCompleter(fx) });
        const ctx = laneCtx(fx, { rubric, registry, report, driver, extra: { readChangeUnderReview: async () => "" } });
        const state = await runLoopBody({ scope: "07" }, ctx);
        assert.equal(state.state, "done");
        const baselines = registry.of("work:grade").filter((c) => c.input.run === true && c.input.claimRun == null);
        assert.equal(baselines.length, 1);
        assert.equal(path.resolve(baselines[0].projectRoot), path.resolve(fx.root), "in the primary");
        assert.ok(report.lines.some((line) => line.startsWith("Baseline work:grade 07/01 — ")), "the shipped line");
        const run = (await laneRunsOf(fx, "07/01")).find((r) => r.brief?.gradeBaseline != null);
        assert.ok(run);
        assert.equal("baseCommit" in run.brief.gradeBaseline, false, "no baseCommit key");
        assert.equal(run.brief.lane, undefined);
      }, { stories: ["01"], config: { loop: { concurrency: "sequential" } } });
    },
  },

  // ── task 04 · the wave run carries the liveness ───────────────────────────────────────
  {
    name: "129/04 task04 the wave run is minted before the first dispatch and carries the wave; every lane run is its child",
    run: async () => {
      await withLaneRepo(async (fx) => {
        let mintedBeforeDispatch = null;
        const registry = scriptedRegistry({ dispatch: async (input, ctx, real) => {
          if (input.refs && mintedBeforeDispatch == null) mintedBeforeDispatch = await laneRunsOf(fx, "07");
          return await real();
        } });
        const { state } = await runWave(fx, { child: fakeLaneChild(fx), rubric: stubRubric(emits(passingTap())), registry });
        assert.equal(state.state, "done");
        assert.equal(mintedBeforeDispatch.length, 1, "one milestone run minted before work:dispatch was first asked");
        const wave = mintedBeforeDispatch[0];
        assert.equal(wave.brief.loop.phase, "continue");
        assert.deepEqual(Object.keys(wave.brief.loop), [...LOOP_KEYS]);
        assert.deepEqual(Object.keys(wave.brief.wave), ["members", "baseCommit", "bound"]);
        assert.deepEqual(wave.brief.wave.members, ["07/01", "07/03"]);
        assert.equal(wave.brief.wave.bound, 3);
        assert.ok(/^[0-9a-f]{40}$/u.test(wave.brief.wave.baseCommit), "the primary's HEAD at the mint");
        for (const ref of ["07/01", "07/03"]) {
          const laneRun = (await laneRunsOf(fx, ref)).find((r) => r.brief?.lane);
          assert.deepEqual({ ...laneRun.brief.loop, cycle: wave.brief.loop.cycle }, wave.brief.loop, `${ref}: brief.loop equals the wave run's except cycle`);
          assert.equal(laneRun.brief.loop.scope, "07", "never the story's own ref");
          assert.equal(laneRun.brief.wave, undefined);
          // The lane's base is the own-writes commit that carried the wave run's record — one
          // commit after the HEAD the brief names (recorded as a contract note, 129/04 build).
          assert.notEqual(laneRun.brief.lane.baseCommit, wave.brief.wave.baseCommit);
          assert.equal((await git(["rev-parse", `${laneRun.brief.lane.baseCommit}~1`], fx.root)).stdout.trim(), wave.brief.wave.baseCommit);
        }
        assert.equal(wave.brief.lane, undefined);
        const row = waveRows(state)[0];
        assert.equal(row.ref, "07");
        assert.equal(row.phase, "continue");
        assert.deepEqual(row.wave, { members: ["07/01", "07/03"], bound: 3 });
        assert.equal(row.outcome, "done");
        assert.equal(row.attempt, 1);
        assert.equal(row.runId, wave.runId);
        assert.equal(state.driven.indexOf(row), 0, "precedes every lane row");
      });
    },
  },
  {
    name: "129/04 task04 [outline] the wave run is heartbeated on the interval only while a lane is open; cleared when the last lane closes (3 rows)",
    run: async () => {
      for (const row of [{ lanes: 2, ticks: 3 }, { lanes: 1, ticks: 1 }, { lanes: 0, ticks: 3 }]) {
        await withLaneRepo(async (fx) => {
          const timers = fakeTimers();
          const gates = { "07/01": deferred(), "07/03": deferred() };
          let observed = null;
          let fired = false;
          const child = fakeLaneChild(fx, {
            pause: { "07/01": gates["07/01"].promise, "07/03": gates["07/03"].promise },
            onSpawn: async () => {
              if (fired || child.calls.length < row.lanes) return;
              fired = true;
              setTimeout(async () => {
                if (row.lanes === 0) { gates["07/01"].resolve(); gates["07/03"].resolve(); }
                const waveRun = (await laneRunsOf(fx, "07")).find((r) => r.state === "running");
                const queue = path.join(fx.milestoneDir, "runs", ".heartbeats.ndjson");
                const before = existsSync(queue) ? await readFile(queue, "utf8") : "";
                const lines = [];
                for (let i = 0; i < row.ticks; i += 1) {
                  const at = `2026-09-14T12:0${i}:00.000Z`;
                  timers.now = at;
                  await timers.fire();
                  const record = (await laneRunsOf(fx, "07")).find((r) => r.runId === waveRun?.runId);
                  lines.push({ at, heartbeatAt: record?.heartbeatAt ?? null, stale: record == null ? null : isStale(record, Date.parse(at), 900000) });
                }
                observed = { waveRun, before, lines, armed: timers.armed.size };
                gates["07/01"].resolve();
                gates["07/03"].resolve();
              }, 40);
            },
          });
          const ctx = { now: null };
          const { state } = await runWave(fx, { child, rubric: stubRubric(emits(passingTap())), timers, now: undefined, extra: { now: () => timers.now ?? new Date().toISOString() } });
          assert.equal(state.state, "done");
          if (row.lanes === 0) {
            assert.equal(timers.armed.size, 0, "no interval keeps the process alive after the last lane closed");
            return;
          }
          assert.ok(observed, "guard: the interval was fired with lanes open");
          assert.equal(observed.armed, 1, "one interval armed while lanes were open");
          assert.equal(observed.before, "", "the queue is consumed after each append (nothing left behind)");
          for (const line of observed.lines) {
            assert.equal(line.heartbeatAt, line.at, `heartbeatAt equals the last at (${line.at})`);
            assert.equal(line.stale, false, "never stale at any sampled instant");
          }
          assert.equal(timers.armed.size, 0, "cleared when the last lane closed");
        }, { stories: row.lanes === 1 ? ["01"] : ["01", "03"], config: { loop: { heartbeatMs: 900000 } } });
      }
    },
  },
  {
    name: "129/04 task04 [outline] the wave run settles with the wave (7 rows), a wave run is settled before the next is minted, and re-minting after a merge keeps one non-terminal run",
    run: async () => {
      const rows = [
        { ending: "clean", state: "done", reason: null },
        { ending: "cleanup-refused", state: "done", reason: null },
        { ending: "conflict", state: "failed", reason: "agent_error" },
        { ending: "refused", state: "failed", reason: "agent_error" },
        { ending: "indeterminate", state: "failed", reason: "agent_error" },
        { ending: "interrupt-once", state: "failed", reason: "agent_error" },
        { ending: "interrupt-twice", state: "failed", reason: "agent_error" },
      ];
      for (const row of rows) {
        await withLaneRepo(async (fx) => {
          const signals = fakeSignals();
          const child = fakeLaneChild(fx, {
            answers: {
              "07/01": async (input) => {
                if (row.ending === "conflict" || row.ending === "refused") {
                  const { writeFile } = await import("node:fs/promises");
                  await writeFile(path.join(input.lane, "src", "x.mjs"), "// lane\n", "utf8");
                  await writeFile(path.join(fx.root, "src", "x.mjs"), "// operator\n", "utf8");
                  if (row.ending === "conflict") await git(["commit", "-q", "-am", "operator: moved"], fx.root);
                }
                if (row.ending === "interrupt-once") signals.raise("SIGINT");
                if (row.ending === "interrupt-twice") { signals.raise("SIGINT"); signals.raise("SIGINT"); await new Promise((r) => setTimeout(r, 20)); return input.signal.aborted ? { outcome: "aborted" } : { outcome: "aborted" }; }
                const file = await laneStoryFile(fx, input.lane, "07/01");
                await replaceStatus(file, "in-review");
                return { outcome: "document", document: { outcome: "done", sessionId: "s", settlementContext: {} } };
              },
            },
          });
          const rubric = stubRubric((at, options) => (row.ending === "indeterminate" && at > 0 ? emits("", 0) : emits(passingTap())));
          const registry = scriptedRegistry({ dispatch: async (input, ctx, real) => (row.ending === "cleanup-refused" && input.cleanup ? { action: "cleanup", bound: 3, ref: input.ref, outcome: "refused", code: "dispatch-lane-uncommitted-work" } : await real()) });
          const { state } = await runWave(fx, { child, rubric, registry, signals });
          const runs = await laneRunsOf(fx, "07");
          const waves = runs.filter((r) => r.brief?.wave != null);
          assert.ok(waves.length >= 1, `${row.ending}: a wave run exists`);
          const last = waves.at(-1);
          assert.equal(last.state, row.state, `${row.ending}: state (${state.act?.stop ?? state.state})`);
          assert.equal(last.failureReason, row.reason, `${row.ending}: failureReason`);
          assert.equal(runs.filter((r) => r.state === "running").length, 0, `${row.ending}: the milestone holds no non-terminal run`);
          for (const ref of ["07/01"]) {
            const merged = (await laneRunsOf(fx, ref)).filter((r) => r.brief?.lane != null && r.state === "done");
            for (const run of merged) assert.ok(last.updatedAt >= run.updatedAt, `${row.ending}: updatedAt not before every merged lane run's`);
          }
        }, { stories: ["01"], commit: { "src/x.mjs": "// base\n" } });
      }
      // die with the loop (no settle), resumed → the wave run is reclaimed runtime_offline
      await withLaneRepo(async (fx) => {
        // 07/01 merges first; the re-minted epoch is running with 07/03 open when the process
        // "dies" — the next ask throws out of the loop, settling nothing.
        let asks = 0;
        const registry = scriptedRegistry({ next: async (input, ctx, real) => {
          if (input.throughReview && ++asks === 2) throw new Error("the loop process died");
          return await real();
        } });
        const gate03 = deferred();
        const child = fakeLaneChild(fx, { pause: { "07/03": gate03.promise }, answers: { "07/01": async (input) => {
          const file = await laneStoryFile(fx, input.lane, "07/01");
          await replaceStatus(file, "in-review");
          setTimeout(gate03.resolve, 200);
          return { outcome: "document", document: { outcome: "done", sessionId: "s-07/01", settlementContext: {} } };
        } } });
        await assert.rejects(runWave(fx, { child, rubric: stubRubric(emits(passingTap())), registry }), /the loop process died/u);
        const running = (await laneRunsOf(fx, "07")).filter((r) => r.brief?.wave != null && r.state === "running");
        assert.equal(running.length, 1, "guard: the epoch was left running by the death");
        await new Promise((resolve) => setTimeout(resolve, 300));
        const later = new Date(Date.now() + 3600_000).toISOString();
        const { state, report } = await runWave(fx, { child: fakeLaneChild(fx), rubric: stubRubric(emits(passingTap())), input: { resume: true, now: later }, now: later });
        assert.ok(report.lines.includes(`Reclaimed 07 — run ${running[0].runId} (runtime_offline).`), report.lines.join("\n"));
        const reclaimed = (await laneRunsOf(fx, "07")).find((r) => r.runId === running[0].runId);
        assert.equal(reclaimed.state, "failed");
        assert.equal(reclaimed.failureReason, "runtime_offline");
        assert.equal(report.lines.some((line) => line.startsWith("Resumed 07 — attempt")), false, "a reclaimed wave run is never retried as the milestone's act");
        // (The in-process "death" lets the dangling lane finish and commit, so the reconcile merges
        // it and BUILD finds nothing open; a lane still running at the death is task 06's reconcile
        // case, where the re-driven lane gets its NEW wave run.)
        const epochs = (await laneRunsOf(fx, "07")).filter((r) => r.brief?.wave != null && r.runId > running[0].runId);
        assert.ok(epochs.every((r) => r.attempt === 1 && r.retryOf == null), "any wave run the BUILD phase mints is NEW (attempt 1, no retryOf)");
        assert.equal(state.state, "done", report.lines.join("\n"));
      }, { config: { loop: { heartbeatMs: 60000 } } });
    },
  },
  {
    name: "129/04 task04 the wave run is re-minted after every merge so the supervisor sees exactly one row, and the driven row names the wave",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const supervisorSaw = [];
        const gate03 = deferred();
        const child = fakeLaneChild(fx, {
          pause: { "07/03": gate03.promise },
          answers: { "07/01": async (input) => {
            const file = await laneStoryFile(fx, input.lane, "07/01");
            await replaceStatus(file, "in-review");
            return { outcome: "document", document: { outcome: "done", sessionId: "s-07/01", settlementContext: {} } };
          } },
        });
        // After 07/01 merges (07/03 still open) the supervisor is asked with the primary's items.
        const registry = scriptedRegistry({ next: async (input, ctx, real) => {
          const answer = await real();
          if (input.throughReview && supervisorSaw.length === 0) {
            const runs = await laneRunsOf(fx, "07");
            if (runs.some((r) => r.brief?.wave && r.state === "done")) {
              const items = [];
              for (const ref of ["07", "07/01", "07/03"]) items.push({ ref, runs: await laneRunsOf(fx, ref) });
              const now = new Date().toISOString();
              const { rows } = decideSupervisedDeclarations({ workspaces: [{ workspaceId: "w", projectRoot: fx.root, items }], maxAttempts: 3, ceilingMs: 43200000, stalenessMs: 900000, now, isRunning, isStale, retryReadiness });
              supervisorSaw.push({ rows: rows.length, runs: runs.map((r) => [r.state, r.brief?.wave?.members ?? null]) });
              gate03.resolve();
            }
          }
          return answer;
        } });
        const { state } = await runWave(fx, { child, rubric: stubRubric(emits(passingTap())), registry, input: { supervised: true } });
        assert.equal(state.state, "done");
        assert.equal(supervisorSaw.length, 1, "guard: the supervisor was asked mid-wave");
        assert.equal(supervisorSaw[0].rows, 1, "exactly one row for scope 07 while 07/03 is still open");
        const waves = (await laneRunsOf(fx, "07")).filter((r) => r.brief?.wave != null);
        assert.ok(waves.length >= 2, "a newer wave run was minted after the first merge");
        assert.deepEqual(waves[1].brief.wave.members, ["07/03"], "the second epoch names the lane still in flight");
        assert.ok(waves.every((r) => r.state === "done"), "every wave run done at the end");
        // unsupervised → zero rows; supervised + dead → listed for relaunch on its wave run
        const items = [];
        for (const ref of ["07", "07/01", "07/03"]) items.push({ ref, runs: await laneRunsOf(fx, ref) });
        const wave = waves[0];
        const nowMs = Date.now();
        const at = (offsetMs) => new Date(nowMs + offsetMs).toISOString();
        const dead = { ...wave, state: "running", createdAt: at(-3_600_000), updatedAt: at(-3_000_000), heartbeatAt: at(-3_000_000), brief: { ...wave.brief, loop: { ...wave.brief.loop, supervised: true } } };
        // The lane runs came home BEFORE the epoch died: they are older than the wave run that
        // carries the loop's liveness (the re-mint after every merge is what makes that so).
        const deadItems = [{ ref: "07", runs: [dead] }, ...items.slice(1).map((entry) => ({ ...entry, runs: entry.runs.map((run) => ({ ...run, createdAt: at(-7_200_000) })) }))];
        const listed = decideSupervisedDeclarations({ workspaces: [{ workspaceId: "w", projectRoot: fx.root, items: deadItems }], maxAttempts: 3, ceilingMs: 43200000, stalenessMs: 900000, now: at(0), isRunning, isStale, retryReadiness });
        assert.equal(listed.rows.length, 1, "a dead loop mid-wave is listed on its wave run");
        assert.equal(listed.rows[0].scope, "07");
        const unsupervised = decideSupervisedDeclarations({ workspaces: [{ workspaceId: "w", projectRoot: fx.root, items: [{ ref: "07", runs: [{ ...dead, heartbeatAt: at(-60_000), brief: { ...dead.brief, loop: { ...dead.brief.loop, supervised: false } } }] }] }], maxAttempts: 3, ceilingMs: 43200000, stalenessMs: 900000, now: at(0), isRunning, isStale, retryReadiness });
        assert.equal(unsupervised.rows.length, 0, "an unsupervised loop's wave run lists nothing");
      });
    },
  },

  // ── task 05 · held members dispatch after the merge ──────────────────────────────────
  {
    name: "129/04 task05 the first wave is the write-disjoint pair, the collider is held and dispatched only after the colliding lane merged, from the merged HEAD",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const asks = [];
        const dispatches = [];
        const heads = [];
        const registry = scriptedRegistry({
          next: async (input, ctx, real) => { const a = await real(); if (input.throughReview) asks.push({ wave: (a.wave ?? []).map((m) => m.ref), heldSet: (a.heldSet ?? []).map((m) => m.ref) }); return a; },
          dispatch: async (input, ctx, real) => { if (input.refs) { dispatches.push([...input.refs]); heads.push(await headSha(fx.root)); } return await real(); },
        });
        const { state, report } = await runWave(fx, { child: fakeLaneChild(fx), rubric: stubRubric(emits(passingTap())), registry });
        assert.equal(state.state, "done", report.lines.join("\n"));
        assert.deepEqual(asks[0], { wave: ["27/02", "27/04"], heldSet: ["27/03"] });
        assert.deepEqual(dispatches[0], ["27/02", "27/04"]);
        assert.ok(report.lines.includes("Wave 1 — dispatching 27/02, 27/04 (bound 3); held: 27/03."));
        const held = dispatches.findIndex((refs) => refs.includes("27/03"));
        assert.ok(held > 0, "27/03 dispatched in a later wave");
        const merge02 = state.driven.find((r) => r.ref === "27/02" && r.merge != null);
        assert.ok(merge02, "27/02 merged");
        const base03 = state.driven.find((r) => r.ref === "27/03" && r.lane != null).baseCommit;
        assert.equal((await git(["merge-base", "--is-ancestor", merge02.merge.commit, base03], fx.root)).status, 0, "27/03's base includes 27/02's merge");
        assert.ok(dispatches.slice(1).every((refs) => !refs.includes("27/04") || !refs.includes("27/02")), "a lane is re-asked for nothing it already holds");
      }, { stories: [{ number: "02", files: ["src/cli.mjs"] }, { number: "03", files: ["src/cli.mjs"] }, { number: "04", files: ["src/d.mjs"] }, { number: "05", files: ["src/e.mjs"], status: "done" }], milestone: "27" });
    },
  },
  {
    name: "129/04 task05 [outline] admission is the bound against the wave, in wave order; the refused wait for a lane to close (6 rows)",
    run: async () => {
      const rows = [
        { bound: 1, stories: ["04"], admitted: ["27/04"], refused: [] },
        { bound: 1, stories: ["02", "04"], admitted: ["27/02"], refused: ["27/04"] },
        { bound: 1, stories: ["02", "04", "05"], admitted: ["27/02"], refused: ["27/04", "27/05"] },
        { bound: 2, stories: ["02", "04"], admitted: ["27/02", "27/04"], refused: [] },
        { bound: 2, stories: ["02", "04", "05"], admitted: ["27/02", "27/04"], refused: ["27/05"] },
        { bound: 3, stories: ["02", "04", "05"], admitted: ["27/02", "27/04", "27/05"], refused: [] },
      ];
      for (const row of rows) {
        await withLaneRepo(async (fx) => {
          const spawned = [];
          const gates = new Map(row.stories.map((n) => [`27/${n}`, deferred()]));
          const child = fakeLaneChild(fx, {
            pause: Object.fromEntries([...gates].map(([ref, gate]) => [ref, gate.promise])),
            onSpawn: (input) => {
              spawned.push(input.ref);
              if (spawned.length === row.admitted.length) setTimeout(() => { for (const gate of gates.values()) gate.resolve(); }, 30);
            },
          });
          const { state, report } = await runWave(fx, { child, rubric: stubRubric(emits(passingTap())) });
          const label = `bound ${row.bound}, wave ${row.stories.join(",")}`;
          assert.equal(state.state, "done", `${label}: ${report.lines.join("\n")}`);
          assert.deepEqual(spawned.slice(0, row.admitted.length).sort(), [...row.admitted].sort(), `${label}: the admitted are spawned before any settles`);
          for (const ref of row.refused) assert.ok(report.lines.includes(`${ref} — at capacity (${row.bound}/${row.bound}), waiting for a lane to close.`), `${label}: ${ref} refused and narrated`);
          assert.deepEqual([...new Set(spawned)].sort(), row.stories.map((n) => `27/${n}`).sort(), `${label}: the refused were re-asked and admitted after a merge`);
        }, { stories: row.stories.map((n) => ({ number: n, files: [`src/f${n}.mjs`] })), milestone: "27", config: { dispatch: { concurrency: row.bound } } });
      }
    },
  },
  {
    name: "129/04 task05 foreign holders count against the bound; only a fully foreign capacity halts, naming the holders and the remedy",
    run: async () => {
      // a fully foreign capacity → halt
      await withLaneRepo(async (fx) => {
        const registry = scriptedRegistry({ dispatch: async (input, ctx, real) => {
          if (!input.refs) return await real();
          const holders = [{ ref: "53/01", worktree: "/lanes/dispatch-53-01", branch: "aof/mesh/53-01", lastActivityAt: "2026-09-14T11:00:00.000Z", state: "working" }, { ref: "53/02", worktree: "/lanes/dispatch-53-02", branch: "aof/mesh/53-02", lastActivityAt: "2026-09-14T11:30:00.000Z", state: "quiet" }];
          return { action: "dispatch", bound: 3, dispatched: input.refs.map((ref) => ({ ref, ok: true, outcome: "refused", code: "dispatch-capacity-full", value: { ref, outcome: "refused", code: "dispatch-capacity-full", reason: "at-capacity", occupied: 3, holders } })), peak: 0, ranAtOnce: 0 };
        } });
        const { state, report } = await runWave(fx, { child: fakeLaneChild(fx), rubric: stubRubric(emits(passingTap())), registry });
        assert.equal(state.act.stop, "lane-open-failed");
        assert.equal(state.act.producer, "work:dispatch:at-capacity");
        const account = report.lines.at(-1);
        assert.match(account, /holders=\[\{"ref":"53\/01","lastActivityAt":"2026-09-14T11:00:00.000Z"\},\{"ref":"53\/02","lastActivityAt":"2026-09-14T11:30:00.000Z"\}\]/u);
        assert.match(account, /occupied=3/u);
        assert.match(account, /bound=3/u);
        assert.match(account, /remedy=aof work dispatch --list/u);
        assert.equal(registry.of("work:dispatch").filter((c) => c.input.refs).length, 1, "no further work:dispatch ask");
        const wave = (await laneRunsOf(fx, "07")).find((r) => r.brief?.wave);
        assert.equal(wave.state, "failed");
      }, { stories: ["01", "03"] });
      // one foreign holder at bound 2: 07/01 admitted, 07/03 waits and is admitted after the merge
      await withLaneRepo(async (fx) => {
        let admittedFirst = null;
        const registry = scriptedRegistry({ dispatch: async (input, ctx, real) => {
          if (!input.refs) return await real();
          const answer = await real();
          if (admittedFirst == null) {
            admittedFirst = [...input.refs];
            const [first, ...rest] = answer.dispatched;
            return { ...answer, dispatched: [first, ...rest.map((entry) => ({ ref: entry.ref, ok: true, outcome: "refused", code: "dispatch-capacity-full", value: { ref: entry.ref, outcome: "refused", code: "dispatch-capacity-full", reason: "at-capacity", occupied: 2, holders: [{ ref: "53/01", lastActivityAt: null }] } }))] };
          }
          return answer;
        } });
        const { state, report } = await runWave(fx, { child: fakeLaneChild(fx), rubric: stubRubric(emits(passingTap())), registry });
        assert.equal(state.state, "done", report.lines.join("\n"));
        assert.ok(report.lines.includes("07/03 — at capacity (2/2), waiting for a lane to close."));
        assert.ok(state.driven.some((r) => r.ref === "07/03" && r.lane != null), "07/03 admitted after 07/01's merge while the foreign lane still holds its slot");
      }, { stories: ["01", "03"], config: { dispatch: { concurrency: 2 } } });
    },
  },
  {
    name: "129/04 task05 a wave of one still gets a lane, read off the open answer; a throwing single open halts lane-open-failed naming the error",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const opens = [];
        const registry = scriptedRegistry({ dispatch: async (input, ctx, real) => { const a = await real(); if (input.refs) opens.push({ refs: input.refs, action: a.action, keys: Object.keys(a) }); return a; } });
        const child = fakeLaneChild(fx);
        const { state } = await runWave(fx, { child, rubric: stubRubric(emits(passingTap())), registry });
        assert.equal(state.state, "done");
        assert.deepEqual(opens[0].refs, ["27/04"]);
        assert.equal(opens[0].action, "open", "the single-ref answer shape");
        for (const key of ["worktree", "branch", "bound"]) assert.ok(opens[0].keys.includes(key));
        assert.equal(child.calls.length, 1, "driven in a lane, not the primary");
        assert.equal(path.resolve(child.calls[0].lane), path.resolve(meshDispatchWorktreePath(fx.root, "27/04")));
      }, { stories: [{ number: "04" }], milestone: "27" });
      await withLaneRepo(async (fx) => {
        const registry = scriptedRegistry({ dispatch: async (input, ctx, real) => { if (input.refs) throw Object.assign(new Error("git worktree add failed: disk full"), { code: "dispatch-worktree-add-failed" }); return await real(); } });
        const { state, report } = await runWave(fx, { child: fakeLaneChild(fx), rubric: stubRubric(emits(passingTap())), registry });
        assert.equal(state.act.stop, "lane-open-failed");
        assert.match(report.lines.at(-1), /disk full/u);
      }, { stories: [{ number: "04" }], milestone: "27" });
    },
  },
  {
    name: "129/04 task05 an empty dispatch with held members is dependency-blocked with nothing in flight, and waits for the merge with a lane in flight",
    run: async () => {
      await withLaneRepo(async (fx) => {
        // 27/04 set aside: its cycle cap is exhausted at once — cap 1 with a failing grade re-drive
        // would hand it to the plan; the simpler door is a wave answer the engine holds entirely.
        const registry = scriptedRegistry({ next: async (input, ctx, real) => {
          const a = await real();
          if (!input.throughReview) return a;
          return { ...a, wave: [], heldSet: [{ ref: "27/03", type: "story" }, ...(a.heldSet ?? [])] };
        } });
        const { state, report } = await runWave(fx, { child: fakeLaneChild(fx), rubric: stubRubric(emits(passingTap())), registry });
        assert.equal(state.act.stop, "dependency-blocked");
        assert.equal(state.act.producer, "engine:wave-empty-held");
        assert.match(report.lines.at(-1), /skipped=\["27\/03"\]/u);
        assert.equal(registry.of("work:dispatch").filter((c) => c.input.refs).length, 0, "no work:dispatch ask, no lane");
      }, { stories: [{ number: "03", files: ["src/cli.mjs"] }, { number: "04", files: ["src/d.mjs"] }], milestone: "27" });
      await withLaneRepo(async (fx) => {
        const dispatches = [];
        const registry = scriptedRegistry({ dispatch: async (input, ctx, real) => { if (input.refs) dispatches.push([...input.refs]); return await real(); } });
        const { state, report } = await runWave(fx, { child: fakeLaneChild(fx), rubric: stubRubric(emits(passingTap())), registry });
        assert.equal(state.state, "done", report.lines.join("\n"));
        assert.deepEqual(dispatches[0], ["27/02"], "27/03 is held while 27/02 is in flight");
        assert.deepEqual(dispatches[1], ["27/03"], "…and dispatched after 27/02 merges");
      }, { stories: [{ number: "02", files: ["src/cli.mjs"] }, { number: "03", files: ["src/cli.mjs"] }], milestone: "27" });
    },
  },
  {
    name: "129/04 task05 the bound is narrated from dispatch's answer, never read from config, and wave.mjs holds no concurrency literal",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const registry = scriptedRegistry({ dispatch: async (input, ctx, real) => ({ ...(await real()), bound: 7 }) });
        const { state, report } = await runWave(fx, { child: fakeLaneChild(fx), rubric: stubRubric(emits(passingTap())), registry });
        assert.equal(state.state, "done");
        const bounds = report.lines.filter((line) => /\(bound \d+\)/u.test(line)).map((line) => /\(bound (\d+)\)/u.exec(line)[1]);
        assert.ok(bounds.length > 0);
        assert.ok(bounds.every((b) => b === "7"), `every narrated bound is 7: ${bounds}`);
      }, { stories: ["01"], config: { dispatch: { concurrency: 2 } } });
      const wave = await readFile(new URL("../../src/loop/wave.mjs", import.meta.url), "utf8");
      assert.doesNotMatch(wave, /config\.work\.dispatch|config\.work\.loop|dispatchConcurrencyFromConfig|DEFAULT_DISPATCH_CONCURRENCY/u);
      const stripped = wave.replace(/\/\/[^\n]*/gu, "");
      assert.doesNotMatch(stripped, /\b(?:bound|concurrency)\s*[:=]\s*\d/u, "no numeric concurrency literal");
      assert.ok(LOOP_STOPS.includes("lane-open-failed"));
    },
  },
];
