// Traceability: milestone 126 / story 02, tasks 00 and 01 (ADR-004). THE DECLARATION PREDICATE,
// driven over literal run records — which declarations should be running on this node now.
//
// The store's own verdicts are handed in, never imported by the engine, so this suite passes the
// REAL `isRunning`, `isStale` and `retryReadiness`: a fixture that substituted its own would prove
// only that the decider can be lied to. The structural half is
// `test/arch/loop/acd-declaration-predicate-is-composed.test.mjs`.
import assert from "node:assert/strict";

import {
  buildLoopDeclaration,
  decideSupervisedDeclarations,
  readLoopDeclaration,
} from "../../src/work/loop.mjs";
import { isRunning, isStale, retryReadiness } from "../../src/run-store.mjs";

const NOW = "2026-09-08T12:00:00.000Z";
const CEILING = 7_200_000;
const STALENESS = 900_000;

const loop = (over = {}) => ({
  loopRunId: "lr-1", scope: "53", level: "L2", cap: 3,
  phase: "continue", cycle: 1, startedAt: "2026-09-08T10:00:00.000Z",
  id: "loop:autonomous-cascade", supervised: true, ...over,
});

/** A run record whose instants sit inside the ceiling unless a case moves them. */
const run = (over = {}) => ({
  runId: "run-1",
  retryOf: null,
  state: "running",
  attempt: 1,
  failureReason: null,
  resumeAfter: null,
  reclaimedAt: null,
  createdAt: "2026-09-08T11:00:00.000Z",
  heartbeatAt: "2026-09-08T11:59:00.000Z",
  updatedAt: "2026-09-08T11:59:00.000Z",
  brief: { loop: loop() },
  ...over,
});

function ask(runs, { ceilingMs = CEILING, now = NOW, items } = {}) {
  return decideSupervisedDeclarations({
    workspaces: [{
      workspaceId: "ws-1",
      projectRoot: "C:/repo",
      items: items ?? [{ ref: "53", runs }],
    }],
    maxAttempts: 3,
    ceilingMs,
    stalenessMs: STALENESS,
    now,
    isRunning,
    isStale,
    retryReadiness,
  });
}

/** A settled attempt of `ms`, chained onto `retryOf`, ending well before `now`. */
const settled = (runId, retryOf, startIso, ms, over = {}) => run({
  runId,
  retryOf,
  state: "failed",
  failureReason: "timeout",
  heartbeatAt: null,
  createdAt: startIso,
  updatedAt: new Date(Date.parse(startIso) + ms).toISOString(),
  ...over,
});

