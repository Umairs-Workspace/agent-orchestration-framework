// Traceability wiring for milestone 20 / story 00 — heartbeat + orphan reclaim.
//
// Covers EVERY @executable scenario in
//   tasks/03_heartbeat-and-reclaim.feature
// exercising the REAL src/run-store.mjs in-process against a temp fixture repo
// (mkdtemp → mkdir → run → rm in finally). One test object per @executable
// scenario (Scenario-Outline rows folded into one entry iterating the rows), each
// name tracing to feature + scenario. node:assert/strict.
//
//   03_heartbeat-and-reclaim.feature — heartbeat bumps heartbeatAt + updatedAt with
//     NO state change; staleness is heartbeatAt-driven (updatedAt fallback when it
//     never beat), strict `>` at the threshold; reclaimStaleRuns force-fails ONLY
//     stale running runs via the legal running → failed edge (runtime_offline +
//     reclaimedAt = now, sessionId preserved), the never-beat fallback included;
//     every live/queued/terminal sibling is byte-unchanged; the scan walks the
//     supplied item list by path (an item not in the list is untouched); an empty
//     or all-healthy scan is a clean no-op.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// --- fixture builders --------------------------------------------------------

async function makeRepo() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-run-hbreclaim-"));
  const workDir = path.join(repo, "wiki", "work");
  await mkdir(workDir, { recursive: true });
  return { repo, workDir };
}

async function milestoneItem(workDir, { number = "20", slug = "autonomous-run-resilience" } = {}) {
  const dir = path.join(workDir, `${number}_milestone_${slug}`);
  await mkdir(dir, { recursive: true });
  return { ref: number, dir };
}

function runFilePath(item, runId) {
  return path.join(item.dir, "runs", `${runId}.json`);
}

async function readFileBytes(item, runId) {
  return readFile(runFilePath(item, runId), "utf8");
}

async function runFiles(item) {
  try {
    return (await readdir(path.join(item.dir, "runs"))).filter((name) => name.endsWith(".json"));
  } catch {
    return [];
  }
}

// Write a run-record DIRECTLY in an arbitrary shape/state (the dedup guard mints no
// queued/second run, and there is no producer for an aged-heartbeat record). The
// directly-written-fixture pattern story 00's notes prescribe.
async function writeRecord(item, overrides) {
  const runsDir = path.join(item.dir, "runs");
  await mkdir(runsDir, { recursive: true });
  const base = {
    runId: "20260630T000000000Z-0000",
    itemRef: item.ref,
    state: "running",
    attempt: 1,
    outcome: null,
    sessionId: null,
    brief: {},
    createdAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
    failureReason: null,
    heartbeatAt: null,
    retryOf: null,
    reclaimedAt: null,
  };
  const record = { ...base, ...overrides };
  await writeFile(path.join(runsDir, `${record.runId}.json`), JSON.stringify(record, null, 2), "utf8");
  return record;
}

// Subtract `ms` from an ISO instant → an ISO instant `ms` ago.
function isoAgo(nowIso, ms) {
  return new Date(Date.parse(nowIso) - ms).toISOString();
}

