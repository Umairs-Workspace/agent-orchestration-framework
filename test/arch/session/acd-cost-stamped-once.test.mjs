// Fitness function: acd-cost-stamped-once (milestone 68 / story 00 / 68/ADR-004 /
// FF-6804) — "Cost is stamped once."
//
//   "No read path multiplies a price table; costUsd is written only at settle;
//    priceTable is present exactly when costSource is 'priced'; costSource is the
//    closed two-member vocabulary."
//
// costUsd is stamped ONCE at settle (in the writer, src/run-store.mjs), never
// recomputed on read. A price-table correction changes what future runs are stamped
// with; it never rewrites a run that has already settled.
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
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-cost-"));
  const dir = path.join(repo, "wiki", "work", "68_milestone_loop-telemetry");
  await mkdir(dir, { recursive: true });
  return { repo, item: { ref: "68", dir } };
}

function validSpend(overrides = {}) {
  return {
    model: "claude-sonnet",
    effort: "high",
    tokens: { input: 1000, output: 200, cacheRead: 50000, cacheCreate: 900000 },
    costUsd: 1.11,
    costSource: "priced",
    priceTable: "v1",
    turns: 5,
    toolCalls: 3,
    exitReason: "final_output",
    ...overrides,
  };
}

export const archTests = [
  {
    name: "arch/68 FF-6804 (acd-cost-stamped-once): costSource is the closed two-member vocabulary, and priceTable is present exactly when priced",
    run: async () => {
      const store = await import("../../../src/run-store.mjs");
      assert.deepEqual(store.COST_SOURCES, ["reported", "priced"], "costSource is the closed two-member set reported|priced");
    },
  },
  {
    name: "arch/68 FF-6804 (acd-cost-stamped-once): no read path multiplies a price table — no module outside the writer recomputes costUsd from buckets",
    run: async () => {
      const modules = await modulesUnder(SRC).then((list) => list.filter((file) => path.basename(file) !== "run-store.mjs"));
      assert.ok(modules.length > 150, `src was actually walked: ${modules.length} modules`);
      const offenders = [];
      for (const file of modules) {
        const code = (await readFile(file, "utf8")).replace(/\r\n/gu, "\n");
        // A read path that prices buckets (multiplies by a price/table to derive
        // costUsd) would recompute cost — forbidden by 68/ADR-004.
        if (/\bcostUsd\b/.test(code) && /\bpriceTable\b/.test(code) && /[*×]|\*|\.costUsd\s*=/.test(code)) {
          offenders.push(path.relative(root, file));
        }
      }
      assert.deepEqual(offenders, [], `no read path recomputes costUsd from a price table (offenders: ${offenders.join("; ")})`);
    },
  },
  {
    name: "arch/68 FF-6804 (acd-cost-stamped-once): the writer stamps costUsd once at settle, refuses the mis-shaped provenance answers, and reading never rewrites a stamped run (behaviour over the real seam)",
    run: async () => {
      const { repo, item } = await makeItem();
      try {
        const store = await import("../../../src/run-store.mjs");

        // priced → priceTable present; reported → priceTable null.
        let record = await store.startRun(item, { now: "2026-08-20T10:00:00.000Z" });
        await store.settleRun(item, { runId: record.runId, spend: validSpend({ costSource: "priced", priceTable: "price-v1", costUsd: 2.5 }) });
        let reloaded = (await store.readRuns(item)).find((r) => r.runId === record.runId);
        assert.equal(reloaded.spend.priceTable, "price-v1", "priceTable is present when priced");
        assert.equal(reloaded.spend.costSource, "priced", "costSource is priced");
        await store.completeRun(item, { runId: record.runId, outcome: "done", now: "2026-08-20T11:00:00.000Z" });

        record = await store.startRun(item, { now: "2026-08-20T12:00:00.000Z" });
        await store.settleRun(item, { runId: record.runId, spend: validSpend({ costSource: "reported", costUsd: 3.3, priceTable: null }) });
        reloaded = (await store.readRuns(item)).find((r) => r.runId === record.runId);
        assert.equal(reloaded.spend.priceTable, null, "priceTable is null when reported");
        assert.equal(reloaded.spend.costUsd, 3.3, "the reported figure is stamped as-is");
        await store.completeRun(item, { runId: record.runId, outcome: "done", now: "2026-08-20T13:00:00.000Z" });

        // Refused shapes: closed vocabulary, priced-without-table, reported-with-table, negative cost.
        const refused = [
          { spend: validSpend({ costSource: "estimated" }), code: "cost-source-closed" },
          { spend: validSpend({ costSource: "priced", priceTable: null }), code: "cost-priced-no-table" },
          { spend: validSpend({ costSource: "reported", priceTable: "v1" }), code: "cost-reported-with-table" },
          { spend: validSpend({ costUsd: -1 }), code: "cost-invalid" },
        ];
        for (const c of refused) {
          record = await store.startRun(item, { now: "2026-08-20T14:00:00.000Z" });
          await assert.rejects(
            () => store.settleRun(item, { runId: record.runId, spend: c.spend }),
            (err) => err.code === c.code,
            `the writer refuses the malformed cost (${c.code})`
          );
          await store.completeRun(item, { runId: record.runId, outcome: "done", now: "2026-08-20T14:30:00.000Z" });
        }

        // Reading never rewrites: settle once, read many times, costUsd unchanged.
        record = await store.startRun(item, { now: "2026-08-20T15:00:00.000Z" });
        await store.settleRun(item, { runId: record.runId, spend: validSpend({ costSource: "priced", priceTable: "v1", costUsd: 9.99 }) });
        for (let i = 0; i < 3; i += 1) {
          const r = (await store.readRuns(item)).find((x) => x.runId === record.runId);
          assert.equal(r.spend.costUsd, 9.99, `read #${i} returns the stamped number unchanged`);
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
];