export const workLoopDeclarationsTests = [
  {
    name: "126/02 task00 — every class of latest run is answered, and only the resumable ones are listed",
    run() {
      const rows = [
        ["running, heartbeat fresh", { }, true, 1],
        ["running, heartbeat older than the threshold", { heartbeatAt: "2026-09-08T11:00:00.000Z", updatedAt: "2026-09-08T11:00:00.000Z" }, true, 1],
        ["queued, never started", { state: "queued", heartbeatAt: null }, false, 1],
        ["cancelled", { state: "cancelled", heartbeatAt: null }, false, 1],
        ["failed runtime_offline, reclaimed", { state: "failed", failureReason: "runtime_offline", reclaimedAt: "2026-09-08T11:59:00.000Z" }, true, 1],
        ["failed timeout", { state: "failed", failureReason: "timeout" }, true, 2],
        ["failed session_limit, resumeAfter after now", { state: "failed", failureReason: "session_limit", resumeAfter: "2026-09-08T13:00:00.000Z" }, false, 1],
        ["failed session_limit, resumeAfter before now", { state: "failed", failureReason: "session_limit", resumeAfter: "2026-09-08T11:00:00.000Z" }, true, 1],
        ["failed session_limit, no resumeAfter", { state: "failed", failureReason: "session_limit" }, true, 1],
        ["failed needs-input", { state: "failed", failureReason: "needs-input" }, false, 1],
        ["failed agent_error", { state: "failed", failureReason: "agent_error" }, false, 1],
        ["failed runtime_offline at attempt 3 of 3", { state: "failed", failureReason: "runtime_offline" }, false, 3],
        ["done", { state: "done", heartbeatAt: null }, false, 1],
      ];
      for (const [label, over, listed, attempt] of rows) {
        const answer = ask([run({ ...over, attempt })]);
        assert.equal(answer.rows.length, listed ? 1 : 0, `${label}: ${listed ? "listed" : "not listed"}`);
      }

      // The ceiling is the other gate, and it bites on a RELAUNCH.
      const overCeiling = ask([run({ state: "failed", failureReason: "runtime_offline", attempt: 2 })], { ceilingMs: 1 });
      assert.equal(overCeiling.rows.length, 0, "a lineage over the ceiling is not listed");

      // `supervised: false` is not listed on any ground.
      for (const over of [{}, { state: "failed", failureReason: "runtime_offline", reclaimedAt: "2026-09-08T11:59:00.000Z" }]) {
        const answer = ask([run({ ...over, brief: { loop: loop({ supervised: false }) } })]);
        assert.equal(answer.rows.length, 0, "an unsupervised declaration yields no row, whatever its run says");
      }
    },
  },
  {
    name: "126/02 task00 — a listed row carries six keys and no verdict",
    run() {
      const [row] = ask([run()]).rows;
      assert.deepEqual(
        Object.keys(row),
        ["workspaceId", "projectRoot", "loopRunId", "scope", "level", "cap"],
        "six keys, no seventh",
      );
      assert.deepEqual(row, { workspaceId: "ws-1", projectRoot: "C:/repo", loopRunId: "lr-1", scope: "53", level: "L2", cap: 3 });
      assert.ok(Object.isFrozen(row));
      for (const forbidden of ["state", "failureReason", "ready", "readiness", "attempt", "argv", "cwd", "label"]) {
        assert.ok(!(forbidden in row), `a row carries no ${forbidden}`);
      }
    },
  },
  {
    name: "126/02 task00 — the boundaries, each stated as the instant or the count itself",
    run() {
      // `retryReadiness` parks on a STRICT `readyAtMs > nowMs`, so an instant exactly equal to
      // `now` is READY.
      assert.equal(ask([run({ state: "failed", failureReason: "session_limit", resumeAfter: NOW })]).rows.length, 1);
      // `isStale` is a STRICT `>`, so an age exactly at the threshold is still LIVE — and a live
      // run in flight is listed whatever the clock says.
      const atThreshold = new Date(Date.parse(NOW) - STALENESS).toISOString();
      assert.equal(ask([run({ heartbeatAt: atThreshold, updatedAt: atThreshold })]).rows.length, 1);

      // The ceiling's own boundary is `>=`, decided in ONE home.
      const lineage = (ms) => [settled("a", null, "2026-09-08T09:00:00.000Z", ms), run({
        runId: "b", retryOf: "a", state: "failed", failureReason: "runtime_offline", attempt: 2,
        heartbeatAt: null, createdAt: "2026-09-08T11:00:00.000Z", updatedAt: "2026-09-08T11:00:00.000Z",
      })];
      assert.equal(ask(lineage(CEILING - 1)).rows.length, 1, "one ms under the ceiling is listed");
      assert.equal(ask(lineage(CEILING)).rows.length, 0, "equal to the ceiling is not");
      assert.equal(
        ask(lineage(CEILING - 1).map((r) => (r.runId === "b" ? { ...r, attempt: 3 } : r))).rows.length,
        0,
        "…and attempts exhausted is not listed however much budget remains",
      );
    },
  },
  {
    name: "126/02 task00 — liveness decides a run in flight: the pair on which isStale alone changes the verdict",
    run() {
      // A lineage well over the ceiling, whose latest run is in flight. Fresh ⇒ listed on its own
      // liveness (its shell owns its bounds). Stale ⇒ a relaunch, and the clock refuses it.
      const spent = settled("a", null, "2026-09-08T05:00:00.000Z", CEILING + 60_000);
      const fresh = run({ runId: "b", retryOf: "a", createdAt: "2026-09-08T11:00:00.000Z" });
      const stale = { ...fresh, heartbeatAt: "2026-09-08T11:00:00.000Z", updatedAt: "2026-09-08T11:00:00.000Z" };
      assert.equal(ask([spent, fresh]).rows.length, 1, "running and fresh is listed over the ceiling");
      assert.equal(ask([spent, stale]).rows.length, 0, "running and stale over the ceiling is not");
    },
  },
  {
    name: "126/02 task00 — an exhausted lineage is not listed even though the store says ready",
    run() {
      const first = settled("a", null, "2026-09-08T08:00:00.000Z", 3_700_000);
      const second = run({
        runId: "b", retryOf: "a", state: "failed", failureReason: "runtime_offline", attempt: 2,
        heartbeatAt: null, createdAt: "2026-09-08T09:30:00.000Z", updatedAt: "2026-09-08T11:00:00.000Z",
      });
      // The store, asked directly, says this record is ready to retry.
      assert.equal(retryReadiness(second, 3, Date.parse(NOW)).ready, true);
      assert.equal(retryReadiness(second, 3, Date.parse(NOW)).state, "ready");
      // …and the predicate still declines it, because nothing persists a `deadline-exhausted`
      // halt and a reconciler fed this row would relaunch it every tick, forever.
      assert.equal(ask([first, second]).rows.length, 0);
      // Raise only the ceiling and the row appears — so the clock leg is what decided.
      assert.equal(ask([first, second], { ceilingMs: 60 * 60 * 1000 * 24 }).rows.length, 1);
    },
  },
  {
    name: "126/02 task00 — which declaration a row answers for, and how many rows a workspace yields",
    run() {
      assert.equal(ask([{ runId: "x", createdAt: "2026-09-08T11:00:00.000Z", brief: {} }]).rows.length, 0, "no run carrying a brief.loop");
      assert.equal(decideSupervisedDeclarations({ workspaces: [{ workspaceId: "w", projectRoot: "p", items: [] }] }).rows.length, 0, "a workspace holding no items");

      // One declaration whose runs span three items in its scope → ONE row, decided by the newest.
      const spanning = ask(null, {
        items: [
          { ref: "53/00", runs: [run({ runId: "a", createdAt: "2026-09-08T11:00:00.000Z", state: "done", heartbeatAt: null })] },
          { ref: "53/01", runs: [run({ runId: "b", createdAt: "2026-09-08T11:10:00.000Z", state: "done", heartbeatAt: null })] },
          { ref: "53/02", runs: [run({ runId: "c", createdAt: "2026-09-08T11:20:00.000Z" })] },
        ],
      });
      assert.equal(spanning.rows.length, 1, "one row per SCOPE, never one per item");

      // Two scopes, both resumable → two rows, each carrying its own loopRunId.
      const twoScopes = ask(null, {
        items: [
          { ref: "53", runs: [run({ runId: "a" })] },
          { ref: "60", runs: [run({ runId: "b", brief: { loop: loop({ loopRunId: "lr-2", scope: "60" }) } })] },
        ],
      });
      assert.deepEqual(twoScopes.rows.map((r) => r.loopRunId).sort(), ["lr-1", "lr-2"]);

      // The newest record's envelope is unusable; the OLDER declaration is recovered, and the
      // NEWEST record still decides the verdict.
      const older = run({ runId: "a", createdAt: "2026-09-08T11:00:00.000Z", state: "done", heartbeatAt: null });
      const newestUnusable = run({
        runId: "b", createdAt: "2026-09-08T11:30:00.000Z",
        state: "failed", failureReason: "agent_error", heartbeatAt: null,
        brief: { loop: { ...loop(), cap: undefined } },
      });
      assert.equal(readLoopDeclaration([older, newestUnusable]).loopRunId, "lr-1", "the older declaration is recovered");
      assert.equal(ask([older, newestUnusable]).rows.length, 0, "…and the newest record's agent_error decides");

      // The newest USABLE record's `supervised` is the one read.
      const olderSupervised = run({ runId: "a", createdAt: "2026-09-08T11:00:00.000Z", state: "done", heartbeatAt: null });
      const newerUnsupervised = run({ runId: "b", createdAt: "2026-09-08T11:30:00.000Z", brief: { loop: loop({ supervised: false }) } });
      assert.equal(ask([olderSupervised, newerUnsupervised]).rows.length, 0);
      const olderUnsupervised = run({ runId: "a", createdAt: "2026-09-08T11:00:00.000Z", state: "done", heartbeatAt: null, brief: { loop: loop({ supervised: false }) } });
      const newerSupervised = run({ runId: "b", createdAt: "2026-09-08T11:30:00.000Z" });
      assert.equal(ask([olderUnsupervised, newerSupervised]).rows.length, 1);

      // A tie on `createdAt` is broken deterministically, so two asks agree.
      const tied = [run({ runId: "a" }), run({ runId: "b" })];
      const first = ask(tied);
      assert.equal(first.rows.length, 1);
      assert.deepEqual(ask(tied), first, "two asks return the identical answer");
    },
  },
  {
    name: "126/02 task01 — the envelope gains a ninth key, last, and only `true` raises it",
    run() {
      const base = { loopRunId: "lr-7", scope: "53", level: "L2", cap: 3, phase: "continue", cycle: 2, startedAt: "2026-09-08T10:00:00.000Z", id: "loop:autonomous-cascade" };
      for (const [input, value] of [[undefined, false], [true, true], [false, false], [null, false], ["true", false], [1, false]]) {
        const built = buildLoopDeclaration(input === undefined ? base : { ...base, supervised: input });
        assert.equal(Object.keys(built).length, 9, `${String(input)}: nine keys`);
        assert.deepEqual(Object.keys(built).slice(0, 8), ["loopRunId", "scope", "level", "cap", "phase", "cycle", "startedAt", "id"]);
        assert.equal(Object.keys(built).at(-1), "supervised");
        assert.equal(built.supervised, value, `${String(input)}: the opt-in fails closed`);
        // The eight before it hold their existing values.
        for (const key of Object.keys(base)) assert.equal(built[key], base[key], key);
      }
    },
  },
  {
    name: "126/02 task01 — the key survives recovery, and the usability requirement stays at five",
    run() {
      const nine = { loopRunId: "lr-7", scope: "53", level: "L2", cap: 3, phase: "continue", cycle: 2, startedAt: "2026-09-08T10:00:00.000Z", id: "i", supervised: true };
      const rec = (over) => readLoopDeclaration([{ runId: "r", createdAt: "2026-09-08T11:00:00.000Z", brief: { loop: over } }]);

      const supervised = rec(nine);
      assert.deepEqual(Object.keys(supervised), ["loopRunId", "scope", "level", "cap", "startedAt", "supervised"], "six projected keys, supervision last");
      assert.equal(supervised.supervised, true);
      assert.equal(rec({ ...nine, supervised: false }).supervised, false);
      // The eight keys shipped today, with no `supervised` at all — every record already on disk.
      const { supervised: _dropped, ...eight } = nine;
      assert.equal(rec(eight).supervised, false);
      assert.deepEqual(Object.keys(rec(eight)), ["loopRunId", "scope", "level", "cap", "startedAt", "supervised"]);
      // The projection fails closed too.
      assert.equal(rec({ ...nine, supervised: "true" }).supervised, false);
      // Exactly the five required keys, and the five plus an unknown tenth.
      const five = { loopRunId: "lr-7", scope: "53", level: "L2", cap: 3, startedAt: "2026-09-08T10:00:00.000Z" };
      assert.equal(rec(five).supervised, false);
      assert.deepEqual(Object.keys(rec({ ...five, wibble: 1 })), ["loopRunId", "scope", "level", "cap", "startedAt", "supervised"], "an unknown key is not projected");
      // Unusable shapes recover nothing.
      assert.equal(rec({ ...nine, cap: undefined }), null);
      assert.equal(rec(undefined), null);
      assert.equal(rec("not an object"), null);
    },
  },
  {
    name: "2026-09-11 — a workspace's OWN ceilingMs governs its declarations, not the supervising node's; a member with none falls back to input.ceilingMs (the deadline-exhausted storm fix)",
    run() {
      // One lineage, ~1h of attempt time, reclaimed and resumable. Two workspaces, two ceilings.
      const start = "2026-09-08T10:00:00.000Z";
      const lineage = [settled("a", null, start, 3 * 60 * 60 * 1000, { failureReason: "runtime_offline", reclaimedAt: new Date(Date.parse(start) + 3 * 60 * 60 * 1000).toISOString(), attempt: 1 })];
      const workspaceWith = (ceilingMs) => ({ workspaceId: ceilingMs == null ? "no-ceiling" : `c${ceilingMs}`, projectRoot: "C:/m", items: [{ ref: "01", runs: lineage }], ...(ceilingMs == null ? {} : { ceilingMs }) });
      const ask2 = (workspace, inputCeiling) => decideSupervisedDeclarations({
        workspaces: [workspace], maxAttempts: 3, ceilingMs: inputCeiling, stalenessMs: STALENESS, now: NOW, isRunning, isStale, retryReadiness,
      }).rows.length;

      // The member's OWN 2h ceiling rejects a 3h lineage that this node's raised 12h would admit.
      assert.equal(ask2(workspaceWith(2 * 60 * 60 * 1000), 12 * 60 * 60 * 1000), 0, "the member's own 2h ceiling governs — NOT the node's 12h — so the exhausted lineage is not listed");
      assert.equal(ask2(workspaceWith(12 * 60 * 60 * 1000), 1), 1, "…and a member whose OWN ceiling is 12h IS listed, even though the node passed 1ms");
      // No per-workspace ceiling ⇒ the engine falls back to input.ceilingMs, exactly as before.
      assert.equal(ask2(workspaceWith(null), 12 * 60 * 60 * 1000), 1, "a member with no ceiling uses the node's, unchanged");
      assert.equal(ask2(workspaceWith(null), 1), 0, "…in both directions");
    },
  },
];
