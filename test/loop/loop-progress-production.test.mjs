// Traceability: milestone 69 / story 06. The loop command consumes the progress
// authority after each measurable continue round; these cases cover the command
// adapters and the pure ordering decision without restating either policy.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { failingCountFromGrade, recordBuildProgress, runLoopBody } from "../../src/commands/loop.mjs";
import {
  decideBuildProgress,
  evaluateProgressPolicy,
  progressSample,
  readProgressSamples,
  sampleWorktreeProgress,
} from "../../src/loop-progress.mjs";
import { readRuns } from "../../src/run-store.mjs";
import { resolveItemExact } from "../../src/commands/resolve.mjs";
import { decideLoopProgress, LOOP_STOPS } from "../../src/work/loop.mjs";
import { completingDriver, loopFixture } from "./loop-command-probe.test.mjs";

const execFileAsync = promisify(execFile);
const AT = "2026-08-23T12:00:00.000Z";

function sample(at, overrides = {}) {
  return progressSample({
    at,
    runId: "run-1",
    filesTouched: ["src/subject.mjs"],
    linesChanged: 4,
    commitsMade: 0,
    failingScenarios: 3,
    ...overrides,
  });
}

// F-69-V9. A round is turned into the ledger the production path would hold for
// it, and `null` is a round whose failing count could not be measured. Task 00's
// rule — `progressSample` refuses a sample with no failing count, so the round
// appends NOTHING — is applied here rather than restated, which is what makes
// the drop a property of the producer and not of the derivative. Every round
// moves the tree, so the sample policy admits each one and the failing-count
// bound is the only thing under test.
function ledgerFor(rounds) {
  const samples = [];
  let linesChanged = 0;
  for (const failingScenarios of rounds) {
    linesChanged += 1;
    if (failingScenarios == null) continue;
    samples.push(sample(`2026-08-23T12:${String(samples.length).padStart(2, "0")}:00.000Z`, {
      linesChanged,
      failingScenarios,
    }));
  }
  return samples;
}

const decideOver = (rounds) => decideLoopProgress({
  samples: ledgerFor(rounds),
  resets: 0,
  maxStalls: 2,
  maxResets: 2,
  evaluateProgressPolicy, decideBuildProgress,
});

async function productionFixture({ counts, mutate, cap = 3 }) {
  const fx = await loopFixture({ cap });
  fx.workspace.config.work.rubric = {
    command: ["node", "fixture-rubric.mjs"],
    report: { format: "tap", floor: 1 },
  };
  const subject = path.join(fx.projectRoot, "subject.txt");
  writeFileSync(subject, "baseline\n");
  await execFileAsync("git", ["init", "--quiet"], { cwd: fx.projectRoot, windowsHide: true });
  await execFileAsync("git", ["add", "."], { cwd: fx.projectRoot, windowsHide: true });
  await execFileAsync("git", ["-c", "user.name=AOF Test", "-c", "user.email=aof@example.invalid", "commit", "--quiet", "-m", "baseline"], { cwd: fx.projectRoot, windowsHide: true });

  let gradeIndex = 0;
  // The first spawn is the story's baseline (2026-09-12) and answers a clean tree, so `counts`
  // still reads cycle by cycle and every failing case below is the story's own.
  let baselineTaken = false;
  const spawnRubric = () => {
    if (!baselineTaken) {
      baselineTaken = true;
      return { status: 0, signal: null, stdout: "TAP version 13\nok - green\n1..1\n", stderr: "" };
    }
    const failed = counts[Math.min(gradeIndex, counts.length - 1)];
    gradeIndex += 1;
    const rows = failed === 0
      ? ["ok - green"]
      : Array.from({ length: failed }, (_, index) => `not ok - failing ${index + 1}`);
    return { status: failed === 0 ? 0 : 1, signal: null, stdout: `TAP version 13\n${rows.join("\n")}\n1..${rows.length}\n`, stderr: "" };
  };
  const driver = completingDriver(fx, {
    onCommand(command) {
      if (mutate && command === "/aof:continue 03/01") appendFileSync(subject, `round ${gradeIndex}\n`);
    },
  });
  driver.options.resumeSessionAvailable = async () => true;
  const reports = [];
  const runCtx = {
    ...fx.ctx,
    spawnRubric,
    agentSessionDriverOptions: driver.options,
    report: (line) => reports.push(line),
  };
  const state = await runLoopBody({ scope: "03", cap }, runCtx);
  const item = await resolveItemExact(fx.ctx, "03/01");
  const continues = (await readRuns(item)).filter((run) => run.brief?.loop?.phase === "continue");
  return { fx, state, driver, item, continues, gradeIndex, reports, runCtx };
}

