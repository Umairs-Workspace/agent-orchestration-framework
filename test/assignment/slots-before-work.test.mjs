// Traceability wiring for milestone 69 / story 04. One entry per @executable
// Scenario and per Scenario-Outline row in tasks 00 and 01. The local half drives
// the real bounded pool; the mesh half drives the real control tick over a real
// global_assignments table with only its transport/store-open seams injected.
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  DEFAULT_DISPATCH_CONCURRENCY,
  dispatchConcurrencyFromConfig,
  dispatchReadySet,
} from "../../src/work/dispatch.mjs";
import {
  assignmentOccupiesDispatchSlot,
  countDispatchSlotsByTarget,
  runControlDispatchReclaimTick,
} from "../../src/mesh/assignment-reclaim.mjs";
import { openGlobalWorkProjectionStore } from "../../src/global-work-store.mjs";
import {
  assembleAssignmentRecord,
  insertAssignment,
  readAssignment,
  updateAssignmentState,
} from "../../src/assignment-record.mjs";
import { dispatchCommand } from "../../src/commands/dispatch.mjs";
import { withDispatchRepo } from "../support/dispatch-lane-fixture.mjs";

const NOW = "2026-08-22T10:00:00.000Z";
const pause = () => new Promise((resolve) => setTimeout(resolve, 0));

function members(count) {
  return Array.from({ length: count }, (_, index) => ({ ref: `69/${String(index).padStart(2, "0")}` }));
}

async function observedPool({ ready, bound, run = async (member) => member.ref }) {
  let inFlight = 0;
  let observedPeak = 0;
  const starts = [];
  const report = await dispatchReadySet(members(ready), async (member, index) => {
    starts.push(member.ref);
    inFlight += 1;
    observedPeak = Math.max(observedPeak, inFlight);
    try {
      return await run(member, index);
    } finally {
      inFlight -= 1;
    }
  }, { bound });
  return { report, observedPeak, starts };
}

