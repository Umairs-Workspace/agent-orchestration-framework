// Traceability: milestone 69 / story 03. The ledger records deterministic samples,
// appends them beside a run, and bounds stalls without asking a model for a verdict.
import assert from "node:assert/strict";
import { access, appendFile, mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  appendProgressSample,
  decideBuildProgress,
  evaluateProgressPolicy,
  madeProgress,
  progressLedgerPath,
  progressPolicyFromConfig,
  progressSample,
  readProgressSamples,
  sampleWorktreeProgress,
} from "../../src/loop-progress.mjs";
import { readRuns, startRun } from "../../src/run-store.mjs";

const AT = "2026-08-23T10:00:00.000Z";

const sample = (overrides = {}) => progressSample({
  at: AT,
  runId: "run-1",
  filesTouched: ["src/a.mjs"],
  linesChanged: 4,
  commitsMade: 0,
  failingScenarios: 3,
  ...overrides,
});

async function fixture(node = null) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-loop-progress-"));
  const item = { ref: "69/03", dir: path.join(root, "wiki", "work", "69_milestone", "stories", "03_story") };
  await mkdir(item.dir, { recursive: true });
  const run = await startRun(item, { now: AT, node });
  return { root, item, run, cleanup: () => rm(root, { recursive: true, force: true }) };
}