export const loopProgressProductionTests = [
  {
    name: "69/06 task00 a measurable production round records through the existing producer",
    run: async () => {
      const calls = [];
      const measured = sample(AT);
      const result = await recordBuildProgress({
        item: { dir: "C:/item" },
        run: { runId: "run-1" },
        worktreePath: "C:/lane",
        baseCommit: "abc123",
        failingScenarios: 3,
        at: AT,
      }, {
        sampleWorktreeProgress: async (input) => {
          calls.push(["sample", input]);
          return measured;
        },
        appendProgressSample: async (item, run, row) => {
          calls.push(["append", item, run, row]);
          return row;
        },
      });
      assert.equal(result, measured);
      assert.deepEqual(calls.map(([kind]) => kind), ["sample", "append"]);
      assert.equal(calls[0][1].worktreePath, "C:/lane");
      assert.equal(calls[0][1].baseCommit, "abc123");
    },
  },
  {
    name: "69/06 task00 an absent failing count appends nothing and a producer fault degrades",
    run: async () => {
      let calls = 0;
      const absent = await recordBuildProgress({ failingScenarios: null }, {
        sampleWorktreeProgress: async () => { calls += 1; },
      });
      assert.equal(absent, null);
      assert.equal(calls, 0);

      const faults = [];
      const degraded = await recordBuildProgress({
        item: { dir: "C:/item" },
        run: { runId: "run-1" },
        worktreePath: "C:/gone",
        baseCommit: "abc123",
        failingScenarios: 3,
        at: AT,
      }, {
        sampleWorktreeProgress: async () => { throw new Error("gone"); },
        onFault: (error) => faults.push(error.message),
      });
      assert.equal(degraded, null);
      assert.deepEqual(faults, ["gone"]);
    },
  },
  {
    name: "69/06 task00 each failed sample source degrades without manufacturing a count",
    run: async () => {
      const rows = [
        ["porcelain", async (args) => args[0] === "status" ? { status: 1, stdout: "" } : { status: 0, stdout: args[0] === "diff" ? "1\t0\ta.mjs\n" : "0\n" }, "sample"],
        ["numstat", async (args) => ({ status: args[0] === "diff" ? 1 : 0, stdout: args[0] === "status" ? " M a.mjs\n" : "" }), "none"],
        ["commit count", async (args) => ({ status: args[0] === "rev-list" ? 1 : 0, stdout: args[0] === "status" ? " M a.mjs\n" : args[0] === "diff" ? "1\t0\ta.mjs\n" : "" }), "none"],
      ];
      for (const [source, exec, expected] of rows) {
        const faults = [];
        let appended = null;
        const result = await recordBuildProgress({
          item: { dir: "C:/item" },
          run: { runId: "run-1" },
          worktreePath: "C:/lane",
          baseCommit: "abc123",
          failingScenarios: 3,
          at: AT,
        }, {
          sampleWorktreeProgress: (input) => sampleWorktreeProgress(input, { exec }),
          appendProgressSample: async (_item, _run, measured) => { appended = measured; return measured; },
          onFault: (error) => faults.push(error),
        });
        assert.equal(result == null ? "none" : "sample", expected, source);
        assert.equal(appended == null ? "none" : "sample", expected, `${source} append`);
        if (source === "porcelain") assert.deepEqual(result.filesTouched, []);
        else assert.equal(faults.length, 1, `${source} reports its fault`);
      }

      const faults = [];
      const appendFault = await recordBuildProgress({
        item: { dir: "C:/item" }, run: { runId: "run-1" }, worktreePath: "C:/lane",
        baseCommit: "abc123", failingScenarios: 3, at: AT,
      }, {
        sampleWorktreeProgress: async () => sample(AT),
        appendProgressSample: async () => { throw new Error("append refused"); },
        onFault: (error) => faults.push(error.message),
      });
      assert.equal(appendFault, null);
      assert.deepEqual(faults, ["append refused"]);
    },
  },
  {
    name: "69/06 task01 the grade adapter accepts only measured pass/fail case counts",
    run() {
      assert.equal(failingCountFromGrade({ grade: { verdict: "fail", cases: { failed: 4 } } }), 4);
      assert.equal(failingCountFromGrade({ grade: { verdict: "pass", cases: { failed: 0 } } }), 0);
      assert.equal(failingCountFromGrade({ grade: { verdict: "indeterminate", cases: { failed: 0 } } }), null);
      assert.equal(failingCountFromGrade({ grade: { verdict: "fail", cases: { failed: "4" } } }), null);
      assert.equal(failingCountFromGrade({ maker: { failing: 4 } }), null);
    },
  },
  {
    name: "69/06 task01 sample stalls reset before the failing-count derivative can halt",
    run() {
      const samples = [
        sample(AT),
        sample("2026-08-23T12:01:00.000Z"),
        sample("2026-08-23T12:02:00.000Z"),
      ];
      assert.deepEqual(decideLoopProgress({ samples, resets: 0, maxStalls: 2, maxResets: 2, evaluateProgressPolicy, decideBuildProgress }), {
        act: "reset",
        producer: "progress:samples",
        resets: 1,
        stalls: 2,
        summary: {
          sampleCount: 3,
          filesTouched: ["src/subject.mjs"],
          linesChanged: 4,
          commitsMade: 0,
          failingScenarios: 3,
        },
      });
    },
  },
  {
    name: "69/06 task01 exhausted resets escalate and productive grinding halts on no progress",
    run() {
      const stalled = [sample(AT), sample("2026-08-23T12:01:00.000Z"), sample("2026-08-23T12:02:00.000Z")];
      const escalated = decideLoopProgress({ samples: stalled, resets: 2, maxStalls: 2, maxResets: 2, evaluateProgressPolicy, decideBuildProgress });
      assert.equal(escalated.act, "halt");
      assert.equal(escalated.stop, "progress-exhausted");
      assert.equal(escalated.resetBound, 2);
      assert.equal(escalated.disposition, "preserved-for-triage");

      const grinding = [
        sample(AT, { linesChanged: 1 }),
        sample("2026-08-23T12:01:00.000Z", { linesChanged: 2 }),
        sample("2026-08-23T12:02:00.000Z", { linesChanged: 3 }),
      ];
      const halted = decideLoopProgress({ samples: grinding, resets: 0, maxStalls: 2, maxResets: 2, evaluateProgressPolicy, decideBuildProgress });
      assert.equal(halted.act, "halt");
      assert.equal(halted.stop, "no-progress");
      assert.equal(halted.failingCount, 3);
      assert.equal(halted.progressBound, 2);
    },
  },
  {
    name: "69/06 task01 green crosses without consulting the progress bound and stop literals stay aligned",
    run() {
      const green = decideLoopProgress({
        samples: [sample(AT, { failingScenarios: 0 })],
        resets: 0,
        maxStalls: 2,
        maxResets: 2,
        evaluateProgressPolicy,
        decideBuildProgress,
      });
      assert.equal(green.act, "done");
      assert.equal(green.progressBoundConsulted, false);
      for (const stop of ["deadline-exhausted", "progress-exhausted", "no-progress", "grade-indeterminate"]) {
        assert.ok(LOOP_STOPS.includes(stop));
      }
    },
  },
  {
    name: "69/06 task01 [outline] the failing counts a build measured, and what the loop does next",
    run() {
      // The nine rows of task01's outline, at the declared defaults, the sample
      // policy having admitted each round. `null` is a round whose count was
      // absent — the `—` of the table.
      const rows = [
        { sequence: [9, 12], outcome: "continue" },
        { sequence: [4, 4, 4], outcome: "halt" },
        { sequence: [9, 9, 8], outcome: "continue" },
        { sequence: [9, null, 9], outcome: "continue" },
        { sequence: [9, 9, null], outcome: "continue" },
        { sequence: [9, 9, null, 9], outcome: "halt" },
        { sequence: [null, null, null], outcome: "continue" },
        { sequence: [9, 9, 0], outcome: "done" },
        { sequence: [null, 0], outcome: "done" },
      ];
      const label = (sequence) => sequence.map((count) => count ?? "—").join(", ");
      for (const { sequence, outcome } of rows) {
        const decision = decideOver(sequence);
        assert.equal(decision.act, outcome, `${label(sequence)} → ${outcome} (got ${decision.act})`);
        if (outcome === "halt") assert.equal(decision.stop, "no-progress", `${label(sequence)} halts on no progress`);
      }

      // The bound counts non-reducing transitions BETWEEN MEASURED ROUNDS, so an
      // unmeasured round in the middle leaves the same two transitions the
      // uninterrupted run has — and the same halt.
      assert.deepEqual(decideOver([9, 9, null, 9]).stop, decideOver([9, 9, 9]).stop);
      assert.equal(decideOver([9, 9, null, 9]).noProgressRounds, decideOver([9, 9, 9]).noProgressRounds);
      // A build nothing could measure is a continue that SAYS it measured
      // nothing, never a halt manufactured from the absence of evidence.
      assert.deepEqual(decideOver([null, null, null]), { act: "continue", measured: false });
    },
  },
  {
    name: "69/06 task01 an unmeasured round neither halts nor counts as a stall, and its absence is never a zero",
    run() {
      // Both halves of the drop are deliberate and each is load-bearing on its
      // own. Counting an absent round as a stall would halt this build for a
      // flaky gate:
      const trailingAbsent = decideOver([9, 9, null]);
      assert.equal(trailingAbsent.act, "continue");
      assert.equal(trailingAbsent.noProgressRounds, 1, "the absent round added no stall");
      assert.equal(decideOver([9, 9]).noProgressRounds, trailingAbsent.noProgressRounds);
      // ...and letting it CLEAR the accumulated stalls would hand any build an
      // escape from the bound by failing to measure, which is the 11h07m burn
      // again by a quieter route:
      assert.equal(decideOver([9, 9, null, 9]).act, "halt");

      // The zero an indeterminate grade reports is the absence of a measurement
      // wearing the shape of one. Read as a measurement it crosses the phase;
      // read correctly it never reaches the ledger at all.
      assert.equal(failingCountFromGrade({ grade: { verdict: "indeterminate", cases: { failed: 0 } } }), null);
      assert.equal(ledgerFor([9, 9, null]).length, 2, "the unmeasured round appended no sample");
      assert.deepEqual(ledgerFor([9, 9, null]).map((entry) => entry.failingScenarios), [9, 9], "and no sample carries a count nobody measured");
      assert.equal(decideOver([9, 9, 0]).act, "done", "a MEASURED zero is a different answer entirely");

      // An empty ledger is the honest unbounded state: dormant, and saying so.
      assert.deepEqual(decideLoopProgress({ samples: [], resets: 0, maxStalls: 2, maxResets: 2, evaluateProgressPolicy, decideBuildProgress }), { act: "continue", measured: false });
      assert.deepEqual(decideLoopProgress({}), { act: "continue", measured: false });
    },
  },
  {
    name: "69/06 task00 a committed round counts from its starting commit, not a tree hash",
    run: async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-progress-production-"));
      try {
        await execFileAsync("git", ["init", "--quiet", root], { windowsHide: true });
        await execFileAsync("git", ["-C", root, "config", "user.name", "AOF Test"], { windowsHide: true });
        await execFileAsync("git", ["-C", root, "config", "user.email", "aof@example.invalid"], { windowsHide: true });
        await execFileAsync("git", ["-C", root, "commit", "--allow-empty", "--quiet", "-m", "baseline"], { windowsHide: true });
        const { stdout } = await execFileAsync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8", windowsHide: true });
        await execFileAsync("git", ["-C", root, "commit", "--allow-empty", "--quiet", "-m", "round"], { windowsHide: true });
        let captured = null;
        await recordBuildProgress({
          item: { dir: root },
          run: { runId: "run-1" },
          worktreePath: root,
          baseCommit: stdout.trim(),
          failingScenarios: 1,
          at: AT,
        }, {
          appendProgressSample: async (_item, _run, row) => { captured = row; return row; },
        });
        assert.equal(captured.commitsMade, 1);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "69/06 task00 the loop command appends measurable rounds to the attempt ledger",
    run: async () => {
      const result = await productionFixture({ counts: [3, 3, 3], mutate: true });
      try {
        assert.equal(result.state.act.stop, "no-progress");
        assert.equal(result.gradeIndex, 3);
        assert.equal(result.continues.length, 3);
        const samples = await readProgressSamples(result.item, result.continues[0]);
        assert.equal(samples.length, 3);
        assert.deepEqual(samples.map((row) => row.failingScenarios), [3, 3, 3]);
        assert.ok(samples[2].linesChanged > samples[1].linesChanged, "the production samples measure the driven tree");
      } finally {
        await result.fx.cleanup();
      }
    },
  },
  {
    name: "69/06 task01 production resets start cold, persist their tally, and eventually escalate",
    run: async () => {
      const result = await productionFixture({ counts: [3], mutate: false });
      try {
        assert.equal(result.state.act.stop, "progress-exhausted");
        assert.equal(result.state.act.resets, 2);
        assert.equal(result.continues.length, 9);
        assert.equal(result.driver.spawnCalls[1].args.includes("--resume"), true);
        assert.equal(result.driver.spawnCalls[2].args.includes("--resume"), true);
        assert.equal(result.driver.spawnCalls[3].args.includes("--resume"), false, "the post-reset attempt is a fresh session");
        assert.equal(result.continues[3].brief.progress.resets, 1);
        assert.equal(result.continues[3].brief.progress.attemptRunId, null);
        assert.equal(result.continues[3].brief.progress.summary.sampleCount, 3);
        assert.equal(result.continues[3].brief.progress.continuation, true);
        assert.deepEqual(result.continues.map((run) => run.brief.loop.cycle), Array(9).fill(1), "progress rounds consume their own bound, not the engine cycle cap");
        assert.equal((await readProgressSamples(result.item, result.continues[0])).length, 3);
        assert.equal((await readProgressSamples(result.item, result.continues[3])).length, 3);
        assert.equal((await readProgressSamples(result.item, result.continues[6])).length, 3);
        assert.match(result.reports.at(-1), /resets=2; resetBound=2; summary=/u, "the coded escalation details survive to the reported line");

        const resumedDriver = completingDriver(result.fx);
        const resumed = await runLoopBody({ scope: "03", cap: 3, resume: true }, {
          ...result.runCtx,
          agentSessionDriverOptions: resumedDriver.options,
          report: () => {},
        });
        assert.equal(resumed.act.stop, "progress-exhausted");
        assert.equal(resumed.act.resets, 2, "resume reconstructs this loop run's reset tally from its brief");
        assert.equal(resumedDriver.spawnCalls.length, 0, "resume does not start a fourth identical attempt");
      } finally {
        await result.fx.cleanup();
      }
    },
  },
];