export const slotsBeforeWorkPoolTests = [
  {
    name: "69/04 task 00 wiring: the production work:dispatch command sends a multi-ref ready set through the bounded pool",
    run: () => withDispatchRepo(async ({ root }) => {
      const result = await dispatchCommand.run(
        { refs: ["69/00", "69/01", "69/02"] },
        { workspace: { projectRoot: root, config: { work: { dispatch: { concurrency: 2 } } } } },
      );
      assert.equal(result.action, "dispatch");
      assert.equal(result.bound, 2);
      assert.ok(result.peak <= 2);
      assert.deepEqual(result.dispatched.map((entry) => entry.ref), ["69/00", "69/01", "69/02"]);
      assert.deepEqual(result.dispatched.map((entry) => entry.outcome ?? "opened"), ["opened", "opened", "refused"], "the production caller materialises only the local slots it acquired");
      assert.ok(result.dispatched.slice(0, 2).every((entry) => entry.ok && entry.value.worktree), "each admitted ref was opened through a real isolated lane");
      assert.equal(result.dispatched[2].code, "dispatch-capacity-full");
      assert.equal(dispatchCommand.cli.exit(result), 0, "a capacity refusal is a successful per-member answer");
    }),
  },
  {
    name: "69/04 task 00: a ready set larger than the bound never exceeds it and every member is dispatched",
    run: async () => {
      const { report, observedPeak } = await observedPool({
        ready: 7,
        bound: 3,
        run: async (member, index) => { await new Promise((resolve) => setTimeout(resolve, index % 3)); return member.ref; },
      });
      assert.equal(observedPeak, 3, "the observed in-flight count saturates but never exceeds the bound");
      assert.equal(report.dispatched.length, 7);
      assert.ok(report.dispatched.every((entry) => entry.ok), "every member eventually dispatches");
    },
  },
  {
    name: "69/04 task 00: the remainder starts as any lane frees, never behind the slowest member of a wave",
    run: async () => {
      let releaseSlow;
      const slow = new Promise((resolve) => { releaseSlow = resolve; });
      const starts = [];
      const finished = [];
      const pending = dispatchReadySet(members(4), async (member, index) => {
        starts.push(index);
        if (index === 0) await slow;
        else await pause();
        finished.push(index);
        return member.ref;
      }, { bound: 2 });
      await pause();
      await pause();
      assert.ok(starts.includes(2), `a waiting member started while lane 0 was still blocked: ${starts}`);
      assert.equal(finished.includes(0), false, "the slowest member of the preceding pair has not finished");
      releaseSlow();
      const report = await pending;
      assert.equal(report.dispatched.length, 4);
    },
  },
  {
    name: "69/04 task 00: a ready set smaller than the bound runs every member in flight together",
    run: async () => {
      let release;
      const gate = new Promise((resolve) => { release = resolve; });
      let inFlight = 0;
      let allTogether = false;
      const pending = dispatchReadySet(members(2), async () => {
        inFlight += 1;
        if (inFlight === 2) allTogether = true;
        await gate;
        inFlight -= 1;
      }, { bound: 5 });
      await pause();
      assert.equal(allTogether, true, "both members entered before either was released");
      release();
      await pending;
    },
  },
  {
    name: "69/04 task 00: one faulting lane is recorded failed and never strands the other members",
    run: async () => {
      const { report } = await observedPool({
        ready: 4,
        bound: 2,
        run: async (member, index) => { if (index === 1) throw new Error("lane fault"); return member.ref; },
      });
      assert.deepEqual(report.dispatched.map((entry) => entry.ok), [true, false, true, true]);
      assert.equal(report.dispatched[1].error.message, "lane fault");
    },
  },
  {
    name: "69/04 review: a multi-ref command preserves every lane result and exits non-success when any lane fails",
    run: async () => {
      const visited = [];
      const result = await dispatchCommand.run(
        { refs: ["69/00", "69/01", "69/02"] },
        {
          workspace: workspace(2),
          withDispatchAdmissionLock: (operation) => operation(),
          inspectDispatchLaneAdmission: async () => ({ occupied: 0, holders: [], existingRefs: new Set() }),
          runDispatchLane: async (member) => {
            visited.push(member.ref);
            if (member.ref === "69/01") throw new Error("materialisation failed");
            return { ref: member.ref, worktree: `/lane/${member.ref}`, created: true };
          },
        },
      );
      assert.deepEqual(visited, ["69/00", "69/01"], "the third member is refused before the injected opener sees it");
      assert.deepEqual(result.dispatched.map((entry) => entry.ok), [true, false, true], "fault and refusal remain distinct per-lane outcomes");
      assert.equal(result.dispatched[1].error.message, "materialisation failed");
      assert.equal(result.dispatched[2].code, "dispatch-capacity-full");
      assert.equal(dispatchCommand.cli.exit(result), 1, "the generic CLI face receives a failing exit code");
    },
  },
  {
    name: "69/04 task 00: the reported peak is the observed in-flight peak and never exceeds the bound",
    run: async () => {
      const { report, observedPeak } = await observedPool({ ready: 6, bound: 2, run: async () => pause() });
      assert.equal(report.peak, observedPeak);
      assert.equal(report.ranAtOnce, observedPeak);
      assert.ok(report.peak <= report.bound);
    },
  },
  ...[
    { label: "absent", value: undefined, effective: DEFAULT_DISPATCH_CONCURRENCY },
    { label: "a positive integer", value: 5, effective: 5 },
    { label: "zero", value: 0, effective: DEFAULT_DISPATCH_CONCURRENCY },
    { label: "a negative number", value: -2, effective: DEFAULT_DISPATCH_CONCURRENCY },
    { label: "the string 3", value: "3", effective: DEFAULT_DISPATCH_CONCURRENCY },
  ].map(({ label, value, effective }) => ({
    name: `69/04 task 00 production-door bound outline [${label}] -> ${effective}`,
    run: () => withDispatchRepo(async ({ root }) => {
      const workspace = value === undefined ? {} : { config: { work: { dispatch: { concurrency: value } } } };
      assert.equal(dispatchConcurrencyFromConfig(workspace), effective);
      const result = await dispatchCommand.run(
        { refs: ["69/00", "69/01", "69/02", "69/03"] },
        { workspace: { ...workspace, projectRoot: root } },
      );
      assert.equal(result.bound, effective, "the production work:dispatch door reaches the existing resolver");
      assert.ok(result.peak <= effective);
      const opened = result.dispatched.filter((entry) => entry.outcome !== "refused");
      const refused = result.dispatched.filter((entry) => entry.outcome === "refused");
      assert.equal(opened.length, Math.min(4, effective), "the production door materialised no more lanes than its effective bound");
      assert.equal(refused.length, Math.max(0, 4 - effective), "every over-bound member received a refusal");
      // The failure this must NAME is a lane FAULT, and a bare `every(ok)` reports only that one
      // exists. Under a saturated machine the fault is a real materialisation error (the class
      // this fixture's own teardown comment already documents), and a message that does not carry
      // it costs a whole 35-minute whole-tree run to re-learn — 119/F-32's lesson, applied to the
      // assertion rather than to the runner.
      const faulted = result.dispatched.filter((entry) => !entry.ok);
      assert.deepEqual(
        faulted.map((entry) => ({ ref: entry.ref, outcome: entry.outcome, code: entry.code, error: entry.error?.message })),
        [],
        "capacity refusals are answers, not lane faults",
      );
    }),
  })),
  {
    name: "69/04 task 00: no second resolution site is introduced",
    run: () => {
      assert.equal(dispatchConcurrencyFromConfig({ config: { work: { dispatch: { concurrency: 4 } } } }), 4);
      assert.equal(dispatchConcurrencyFromConfig({}), DEFAULT_DISPATCH_CONCURRENCY);
      // FF-6907 performs the non-vacuous whole-src reader enumeration. This lane
      // binds the behavioural scenario to that same exported one-home resolver.
    },
  },
];

