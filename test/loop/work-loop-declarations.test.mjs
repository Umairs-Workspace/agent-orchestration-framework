// Traceability: milestone 126 / story 02, tasks 00 and 01 (ADR-004). THE DECLARATION PREDICATE,
// driven over literal run records — which declarations should be running on this node now.
//
// The store's own verdicts are handed in, never imported by the engine, so this suite passes the
// REAL `isRunning`, `isStale` and `retryReadiness`: a fixture that substituted its own would prove
// only that the decider can be lied to. The structural half is
// `test/arch/loop/acd-declaration-predicate-is-composed.test.mjs`.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildLoopDeclaration,
  decideSupervisedDeclarations,
  readLoopDeclaration,
} from "../../src/work/loop.mjs";
import { isRunning, isStale, retryReadiness } from "../../src/run-store.mjs";
import { meshStatusCommand } from "../../src/commands/mesh/identity.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import { openGlobalWorkProjectionStore } from "../../src/global-work-store.mjs";
import { publishGlobalRegistryDescriptorsToStore } from "../../src/global-node-registry.mjs";
import { publishNodeRecord } from "../../src/mesh/store.mjs";
import { stopLoop } from "../../src/loop/stop.mjs";
import {
  clearStopRequest,
  loopStopsDir,
  markStopHonoured,
  requestLoopStop,
  stopRequestPath,
} from "../../src/loop/stop-request.mjs";
import { setDegradeSinkForTest } from "../../src/degrade.mjs";
import { stripComments } from "../support/source-slice.mjs";

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