export const runHeartbeatReclaimTests = [
  // ── Scenario: heartbeat stamps the running run's liveness without changing its state ──
  {
    name: "run-heartbeat-reclaim/03 heartbeat stamps the running run's liveness without changing its state",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const { startRun, heartbeat, readRuns } = await import("../../src/run-store.mjs");
        const item = await milestoneItem(workDir);

        const started = await startRun(item, { now: "2026-06-30T08:00:00.000Z" });
        assert.equal(started.heartbeatAt, null, "the run starts with heartbeatAt null");

        const beat = await heartbeat(item, started.runId, { now: "2026-06-30T09:00:00.000Z" });
        assert.equal(beat.heartbeatAt, "2026-06-30T09:00:00.000Z", "heartbeatAt is the supplied now");
        assert.equal(beat.updatedAt, "2026-06-30T09:00:00.000Z", "updatedAt is bumped to the supplied now");
        assert.equal(beat.state, "running", "the state is still running");
        assert.equal(beat.outcome, null, "the outcome is still null");

        const [reloaded] = await readRuns(item);
        assert.equal(reloaded.heartbeatAt, "2026-06-30T09:00:00.000Z", "the stamp persisted to disk");
        assert.equal(reloaded.state, "running", "the persisted state is still running");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // ── Scenario Outline: a running run is stale per heartbeatAt, falling back to updatedAt when it never beat ──
  // Staleness is OBSERVED via whether the reclaim scan force-failed the run (the store
  // exposes no isStale; the by-write outcome is the observable per the feature note).
  {
    name: "run-heartbeat-reclaim/03 a running run is stale per heartbeatAt, falling back to updatedAt when it never beat",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const { reclaimStaleRuns, readRuns } = await import("../../src/run-store.mjs");
        const now = "2026-06-30T12:00:00.000Z";
        const threshold = 60000;

        const rows = [
          // heartbeatAt drives staleness when present (strict > at the boundary)
          { livenessField: "heartbeatAt", age: 30000, staleness: "live" },
          { livenessField: "heartbeatAt", age: 60000, staleness: "live" },
          { livenessField: "heartbeatAt", age: 90000, staleness: "stale" },
          // updatedAt is the fallback for a run that never beat (heartbeatAt null)
          { livenessField: "updatedAt", age: 30000, staleness: "live" },
          { livenessField: "updatedAt", age: 60000, staleness: "live" },
          { livenessField: "updatedAt", age: 90000, staleness: "stale" },
        ];
        for (const row of rows) {
          const item = await milestoneItem(workDir, { slug: `stale-${row.livenessField}-${row.age}` });
          const stamp = isoAgo(now, row.age);
          // For the heartbeatAt rows, set heartbeatAt to the aged stamp and updatedAt
          // fresh so ONLY heartbeatAt could drive staleness. For the updatedAt rows,
          // leave heartbeatAt null so the fallback drives it.
          if (row.livenessField === "heartbeatAt") {
            await writeRecord(item, { runId: "20260630T000000000Z-0000", state: "running", heartbeatAt: stamp, updatedAt: now });
          } else {
            await writeRecord(item, { runId: "20260630T000000000Z-0000", state: "running", heartbeatAt: null, updatedAt: stamp });
          }

          await reclaimStaleRuns([item], { now, stalenessThreshold: threshold });
          const [run] = await readRuns(item);
          if (row.staleness === "stale") {
            assert.equal(run.state, "failed", `[${row.livenessField} age ${row.age}] judged stale → force-failed`);
          } else {
            assert.equal(run.state, "running", `[${row.livenessField} age ${row.age}] judged live → left running`);
          }
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // ── Scenario: reclaiming a stale running run force-fails it as a retryable, audited reclaim ──
  {
    name: "run-heartbeat-reclaim/03 reclaiming a stale running run force-fails it as a retryable, audited reclaim",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const { reclaimStaleRuns, readRuns } = await import("../../src/run-store.mjs");
        const item = await milestoneItem(workDir);
        const now = "2026-06-30T12:00:00.000Z";

        // a stale running run (heartbeatAt far past the threshold) with sessionId sess-c
        await writeRecord(item, { runId: "20260630T000000000Z-0000", state: "running", sessionId: "sess-c", heartbeatAt: isoAgo(now, 600000), updatedAt: isoAgo(now, 600000) });

        const reclaimed = await reclaimStaleRuns([item], { now, stalenessThreshold: 60000 });
        assert.equal(reclaimed.length, 1, "exactly one run is reclaimed");
        const [run] = await readRuns(item);
        assert.equal(run.state, "failed", "the run state is failed");
        assert.equal(run.failureReason, "runtime_offline", "the run failureReason is runtime_offline (infra → retryable)");
        assert.equal(run.reclaimedAt, now, "the run reclaimedAt is the now passed to the scan");
        assert.equal(run.sessionId, "sess-c", "the run sessionId is still sess-c (preserved)");
        // the returned entry references the item + the reclaimed run
        assert.equal(reclaimed[0].item, item, "the reclaimed entry carries the item");
        assert.equal(reclaimed[0].run.runId, run.runId, "the reclaimed entry carries the failed run");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // ── Scenario: a never-beat running run past its updatedAt threshold is reclaimed via the fallback ──
  {
    name: "run-heartbeat-reclaim/03 a never-beat running run past its updatedAt threshold is reclaimed via the fallback",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const { reclaimStaleRuns, readRuns } = await import("../../src/run-store.mjs");
        const item = await milestoneItem(workDir);
        const now = "2026-06-30T12:00:00.000Z";

        // never beat (heartbeatAt null) but updatedAt is past the threshold → stale via fallback
        await writeRecord(item, { runId: "20260630T000000000Z-0000", state: "running", heartbeatAt: null, updatedAt: isoAgo(now, 600000) });

        await reclaimStaleRuns([item], { now, stalenessThreshold: 60000 });
        const [run] = await readRuns(item);
        assert.equal(run.state, "failed", "the never-beat run is force-failed via the updatedAt fallback");
        assert.equal(run.failureReason, "runtime_offline", "the failureReason is runtime_offline");
        assert.ok(run.reclaimedAt, "the reclaimedAt is set");
        assert.equal(run.reclaimedAt, now, "the reclaimedAt equals the scan's now");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // ── Scenario Outline: reclaim leaves every non-stale and every terminal run byte-unchanged ──
  {
    name: "run-heartbeat-reclaim/03 reclaim leaves every non-stale and every terminal run byte-unchanged",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const { reclaimStaleRuns, readRuns } = await import("../../src/run-store.mjs");
        const now = "2026-06-30T12:00:00.000Z";
        const fresh = isoAgo(now, 1000); // 1s old — well under the threshold
        const stale = isoAgo(now, 600000); // 10min old — well over the threshold

        const kinds = ["fresh-heartbeat running", "queued", "done", "failed", "cancelled"];
        for (const kind of kinds) {
          const item = await milestoneItem(workDir, { slug: `sib-${kind.replace(/\s+/g, "-")}` });
          // the stale running run that WILL be reclaimed
          const staleRun = await writeRecord(item, { runId: "20260630T000000000Z-0000", state: "running", heartbeatAt: stale, updatedAt: stale });
          // the sibling that must be byte-unchanged
          const sibling = await writeSibling(item, kind, fresh);
          const siblingBefore = await readFileBytes(item, sibling.runId);

          await reclaimStaleRuns([item], { now, stalenessThreshold: 60000 });

          const runs = await readRuns(item);
          const staleAfter = runs.find((r) => r.runId === staleRun.runId);
          assert.equal(staleAfter.state, "failed", `[${kind}] the stale running run became failed`);
          assert.equal(await readFileBytes(item, sibling.runId), siblingBefore, `[${kind}] the sibling run is byte-unchanged`);
        }

        // build a sibling record of the given kind, distinct runId from the stale run
        async function writeSibling(item, kind, freshStamp) {
          switch (kind) {
            case "fresh-heartbeat running":
              return writeRecord(item, { runId: "20260630T000000000Z-0001", state: "running", heartbeatAt: freshStamp, updatedAt: freshStamp });
            case "queued":
              return writeRecord(item, { runId: "20260630T000000000Z-0001", state: "queued", outcome: null, heartbeatAt: null, updatedAt: freshStamp });
            case "done":
              return writeRecord(item, { runId: "20260630T000000000Z-0001", state: "done", outcome: "done", updatedAt: freshStamp });
            case "failed":
              return writeRecord(item, { runId: "20260630T000000000Z-0001", state: "failed", outcome: "failed", failureReason: "agent_error", updatedAt: freshStamp });
            case "cancelled":
              return writeRecord(item, { runId: "20260630T000000000Z-0001", state: "cancelled", outcome: "cancelled", updatedAt: freshStamp });
            default:
              throw new Error(`unknown sibling kind: ${kind}`);
          }
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // ── Scenario: the scan walks the supplied item list by path, scanning each item's runs/ and no others ──
  {
    name: "run-heartbeat-reclaim/03 the scan walks the supplied item list by path, scanning each item's runs/ and no others",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const { reclaimStaleRuns, readRuns } = await import("../../src/run-store.mjs");
        const now = "2026-06-30T12:00:00.000Z";
        const stale = isoAgo(now, 600000);

        const item20 = await milestoneItem(workDir, { number: "20", slug: "autonomous-run-resilience" });
        const item21 = await milestoneItem(workDir, { number: "21", slug: "board-run-observability" });
        const item19 = await milestoneItem(workDir, { number: "19", slug: "work-run-lifecycle" });

        await writeRecord(item20, { runId: "20260630T000000000Z-0000", state: "running", heartbeatAt: stale, updatedAt: stale });
        await writeRecord(item21, { runId: "20260630T000000000Z-0000", state: "running", heartbeatAt: stale, updatedAt: stale });
        await writeRecord(item19, { runId: "20260630T000000000Z-0000", state: "running", heartbeatAt: stale, updatedAt: stale });
        const item19Before = await readFileBytes(item19, "20260630T000000000Z-0000");

        // scan ONLY item 20 + item 21 — item 19 is not in the list
        await reclaimStaleRuns([item20, item21], { now, stalenessThreshold: 60000 });

        assert.equal((await readRuns(item20))[0].state, "failed", "item 20's stale run became failed");
        assert.equal((await readRuns(item21))[0].state, "failed", "item 21's stale run became failed");
        // item 19, not in the scanned list, is byte-unchanged
        assert.equal(await readFileBytes(item19, "20260630T000000000Z-0000"), item19Before, "item 19's stale run is byte-unchanged because it was not in the scanned list");
        assert.equal((await readRuns(item19))[0].state, "running", "item 19's run is still running (never scanned)");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  // ── Scenario: a scan with no stale running run writes nothing and raises nothing ──
  {
    name: "run-heartbeat-reclaim/03 a scan with no stale running run writes nothing and raises nothing",
    async run() {
      const { repo, workDir } = await makeRepo();
      try {
        const { reclaimStaleRuns, readRuns } = await import("../../src/run-store.mjs");
        const now = "2026-06-30T12:00:00.000Z";
        const fresh = isoAgo(now, 1000);

        const item = await milestoneItem(workDir);
        const live = await writeRecord(item, { runId: "20260630T000000000Z-0000", state: "running", heartbeatAt: fresh, updatedAt: fresh });
        const done = await writeRecord(item, { runId: "20260630T000000000Z-0001", state: "done", outcome: "done", updatedAt: fresh });
        const liveBefore = await readFileBytes(item, live.runId);
        const doneBefore = await readFileBytes(item, done.runId);

        let reclaimed;
        await assert.doesNotReject(async () => {
          reclaimed = await reclaimStaleRuns([item], { now, stalenessThreshold: 60000 });
        }, "the all-healthy scan raises no error");
        assert.deepEqual(reclaimed, [], "the all-healthy scan reclaims nothing");
        // no run record under item 20 is changed
        assert.equal(await readFileBytes(item, live.runId), liveBefore, "the fresh-heartbeat running run is byte-unchanged");
        assert.equal(await readFileBytes(item, done.runId), doneBefore, "the done run is byte-unchanged");

        // an EMPTY scan is likewise a clean no-op
        const emptyItem = await milestoneItem(workDir, { slug: "empty" });
        let emptyReclaimed;
        await assert.doesNotReject(async () => {
          emptyReclaimed = await reclaimStaleRuns([emptyItem], { now, stalenessThreshold: 60000 });
        }, "an empty scan raises no error");
        assert.deepEqual(emptyReclaimed, [], "an empty scan reclaims nothing");
        assert.deepEqual(await readRuns(emptyItem), [], "the empty item still has no runs");
      } finally {
        await rm(repo, { recursive: true, force: true });
      }
    },
  },
  ...runWaitTests(),
];

// ── milestone 131 / story 01, task 05 — A RUN WAITING ON A HUMAN IS NOT RECLAIMED, AND THE WAIT IS
// CHARGED TO NO ATTEMPT (131/ADR-003 §3-§4, ADR-001 §4). The scan's skip is asked of the store's
// one pure scan, which every sweep selects through; the charge of `attemptElapsedMs`, the pure
// engine, over records it is handed. Built inside a hoisted function so the array above can
// spread it without a TDZ.
function runWaitTests() {
  const NOW = "2026-09-23T14:00:00.000Z";
  const FIVE_MIN = 300000;
  const at = (hhmm) => `2026-09-23T${hhmm}:00.000Z`;
  const BY = { actor: "you", via: "cli", node: "node-7297" };
  const entry = (from, { parked = null, answered = null } = {}) => ({
    question: "Q", phase: "build", askedAt: from, parkedAt: parked, answer: answered == null ? null : "b", answeredAt: answered, by: answered == null ? null : BY,
  });
  const OPEN = entry(at("10:30"));
  const PARKED = entry(at("10:30"), { parked: at("11:00") });
  const ANSWERED = entry(at("10:30"), { answered: at("11:00") });
  const RUN_ID = "20260923T100000000Z-0000";

  async function withItem(fn) {
    const { repo, workDir } = await makeRepo();
    try {
      return await fn(await milestoneItem(workDir, { number: "131", slug: "the-human-in-the-loop" }));
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  }
  const staleRunning = (asks, over = {}) => ({
    runId: RUN_ID, state: "running", createdAt: at("10:00"), updatedAt: at("10:01"), heartbeatAt: at("10:01"),
    node: null, resumeAfter: null, spend: null, ...(asks === undefined ? {} : { asks }), ...over,
  });

  return [
    {
      name: "131/01 task05 — the stale scan skips a run waiting on an unanswered last ask, and only that run (eleven rows)",
      async run() {
        const { staleRunningRuns } = await import("../../src/run-store.mjs");
        const rows = [
          ["[]", [], true],
          ["one entry, open", [OPEN], false],
          ["one entry, parked and unanswered", [PARKED], false],
          ["one entry, answered", [ANSWERED], true],
          ["an answered entry, then an open entry", [ANSWERED, OPEN], false],
          ["absent (a sixteen-key record)", undefined, true],
          ['"x" (read forward as [])', "x", true],
          ["[null]", [null], true],
          ["an open entry, then an answered entry", [OPEN, ANSWERED], true],
          ["two answered entries", [ANSWERED, ANSWERED], true],
          ["an answered entry, then a parked, unanswered entry", [ANSWERED, PARKED], false],
        ];
        await withItem(async (item) => {
          for (const [label, asks, selected] of rows) {
            await writeRecord(item, staleRunning(asks));
            const picked = await staleRunningRuns([item], { now: NOW, stalenessThreshold: FIVE_MIN });
            assert.equal(picked.some((run) => run.runId === RUN_ID), selected, `asks ${label}`);
          }
          for (const [label, over] of [
            ["running, last beat at 13:58", { heartbeatAt: at("13:58"), updatedAt: at("13:58") }],
            ["settled done", { state: "done", outcome: "done" }],
            ["settled failed / runtime_offline", { state: "failed", outcome: "failed", failureReason: "runtime_offline" }],
          ]) {
            await writeRecord(item, staleRunning([OPEN], over));
            assert.deepEqual(await staleRunningRuns([item], { now: NOW, stalenessThreshold: FIVE_MIN }), [], `${label}: not selected`);
          }
        });
      },
    },
    {
      name: "131/01 task05 — every sweep inherits the skip and leaves a waiting run byte-unchanged; once answered, the same sweep reclaims it",
      async run() {
        const { reclaimStaleRuns, answerRunAsk, readRuns } = await import("../../src/run-store.mjs");
        const { transitionStaleRunsReclaimed } = await import("../../src/effects/run-transitions.mjs");
        await withItem(async (item) => {
          for (const [label, asks, sweep] of [
            ["open / reclaimStaleRuns", [OPEN], () => reclaimStaleRuns([item], { now: NOW, stalenessThreshold: FIVE_MIN })],
            ["parked / reclaimStaleRuns", [PARKED], () => reclaimStaleRuns([item], { now: NOW, stalenessThreshold: FIVE_MIN })],
            ["parked / transitionStaleRunsReclaimed", [PARKED], () => transitionStaleRunsReclaimed([item], { now: NOW, stalenessThreshold: FIVE_MIN })],
            ["open / transitionStaleRunsReclaimed", [OPEN], () => transitionStaleRunsReclaimed([item], { now: NOW, stalenessThreshold: FIVE_MIN })],
          ]) {
            await writeRecord(item, staleRunning(asks));
            const before = await readFileBytes(item, RUN_ID);
            assert.deepEqual(await sweep(), [], `${label}: reclaims nothing`);
            assert.equal(await readFileBytes(item, RUN_ID), before, `${label}: the record is byte-unchanged`);
          }

          // The last row left R running with an OPEN ask and a 10:01 beat. The answer does not
          // refresh its liveness, so the same sweep now reclaims it.
          await answerRunAsk(item, RUN_ID, { answer: "b", by: BY, now: at("13:59") });
          const settled = await transitionStaleRunsReclaimed([item], { now: NOW, stalenessThreshold: FIVE_MIN });
          assert.equal(settled.length, 1, "the answered run is reclaimed");
          const [run] = await readRuns(item);
          assert.equal(run.state, "failed");
          assert.equal(run.failureReason, "runtime_offline");
        });
      },
    },
    {
      name: "131/01 task05 — the wait is charged to nobody: a three-hour answered wait, and an interval that ends at the answer, the park or now, clipped to the attempt",
      async run() {
        const { attemptElapsedMs } = await import("../../src/work/loop.mjs");
        const record = (over) => ({ runId: RUN_ID, createdAt: at("10:00"), updatedAt: at("10:00"), heartbeatAt: null, reclaimedAt: null, state: "running", ...over });
        const doneAt = (hhmm) => ({ state: "done", updatedAt: at(hhmm) });

        const waited = record({ ...doneAt("13:30"), asks: [entry(at("10:15"), { answered: at("13:15") })] });
        assert.equal(attemptElapsedMs({ record: waited, now: NOW }), 30 * 60 * 1000, "the three answered hours are removed");

        for (const [label, over, ms] of [
          ["running, still open from 12:00", { asks: [entry(at("12:00"))] }, 2 * 60 * 60 * 1000],
          ["running, parked 12:00→13:00", { asks: [entry(at("12:00"), { parked: at("13:00") })] }, 3 * 60 * 60 * 1000],
          ["settled at 11:00, open from 10:30", { ...doneAt("11:00"), asks: [entry(at("10:30"))] }, 30 * 60 * 1000],
        ]) {
          assert.equal(attemptElapsedMs({ record: record(over), now: NOW }), ms, label);
        }
      },
    },
    {
      name: "131/01 task05 — intervals are clipped to the attempt, merged, and never charged twice (fourteen rows)",
      async run() {
        const { attemptElapsedMs } = await import("../../src/work/loop.mjs");
        const { isStale } = await import("../../src/run-store.mjs");
        const record = (over) => ({ runId: RUN_ID, createdAt: at("10:00"), updatedAt: at("10:00"), heartbeatAt: null, reclaimedAt: null, state: "running", ...over });
        const rows = [
          ["09:00 answered 10:30", [entry(at("09:00"), { answered: at("10:30") })], {}, 12600000],
          ["09:00 still open", [entry(at("09:00"))], {}, 0],
          ["11-12 and 11:30-12:30", [entry(at("11:00"), { answered: at("12:00") }), entry(at("11:30"), { answered: at("12:30") })], {}, 9000000],
          ["11-13 and 11:30-12", [entry(at("11:00"), { answered: at("13:00") }), entry(at("11:30"), { answered: at("12:00") })], {}, 7200000],
          ["10:15-10:45 and 12-12:30", [entry(at("10:15"), { answered: at("10:45") }), entry(at("12:00"), { answered: at("12:30") })], {}, 10800000],
          ["11-12 answered, 13 open", [entry(at("11:00"), { answered: at("12:00") }), entry(at("13:00"))], {}, 7200000],
          ["12 parked 13 answered 13:30", [entry(at("12:00"), { parked: at("13:00"), answered: at("13:30") })], {}, 9000000],
          ["askedAt not-a-date", [{ ...entry("not-a-date", { answered: at("12:00") }) }], {}, 14400000],
          ["askedAt null", [{ ...entry(null, { answered: at("12:00") }) }], {}, 14400000],
          ["answeredAt garbage", [{ ...entry(at("12:00")), answeredAt: "garbage" }], {}, 14400000],
          ["12 answered at 11", [entry(at("12:00"), { answered: at("11:00") })], {}, 14400000],
          ["settled 11, 13-13:30", [entry(at("13:00"), { answered: at("13:30") })], { state: "done", updatedAt: at("11:00") }, 3600000],
        ];
        for (const [label, asks, over, ms] of rows) {
          assert.equal(attemptElapsedMs({ record: record({ asks, ...over }), now: NOW }), ms, label);
        }
        const staleRecord = record({ heartbeatAt: at("13:00"), updatedAt: at("13:00"), asks: [entry(at("12:00"), { parked: at("13:00") })] });
        assert.equal(attemptElapsedMs({ record: staleRecord, now: NOW, stalenessMs: FIVE_MIN, isStale }), 7200000, "stale: ends at its last beat");
        assert.equal(attemptElapsedMs({ record: record({ createdAt: "x", asks: [entry(at("12:00"))] }), now: NOW }), null, "an unreadable createdAt");
      },
    },
    {
      name: "131/01 task05 — an answered ask on an earlier attempt is not charged to the lineage, and a record without asks answers what it answered before",
      async run() {
        const { attemptElapsedMs, lineageElapsedMs } = await import("../../src/work/loop.mjs");
        const one = { runId: "a1", createdAt: at("10:00"), updatedAt: at("11:00"), state: "failed", heartbeatAt: null, reclaimedAt: null, asks: [entry(at("10:15"), { answered: at("10:45") })] };
        const two = { runId: "a2", retryOf: "a1", createdAt: at("12:00"), updatedAt: at("13:00"), state: "done", heartbeatAt: null, reclaimedAt: null, asks: [] };
        assert.equal(lineageElapsedMs({ runs: [one, two], now: NOW }), 5400000);

        const plain = [
          { createdAt: at("10:00"), updatedAt: at("11:00"), state: "done" },
          { createdAt: at("10:00"), updatedAt: at("10:00"), state: "running" },
          { createdAt: at("10:00"), updatedAt: at("10:30"), state: "failed", reclaimedAt: at("13:00"), heartbeatAt: at("10:20") },
        ];
        for (const base of plain) {
          const without = attemptElapsedMs({ record: base, now: NOW });
          assert.equal(attemptElapsedMs({ record: { ...base, asks: [] }, now: NOW }), without, "asks: [] answers what an absent asks answers");
        }
        assert.equal(lineageElapsedMs({ runs: plain.map((r) => ({ ...r, asks: [] })), now: NOW }), lineageElapsedMs({ runs: plain, now: NOW }));
      },
    },
    {
      name: "131/01 task05 — the engine stays pure: src/work/loop.mjs has zero imports and reads no clock",
      async run() {
        const { stripComments } = await import("../support/source-slice.mjs");
        const source = stripComments(await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "work", "loop.mjs"), "utf8"));
        assert.doesNotMatch(source, /^\s*import\s/mu, "zero import statements");
        assert.ok(!source.includes("Date.now(") && !source.includes("new Date("), "no Date.now( and no new Date(");
      },
    },
  ];
}