async function withStore(fn) {
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-69-slots-"));
  const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
  try {
    return await fn({ store, home });
  } finally {
    store.close?.();
    await rm(home, { recursive: true, force: true });
  }
}

function noClose(store, db = store.db) {
  return { db, paths: store.paths, close() {} };
}

function seed(store, { id, target = "worker-a", state = "assigned", code = null, at = NOW }) {
  insertAssignment(store, assembleAssignmentRecord({
    assignmentId: id,
    itemRef: `69/${id}`,
    workspaceId: "ws-1",
    targetNodeId: target,
    issuer: "control-a",
    state,
    now: at,
  }));
  if (code != null) updateAssignmentState(store, id, state, { now: at, code });
  return readAssignment(store, id);
}

function fakeServer(results = []) {
  const attempts = [];
  const queue = [...results];
  return {
    attempts,
    directiveTargets: { get: () => ({ connected: true }), entries: () => [] },
    dispatchDirective(frame) {
      attempts.push(frame);
      return queue.length > 0 ? queue.shift() : { sent: true };
    },
  };
}

const frame = (to, payload) => ({ kind: "directive", to, ...payload });
const workspace = (bound = 2) => ({
  workDir: "/not-used",
  projectRoot: "/not-used",
  config: { work: { dispatch: { concurrency: bound } } },
});

async function tick(store, server, { bound = 2, dispatchedIds = new Set(), ws = workspace(bound), openStore } = {}) {
  return runControlDispatchReclaimTick(ws, server, {
    workspaceId: "ws-1",
    now: NOW,
    openStore: openStore ?? (async () => noClose(store)),
    buildDirectiveFrame: frame,
    resolveDispatchCommit: async () => null,
    dispatchedIds,
  });
}