// `stopped` (130/04) is forwarded ONLY when the caller names it, so a case that omits it asks the
// engine with the key genuinely absent — the default-absent claim is about an absent key.
function ask(runs, { ceilingMs = CEILING, now = NOW, items, ...rest } = {}) {
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
    ...("stopped" in rest ? { stopped: rest.stopped } : {}),
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

// ── The on-disk PRODUCER fixture (130/04 task 03) — the shape of `makeWorkspace` in
// `test/mesh/identity/mesh-status-declarations.test.mjs`: one workspace holding milestone `53`
// with one run record (a `reclaimed()` lineage — `failed / runtime_offline`, reclaimed, and so a
// listed row), and `mesh status --declarations` run over it with `now` pinned. Mirrored rather
// than imported: `test/loop` is at its ceiling and a suite imports no sibling suite.

/** A reclaimed run — the shape the lid closing leaves behind, and a listed one. */
const producerRecord = (over = {}) => ({
  runId: "run-1", itemRef: "53", retryOf: null, state: "failed", attempt: 1,
  failureReason: "runtime_offline", resumeAfter: null,
  reclaimedAt: "2026-09-08T11:30:00.000Z",
  createdAt: "2026-09-08T11:00:00.000Z",
  heartbeatAt: "2026-09-08T11:20:00.000Z",
  updatedAt: "2026-09-08T11:30:00.000Z",
  brief: { loop: loop() },
  ...over,
});

/** A workspace on disk holding one milestone with one run record. */
async function makeProducerWorkspace(root, name, { record = producerRecord(), nodeId = "node-1" } = {}) {
  const dir = path.join(root, name);
  const itemDir = path.join(dir, "wiki", "work", "53_milestone_fixture");
  await mkdir(path.join(itemDir, "runs"), { recursive: true });
  await mkdir(path.join(dir, ".aof"), { recursive: true });
  await writeFile(path.join(itemDir, "SPEC.md"), `---
type: milestone
number: 53
slug: fixture
title: Fixture
status: in-progress
depends: []
created: 2026-09-08
updated: 2026-09-08
schema: 1
aofVersion: 0.1.0
---
# Fixture
`);
  if (record != null) {
    await writeFile(path.join(itemDir, "runs", `${record.runId}.json`), JSON.stringify(record, null, 2));
  }
  await writeFile(path.join(dir, ".aof", "aof.config.json"), JSON.stringify({
    name, work: { dir: "wiki/work" }, mesh: { nodeId, workspaceId: `ws-${name}` },
  }, null, 2));
  return dir;
}

/**
 * The fixture workspace under a temp root, `status()` = `mesh status --declarations` over it,
 * and `stops` = the isolated home's `loopStopsDir()`. Each case removes what it wrote; the root
 * goes with the temp dir.
 */
async function withProducerFixture(fn, { record } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-loop-declarations-"));
  try {
    const dir = await makeProducerWorkspace(root, "repo-a", record === undefined ? {} : { record });
    const status = async () => {
      const workspace = await loadWorkspace(dir, undefined, { env: process.env });
      return meshStatusCommand.run({ now: NOW, declarations: true }, { workspace, globalWorkStoreOptions: { env: process.env } });
    };
    return await fn({ root, dir, status, stops: loopStopsDir() });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

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
  // ── 130/04 task 03 — a honoured loop yields no row (ADR-004 §4-§5).
  //
  // The engine takes an ADDITIVE, default-absent `stopped: Set<loopRunId>`; the producer reads
  // the honoured marks through story 01's module and hands the set. The engine cases add that one
  // key to `ask`'s input and change nothing else; the producer cases drive `supervisedDeclarations`
  // through `mesh status --declarations` over an on-disk workspace — the identity suite's fixture
  // shape (`makeWorkspace`: milestone `53`, a `reclaimed()` record, one listed row), mirrored here
  // because `test/loop` is at its ceiling and a suite imports no sibling suite — under the
  // harness's isolated `AOF_GLOBAL_HOME`, whose `loopStopsDir()` holds the request. A request is
  // written through the module's own writers, never by hand, except the corrupt-file case.
  {
    name: "130/04 task03 — the engine drops a stopped declaration and only a stopped one",
    run() {
      const failedTimeout = [run({ state: "failed", failureReason: "timeout" })];
      const thousand = (withLr1) => new Set([...Array.from({ length: withLr1 ? 999 : 1000 }, (_, i) => `other-${i}`), ...(withLr1 ? ["lr-1"] : [])]);
      const rows = [
        ["absent", failedTimeout, undefined, 1],
        ["new Set()", failedTimeout, new Set(), 1],
        ["new Set([lr-1])", failedTimeout, new Set(["lr-1"]), 0],
        ["new Set([lr-2])", failedTimeout, new Set(["lr-2"]), 1],
        ["new Set([LR-1]) — matched exactly, never case-folded", failedTimeout, new Set(["LR-1"]), 1],
        ["a Set of 1,000 ids, lr-1 among them", failedTimeout, thousand(true), 0],
        ["a Set of 1,000 ids, lr-1 not among them", failedTimeout, thousand(false), 1],
        ["[lr-1] (an array, ill-typed)", failedTimeout, ["lr-1"], 1],
        ["{ has: () => true } (Set-like, not a Set)", failedTimeout, { has: () => true }, 1],
        ["\"lr-1\" (a string)", failedTimeout, "lr-1", 1],
        ["supervised: false — already skipped by the supervised guard", [run({ state: "failed", failureReason: "timeout", brief: { loop: loop({ supervised: false }) } })], new Set(["lr-1"]), 0],
        ["running, fresh — DROPPED: the skip precedes the liveness branch", [run()], new Set(["lr-1"]), 0],
        ["running, stale", [run({ heartbeatAt: "2026-09-08T11:00:00.000Z", updatedAt: "2026-09-08T11:00:00.000Z" })], new Set(["lr-1"]), 0],
        ["failed runtime_offline, reclaimed", [run({ state: "failed", failureReason: "runtime_offline", reclaimedAt: "2026-09-08T11:59:00.000Z" })], new Set(["lr-1"]), 0],
        ["cancelled, absent — not-retryable by the store's own verdict", [run({ state: "cancelled", heartbeatAt: null })], undefined, 0],
        ["cancelled, new Set([lr-1])", [run({ state: "cancelled", heartbeatAt: null })], new Set(["lr-1"]), 0],
        ["done, absent", [run({ state: "done", heartbeatAt: null })], undefined, 0],
      ];
      for (const [label, runs, stopped, expected] of rows) {
        const answer = ask(runs, stopped === undefined ? {} : { stopped });
        assert.equal(answer.rows.length, expected, `${label}: ${expected === 1 ? "one row for lr-1" : "none"}`);
        if (expected === 1) assert.equal(answer.rows[0].loopRunId, "lr-1", `${label}: the row is lr-1's`);
      }
      // The ill-typed inputs dropped nothing AND threw nothing — asserted by having answered.
      for (const stopped of [["lr-1"], { has: () => true }, "lr-1", 42, null]) {
        assert.doesNotThrow(() => ask(failedTimeout, { stopped }), `an ill-typed stopped (${typeof stopped}) throws nothing`);
      }
    },
  },
  {
    name: "130/04 task03 — two lineages in one workspace, one stopped",
    run() {
      const items = [
        { ref: "53", runs: [run({ runId: "a", state: "failed", failureReason: "timeout" })] },
        { ref: "60", runs: [run({ runId: "b", state: "failed", failureReason: "timeout", brief: { loop: loop({ loopRunId: "lr-2", scope: "60" }) } })] },
      ];
      const one = ask(null, { items, stopped: new Set(["lr-1"]) });
      assert.equal(one.rows.length, 1, "exactly one row");
      assert.deepEqual(one.rows[0], { workspaceId: "ws-1", projectRoot: "C:/repo", loopRunId: "lr-2", scope: "60", level: "L2", cap: 3 }, "lr-2's, carrying its six keys");
      assert.equal(ask(null, { items, stopped: new Set(["lr-1", "lr-2"]) }).rows.length, 0, "both stopped, none");
      assert.deepEqual(ask(null, { items }).rows.map((r) => r.loopRunId).sort(), ["lr-1", "lr-2"], "absent, both");
    },
  },
  {
    name: "130/04 task03 — absent and empty answer byte-identically, and the input's other keys are untouched",
    run() {
      const runs = [run({ state: "failed", failureReason: "timeout" })];
      const expected = { workspaceId: "ws-1", projectRoot: "C:/repo", loopRunId: "lr-1", scope: "53", level: "L2", cap: 3 };
      const answers = [ask(runs), ask(runs, { stopped: new Set() }), ask(runs, { stopped: null }), ask(runs, { stopped: undefined })];
      for (const answer of answers) {
        assert.deepEqual(answer, answers[0], "the four answers deep-equal one another");
        assert.deepEqual(answer.rows, [expected], "…and the suite's existing expected row");
        assert.deepEqual(Object.keys(answer.rows[0]), ["workspaceId", "projectRoot", "loopRunId", "scope", "level", "cap"], "exactly the six keys");
        assert.ok(Object.isFrozen(answer.rows[0]) && Object.isFrozen(answer.rows), "frozen");
      }
      // The input object is not mutated — its keys, and the set it carries, are as they were.
      const stopped = new Set(["lr-9"]);
      const input = {
        workspaces: [{ workspaceId: "ws-1", projectRoot: "C:/repo", items: [{ ref: "53", runs }] }],
        maxAttempts: 3, ceilingMs: CEILING, stalenessMs: STALENESS, now: NOW, isRunning, isStale, retryReadiness, stopped,
      };
      const keysBefore = Object.keys(input);
      const json = JSON.stringify({ ...input, isRunning: 1, isStale: 1, retryReadiness: 1, stopped: [...stopped] });
      decideSupervisedDeclarations(input);
      assert.deepEqual(Object.keys(input), keysBefore, "no key added or removed");
      assert.equal(JSON.stringify({ ...input, isRunning: 1, isStale: 1, retryReadiness: 1, stopped: [...input.stopped] }), json, "no value changed");
      assert.equal(input.stopped, stopped, "the set is the caller's own object, untouched");
    },
  },
  {
    name: "130/04 task03 — the engine imports nothing: no import statement, no require(, no dynamic import(",
    async run() {
      const here = path.dirname(fileURLToPath(import.meta.url));
      const source = await readFile(path.join(here, "..", "..", "src", "work", "loop.mjs"), "utf8");
      const stripped = stripComments(source);
      assert.doesNotMatch(stripped, /(^|\n)\s*import\s/, "no import statement");
      assert.doesNotMatch(stripped, /\brequire\s*\(/, "no require(");
      assert.doesNotMatch(stripped, /\bimport\s*\(/, "no dynamic import(");
      assert.match(stripped, /new Set\(\)/, "the frozen empty Set is built from the global");
    },
  },
  {
    name: "130/04 task03 — the producer reads the marks from the one module and hands the set",
    async run() {
      await withProducerFixture(async ({ dir, status, stops }) => {
        const listed = { id: "lr-1", label: "loop 53", argv: ["work", "loop", "53", "--level", "L2", "--resume"], cwd: dir, scope: "53", level: "L2", cap: 3 };
        const rowsOf = async () => (await status()).declarations.rows;

        // | does not exist | one row |
        assert.deepEqual(await rowsOf(), [listed], "no request: the row");

        // | is level 1 `requested` | one row — a draining loop keeps its row |
        await requestLoopStop(stops, { loopRunId: "lr-1", scope: "53", workspaceId: "ws-repo-a", by: { node: "node-1", pid: 1 } });
        assert.deepEqual(await rowsOf(), [listed], "level 1 requested: a draining loop keeps its row");
        // | is level 2 `requested` | one row |
        await requestLoopStop(stops, { loopRunId: "lr-1", scope: "53", workspaceId: "ws-repo-a", by: { node: "node-1", pid: 1 } });
        assert.deepEqual(await rowsOf(), [listed], "level 2 requested: still the row");
        await clearStopRequest(stops, "lr-1");

        // | is level 1 `honoured` | none |
        await requestLoopStop(stops, { loopRunId: "lr-1", scope: "53", workspaceId: "ws-repo-a", by: { node: "node-1", pid: 1 } });
        await markStopHonoured(stops, "lr-1");
        assert.deepEqual(await rowsOf(), [], "level 1 honoured: no row");
        await clearStopRequest(stops, "lr-1");

        // | is level 2 `honoured` with `cancelled` set | none |
        await requestLoopStop(stops, { loopRunId: "lr-1", scope: "53", workspaceId: "ws-repo-a", by: { node: "node-1", pid: 1 } });
        await requestLoopStop(stops, { loopRunId: "lr-1", scope: "53", workspaceId: "ws-repo-a", by: { node: "node-1", pid: 1 } });
        await markStopHonoured(stops, "lr-1", { cancelled: "run-1" });
        assert.deepEqual(await rowsOf(), [], "level 2 honoured, cancelled set: no row");
        await clearStopRequest(stops, "lr-1");

        // | is a corrupt file | one row — an unreadable mark drops nothing, and one degrade event |
        const events = [];
        setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
        try {
          await mkdir(stops, { recursive: true });
          await writeFile(stopRequestPath(stops, "lr-1"), "{ not json", "utf8");
          assert.deepEqual(await rowsOf(), [listed], "a corrupt mark drops nothing");
          assert.equal(events.filter((e) => e.code === "loop-stop-request").length, 1, "reportDegrade(\"loop-stop-request\", …) was called once");
        } finally {
          setDegradeSinkForTest(undefined);
          await unlink(stopRequestPath(stops, "lr-1"));
        }

        // | exists `honoured` for `lr-2` only | one row for `lr-1` — the mark is keyed by id |
        await requestLoopStop(stops, { loopRunId: "lr-2", scope: "53", workspaceId: "ws-repo-a", by: { node: "node-1", pid: 1 } });
        await markStopHonoured(stops, "lr-2");
        assert.deepEqual(await rowsOf(), [listed], "a mark for another id drops nothing");
        await clearStopRequest(stops, "lr-2");
      });

      // | is `honoured` but the record is `supervised: false` | none — no row either way, ok true |
      await withProducerFixture(async ({ status, stops }) => {
        await requestLoopStop(stops, { loopRunId: "lr-1", scope: "53", workspaceId: "ws-repo-a", by: { node: "node-1", pid: 1 } });
        await markStopHonoured(stops, "lr-1");
        const answer = await status();
        assert.equal(answer.declarations.ok, true, "ok is still true");
        assert.deepEqual(answer.declarations.rows, [], "no row either way");
        await clearStopRequest(stops, "lr-1");
      }, { record: producerRecord({ brief: { loop: loop({ supervised: false }) } }) });
    },
  },
  {
    name: "130/04 task03 — a member whose config cannot be read keeps the existing fallback and is still read for marks",
    async run() {
      await withProducerFixture(async ({ root, dir, status, stops }) => {
        // A second workspace registered as a member of this node through the REAL write path
        // (`publishGlobalRegistryDescriptorsToStore`, what the launcher's propagation tick calls),
        // its config removed after registration.
        const memberDir = await makeProducerWorkspace(root, "repo-b");
        const env = process.env;
        const wsA = await loadWorkspace(dir, undefined, { env });
        const wsB = await loadWorkspace(memberDir, undefined, { env });
        const store = await openGlobalWorkProjectionStore({ env });
        try {
          for (const ws of [wsA, wsB]) {
            await publishNodeRecord(ws, "node-1", { nodeId: "node-1", host: "node-1", os: "win32", runtimes: ["codex"], aofVersion: "1.2.3", publishedAt: NOW });
            await publishGlobalRegistryDescriptorsToStore(store, ws, { now: NOW });
          }
        } finally {
          store.close();
        }
        await unlink(path.join(memberDir, ".aof", "aof.config.json"));

        const first = await status();
        assert.equal(first.declarations.ok, true);
        assert.deepEqual(first.declarations.skipped, [], "an unreadable config is not a skipped member");
        const byCwd = new Map(first.declarations.rows.map((row) => [row.cwd, row]));
        assert.ok(byCwd.has(dir) && byCwd.has(memberDir), `both members answer a row: ${JSON.stringify([...byCwd.keys()])}`);
        const { cwd: _a, ...intact } = byCwd.get(dir);
        const { cwd: _b, ...unreadable } = byCwd.get(memberDir);
        assert.deepEqual(unreadable, intact, "the member's row is exactly an intact member's, but for its own cwd — the ceiling fallback stands");

        await requestLoopStop(stops, { loopRunId: "lr-1", scope: "53", workspaceId: null, by: { node: "node-1", pid: 1 } });
        await markStopHonoured(stops, "lr-1");
        const second = await status();
        assert.deepEqual(second.declarations.rows, [], "the mark is read for the unreadable member all the same");
        assert.deepEqual(second.declarations.skipped, [], "and it is still not skipped");
        await clearStopRequest(stops, "lr-1");
      });
    },
  },
  {
    name: "130/04 task03 — the producer spells no path: readStopRequest and loopStopsDir come from the one module",
    async run() {
      const here = path.dirname(fileURLToPath(import.meta.url));
      const source = await readFile(path.join(here, "..", "..", "src", "mesh", "declarations.mjs"), "utf8");
      const stripped = stripComments(source);
      assert.match(stripped, /import \{[^}]*\breadStopRequest\b[^}]*\} from "\.\.\/loop\/stop-request\.mjs"/, "imports readStopRequest from the one module");
      assert.match(stripped, /import \{[^}]*\bloopStopsDir\b[^}]*\} from "\.\.\/loop\/stop-request\.mjs"/, "imports loopStopsDir from the one module");
      assert.doesNotMatch(stripped, /loop-stops/, "spells no path segment");
      assert.match(stripped, /stopped:/, "hands the set to the engine");
    },
  },
  {
    name: "130/04 task03 — a dead supervised loop is stopped and stays stopped until resumed",
    async run() {
      await withProducerFixture(async ({ dir, status, stops }) => {
        const before = await status();
        assert.equal(before.declarations.rows.length, 1, "the reclaimed lineage is listed");

        // Story 02's core, the call `aof work loop 53 --stop` makes: no loop runs, so the request
        // is marked honoured at once.
        const workspace = await loadWorkspace(dir, undefined, { env: process.env });
        const answer = await stopLoop(workspace, { scope: "53", now: NOW });
        assert.equal(answer.ok, true, JSON.stringify(answer));
        assert.equal(answer.live, false, "not live");
        assert.equal(answer.state, "honoured", "honoured at once");
        assert.equal(answer.path, stopRequestPath(stops, "lr-1"), "in the isolated home");

        assert.deepEqual((await status()).declarations.rows, [], "no row for lr-1");

        // `--resume`'s clear (ADR-003 §6) — the call it makes, so no loop is launched here.
        const cleared = await clearStopRequest(stops, "lr-1");
        assert.equal(cleared.cleared, true);
        assert.deepEqual((await status()).declarations, before.declarations, "the row is back, deep-equal to the first answer");
      });
    },
  },
];
