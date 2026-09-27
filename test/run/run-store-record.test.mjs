// Traceability wiring for milestone 19 / story 00 — the run-record store.
//
// Covers EVERY @executable scenario in tasks/00_run-record-store.feature,
// exercising the REAL src/run-store.mjs in-process against a temp fixture repo
// (mkdtemp → mkdir → writeFile → run → rm in finally). One test object per
// @executable scenario (Scenario-Outline rows folded into one entry), each name
// tracing to feature + scenario. node:assert/strict.
//
//   00_run-record-store.feature — create persists ONE runs/<run-id>.json carrying
//     the frozen schema (sortable runId, itemRef, state, attempt, outcome,
//     sessionId, opaque brief, createdAt/updatedAt); read returns the item's runs;
//     a story's runs live under the story folder's own runs/.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The FOURTEEN frozen schema keys, IN ORDER (26/ADR-001 SUPERSEDES 20/ADR-001's
// thirteen-key freeze, which superseded 19/ADR-003's nine): the original nine,
// unchanged in name/order/meaning, then the four additive resilience keys
// (failureReason, heartbeatAt, retryOf, reclaimedAt), then the one additive
// partition-provenance key (node, defaulting null).
const FROZEN_KEYS = ["runId", "itemRef", "state", "attempt", "outcome", "sessionId", "brief", "createdAt", "updatedAt", "failureReason", "heartbeatAt", "retryOf", "reclaimedAt", "node", "resumeAfter", "spend", "asks"];

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const RUNID_RE = /^(\d{8}T\d{9}Z)-(\d{4})$/;

// --- fixture builders --------------------------------------------------------

async function makeRepo() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-runstore-rec-"));
  const workDir = path.join(repo, "wiki", "work");
  await mkdir(workDir, { recursive: true });
  return { repo, workDir };
}

// A milestone item shaped like the row findWork/listItems produce: the store only
// needs item.dir (to build runs/ paths) and item.ref (to stamp itemRef).
async function milestoneItem(workDir, { number = "19", slug = "work-run-lifecycle" } = {}) {
  const dir = path.join(workDir, `${number}_milestone_${slug}`);
  await mkdir(dir, { recursive: true });
  return { ref: number, dir };
}

async function storyItem(workDir, { milestoneSlug = "work-run-lifecycle", mNumber = "19", number = "00", slug = "run-store" } = {}) {
  const dir = path.join(workDir, `${mNumber}_milestone_${milestoneSlug}`, "stories", `${number}_story_${slug}`);
  await mkdir(dir, { recursive: true });
  return { ref: `${mNumber}/${number}`, dir };
}

async function runFiles(item) {
  try {
    return (await readdir(path.join(item.dir, "runs"))).filter((name) => name.endsWith(".json"));
  } catch {
    return [];
  }
}