export const slotsBeforeWorkMeshTests = [
  {
    name: "69/04 task 01: a target already at its bound receives no further dispatch this tick",
    run: () => withStore(async ({ store }) => {
      seed(store, { id: "running-1", state: "running" });
      seed(store, { id: "running-2", state: "running" });
      seed(store, { id: "held", state: "assigned" });
      const server = fakeServer();
      await tick(store, server, { bound: 2 });
      assert.equal(server.attempts.length, 0);
      assert.equal(readAssignment(store, "held").state, "assigned", "the held row is not mutated");
    }),
  },
  {
    name: "69/04 task 01: a held row stays assigned and dispatches on the tick after a running assignment completes",
    run: () => withStore(async ({ store }) => {
      seed(store, { id: "running", state: "running" });
      seed(store, { id: "held", state: "assigned" });
      const server = fakeServer();
      const dispatchedIds = new Set();
      await tick(store, server, { bound: 1, dispatchedIds });
      assert.equal(server.attempts.length, 0);
      assert.equal(readAssignment(store, "held").state, "assigned");
      updateAssignmentState(store, "running", "done", { now: NOW });
      await tick(store, server, { bound: 1, dispatchedIds });
      assert.deepEqual(server.attempts.map((entry) => entry.assignmentId), ["held"]);
    }),
  },
  {
    name: "69/04 task 01: a target below its bound is dispatched normally",
    run: () => withStore(async ({ store }) => {
      seed(store, { id: "running", state: "running" });
      seed(store, { id: "next", state: "assigned" });
      const server = fakeServer();
      await tick(store, server, { bound: 2 });
      assert.deepEqual(server.attempts.map((entry) => entry.assignmentId), ["next"]);
    }),
  },
  {
    name: "69/04 review: same-scan reservations cap a batch of assigned rows before status frames arrive",
    run: () => withStore(async ({ store }) => {
      seed(store, { id: "first" });
      seed(store, { id: "second" });
      seed(store, { id: "held" });
      const server = fakeServer();
      await tick(store, server, { bound: 2 });
      assert.deepEqual(server.attempts.map((entry) => entry.assignmentId), ["first", "second"]);
      assert.equal(readAssignment(store, "held").state, "assigned", "the over-bound row stays assigned");
    }),
  },
  {
    name: "69/04 review: capacity is isolated by target within one mesh scan",
    run: () => withStore(async ({ store }) => {
      seed(store, { id: "a-running", target: "worker-a", state: "running" });
      seed(store, { id: "a-held", target: "worker-a" });
      seed(store, { id: "b-next", target: "worker-b" });
      const server = fakeServer();
      await tick(store, server, { bound: 1 });
      assert.deepEqual(server.attempts.map((entry) => entry.assignmentId), ["b-next"], "a full target never blocks another target");
    }),
  },
  {
    name: "69/04 review: accepted is durable occupancy across restart while a sent row with no status reserves only its scan",
    run: () => withStore(async ({ store }) => {
      seed(store, { id: "accepted", target: "worker-a", state: "accepted" });
      seed(store, { id: "held", target: "worker-a" });
      const server = fakeServer();
      await tick(store, server, { bound: 1, dispatchedIds: new Set() });
      assert.equal(server.attempts.length, 0, "a fresh launcher still counts the persisted accepted row");

      updateAssignmentState(store, "accepted", "done", { now: NOW });
      const sentIds = new Set();
      await tick(store, server, { bound: 1, dispatchedIds: sentIds });
      assert.deepEqual(server.attempts.map((entry) => entry.assignmentId), ["held"]);
      seed(store, { id: "later", target: "worker-a" });
      await tick(store, server, { bound: 1, dispatchedIds: sentIds });
      assert.deepEqual(
        server.attempts.map((entry) => entry.assignmentId),
        ["held", "later"],
        "a sent row that never reports status is once-guarded but is not an unobservable cross-tick lease",
      );
    }),
  },
  {
    name: "69/04 task 01: a running row coded needs-input does not occupy a slot",
    run: () => withStore(async ({ store }) => {
      seed(store, { id: "parked", state: "running", code: "needs-input" });
      seed(store, { id: "next", state: "assigned" });
      const rows = [readAssignment(store, "parked"), readAssignment(store, "next")];
      assert.equal(countDispatchSlotsByTarget(rows).get("worker-a") ?? 0, 0);
      const server = fakeServer();
      await tick(store, server, { bound: 1 });
      assert.deepEqual(server.attempts.map((entry) => entry.assignmentId), ["next"]);
    }),
  },
  ...[
    { state: "running", code: null, treatment: true },
    { state: "running", code: "needs-input", treatment: false },
    { state: "assigned", code: null, treatment: false },
    { state: "reclaimed", code: null, treatment: false },
    { state: "done", code: null, treatment: false },
  ].map(({ state, code, treatment }) => ({
    name: `69/04 task 01 counted-set outline [state=${state}, code=${code ?? "none"}] -> ${treatment ? "counted" : "not counted"}`,
    run: () => {
      const row = { assignmentId: "row", targetNodeId: "worker-a", state, code };
      assert.equal(assignmentOccupiesDispatchSlot(row), treatment);
      assert.equal(countDispatchSlotsByTarget([row]).get("worker-a") ?? 0, treatment ? 1 : 0);
    },
  })),
  {
    name: "69/04 task 01: an unsent dispatch is retried and the bound is consulted before each attempt",
    run: () => withStore(async ({ store }) => {
      seed(store, { id: "retry", state: "assigned" });
      const server = fakeServer([{ sent: false, code: "not-open" }, { sent: true }]);
      const dispatchedIds = new Set();
      let boundReads = 0;
      const dispatchConfig = {};
      Object.defineProperty(dispatchConfig, "concurrency", { get() { boundReads += 1; return 1; } });
      const ws = { ...workspace(1), config: { work: { dispatch: dispatchConfig } } };
      await tick(store, server, { dispatchedIds, ws });
      assert.equal(dispatchedIds.has("retry"), false, "an unsent attempt never consumes the once-guard");
      await tick(store, server, { dispatchedIds, ws });
      assert.deepEqual(server.attempts.map((entry) => entry.assignmentId), ["retry", "retry"]);
      assert.equal(boundReads, 2, "the one-home resolver was consulted on both ticks");
    }),
  },
  {
    name: "69/04 task 01: no lease store is opened; the slot is derived from existing assignment rows",
    run: () => {
      const rows = [
        { assignmentId: "a", targetNodeId: "worker-a", state: "running", code: null },
        { assignmentId: "b", targetNodeId: "worker-a", state: "assigned", code: null },
      ];
      const counts = countDispatchSlotsByTarget(rows);
      assert.deepEqual([...counts.entries()], [["worker-a", 1]]);
      assert.deepEqual(Object.keys(rows[0]), ["assignmentId", "targetNodeId", "state", "code"], "no slot/lease object is added to the row");
    },
  },
  {
    name: "69/04 task 01: bounding dispatch leaves reclaim on the same next-tick path after a fault in either half",
    run: () => withStore(async ({ store }) => {
      seed(store, { id: "next", state: "assigned" });
      const dispatchedIds = new Set();
      const server = fakeServer();
      let assignmentScans = 0;
      let failReclaimOnce = true;
      const db = {
        exec(sql) { return store.db.exec(sql); },
        prepare(sql) {
          if (/SELECT \* FROM global_assignments ORDER BY assigned_at DESC/.test(sql)) {
            assignmentScans += 1;
            if (assignmentScans === 2 && failReclaimOnce) {
              failReclaimOnce = false;
              throw new Error("reclaim scan fault");
            }
          }
          return store.db.prepare(sql);
        },
      };
      const openStore = async () => noClose(store, db);
      await assert.rejects(tick(store, server, { bound: 1, dispatchedIds, openStore }), /reclaim scan fault/);
      assert.equal(server.attempts.length, 1, "dispatch still ran before the reclaim-half fault");
      await tick(store, server, { bound: 1, dispatchedIds, openStore });
      assert.equal(server.attempts.length, 1, "the successful send remains once-guarded");
      assert.equal(assignmentScans, 4, "the next tick ran both the bounded dispatch scan and reclaim scan again");

      // The inverse direction: a dispatch-frame fault prevents this invocation from
      // reaching reclaim, but no state is poisoned and the following tick reaches it.
      seed(store, { id: "dispatch-fault", state: "assigned", target: "worker-b" });
      let throwFrame = true;
      const before = assignmentScans;
      const faultyFrame = (to, payload) => { if (throwFrame) { throwFrame = false; throw new Error("dispatch half fault"); } return frame(to, payload); };
      await assert.rejects(runControlDispatchReclaimTick(workspace(2), server, {
        workspaceId: "ws-1", now: NOW, openStore, buildDirectiveFrame: faultyFrame,
        resolveDispatchCommit: async () => null, dispatchedIds,
      }), /dispatch half fault/);
      await tick(store, server, { bound: 2, dispatchedIds, openStore });
      assert.ok(assignmentScans >= before + 3, "the next invocation again reached the reclaim scan");
    }),
  },
];
