// Fitness function: acd-token-buckets-mutually-exclusive (milestone 68 / story 00 /
// 68/ADR-003 / FF-6803) — "Token buckets are mutually exclusive and writer-enforced."
//
//   "The four buckets are the only token keys, and the refusal of an
//    overlapping/negative/partial spend happens in the write path — not in a caller,
//    not in a comment."
//
// The enforcement lives in the WRITER (src/run-store.mjs): a spend whose buckets are
// not all present, carries a fifth token key, or holds a negative/non-integer bucket
// is REFUSED with a typed error and persists nothing. A caller cannot opt out of it.
import assert from "node:assert/strict";
import { readdir, readFile, mkdtemp, rm, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SRC = path.join(root, "src");
const RUN_STORE = path.join(SRC, "run-store.mjs");

async function modulesUnder(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await modulesUnder(target));
    else if (entry.name.endsWith(".mjs")) out.push(target);
  }
  return out;
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
      const store = await import("../../../src/run-store.mjs");
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
      const modules = await modulesUnder(SRC).then((list) => list.filter((file) => path.basename(file) !== "run-store.mjs"));
      assert.ok(modules.length > 150, `src was actually walked: ${modules.length} modules`);
      const offenders = [];
      for (const file of modules) {
        const code = (await readFile(file, "utf8")).replace(/\r\n/gu, "\n");
        // A second module that owns its own bucket rule would let a caller opt out
        // of the convention — the whole point of writer-enforcement is one home.
        if (/\bTOKEN_BUCKET_KEYS\b/.test(code) || /cacheCreate/.test(code) && /"input"/.test(code)) {
          offenders.push(path.relative(root, file));
        }
      }
      assert.deepEqual(offenders, [], `no module outside run-store.mjs re-derives the bucket convention (offenders: ${offenders.join("; ")})`);
    },
  },
  {
    name: "arch/68 FF-6803 (acd-token-buckets-mutually-exclusive): the writer refuses a partial, overlapping-set, negative or non-integer bucket spend and persists nothing (behaviour over the real seam)",
    run: async () => {
      const { repo, item } = await makeItem();
      try {
        const store = await import("../../../src/run-store.mjs");
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
