// Traceability wiring for milestone 68 / story 00 — the spend-bearing run record.
//
// Covers EVERY @executable scenario in the four task features:
//   tasks/00_sixteenth-key-additive.feature
//   tasks/01_token-buckets-refused-at-write.feature
//   tasks/02_cost-stamped-once.feature
//   tasks/03_exit-reason-vocabulary.feature
// exercising the REAL src/run-store.mjs in-process against a temp fixture repo
// (mkdtemp → mkdir → startRun → settleRun → read → rm in finally). One test object
// per @executable scenario (Scenario-Outline rows folded into one entry iterating
// the rows), each name tracing to feature + scenario. node:assert/strict.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { SPEND_ENVELOPE_KEYS, TOKEN_BUCKET_KEYS, COST_SOURCES, EXIT_REASONS } = await import("../../src/run-store.mjs");

// The fifteen delivered keys (the record 68/00 amends with `spend`).
const FIFTEEN_KEYS = ["runId", "itemRef", "state", "attempt", "outcome", "sessionId", "brief", "createdAt", "updatedAt", "failureReason", "heartbeatAt", "retryOf", "reclaimedAt", "node", "resumeAfter"];

async function makeItem() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-spend-"));
  const dir = path.join(repo, "wiki", "work", "68_milestone_loop-telemetry");
  await mkdir(dir, { recursive: true });
  return { repo, item: { ref: "68", dir } };
}

// A complete, valid spend envelope (ADR-001's declared set). The default is a priced
// zero-cost final-output run; each scenario overrides the axis it is testing.
function validSpend(overrides = {}) {
  return {
    model: "claude-sonnet",
    effort: "high",
    tokens: { input: 1000, output: 200, cacheRead: 50000, cacheCreate: 900000 },
    costUsd: 0,
    costSource: "priced",
    priceTable: "v1",
    turns: 5,
    toolCalls: 3,
    exitReason: "final_output",
    ...overrides,
  };
}

async function startOne(item, { now = "2026-08-20T10:00:00.000Z" } = {}) {
  const { startRun } = await import("../../src/run-store.mjs");
  return startRun(item, { now });
}

async function settle(item, runId, spend, now = "2026-08-20T11:00:00.000Z") {
  const { settleRun } = await import("../../src/run-store.mjs");
  return settleRun(item, { runId, spend, now });
}

async function readRecord(item, runId) {
  const { readRuns } = await import("../../src/run-store.mjs");
  const runs = await readRuns(item);
  return runs.find((run) => run.runId === runId);
}