export const loopProgressTests = [
  {
    name: "69/03 task00 a sample carries only deterministic measures and no progress judgement",
    run() {
      assert.deepEqual(sample({ filesTouched: ["src/b.mjs", "src/a.mjs", "src/a.mjs"] }), {
        at: AT,
        runId: "run-1",
        filesTouched: ["src/a.mjs", "src/b.mjs"],
        linesChanged: 4,
        commitsMade: 0,
        failingScenarios: 3,
      });
    },
  },
  {
    name: "69/03 task00 worktree sampling reuses porcelain changes and deterministic git counts",
    run: async () => {
      const calls = [];
      const sampled = await sampleWorktreeProgress({
        at: AT,
        runId: "run-1",
        worktreePath: "C:/lane",
        baseCommit: "abc123",
        failingScenarios: 3,
      }, {
        exec: async (args) => {
          calls.push(args);
          if (args[0] === "status") return { status: 0, stdout: " M src/a.mjs\n?? test/new.test.mjs\n" };
          if (args[0] === "diff") return { status: 0, stdout: "3\t1\tsrc/a.mjs\n2\t0\ttest/new.test.mjs\n" };
          return { status: 0, stdout: "2\n" };
        },
      });
      assert.deepEqual(sampled, sample({
        filesTouched: ["src/a.mjs", "test/new.test.mjs"],
        linesChanged: 6,
        commitsMade: 2,
      }));
      assert.deepEqual(calls.map((args) => args[0]), ["status", "diff", "rev-list"]);
    },
  },
  {
    name: "69/03 task00 later samples append byte-for-byte and stay invisible to readRuns",
    run: async () => {
      const fx = await fixture("worker-a");
      try {
        const before = await readRuns(fx.item);
        const first = await appendProgressSample(fx.item, fx.run, sample({ runId: fx.run.runId }));
        const ledgerPath = progressLedgerPath(fx.item, fx.run);
        const firstBytes = await readFile(ledgerPath, "utf8");
        await appendProgressSample(fx.item, fx.run, sample({ runId: fx.run.runId, at: "2026-08-23T10:01:00.000Z", commitsMade: 1 }));
        const afterBytes = await readFile(ledgerPath, "utf8");
        assert.ok(afterBytes.startsWith(firstBytes));
        assert.deepEqual(await readProgressSamples(fx.item, fx.run), [first, sample({ runId: fx.run.runId, at: "2026-08-23T10:01:00.000Z", commitsMade: 1 })]);
        assert.deepEqual(await readRuns(fx.item), before, "the sibling NDJSON is not a run record and changed no run key");
      } finally { await fx.cleanup(); }
    },
  },
  {
    name: "69/03 task00 a torn sample is reported and skipped while readable samples survive",
    run: async () => {
      const fx = await fixture();
      try {
        await appendProgressSample(fx.item, fx.run, sample({ runId: fx.run.runId }));
        await appendFile(progressLedgerPath(fx.item, fx.run), "{torn\n", "utf8");
        const faults = [];
        const rows = await readProgressSamples(fx.item, fx.run, { onFault: (error) => faults.push(error) });
        assert.equal(rows.length, 1);
        assert.equal(faults.length, 1);
      } finally { await fx.cleanup(); }
    },
  },
  ...[
    ["the failing-scenario count fell", { failingScenarios: 2 }, true],
    ["a commit was made", { commitsMade: 1 }, true],
    ["new files were touched", { filesTouched: ["src/a.mjs", "src/b.mjs"] }, true],
    ["the line count changed", { linesChanged: 5 }, true],
    ["the failing-scenario count rose", { failingScenarios: 4 }, true],
    ["nothing changed", {}, false],
  ].map(([label, change, expected]) => ({
    name: `69/03 task00 progress row - ${label}`,
    run() {
      assert.equal(madeProgress(sample(), sample({ at: "2026-08-23T10:01:00.000Z", ...change })), expected);
    },
  })),
  {
    name: "69/03 task01 one no-progress comparison continues; the configured second resets with a summary",
    run() {
      const baseline = sample();
      const unchanged = sample({ at: "2026-08-23T10:01:00.000Z" });
      assert.deepEqual(evaluateProgressPolicy([baseline, unchanged], { maxStalls: 2, maxResets: 2 }), { action: "continue", stalls: 1, resets: 0 });
      const result = evaluateProgressPolicy([baseline, unchanged, sample({ at: "2026-08-23T10:02:00.000Z" })], { maxStalls: 2, maxResets: 2 });
      assert.equal(result.action, "reset");
      assert.equal(result.resets, 1);
      assert.equal(result.summary.sampleCount, 3);
      assert.deepEqual(result.summary.filesTouched, ["src/a.mjs"]);
    },
  },
  {
    name: "69/03 task01 progress clears stalls and repeated resets escalate without discarding evidence",
    run() {
      const rows = [
        sample(),
        sample({ at: "2026-08-23T10:01:00.000Z" }),
        sample({ at: "2026-08-23T10:02:00.000Z", commitsMade: 1 }),
        sample({ at: "2026-08-23T10:03:00.000Z", commitsMade: 1 }),
      ];
      assert.deepEqual(evaluateProgressPolicy(rows, { maxStalls: 2, maxResets: 2 }), { action: "continue", stalls: 1, resets: 0 });
      const escalated = evaluateProgressPolicy([...rows, sample({ at: "2026-08-23T10:04:00.000Z", commitsMade: 1 })], { maxStalls: 2, maxResets: 2, resets: 2 });
      assert.equal(escalated.action, "escalate");
      assert.equal(escalated.disposition, "preserved-for-triage");
      assert.equal(escalated.summary.commitsMade, 1);
    },
  },
  {
    name: "69/03 task01 escalation preserves the worktree and the samples that justified it",
    run: async () => {
      const fx = await fixture();
      try {
        for (const at of [AT, "2026-08-23T10:01:00.000Z", "2026-08-23T10:02:00.000Z"]) {
          await appendProgressSample(fx.item, fx.run, sample({ runId: fx.run.runId, at }));
        }
        const rows = await readProgressSamples(fx.item, fx.run);
        const result = evaluateProgressPolicy(rows, { maxStalls: 2, maxResets: 2, resets: 2 });
        assert.equal(result.action, "escalate");
        assert.equal((await readProgressSamples(fx.item, fx.run)).length, 3);
        await assert.doesNotReject(access(fx.item.dir));
      } finally { await fx.cleanup(); }
    },
  },
  {
    name: "69/03 task01 stall and reset bounds resolve from the declared loop home",
    run() {
      assert.deepEqual(progressPolicyFromConfig({ config: { work: { loop: { buildNoProgressRounds: 4, progressMaxResets: 3 } } } }), {
        maxStalls: 4,
        maxResets: 3,
      });
    },
  },
  ...[
    [[9, 6, 3], "continue"],
    [[9, 9], "continue"],
    [[9, 9, 9], "halt"],
    [[9, 9, 6, 6], "continue"],
    [[9, 9, 6, 6, 6], "halt"],
    [[9, 12, 12], "halt"],
    [[9, 3, 0], "done"],
  ].map(([counts, action]) => ({
    name: `69/03 task02 failing-count sequence ${counts.join(", ")} ${action}`,
    run() {
      const result = decideBuildProgress(counts, { maxStalls: 2 });
      assert.equal(result.action, action);
      if (action === "halt") {
        assert.equal(result.stop, "no-progress");
        assert.equal(result.failingCount, counts.at(-1));
      }
      if (action === "done") assert.equal(result.progressBoundConsulted, false);
    },
  })),
  {
    name: "69/03 task02 the framework build loop points at the progress authority, not a numeric round count",
    run: async () => {
      const record = await readFile(path.join(process.cwd(), "src", "bundle", "loops", "build-to-green.md"), "utf8");
      assert.match(record, /ceiling:\s*\[config:work\.loop\.buildNoProgressRounds\]/u);
      assert.doesNotMatch(record, /ceiling:\s*\[?\d/u);
    },
  },
];