export const runStoreRecordTests = [
  {
    name: "run-store/00 starting a run persists exactly one JSON file under the item's runs/ directory",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const { startRun } = await import("../../src/run-store.mjs");
        const item = await milestoneItem(workDir);
        // no runs/ directory yet
        assert.equal(existsSync(path.join(item.dir, "runs")), false, "no runs/ dir before the first start");

        const record = await startRun(item);
        const files = await runFiles(item);
        assert.equal(files.length, 1, "the runs/ dir contains exactly one file");
        assert.equal(files[0], `${record.runId}.json`, "the file is named <runId>.json for the new run");

        const parsed = JSON.parse(await readFile(path.join(item.dir, "runs", files[0]), "utf8"));
        assert.equal(parsed.runId, record.runId, "the file parses as JSON carrying the run record");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "run-store/00 a new run record carries the complete frozen schema in its initial running shape",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const { startRun } = await import("../../src/run-store.mjs");
        const item = await milestoneItem(workDir);

        const record = await startRun(item, { sessionId: "sess-abc" });
        assert.equal(typeof record.runId, "string", "runId is a string");
        assert.ok(record.runId.length > 0, "runId is non-empty");
        assert.equal(record.itemRef, "19", "itemRef is 19");
        assert.equal(record.state, "running", "state is running");
        assert.equal(record.attempt, 1, "attempt is 1");
        assert.equal(record.outcome, null, "outcome is null (not yet terminal)");
        assert.equal(record.sessionId, "sess-abc", "sessionId is the supplied value");
        assert.equal(typeof record.brief, "object", "brief is an object");
        assert.ok(record.brief !== null, "brief is a non-null object");
        assert.match(record.createdAt, ISO_RE, "createdAt is an ISO-8601 instant");
        assert.match(record.updatedAt, ISO_RE, "updatedAt is an ISO-8601 instant");
        assert.equal(record.createdAt, record.updatedAt, "createdAt and updatedAt are equal at start");
        // carries no field outside the frozen schema — exactly the fourteen keys, in order
        assert.deepEqual(Object.keys(record), FROZEN_KEYS, "carries exactly the fourteen frozen schema keys in order");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "run-store/00 the runId encodes the createdAt instant and a zero-padded per-item sequence",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const { startRun } = await import("../../src/run-store.mjs");
        const item = await milestoneItem(workDir);

        const record = await startRun(item);
        const match = record.runId.match(RUNID_RE);
        assert.ok(match, `runId "${record.runId}" matches the form <createdAt-compact>-<seq>`);
        const [, compact, seq] = match;
        assert.equal(seq, "0000", "the <seq> segment is 0000 for the item's first run");
        // <createdAt-compact> equals the run's createdAt with punctuation stripped
        const expectedCompact = record.createdAt.replace(/[-:.]/g, "");
        assert.equal(compact, expectedCompact, "the <createdAt-compact> segment equals createdAt with punctuation stripped");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "run-store/00 runIds started in sequence are distinct and sort lexically into creation order",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        // 20/ADR-006 dedup forbids two non-terminal runs per item, so each run is
        // completed before the next is started — they are still distinct, sortable
        // runs over the item's lifetime (the seq counts terminal files too).
        const { startRun, completeRun } = await import("../../src/run-store.mjs");
        const item = await milestoneItem(workDir);

        const created = [];
        for (let i = 0; i < 3; i += 1) {
          created.push((await startRun(item)).runId);
          await completeRun(item, { outcome: "done" });
        }
        assert.equal(new Set(created).size, 3, "the 3 run records have 3 distinct runIds");
        const sorted = [...created].sort();
        assert.deepEqual(sorted, created, "sorting the runIds lexically yields them in creation order");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "run-store/00 two runs created at the same instant get distinct runIds via the sequence segment",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const { startRun, completeRun } = await import("../../src/run-store.mjs");
        const item = await milestoneItem(workDir);

        // the SAME injected createdAt for both — only the seq segment disambiguates.
        // The first is completed before the second is minted (20/ADR-006 dedup), so
        // the second's seq seeds from the one existing (terminal) file → 0001.
        const now = "2026-06-29T17:30:45.123Z";
        const first = await startRun(item, { now });
        await completeRun(item, { outcome: "done" });
        const second = await startRun(item, { now });

        assert.notEqual(first.runId, second.runId, "the two runIds are distinct");
        const [, c1, s1] = first.runId.match(RUNID_RE);
        const [, c2, s2] = second.runId.match(RUNID_RE);
        assert.equal(c1, c2, "the two runIds share an identical <createdAt-compact> segment");
        assert.equal(s1, "0000", "the first <seq> is 0000");
        assert.equal(s2, "0001", "the second <seq> is 0001");
        assert.deepEqual([first.runId, second.runId].sort(), [first.runId, second.runId], "sorting lexically yields them in creation order");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "run-store/00 a flat structured brief is persisted opaque and round-trips unchanged",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const { startRun, readRuns } = await import("../../src/run-store.mjs");
        const item = await milestoneItem(workDir);

        const brief = { workspace: "/w/space", initiator: "operator", resources: ["a", "b"] };
        await startRun(item, { brief });
        const [reloaded] = await readRuns(item);
        assert.deepEqual(reloaded.brief, brief, "the brief round-trips byte-equivalent");
        // byte-equivalent: identical JSON serialization
        assert.equal(JSON.stringify(reloaded.brief), JSON.stringify(brief), "the brief serializes identically");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "run-store/00 a deeply nested brief round-trips byte-equivalent through persistence",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const { startRun, readRuns } = await import("../../src/run-store.mjs");
        const item = await milestoneItem(workDir);

        // nested object + array of objects + mixed scalar types at depth 3
        const brief = {
          workspace: "ws-1",
          resources: {
            inputs: [
              { name: "a", count: 3, active: true, note: null },
              { name: "b", count: 0, active: false, note: "x" },
            ],
            nested: { level2: { level3: { flag: true, n: 42, s: "deep", nothing: null } } },
          },
        };
        await startRun(item, { brief });
        const [reloaded] = await readRuns(item);
        assert.deepEqual(reloaded.brief, brief, "the deeply nested brief round-trips byte-equivalent");
        // key-order preserved through the JSON round-trip (byte-equivalent serialization)
        assert.equal(JSON.stringify(reloaded.brief), JSON.stringify(brief), "nested keys appear in the same order they were passed");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "run-store/00 sessionId is recorded when supplied and null when omitted (Scenario Outline)",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const { startRun } = await import("../../src/run-store.mjs");

        // Examples: with sessionId "sess-xyz" → "sess-xyz" ; with no sessionId → null
        const rows = [
          { args: { sessionId: "sess-xyz" }, recorded: "sess-xyz" },
          { args: {}, recorded: null },
        ];
        for (const { args, recorded } of rows) {
          const item = await milestoneItem(workDir, { slug: `s-${recorded ?? "none"}` });
          const record = await startRun(item, args);
          assert.equal(record.sessionId, recorded, `sessionId is ${JSON.stringify(recorded)}`);
          assert.ok("sessionId" in record, "the record always has a sessionId key present");
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "run-store/00 reading an item's runs returns every persisted run for that item",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const { startRun, readRuns, completeRun } = await import("../../src/run-store.mjs");
        const item = await milestoneItem(workDir);

        // 20/ADR-006 dedup: complete the first before starting the second.
        await startRun(item);
        await completeRun(item, { outcome: "done" });
        await startRun(item);
        const runs = await readRuns(item);
        assert.equal(runs.length, 2, "I get 2 run records");
        assert.ok(runs.every((run) => run.itemRef === "19"), "every record's itemRef is 19");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "run-store/00 a persisted run reloads from disk with its frozen schema intact",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const { startRun } = await import("../../src/run-store.mjs");
        const item = await milestoneItem(workDir);

        const brief = { resources: { nested: { k: "v" } } };
        await startRun(item, { sessionId: "sess-load", brief });

        // a FRESH store load (a re-import is the in-process analogue of a fresh process)
        const fresh = await import("../../src/run-store.mjs?fresh-record");
        const runs = await fresh.readRuns(item);
        assert.equal(runs.length, 1, "I get 1 run record");
        const [record] = runs;
        assert.equal(record.sessionId, "sess-load", "the record's sessionId survives the round-trip");
        assert.deepEqual(record.brief, brief, "the record's brief equals the persisted object byte-equivalent");
        assert.deepEqual(Object.keys(record), FROZEN_KEYS, "the record carries all fourteen frozen schema fields");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  {
    name: "run-store/00 a story's runs live under the story folder's own runs/, not the milestone's",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const { startRun } = await import("../../src/run-store.mjs");
        const milestone = await milestoneItem(workDir);
        const story = await storyItem(workDir);

        const record = await startRun(story);
        // the run file is written under the STORY folder's runs/ dir
        const storyRunPath = path.join(story.dir, "runs", `${record.runId}.json`);
        assert.ok(existsSync(storyRunPath), "the run file is under the story 19/00 folder's runs/ dir");
        assert.equal(record.itemRef, "19/00", "the run record itemRef is 19/00");
        // the milestone's runs/ dir does NOT contain that run
        const milestoneRuns = await runFiles(milestone);
        assert.equal(milestoneRuns.includes(`${record.runId}.json`), false, "the milestone 19 runs/ dir does not contain that run");
        assert.equal(existsSync(path.join(milestone.dir, "runs")), false, "the milestone has no runs/ dir at all");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  ...runAskTests(),
];

// ── milestone 131 / story 01, task 04 — THE RUN RECORD'S SEVENTEENTH KEY IS `asks` ──────────────
// (131/ADR-003 §3). Appended last by 68/ADR-001's additive discipline, read forward as `[]`, and
// written only by the run's owner through three no-state-change writers shaped like `heartbeat`.
// Built inside a hoisted function so the array above can spread it without a TDZ.
function runAskTests() {
  const SIXTEEN = FROZEN_KEYS.slice(0, 16);
  const MINT_AT = "2026-09-23T17:00:00.000Z";
  const BY = { actor: "you", via: "cli", node: "node-7297" };
  const ENTRY = { question: "Decision needed: X", phase: "refine", askedAt: "2026-09-23T17:01:00.000Z", parkedAt: null, answer: "b", answeredAt: "2026-09-23T17:05:00.000Z", by: BY };
  const store = () => import("../../src/run-store.mjs");

  // A fresh fixture with one run minted on it, torn down after `fn`.
  async function withRun(fn, { node = null } = {}) {
    const { repo, workDir } = await makeRepo();
    try {
      const item = await milestoneItem(workDir, { number: "131", slug: "the-human-in-the-loop" });
      const { startRun } = await store();
      const run = await startRun(item, { now: MINT_AT, node });
      return await fn({ item, runId: run.runId, workDir });
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  }
  const recordPath = (item, runId) => path.join(item.dir, "runs", `${runId}.json`);
  const readOnDisk = async (item, runId) => JSON.parse(await readFile(recordPath(item, runId), "utf8"));
  // A directly written record of any shape — the store has no producer for most of these.
  async function writeRaw(item, record) {
    await mkdir(path.join(item.dir, "runs"), { recursive: true });
    await writeFile(recordPath(item, record.runId), JSON.stringify(record, null, 2), "utf8");
  }
  async function refusal(promise) {
    try {
      await promise;
    } catch (error) {
      return { code: error.code, status: error.status };
    }
    return null;
  }

  return [
    {
      name: "131/01 task04 — a minted record carries seventeen keys with asks last and empty, in memory and on disk",
      async run() {
        await withRun(async ({ item, runId }) => {
          const onDisk = await readOnDisk(item, runId);
          assert.deepEqual(Object.keys(onDisk), [...SIXTEEN, "asks"]);
          assert.deepEqual(onDisk.asks, []);
        });
      },
    },
    {
      name: "131/01 task04 — an older record, or a non-array asks, reads forward with asks empty; a delivered asks array is kept verbatim",
      async run() {
        await withRun(async ({ item, runId }) => {
          const { readRuns } = await store();
          const base = await readOnDisk(item, runId);
          const { asks, ...sixteen } = base;
          const { spend, ...fifteen } = sixteen;
          for (const [label, shape] of [
            ["the sixteen keys and no asks", sixteen],
            ["asks: null", { ...sixteen, asks: null }],
            ['asks: "x"', { ...sixteen, asks: "x" }],
            ["asks: {}", { ...sixteen, asks: {} }],
            ["asks: 0", { ...sixteen, asks: 0 }],
            ["the fifteen keys, no spend and no asks", fifteen],
          ]) {
            await writeRaw(item, shape);
            const [read] = await readRuns(item);
            assert.deepEqual(Object.keys(read), FROZEN_KEYS, `${label}: the seventeen keys, in order`);
            assert.deepEqual(read.asks, [], `${label}: asks reads []`);
          }
          await writeRaw(item, { ...base, asks: [ENTRY] });
          const [kept] = await readRuns(item);
          assert.deepEqual(kept.asks, [ENTRY], "a delivered asks array is kept verbatim");
          assert.deepEqual({ ...kept, asks: [] }, base, "and every other key reads as it did");
        });
      },
    },
    {
      name: "131/01 task04 — open, park and answer write one entry through the owner's writers, changing asks and updatedAt only; a re-ask appends a second",
      async run() {
        await withRun(async ({ item, runId }) => {
          const { openRunAsk, parkRunAsk, answerRunAsk } = await store();
          const before = await readOnDisk(item, runId);
          await openRunAsk(item, runId, { question: "Decision needed: X", phase: "refine", now: "2026-09-23T17:01:00.000Z" });
          await parkRunAsk(item, runId, { now: "2026-09-23T21:01:00.000Z" });
          const answered = await answerRunAsk(item, runId, { answer: "b", by: BY, now: "2026-09-23T22:00:00.000Z" });
          const onDisk = await readOnDisk(item, runId);
          assert.deepEqual(onDisk, answered, "each writer answers the updated record");
          assert.deepEqual(onDisk.asks, [{ question: "Decision needed: X", phase: "refine", askedAt: "2026-09-23T17:01:00.000Z", parkedAt: "2026-09-23T21:01:00.000Z", answer: "b", answeredAt: "2026-09-23T22:00:00.000Z", by: BY }]);
          assert.equal(onDisk.updatedAt, "2026-09-23T22:00:00.000Z");
          assert.deepEqual({ ...onDisk, asks: before.asks, updatedAt: before.updatedAt }, before, "state, outcome, attempt, heartbeatAt and spend are untouched");

          await openRunAsk(item, runId, { question: "Decision needed: Y", phase: "build", now: "2026-09-23T22:10:00.000Z" });
          const twice = await readOnDisk(item, runId);
          assert.equal(twice.asks.length, 2);
          assert.deepEqual(twice.asks[0], onDisk.asks[0], "the first entry unchanged");
          assert.deepEqual(twice.asks[1], { question: "Decision needed: Y", phase: "build", askedAt: "2026-09-23T22:10:00.000Z", parkedAt: null, answer: null, answeredAt: null, by: null }, "the second open");

          await parkRunAsk(item, runId, { now: "2026-09-23T22:20:00.000Z" });
          await answerRunAsk(item, runId, { answer: "c", by: BY, now: "2026-09-23T22:30:00.000Z" });
          const last = await readOnDisk(item, runId);
          assert.deepEqual(last.asks[0], onDisk.asks[0], "asks[0] is E1");
          assert.equal(last.asks[1].parkedAt, "2026-09-23T22:20:00.000Z");
          assert.equal(last.asks[1].answer, "c");
          assert.equal(last.asks[1].answeredAt, "2026-09-23T22:30:00.000Z");
        });
      },
    },
    {
      name: "131/01 task04 — a writer refuses a move the record cannot make, 409, and persists nothing (eleven rows)",
      async run() {
        const open = { question: "Q", phase: "build", askedAt: "2026-09-23T17:01:00.000Z", parkedAt: null, answer: null, answeredAt: null, by: null };
        const parked = { ...open, parkedAt: "2026-09-23T17:02:00.000Z" };
        const done = { ...open, answer: "a", answeredAt: "2026-09-23T17:03:00.000Z", by: BY };
        const rows = [
          ["has settled done", { state: "done", outcome: "done" }, "openRunAsk", "no-running-run"],
          ["has one open ask", { asks: [open] }, "openRunAsk", "run-ask-open"],
          ["has no ask", {}, "parkRunAsk", "run-ask-not-open"],
          ["has one answered ask", { asks: [done] }, "answerRunAsk", "run-ask-not-open"],
          ["has settled done", { state: "done", outcome: "done" }, "parkRunAsk", "no-running-run"],
          ["has settled failed with one open ask", { state: "failed", outcome: "failed", failureReason: "timeout", asks: [open] }, "answerRunAsk", "no-running-run"],
          ["has been reclaimed, with one open ask", { state: "failed", outcome: "failed", failureReason: "runtime_offline", reclaimedAt: "2026-09-23T18:00:00.000Z", asks: [open] }, "parkRunAsk", "no-running-run"],
          ["has one parked, unanswered ask", { asks: [parked] }, "openRunAsk", "run-ask-open"],
          ["has no ask", {}, "answerRunAsk", "run-ask-not-open"],
          ["has one answered ask", { asks: [done] }, "parkRunAsk", "run-ask-not-open"],
          ["has two answered asks", { asks: [done, done] }, "parkRunAsk", "run-ask-not-open"],
        ];
        await withRun(async ({ item, runId }) => {
          const writers = await store();
          const base = await readOnDisk(item, runId);
          for (const [given, over, writer, code] of rows) {
            await writeRaw(item, { ...base, ...over });
            const bytes = await readFile(recordPath(item, runId), "utf8");
            const args = { question: "Q2", phase: "build", answer: "b", by: BY, now: "2026-09-23T19:00:00.000Z" };
            assert.deepEqual(await refusal(writers[writer](item, runId, args)), { code, status: 409 }, `R ${given}: ${writer}`);
            assert.equal(await readFile(recordPath(item, runId), "utf8"), bytes, `R ${given}: ${writer} persisted nothing`);
          }
        });
      },
    },
    {
      name: "131/01 task04 — parking an already-parked, unanswered ask re-stamps its parkedAt",
      async run() {
        await withRun(async ({ item, runId }) => {
          const { openRunAsk, parkRunAsk } = await store();
          await openRunAsk(item, runId, { question: "Q", phase: "build", now: "2026-09-23T17:01:00.000Z" });
          await parkRunAsk(item, runId, { now: "2026-09-23T21:01:00.000Z" });
          await parkRunAsk(item, runId, { now: "2026-09-24T09:00:00.000Z" });
          const { asks } = await readOnDisk(item, runId);
          assert.equal(asks.length, 1);
          assert.equal(asks[0].parkedAt, "2026-09-24T09:00:00.000Z");
        });
      },
    },
    {
      name: "131/01 task04 — every other store write carries asks unchanged, with the seventeen keys in order",
      async run() {
        const writes = [
          ["heartbeat", (s, item, runId) => s.heartbeat(item, runId, { now: "2026-09-23T17:02:00.000Z" })],
          ["recordSessionId", (s, item, runId) => s.recordSessionId(item, { runId, sessionId: "S2", now: "2026-09-23T17:02:00.000Z" })],
          ["applyTransition", (s, item, runId) => s.applyTransition(item, runId, "done", { now: "2026-09-23T17:03:00.000Z" })],
          ["reclaimRun", (s, item, runId) => s.reclaimRun(item, runId, { now: "2026-09-23T17:03:00.000Z" })],
        ];
        for (const [label, write] of writes) {
          await withRun(async ({ item, runId }) => {
            const s = await store();
            await s.openRunAsk(item, runId, { question: "Q", phase: "build", now: "2026-09-23T17:01:00.000Z" });
            const { asks } = await readOnDisk(item, runId);
            await write(s, item, runId);
            const after = await readOnDisk(item, runId);
            assert.deepEqual(after.asks, asks, `${label} carried asks unchanged`);
            assert.deepEqual(Object.keys(after), FROZEN_KEYS, `${label}: the seventeen keys, in order`);
          });
        }
      },
    },
    {
      name: "131/01 task04 — a node-partitioned run keeps its asks on its own record, and a retry starts its own asks",
      async run() {
        await withRun(async ({ item, runId }) => {
          const { openRunAsk, runNodeRecordPath, runRecordPath } = await store();
          await openRunAsk(item, runId, { question: "Decision needed: X", phase: "build", now: "2026-09-23T17:01:00.000Z" });
          const onNode = JSON.parse(await readFile(runNodeRecordPath(item, "node-2976", runId), "utf8"));
          assert.equal(onNode.asks.length, 1);
          assert.equal(onNode.asks[0].answeredAt, null);
          assert.equal(existsSync(runRecordPath(item, runId)), false, "no flat record exists");
        }, { node: "node-2976" });

        await withRun(async ({ item, runId }) => {
          const { openRunAsk, completeRun, retryRun } = await store();
          await openRunAsk(item, runId, { question: "Q", phase: "build", now: "2026-09-23T17:01:00.000Z" });
          await completeRun(item, { runId, outcome: "failed", failureReason: "timeout", now: "2026-09-23T17:10:00.000Z", settleSpend: false });
          const next = await retryRun(item, { runId, now: "2026-09-23T17:20:00.000Z" });
          assert.deepEqual(next.asks, [], "the new attempt's asks is []");
        });
      },
    },
    {
      name: "131/01 task04 — asks is assigned on a run record only by run-store.mjs, and only in its five homes",
      async run() {
        const { stripComments } = await import("../support/source-slice.mjs");
        const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
        const files = (await readdir(srcRoot, { recursive: true })).filter((f) => f.endsWith(".mjs"));
        assert.ok(files.length > 100, `the sweep read src/ — ${files.length} modules`);
        // An object-literal `asks:` key — never a member read like `record.asks : []` in a ternary.
        const assigns = /(?<![.\w])asks\s*:/u;
        // Not a run record: 131/05's `applyAskOverlay(rows, { asks, workspaceId })` options argument,
        // exempted by its exact spelling so any other `asks:` in list.mjs still reds.
        const notARecord = { "commands/list.mjs": "{ asks: await readWorkspaceAsks(ctx)," };
        for (const rel of files) {
          const posix = rel.split(path.sep).join("/");
          if (posix === "run-store.mjs") continue;
          const source = stripComments(await readFile(path.join(srcRoot, rel), "utf8")).replace(notARecord[posix] ?? "\0", "");
          assert.ok(!assigns.test(source), `${rel} assigns an asks key`);
        }
        const store = stripComments(await readFile(path.join(srcRoot, "run-store.mjs"), "utf8"));
        const homes = ["function buildRecord", "function normalizeRecord", "async function openRunAsk", "async function parkRunAsk", "async function answerRunAsk"];
        const starts = [...store.matchAll(/(?:async\s+)?function\s+\w+/gu)].map((m) => ({ at: m.index, name: m[0] }));
        for (const line of store.split("\n").map((text, i) => ({ text, i })).filter(({ text }) => assigns.test(text))) {
          const offset = store.split("\n").slice(0, line.i).join("\n").length;
          const owner = starts.filter((s) => s.at <= offset).at(-1)?.name;
          assert.ok(homes.includes(owner), `an asks assignment sits in ${owner}: ${line.text.trim()}`);
        }
      },
    },
  ];
}
