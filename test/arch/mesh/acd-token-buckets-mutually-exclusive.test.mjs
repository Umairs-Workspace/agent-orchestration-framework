import { defaultApplication as _aofApplication } from "aof/default-application";
// Fitness function: acd-token-buckets-mutually-exclusive (milestone 68 / story 00 /
// 68/ADR-003 / FF-6803) — "Token buckets are mutually exclusive and writer-enforced."
//
//   "The four buckets are the only token keys, and the refusal of an
//    overlapping/negative/partial spend happens in the write path — not in a caller,
//    not in a comment."
//
// The enforcement lives in the WRITER (packages/core/src/run-store.mjs): a spend whose buckets are
// not all present, carries a fifth token key, or holds a negative/non-integer bucket
// is REFUSED with a typed error and persists nothing. A caller cannot opt out of it.
import assert from "node:assert/strict";
import { readdir, readFile, mkdtemp, rm, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SRC = path.join(root, "packages", "core", "src");
const RUN_STORE = path.join(root, "packages/execution/src/runs.mjs");

async function modulesUnder(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await modulesUnder(target));
    else if (entry.name.endsWith(".mjs")) out.push(target);
  }
  return out;
}

function definesBucketPolicy(code) {
  // A composition alias retains the policy by identity; only the initializer's
  // property read is admitted. A second array/derivation remains a definition.
  const declarations = [...code.matchAll(/\b(?:const|let|var)\s+TOKEN_BUCKET_KEYS\s*=\s*([^;]+);/gu)];
  return declarations.some(match => !/^\w+\.TOKEN_BUCKET_KEYS$/u.test(match[1].trim()))
    || /cacheCreate/.test(code) && /"input"/.test(code);
}

async function makeItem() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-buckets-"));
  const dir = path.join(repo, "wiki", "work", "68_milestone_loop-telemetry");
  await mkdir(dir, { recursive: true });
  return { repo, item: { ref: "68", dir } };
}

function validSpend(tokens) {
  return {
    model: "claude-sonnet",
    effort: "high",
    tokens,
    costUsd: 0,
    costSource: "priced",
    priceTable: "v1",
    turns: 1,
    toolCalls: 1,
    exitReason: "final_output",
  };
}

export const archTests = [
  {
    name: "arch/68 FF-6803 (acd-token-buckets-mutually-exclusive): the four buckets are the closed set of token keys, declared once in the writer",
    run: async () => {
      const store = await Promise.resolve(Object.freeze({
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
      assert.deepEqual(store.TOKEN_BUCKET_KEYS, ["input", "output", "cacheRead", "cacheCreate"], "the four mutually-exclusive buckets are exactly input/output/cacheRead/cacheCreate");
      const code = (await readFile(RUN_STORE, "utf8")).replace(/\r\n/gu, "\n");
      // The validation lives IN the writer (run-store.mjs) — the enforcement point.
      assert.match(code, /nonNegativeInteger/, "the writer holds the non-negative-integer bucket guard");
      assert.match(code, /TOKEN_BUCKET_KEYS/, "the writer names the closed bucket set");
    },
  },
  {
    name: "arch/68 FF-6803 (acd-token-buckets-mutually-exclusive): no module outside run-store.mjs re-derives its own bucket validation — the writer is the only enforcement home",
    run: async () => {
      const modules = (await readRuntimeFiles(root, { runtime: "node" })).map(file => file.path).filter(file => file !== RUN_STORE);
      assert.ok(modules.length > 150, `src was actually walked: ${modules.length} modules`);
      const offenders = [];
      for (const file of modules) {
        const code = (await readFile(file, "utf8")).replace(/\r\n/gu, "\n");
        // A second module that owns its own bucket rule would let a caller opt out
        // of the convention — the whole point of writer-enforcement is one home.
        // Imported/injected keys preserve the one policy home. A second declaration or
        // bucket-set literal defines a competing rule and still fails the sweep.
        if (definesBucketPolicy(code)) {
          offenders.push(path.relative(root, file));
        }
      }
      assert.deepEqual(offenders, [], `no module outside run-store.mjs re-derives the bucket convention (offenders: ${offenders.join("; ")})`);
      assert.equal(definesBucketPolicy('const TOKEN_BUCKET_KEYS = ["input", "output", "cacheRead", "cacheCreate"];'), true, "a planted second policy is refused");
      assert.equal(definesBucketPolicy('const TOKEN_BUCKET_KEYS = implementation.TOKEN_BUCKET_KEYS;'), false, "a composition property alias retains identity");
      assert.equal(definesBucketPolicy('const TOKEN_BUCKET_KEYS = implementation.TOKEN_BUCKET_KEYS.slice();'), true, "a derived copy is not a property alias");
    },
  },
  {
    name: "arch/68 FF-6803 (acd-token-buckets-mutually-exclusive): the writer refuses a partial, overlapping-set, negative or non-integer bucket spend and persists nothing (behaviour over the real seam)",
    run: async () => {
      const { repo, item } = await makeItem();
      try {
        const store = await Promise.resolve(Object.freeze({
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
        const cases = [
          { label: "missing cacheCreate", spend: validSpend({ input: 1, output: 1, cacheRead: 1 }), code: "token-buckets-partial" },
          { label: "fifth token key", spend: validSpend({ input: 1, output: 1, cacheRead: 1, cacheCreate: 1, inclusive: 2 }), code: "token-buckets-closed-set" },
          { label: "negative input", spend: validSpend({ input: -1, output: 1, cacheRead: 1, cacheCreate: 1 }), code: "token-buckets-invalid" },
          { label: "fractional cacheRead", spend: validSpend({ input: 1, output: 1, cacheRead: 1.5, cacheCreate: 1 }), code: "token-buckets-invalid" },
          { label: "string input", spend: validSpend({ input: "1", output: 1, cacheRead: 1, cacheCreate: 1 }), code: "token-buckets-invalid" },
        ];
        for (const c of cases) {
          const record = await store.startRun(item, { now: "2026-08-20T10:00:00.000Z" });
          await assert.rejects(
            () => store.settleRun(item, { runId: record.runId, spend: c.spend }),
            (err) => err.code === c.code,
            `[${c.label}] the writer refuses the malformed spend`
          );
          const runs = await store.readRuns(item);
          const reloaded = runs.find((run) => run.runId === record.runId);
          assert.equal(reloaded.spend, null, `[${c.label}] the record's spend is left exactly as it was (nothing persisted)`);
          await store.completeRun(item, { runId: record.runId, outcome: "done", now: "2026-08-20T11:00:00.000Z" });
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
];
