import { defaultApplication as _aofApplication } from "aof/default-application";
// Fitness function: acd-run-partition-ready (milestone 19, ADR-002 / fitness #3).
//
// Partition-ready layout: run records are PER-RUN files under runs/, never one
// monolithic aggregate — so milestone 26's <node>/ segment is a pure additive path
// delta (no aggregate file to migrate or rewrite). The run path is built by a SINGLE
// seam (runRecordPath/runsDir) the <node> segment slots into.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const RUN_STORE = new URL("../../../packages/execution/src/runs.mjs", import.meta.url);

export const archTests = [
  {
    name: "arch/run-partition-ready: N runs produce N discrete files under runs/ with no monolithic aggregate",
    async run() {
      // Lazy-import the store INSIDE run() (house discipline R4/m06).
      const { startRun, completeRun } = await Promise.resolve(Object.freeze({
  COST_SOURCES: _aofApplication.execution.runs.COST_SOURCES,
  DEFAULT_PARK_MINUTES: _aofApplication.execution.runs.DEFAULT_PARK_MINUTES,
  EXIT_REASONS: _aofApplication.execution.runs.EXIT_REASONS,
  PRICE_TABLE_VERSION: _aofApplication.execution.runs.PRICE_TABLE_VERSION,
  SPEND_ENVELOPE_KEYS: _aofApplication.execution.runs.SPEND_ENVELOPE_KEYS,
  TOKEN_BUCKET_KEYS: _aofApplication.execution.runs.TOKEN_BUCKET_KEYS,
  answerRunAsk: _aofApplication.execution.runs.answerRunAsk,
  applyTransition: _aofApplication.execution.runs.applyTransition,
  completeRun: _aofApplication.execution.runs.completeRun,
  heartbeat: _aofApplication.execution.runs.heartbeat,
  isLegalTransition: _aofApplication.execution.runs.isLegalTransition,
  isRetryable: _aofApplication.execution.runs.isRetryable,
  isRunning: _aofApplication.execution.runs.isRunning,
  isStale: _aofApplication.execution.runs.isStale,
  mapVendorTokensToBuckets: _aofApplication.execution.runs.mapVendorTokensToBuckets,
  openRunAsk: _aofApplication.execution.runs.openRunAsk,
  parkRunAsk: _aofApplication.execution.runs.parkRunAsk,
  parseResumeAfter: _aofApplication.execution.runs.parseResumeAfter,
  priceVendorTokens: _aofApplication.execution.runs.priceVendorTokens,
  pruneRun: _aofApplication.execution.runs.pruneRun,
  readRuns: _aofApplication.execution.runs.readRuns,
  reclaimRun: _aofApplication.execution.runs.reclaimRun,
  reclaimStaleRuns: _aofApplication.execution.runs.reclaimStaleRuns,
  recordAnchorReading: _aofApplication.execution.runs.recordAnchorReading,
  recordAnswers: _aofApplication.execution.runs.recordAnswers,
  recordSessionId: _aofApplication.execution.runs.recordSessionId,
  retryReadiness: _aofApplication.execution.runs.retryReadiness,
  retryRun: _aofApplication.execution.runs.retryRun,
  rewriteRunItemRef: _aofApplication.execution.runs.rewriteRunItemRef,
  runNodeRecordPath: _aofApplication.execution.runs.runNodeRecordPath,
  runRecordPath: _aofApplication.execution.runs.runRecordPath,
  runsDir: _aofApplication.execution.runs.runsDir,
  settleRun: _aofApplication.execution.runs.settleRun,
  settleRunFromVendor: _aofApplication.execution.runs.settleRunFromVendor,
  staleRunningRuns: _aofApplication.execution.runs.staleRunningRuns,
  startRun: _aofApplication.execution.runs.startRun,
  shouldRetry: _aofApplication.execution.runs.shouldRetry,
}));

      const repo = await mkdtemp(path.join(os.tmpdir(), "aof-run-partition-"));
      try {
        const workDir = path.join(repo, "wiki", "work");
        const mDir = path.join(workDir, "19_milestone_work-run-lifecycle");
        await mkdir(mDir, { recursive: true });
        const item = { ref: "19", dir: mDir };

        // 20/ADR-006 dedup forbids two non-terminal runs per item — complete each
        // before the next so N discrete per-run files still accrue (partition-ready).
        const N = 5;
        const created = [];
        for (let i = 0; i < N; i += 1) {
          created.push(await startRun(item));
          await completeRun(item, { outcome: "done" });
        }

        const entries = await readdir(path.join(mDir, "runs"));
        // exactly N discrete files, one per run, named by runId
        assert.equal(entries.length, N, `runs/ holds exactly ${N} discrete files (one per run)`);
        const jsonFiles = entries.filter((name) => name.endsWith(".json"));
        assert.equal(jsonFiles.length, N, "every entry is a per-run .json file");
        assert.deepEqual(
          jsonFiles.sort(),
          created.map((r) => `${r.runId}.json`).sort(),
          "each file is named by its run's runId"
        );

        // NO monolithic aggregate: no runs.json (or any combined-log file) exists.
        assert.ok(!entries.includes("runs.json"), "there is no monolithic runs.json aggregate");
        assert.ok(
          !entries.some((name) => name === "runs.json" || name === "log.json" || name === "index.json"),
          "no aggregate/combined-log file alongside the per-run files"
        );
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/run-partition-ready: the run-file path is built by a single seam the <node> segment slots into",
    async run() {
      const source = await readFile(RUN_STORE, "utf8");
      const code = stripComments(source);

      // The ONE run-file path builder is runRecordPath, built from runsDir — the single
      // join site that produces a run-file path. milestone 26's <node>/ segment slots in
      // as join(runsDir(item), node, runId + ".json") — one edit, here.
      const recordPathDefs = [...code.matchAll(/function\s+runRecordPath\s*\(/g)];
      assert.equal(recordPathDefs.length, 1, "runRecordPath is defined exactly once (the single run-file path builder)");

      // runRecordPath builds its path from runsDir(...) + the runId stem — no other
      // function joins a runId into a path.
      assert.ok(
        /runRecordPath[\s\S]*?path\.join\s*\(\s*runsDir\s*\(\s*item\s*\)/.test(code),
        "runRecordPath joins runsDir(item) (the seam the <node> segment slots into)"
      );

      // The only `runId + ".json"` (the run-file stem) appears inside runRecordPath —
      // the single place a run-file name is assembled.
      const stemSites = [...code.matchAll(/runId\s*\+\s*["']\.json["']/g)];
      assert.equal(stemSites.length, 1, "the run-file name is assembled in exactly one place");
    },
  },
];

function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}