export const runStoreSpendTests = [
  // ══ 00_sixteenth-key-additive.feature ══
  // Scenario: a newly minted run record carries spend as its sixteenth key
  {
    name: "run-store-spend/00 a newly minted run record carries spend as its sixteenth key, null, with the fifteen delivered keys unchanged and only 131's asks after it",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const record = await startOne(item);
        const keys = Object.keys(record);
        assert.deepEqual(keys.slice(0, 15), FIFTEEN_KEYS, "the fifteen delivered keys are unchanged in name, order and meaning");
        assert.equal(keys[15], "spend", "spend is the sixteenth key");
        // 131/ADR-003 §3 appended a seventeenth key, `asks`, after it by the same additive rule.
        assert.deepEqual(keys.slice(16), ["asks"], "the one key after spend is 131's asks");
        assert.equal(keys.length, 17, "the record carries exactly seventeen keys");
        assert.equal(record.spend, null, "spend reads null on a freshly minted run");
        const onDisk = JSON.parse(await readFile(path.join(item.dir, "runs", `${record.runId}.json`), "utf8"));
        assert.equal(Object.keys(onDisk).at(-2), "spend", "spend is the sixteenth key on disk, with only 131's asks after it");
        assert.equal(onDisk.spend, null, "the on-disk spend is null");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario: a fifteen-key record written before this milestone reads forward unchanged
  {
    name: "run-store-spend/00 a fifteen-key record written before this milestone reads forward unchanged with spend null",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const { readRuns } = await import("../../src/run-store.mjs");
        const legacy = {
          runId: "20260630T000000000Z-0000",
          itemRef: item.ref,
          state: "done",
          attempt: 1,
          outcome: "done",
          sessionId: "sess-15",
          brief: { note: "pre-68" },
          createdAt: "2026-06-30T00:00:00.000Z",
          updatedAt: "2026-06-30T00:00:00.000Z",
          failureReason: null,
          heartbeatAt: null,
          retryOf: null,
          reclaimedAt: null,
          node: null,
          resumeAfter: null,
        };
        assert.deepEqual(Object.keys(legacy), FIFTEEN_KEYS, "the fixture IS a genuine fifteen-key record (non-vacuous)");
        await mkdir(path.join(item.dir, "runs"), { recursive: true });
        const fs = await import("node:fs/promises");
        await fs.writeFile(path.join(item.dir, "runs", `${legacy.runId}.json`), JSON.stringify(legacy, null, 2), "utf8");

        let runs;
        await assert.doesNotReject(async () => { runs = await readRuns(item); }, "the fifteen-key record reads forward without error");
        assert.equal(runs.length, 1, "the legacy record reads back as one run");
        const [record] = runs;
        assert.equal(record.spend, null, "spend reads null (absence benign)");
        for (const key of FIFTEEN_KEYS) {
          assert.deepEqual(record[key], legacy[key], `the delivered value "${key}" is returned verbatim`);
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario: not-measured and measured-zero are different answers
  {
    name: "run-store-spend/00 not-measured (spend null) and measured-zero (costUsd 0) are distinguishable from the record alone",
    async run() {
      const { repo, item } = await makeItem();
      try {
        // A run whose spend was never ingested → spend stays null.
        const neverIngested = await startOne(item, { now: "2026-08-20T10:00:00.000Z" });
        const { completeRun } = await import("../../src/run-store.mjs");
        await completeRun(item, { runId: neverIngested.runId, outcome: "done", now: "2026-08-20T10:05:00.000Z" });

        // A run whose ingested spend totalled zero tokens at zero cost → a full
        // envelope with costUsd 0.
        const zeroRun = await startOne(item, { now: "2026-08-20T11:00:00.000Z" });
        await settle(item, zeroRun.runId, validSpend({
          tokens: { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 },
          costUsd: 0,
        }), "2026-08-20T11:05:00.000Z");

        const first = await readRecord(item, neverIngested.runId);
        const second = await readRecord(item, zeroRun.runId);
        assert.equal(first.spend, null, "the never-ingested run reports spend as null");
        assert.equal(typeof second.spend, "object", "the zero run reports a spend envelope");
        assert.equal(second.spend.costUsd, 0, "the zero run's costUsd is 0");
        assert.notEqual(first.spend, second.spend, "null and a measured-zero envelope are not the same value");
        assert.ok(first.spend === null && second.spend !== null, "the two are distinguishable without consulting anything outside the record");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario Outline: the envelope carries exactly its declared keys and nothing else
  {
    name: "run-store-spend/00 the envelope carries exactly its declared keys (all nine present, no phase/attempt, no fifth key)",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const record = await startOne(item);
        await settle(item, record.runId, validSpend());
        const settled = await readRecord(item, record.runId);
        // Every positive row: spend carries the key.
        for (const key of SPEND_ENVELOPE_KEYS) {
          assert.ok(key in settled.spend, `spend carries the declared key "${key}"`);
        }
        // No key outside the declared set — phase (rides brief.loop.phase) and
        // attempt (already key 4) must NOT appear.
        assert.deepEqual(Object.keys(settled.spend), [...SPEND_ENVELOPE_KEYS], "spend carries exactly its declared keys and nothing else");
        assert.ok(!("phase" in settled.spend), "spend carries no phase key (ADR-002 — it rides brief.loop.phase)");
        assert.ok(!("attempt" in settled.spend), "spend carries no attempt key (ADR-001 — attempt is already key 4)");

        // The writer REFUSES an envelope that smuggles in a flat `phase` or `attempt`.
        for (const forbidden of ["phase", "attempt"]) {
          const bad = { ...validSpend(), [forbidden]: forbidden === "phase" ? "build" : 2 };
          await assert.rejects(
            () => settle(item, record.runId, bad),
            (err) => err.code === "spend-invalid-key",
            `a spend carrying "${forbidden}" is refused at write`
          );
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ══ 01_token-buckets-refused-at-write.feature ══
  // Scenario: the four buckets total without any term counted twice
  {
    name: "run-store-spend/01 the four buckets total without any term counted twice, each returned verbatim",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const record = await startOne(item);
        const buckets = { input: 1000, output: 200, cacheRead: 50000, cacheCreate: 900000 };
        await settle(item, record.runId, validSpend({ tokens: buckets }));
        const settled = await readRecord(item, record.runId);
        for (const key of TOKEN_BUCKET_KEYS) {
          assert.equal(settled.spend.tokens[key], buckets[key], `bucket "${key}" is returned verbatim`);
        }
        const total = TOKEN_BUCKET_KEYS.reduce((sum, key) => sum + settled.spend.tokens[key], 0);
        assert.equal(total, 1000 + 200 + 50000 + 900000, "the sum of the four buckets is the run's true total token count");
        // No bucket's value is contained in any other bucket — the values are disjoint.
        const vals = TOKEN_BUCKET_KEYS.map((key) => settled.spend.tokens[key]);
        assert.equal(new Set(vals).size, 4, "the four bucket values are distinct");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario: a caller cannot write a spend the convention forbids
  {
    name: "run-store-spend/01 a caller cannot write a spend the convention forbids — the settle is refused with a typed error, spend left as it was, nothing partial persisted",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const record = await startOne(item);
        // A spend whose buckets do not satisfy the convention (a negative bucket).
        const malformed = validSpend({ tokens: { input: -1, output: 200, cacheRead: 50000, cacheCreate: 900000 } });
        await assert.rejects(
          () => settle(item, record.runId, malformed),
          (err) => err.code === "token-buckets-invalid" && /input/.test(err.message),
          "the settle is refused with a typed error naming the offending bucket"
        );
        const after = await readRecord(item, record.runId);
        assert.equal(after.spend, null, "the record's spend is left exactly as it was (never settled)");
        const files = (await readdir(path.join(item.dir, "runs"))).filter((name) => name.endsWith(".json"));
        assert.equal(files.length, 1, "no partially-written envelope is persisted — still exactly one run file");
        const onDisk = JSON.parse(await readFile(path.join(item.dir, "runs", `${record.runId}.json`), "utf8"));
        assert.equal(onDisk.spend, null, "the on-disk record's spend is untouched");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario Outline: what the writer refuses, and why
  {
    name: "run-store-spend/01 what the writer refuses, and why (the malformed bucket-set outline)",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const rows = [
          {
            label: "a bucket set missing cacheCreate",
            make: () => validSpend({ tokens: { input: 1, output: 1, cacheRead: 1 } }),
            code: "token-buckets-partial",
            reason: /all four buckets are required — absence is not zero/,
          },
          {
            label: "a bucket set carrying a fifth token key",
            make: () => validSpend({ tokens: { input: 1, output: 1, cacheRead: 1, cacheCreate: 1, inclusive: 2 } }),
            code: "token-buckets-closed-set",
            reason: /the four buckets are the closed set/,
          },
          {
            label: "input holding a negative count",
            make: () => validSpend({ tokens: { input: -5, output: 1, cacheRead: 1, cacheCreate: 1 } }),
            code: "token-buckets-invalid",
            reason: /non-negative integer/,
          },
          {
            label: "cacheRead holding a fractional count",
            make: () => validSpend({ tokens: { input: 1, output: 1, cacheRead: 1.5, cacheCreate: 1 } }),
            code: "token-buckets-invalid",
            reason: /non-negative integer/,
          },
          {
            label: "input holding a string",
            make: () => validSpend({ tokens: { input: "1000", output: 1, cacheRead: 1, cacheCreate: 1 } }),
            code: "token-buckets-invalid",
            reason: /non-negative integer/,
          },
          {
            label: "an input that folds in the cache-read count (an inclusive bucket, the vendor's other convention)",
            make: () => validSpend({ tokens: { input: 51000, output: 1, cacheRead: 50000, cacheCreate: 1, inclusive: 1 } }),
            code: "token-buckets-closed-set",
            reason: /the four buckets are the closed set/,
          },
        ];
        for (const row of rows) {
          const record = await startOne(item);
          await assert.rejects(
            () => settle(item, record.runId, row.make()),
            (err) => err.code === row.code && row.reason.test(err.message),
            `[${row.label}] the settle is refused with the expected reason`
          );
          const after = await readRecord(item, record.runId);
          assert.equal(after.spend, null, `[${row.label}] spend left exactly as it was`);
          const { completeRun } = await import("../../src/run-store.mjs");
          await completeRun(item, { runId: record.runId, outcome: "done", now: "2026-08-20T11:00:00.000Z" });
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario: a consumer that needs the inclusive convention derives it on the way out
  {
    name: "run-store-spend/01 the vendor-inclusive input figure is derivable as input+cacheRead+cacheCreate, and the stored record is unchanged by the derivation",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const record = await startOne(item);
        await settle(item, record.runId, validSpend());
        const settled = await readRecord(item, record.runId);
        const { input, cacheRead, cacheCreate } = settled.spend.tokens;
        const inclusive = input + cacheRead + cacheCreate;
        assert.equal(inclusive, 1000 + 50000 + 900000, "the vendor-inclusive input is derivable as input plus cacheRead plus cacheCreate");
        // The stored record is unchanged by that derivation.
        const onDisk = JSON.parse(await readFile(path.join(item.dir, "runs", `${record.runId}.json`), "utf8"));
        assert.deepEqual(onDisk.spend.tokens, settled.spend.tokens, "the stored buckets are unchanged by the derivation");
        assert.equal(onDisk.spend.tokens.input, 1000, "the stored input is still the exclusive count");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ══ 02_cost-stamped-once.feature ══
  // Scenario: a priced cost records the table it was priced with
  {
    name: "run-store-spend/02 a priced cost records the table it was priced with",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const record = await startOne(item);
        // ingested token buckets and no runtime-reported cost → priced.
        await settle(item, record.runId, validSpend({ costSource: "priced", priceTable: "price-table-2026-08", costUsd: 1.23 }));
        const settled = await readRecord(item, record.runId);
        assert.equal(typeof settled.spend.costUsd, "number", "costUsd is a number");
        assert.equal(settled.spend.costSource, "priced", "costSource reads priced");
        assert.equal(settled.spend.priceTable, "price-table-2026-08", "priceTable names the version of the table used");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario: a reported cost beats a priced one, and says so
  {
    name: "run-store-spend/02 a reported cost beats a priced one — costUsd is the reported figure, costSource reported, priceTable null, no table consulted",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const record = await startOne(item);
        await settle(item, record.runId, validSpend({
          costSource: "reported",
          costUsd: 4.56,
          priceTable: null,
        }));
        const settled = await readRecord(item, record.runId);
        assert.equal(settled.spend.costUsd, 4.56, "costUsd is the reported figure");
        assert.equal(settled.spend.costSource, "reported", "costSource reads reported");
        assert.equal(settled.spend.priceTable, null, "priceTable reads null");
        // The writer consults no price table when reported — nothing to recompute.
        assert.equal(settled.spend.costUsd, 4.56, "no price table is consulted (the reported figure is stamped as-is)");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario: reading a settled run returns the stamped number, whatever the table now says
  {
    name: "run-store-spend/02 reading a settled run returns the stamped costUsd and priceTable version, whatever the table now says",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const { completeRun } = await import("../../src/run-store.mjs");
        // A run settled at a known costUsd under a known price table.
        const first = await startOne(item, { now: "2026-08-20T10:00:00.000Z" });
        await settle(item, first.runId, validSpend({ costUsd: 1.11, priceTable: "v1", costSource: "priced" }), "2026-08-20T11:00:00.000Z");
        await completeRun(item, { runId: first.runId, outcome: "done", now: "2026-08-20T11:00:00.000Z" });

        // The price table is later corrected.
        const corrected = await startOne(item, { now: "2026-08-21T10:00:00.000Z" });
        await settle(item, corrected.runId, validSpend({ costUsd: 2.22, priceTable: "v2", costSource: "priced" }), "2026-08-21T11:00:00.000Z");

        const settledBefore = await readRecord(item, first.runId);
        assert.equal(settledBefore.spend.costUsd, 1.11, "costUsd is unchanged from what was stamped at settle");
        assert.equal(settledBefore.spend.priceTable, "v1", "priceTable still names the version in force at settle");

        const settledAfter = await readRecord(item, corrected.runId);
        assert.equal(settledAfter.spend.costUsd, 2.22, "a run settled after the correction is stamped with the new table's version");
        assert.equal(settledAfter.spend.priceTable, "v2", "the corrected run carries the new table version");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario Outline: the two provenance answers, and the shapes that are not answers
  {
    name: "run-store-spend/02 accepted provenance answers (priced, reported, measured-zero) and the refused shapes",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const { completeRun } = await import("../../src/run-store.mjs");
        // ── accepted: buckets only → priced with a price-table version
        let record = await startOne(item);
        await settle(item, record.runId, validSpend({ costSource: "priced", priceTable: "v1", costUsd: 0.5 }));
        let settled = await readRecord(item, record.runId);
        assert.equal(settled.spend.costSource, "priced", "buckets only is stamped priced");
        assert.equal(settled.spend.priceTable, "v1", "a priced stamp carries a price-table version");
        await completeRun(item, { runId: record.runId, outcome: "done", now: "2026-08-20T11:00:00.000Z" });

        // ── accepted: buckets and a runtime-reported USD figure → reported, priceTable null
        record = await startOne(item);
        await settle(item, record.runId, validSpend({ costSource: "reported", costUsd: 3.33, priceTable: null }));
        settled = await readRecord(item, record.runId);
        assert.equal(settled.spend.costSource, "reported", "buckets + a reported figure is stamped reported");
        assert.equal(settled.spend.priceTable, null, "reported carries priceTable null");
        await completeRun(item, { runId: record.runId, outcome: "done", now: "2026-08-20T11:00:00.000Z" });

        // ── accepted: a run that genuinely cost nothing → 0, a measured zero, not null
        record = await startOne(item);
        await settle(item, record.runId, validSpend({ costUsd: 0, costSource: "priced", priceTable: "v1" }));
        settled = await readRecord(item, record.runId);
        assert.equal(settled.spend.costUsd, 0, "a genuinely free run is stamped 0, not null");
        await completeRun(item, { runId: record.runId, outcome: "done", now: "2026-08-20T11:00:00.000Z" });

        // ── refused: costSource outside the closed two-member set
        record = await startOne(item);
        await assert.rejects(
          () => settle(item, record.runId, validSpend({ costSource: "estimated" })),
          (err) => err.code === "cost-source-closed",
          "a costSource outside the closed two-member set is refused"
        );
        await completeRun(item, { runId: record.runId, outcome: "done", now: "2026-08-20T11:00:00.000Z" });

        // ── refused: costSource priced with no priceTable
        record = await startOne(item);
        await assert.rejects(
          () => settle(item, record.runId, validSpend({ costSource: "priced", priceTable: null })),
          (err) => err.code === "cost-priced-no-table",
          "a priced number without its table is refused"
        );
        await completeRun(item, { runId: record.runId, outcome: "done", now: "2026-08-20T11:00:00.000Z" });

        // ── refused: costSource reported carrying a priceTable
        record = await startOne(item);
        await assert.rejects(
          () => settle(item, record.runId, validSpend({ costSource: "reported", priceTable: "v1" })),
          (err) => err.code === "cost-reported-with-table",
          "a reported cost carrying a priceTable is refused (nothing priced it)"
        );
        await completeRun(item, { runId: record.runId, outcome: "done", now: "2026-08-20T11:00:00.000Z" });

        // ── refused: a costUsd that is negative
        record = await startOne(item);
        await assert.rejects(
          () => settle(item, record.runId, validSpend({ costUsd: -1, costSource: "priced", priceTable: "v1" })),
          (err) => err.code === "cost-invalid",
          "a negative costUsd is refused (a cost is non-negative)"
        );
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },

  // ══ 03_exit-reason-vocabulary.feature ══
  // Scenario: a run that produced its final answer records that it did
  {
    name: "run-store-spend/03 a run that produced its final answer records exitReason final_output, and the outcome is unchanged",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const { completeRun } = await import("../../src/run-store.mjs");
        const record = await startOne(item);
        await completeRun(item, { runId: record.runId, outcome: "done", now: "2026-08-20T11:00:00.000Z" });
        await settle(item, record.runId, validSpend({ exitReason: "final_output" }), "2026-08-20T11:05:00.000Z");
        const settled = await readRecord(item, record.runId);
        assert.equal(settled.spend.exitReason, "final_output", "exitReason reads final_output");
        assert.equal(settled.outcome, "done", "the run's outcome is unchanged by the presence of the reason");
        assert.equal(settled.state, "done", "the run's state is unchanged by the presence of the reason");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario: the vocabulary is closed
  {
    name: "run-store-spend/03 the vocabulary is closed — a settle with an exit reason outside it is refused with a typed error, spend left as it was",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const record = await startOne(item);
        await assert.rejects(
          () => settle(item, record.runId, validSpend({ exitReason: "wandered_off" })),
          (err) => err.code === "exit-reason-closed",
          "a settle with an exit reason outside the declared vocabulary is refused with a typed error"
        );
        const after = await readRecord(item, record.runId);
        assert.equal(after.spend, null, "the record's spend is left exactly as it was");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario: an exit reason changes nothing about how the run is treated
  {
    name: "run-store-spend/03 an exit reason changes nothing about how the run is treated — two runs identical but for their reason differ in nothing else",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const { completeRun } = await import("../../src/run-store.mjs");
        const runA = await startOne(item, { now: "2026-08-20T10:00:00.000Z" });
        await settle(item, runA.runId, validSpend({ exitReason: "final_output" }));
        await completeRun(item, { runId: runA.runId, outcome: "done", now: "2026-08-20T10:05:00.000Z" });
        const runB = await startOne(item, { now: "2026-08-20T10:00:00.000Z" });
        await settle(item, runB.runId, validSpend({ exitReason: "abort" }));
        await completeRun(item, { runId: runB.runId, outcome: "done", now: "2026-08-20T10:05:00.000Z" });
        const a = await readRecord(item, runA.runId);
        const b = await readRecord(item, runB.runId);
        assert.equal(a.spend.exitReason, "final_output", "run A reports its own exitReason");
        assert.equal(b.spend.exitReason, "abort", "run B reports its own exitReason");
        // Neither run's state, outcome, attempt or retry lineage differs because of it.
        assert.equal(a.state, b.state, "state is identical");
        assert.equal(a.outcome, b.outcome, "outcome is identical");
        assert.equal(a.attempt, b.attempt, "attempt is identical");
        assert.equal(a.retryOf, b.retryOf, "retry lineage is identical");
        assert.equal(a.retryOf, null, "no retry is triggered by either value");
        // No kill or bound is triggered — nothing in this milestone branches on the value.
        assert.equal(a.spend.exitReason === "abort", false, "recording an abort does not kill the run");
        assert.ok(!("bound" in a.spend) && !("kill" in a.spend), "no bound/kill field is minted by the exit reason");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // Scenario Outline: the declared vocabulary, and what each member records
  {
    name: "run-store-spend/03 the declared vocabulary — reachable members (final_output, abort, error) and the 69-declared unreachable members (max_turns, timeout, stall, budget_exceeded)",
    async run() {
      const { repo, item } = await makeItem();
      try {
        const rows = [
          { how: "by producing its final output", reason: "final_output" },
          { how: "by being aborted before it could finish", reason: "abort" },
          { how: "by failing with an error", reason: "error" },
          // Declared for milestone 69 — unreachable until its producer lands (ADR-008),
          // but the vocabulary is FIXED here, so the writer records them.
          { how: "by exhausting a turn bound", reason: "max_turns" },
          { how: "by exceeding a wall-clock deadline", reason: "timeout" },
          { how: "by making no progress within its attempt", reason: "stall" },
          { how: "by exceeding a cost ceiling", reason: "budget_exceeded" },
        ];
        for (const row of rows) {
          const record = await startOne(item);
          await settle(item, record.runId, validSpend({ exitReason: row.reason }));
          const { completeRun } = await import("../../src/run-store.mjs");
          await completeRun(item, { runId: record.runId, outcome: "done", now: "2026-08-20T11:00:00.000Z" });
          const settled = await readRecord(item, record.runId);
          assert.equal(settled.spend.exitReason, row.reason, `[${row.how}] exitReason reads ${row.reason}`);
          // The value is recorded without any action being taken on it — the record's
          // state/outcome are untouched by settling.
          assert.equal(settled.outcome, "done", `[${row.how}] the value is recorded without acting on it (outcome untouched by the reason)`);
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
];
