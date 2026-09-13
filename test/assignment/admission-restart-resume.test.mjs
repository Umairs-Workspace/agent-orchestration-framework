// Traceability wiring for 69/04 task 03: durable mesh occupancy and resume re-admission.
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { meshTerminalResumeCommand } from "../../src/commands/mesh/terminal-resume.mjs";
import { createTerminalInputRouter } from "../../src/mesh/terminal-input.mjs";
import { openGlobalWorkProjectionStore } from "../../src/global-work-store.mjs";
import {
  assembleAssignmentRecord,
  insertAssignment,
  listAllAssignments,
  readAssignment,
  reserveParkedAssignmentResume,
  restoreParkedAssignmentResume,
  updateAssignmentState,
} from "../../src/assignment-record.mjs";
import {
  assignmentOccupiesDispatchSlot,
  countDispatchSlotsByTarget,
  runControlDispatchReclaimTick,
} from "../../src/mesh/assignment-reclaim.mjs";

const NOW = "2026-08-22T10:00:00.000Z";
const CONFIRMED_AT = "2099-01-01T00:00:00.000Z";
const workspace = (bound = 1) => ({ workDir: "/not-used", projectRoot: "/not-used", config: { work: { dispatch: { concurrency: bound } } } });

async function withStore(body) {
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-69-admission-"));
  const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
  try { return await body({ home, store }); }
  finally { store.close?.(); await rm(home, { recursive: true, force: true }); }
}

function seed(store, { id, target = "worker-a", state = "assigned", code = null, sessionId = null, runId = null }) {
  insertAssignment(store, assembleAssignmentRecord({ assignmentId: id, itemRef: `69/${id}`, workspaceId: "ws-1", targetNodeId: target, issuer: "control-a", state, now: NOW }));
  if (code != null || sessionId != null || runId != null) updateAssignmentState(store, id, state, { now: NOW, code, sessionId, runId });
  return readAssignment(store, id);
}

function server(onSend = null) {
  const attempts = [];
  return {
    attempts,
    directiveTargets: { get: () => ({ connected: true }), entries: () => [] },
    dispatchDirective(frame) {
      attempts.push(frame);
      onSend?.(frame);
      return { sent: true };
    },
  };
}

async function tick(store, targetServer, { bound = 1, dispatchedIds = new Set() } = {}) {
  return runControlDispatchReclaimTick(workspace(bound), targetServer, {
    workspaceId: "ws-1",
    now: NOW,
    openStore: async () => ({ db: store.db, paths: store.paths, close() {} }),
    buildDirectiveFrame: (to, payload) => ({ kind: "directive", to, ...payload }),
    resolveDispatchCommit: async () => null,
    dispatchedIds,
  });
}

function resumeCtx(home, { bound = 1, pushed = [], confirm = true } = {}) {
  return {
    workspace: workspace(bound),
    globalWorkStoreOptions: { env: { AOF_GLOBAL_HOME: home } },
    confirmTimeoutMs: 60,
    createTerminalResumePush: () => ({
      async push(envelope) {
        pushed.push(envelope);
        if (!confirm) return;
        const probe = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
        try { updateAssignmentState(probe, envelope.signal.assignmentId, "running", { now: CONFIRMED_AT, code: "resumed" }); }
        finally { probe.close?.(); }
      },
      close() {},
    }),
  };
}

function seedParked(store, id, target = "worker-a") {
  return seed(store, { id, target, state: "running", code: "needs-input", sessionId: `session-${id}`, runId: `run-${id}` });
}

export const admissionRestartResumeTests = [
  {
    name: "69/04 task 03: accepted rows fill the bound before running and hold the further assigned row",
    run: () => withStore(async ({ store }) => {
      seed(store, { id: "accepted", state: "accepted" });
      seed(store, { id: "held" });
      const target = server();
      await tick(store, target, { bound: 1 });
      assert.equal(target.attempts.length, 0);
      assert.equal(readAssignment(store, "held").state, "assigned");
    }),
  },
  {
    name: "69/04 task 03: occupancy survives a scheduler restart because accepted state, not its once-guard, holds the slot",
    run: () => withStore(async ({ store }) => {
      seed(store, { id: "accepted", state: "accepted" });
      seed(store, { id: "held" });
      await tick(store, server(), { bound: 1, dispatchedIds: new Set(["old-process-only"]) });
      const restarted = server();
      await tick(store, restarted, { bound: 1, dispatchedIds: new Set() });
      assert.equal(restarted.attempts.length, 0);
    }),
  },
  {
    name: "69/04 task 03: a sent row acknowledged as accepted occupies exactly one durable slot",
    run: () => withStore(async ({ store }) => {
      seed(store, { id: "sent" });
      const target = server(() => updateAssignmentState(store, "sent", "accepted", { now: NOW }));
      await tick(store, target, { bound: 2 });
      assert.equal(countDispatchSlotsByTarget([readAssignment(store, "sent")]).get("worker-a"), 1);
    }),
  },
  {
    name: "69/04 task 03: a sent but never acknowledged assigned row does not hold capacity on later ticks",
    run: () => withStore(async ({ store }) => {
      seed(store, { id: "sent" });
      const first = server();
      await tick(store, first, { bound: 1, dispatchedIds: new Set() });
      assert.equal(assignmentOccupiesDispatchSlot(readAssignment(store, "sent")), false);
      const restarted = server();
      await tick(store, restarted, { bound: 1, dispatchedIds: new Set() });
      assert.equal(restarted.attempts.length, 1, "a later scheduler can offer the still-assigned row again");
    }),
  },
  {
    name: "69/04 task 03: each successful send reserves within its scan before the next row is considered",
    run: () => withStore(async ({ store }) => {
      seed(store, { id: "one" }); seed(store, { id: "two" }); seed(store, { id: "three" });
      const target = server();
      await tick(store, target, { bound: 2 });
      assert.deepEqual(target.attempts.map((entry) => entry.assignmentId), ["one", "two"]);
      assert.equal(readAssignment(store, "three").state, "assigned");
    }),
  },
  ...[
    ["a worker has accepted but not yet begun", "accepted", null, true],
    ["a worker is running", "running", null, true],
    ["running and coded as waiting on a human", "running", "needs-input", false],
    ["still assigned, whose directive was already sent", "assigned", null, false],
    ["still assigned, whose directive was never sent", "assigned", null, false],
  ].map(([situation, state, code, counted]) => ({
    name: `69/04 task 03 restart-occupancy outline [${situation}] -> ${counted ? "counted" : "not counted"}`,
    run: () => withStore(async ({ home, store }) => {
      seed(store, { id: "restart-row", state, code });
      const restarted = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
      try {
        const rows = listAllAssignments(restarted);
        const restartedOnceGuard = new Set();
        assert.equal(restartedOnceGuard.size, 0);
        assert.equal(assignmentOccupiesDispatchSlot(rows[0]), counted);
        assert.equal(countDispatchSlotsByTarget(rows).get("worker-a") ?? 0, counted ? 1 : 0);
      } finally { restarted.close?.(); }
    }),
  })),
  {
    name: "69/04 task 03: a pre-restart sent row still assigned is offered again under a freshly consulted bound",
    run: () => withStore(async ({ store }) => {
      seed(store, { id: "retry" });
      await tick(store, server(), { bound: 1, dispatchedIds: new Set(["retry"]) });
      let boundReads = 0;
      const config = {};
      Object.defineProperty(config, "concurrency", { get() { boundReads += 1; return 1; } });
      const target = server();
      await runControlDispatchReclaimTick({ ...workspace(1), config: { work: { dispatch: config } } }, target, {
        workspaceId: "ws-1", now: NOW,
        openStore: async () => ({ db: store.db, paths: store.paths, close() {} }),
        buildDirectiveFrame: (to, payload) => ({ kind: "directive", to, ...payload }),
        resolveDispatchCommit: async () => null,
        dispatchedIds: new Set(),
      });
      assert.deepEqual(target.attempts.map((entry) => entry.assignmentId), ["retry"]);
      assert.equal(boundReads, 1);
    }),
  },
  {
    name: "69/04 task 03: a parked answer is refused with resume-capacity-full while its target is full and no new run starts",
    run: () => withStore(async ({ home, store }) => {
      const parked = seedParked(store, "parked");
      seed(store, { id: "busy", state: "accepted" });
      const pushed = [];
      await assert.rejects(() => meshTerminalResumeCommand.run({ session: parked.sessionId }, resumeCtx(home, { pushed })), (error) => error.code === "resume-capacity-full");
      assert.equal(pushed.length, 0);
      assert.equal(readAssignment(store, "parked").code, "needs-input");
      assert.equal(readAssignment(store, "parked").runId, "run-parked");
    }),
  },
  {
    name: "69/04 task 03: a parked answer resumes and immediately occupies a slot when the target has room",
    run: () => withStore(async ({ home, store }) => {
      const parked = seedParked(store, "parked");
      const result = await meshTerminalResumeCommand.run({ session: parked.sessionId }, resumeCtx(home));
      assert.equal(result.confirmed, true);
      const row = readAssignment(store, "parked");
      assert.equal(row.code, "resumed");
      assert.equal(assignmentOccupiesDispatchSlot(row), true);
    }),
  },
  ...[[0, 1, true], [1, 1, false], [2, 3, true], [3, 3, false], [4, 3, false]].map(([occupied, bound, admitted]) => ({
    name: `69/04 task 03 parked-answer outline [occupied=${occupied}, bound=${bound}] -> ${admitted ? "admitted/resumes" : "refused/stays parked"}`,
    run: () => withStore(async ({ home, store }) => {
      const parked = seedParked(store, "parked");
      for (let index = 0; index < occupied; index += 1) seed(store, { id: `busy-${index}`, state: "accepted" });
      if (admitted) {
        await meshTerminalResumeCommand.run({ session: parked.sessionId }, resumeCtx(home, { bound }));
        assert.equal(readAssignment(store, "parked").code, "resumed");
      } else {
        await assert.rejects(() => meshTerminalResumeCommand.run({ session: parked.sessionId }, resumeCtx(home, { bound })), (error) => error.code === "resume-capacity-full");
        assert.equal(readAssignment(store, "parked").code, "needs-input");
      }
    }),
  })),
  {
    name: "69/04 task 03: a parked run does not count against its own return at bound one",
    run: () => withStore(async ({ home, store }) => {
      const parked = seedParked(store, "parked");
      await meshTerminalResumeCommand.run({ session: parked.sessionId }, resumeCtx(home, { bound: 1 }));
      assert.equal(countDispatchSlotsByTarget([readAssignment(store, "parked")]).get("worker-a"), 1);
    }),
  },
  {
    name: "69/04 task 03: an override counts and atomically attributes the actual resume destination",
    run: () => withStore(async ({ home, store }) => {
      const parked = seedParked(store, "parked", "worker-a");
      seed(store, { id: "busy-a", target: "worker-a", state: "accepted" });
      const pushed = [];
      const result = await meshTerminalResumeCommand.run(
        { session: parked.sessionId, node: "worker-b" },
        resumeCtx(home, { bound: 1, pushed }),
      );
      assert.equal(result.confirmed, true, "free destination B admits even though the previous holder A is full");
      assert.equal(pushed[0].nodeId, "worker-b");
      const resumed = readAssignment(store, "parked");
      assert.equal(resumed.targetNodeId, "worker-b", "the counted row is attributed to the node that was actually sent work");
      assert.equal(countDispatchSlotsByTarget(listAllAssignments(store)).get("worker-b"), 1);
    }),
  },
  {
    name: "69/04 task 03: an override is refused when its actual destination is full even if the old target is free",
    run: () => withStore(async ({ home, store }) => {
      const parked = seedParked(store, "parked", "worker-a");
      seed(store, { id: "busy-b", target: "worker-b", state: "accepted" });
      const pushed = [];
      await assert.rejects(
        () => meshTerminalResumeCommand.run({ session: parked.sessionId, node: "worker-b" }, resumeCtx(home, { bound: 1, pushed })),
        (error) => error.code === "resume-capacity-full" && /worker-b/u.test(error.message),
      );
      assert.equal(pushed.length, 0);
      assert.equal(readAssignment(store, "parked").targetNodeId, "worker-a");
      assert.equal(readAssignment(store, "parked").code, "needs-input");
    }),
  },
  {
    name: "69/04 task 03: an ambiguous confirmation timeout keeps the counted reservation",
    run: () => withStore(async ({ home, store }) => {
      const parked = seedParked(store, "parked");
      const result = await meshTerminalResumeCommand.run({ session: parked.sessionId }, resumeCtx(home, { confirm: false }));
      assert.equal(result.confirmed, false);
      assert.equal(readAssignment(store, "parked").code, "resumed", "timeout cannot claim a process did not start");
      assert.equal(assignmentOccupiesDispatchSlot(readAssignment(store, "parked")), true);
    }),
  },
  {
    name: "69/04 task 03: only a router-observed pre-spawn refusal reparks the exact reservation",
    run: () => withStore(async ({ home, store }) => {
      const parked = seedParked(store, "parked", "worker-a");
      const pushed = [];
      const result = await meshTerminalResumeCommand.run({ session: parked.sessionId, node: "worker-b" }, resumeCtx(home, { pushed, confirm: false }));
      assert.equal(result.confirmed, false);
      const envelope = pushed[0];
      const router = createTerminalInputRouter({
        dispatchDirective: () => ({ sent: false, code: "assignment-target-not-connected" }),
        onTerminalResumeRefused: ({ assignmentId, reservedAt, targetNodeId, previousNodeId }) => {
          const negativeAckStore = { db: store.db };
          restoreParkedAssignmentResume(negativeAckStore, assignmentId, {
            reservedAt,
            reservedTargetNodeId: targetNodeId,
            previousTargetNodeId: previousNodeId,
            now: CONFIRMED_AT,
          });
        },
      });
      assert.equal(router.apply(envelope), false);
      const restored = readAssignment(store, "parked");
      assert.equal(restored.code, "needs-input");
      assert.equal(restored.targetNodeId, "worker-a", "a negative ack restores the pre-override attribution too");
    }),
  },
  {
    name: "69/04 task 03: a capacity-refused answer can be retried after a slot frees without creating a second run",
    run: () => withStore(async ({ home, store }) => {
      const parked = seedParked(store, "parked");
      seed(store, { id: "busy", state: "running" });
      await assert.rejects(() => meshTerminalResumeCommand.run({ session: parked.sessionId }, resumeCtx(home)), (error) => error.code === "resume-capacity-full");
      updateAssignmentState(store, "busy", "done", { now: NOW });
      await meshTerminalResumeCommand.run({ session: parked.sessionId }, resumeCtx(home));
      const row = readAssignment(store, "parked");
      assert.equal(row.runId, "run-parked");
      assert.equal(row.code, "resumed");
    }),
  },
  {
    name: "69/04 task 03: two concurrent answers cannot both acquire the final target slot",
    run: () => withStore(async ({ home, store }) => {
      const a = seedParked(store, "a"); const b = seedParked(store, "b");
      const outcomes = await Promise.allSettled([
        meshTerminalResumeCommand.run({ session: a.sessionId }, resumeCtx(home)),
        meshTerminalResumeCommand.run({ session: b.sessionId }, resumeCtx(home)),
      ]);
      assert.equal(outcomes.filter((entry) => entry.status === "fulfilled").length, 1);
      assert.equal(outcomes.filter((entry) => entry.status === "rejected" && entry.reason.code === "resume-capacity-full").length, 1);
      const rows = [readAssignment(store, "a"), readAssignment(store, "b")];
      assert.equal(rows.filter(assignmentOccupiesDispatchSlot).length, 1);
      assert.equal(rows.filter((row) => row.code === "needs-input").length, 1);
    }),
  },
  {
    name: "69/04 task 03: a tick followed by an answer sees the worker's accepted row and only one takes the slot",
    run: () => withStore(async ({ home, store }) => {
      seed(store, { id: "assigned" });
      const parked = seedParked(store, "parked");
      const target = server(() => updateAssignmentState(store, "assigned", "accepted", { now: NOW }));
      await tick(store, target, { bound: 1 });
      await assert.rejects(() => meshTerminalResumeCommand.run({ session: parked.sessionId }, resumeCtx(home)), (error) => error.code === "resume-capacity-full");
      assert.equal(readAssignment(store, "assigned").state, "accepted");
      assert.equal(readAssignment(store, "parked").code, "needs-input");
    }),
  },
  {
    name: "69/04 task 03: an accepted assignment prevents a parked answer taking a slot already given away",
    run: () => withStore(async ({ home, store }) => {
      seed(store, { id: "accepted", state: "accepted" });
      const parked = seedParked(store, "parked");
      await assert.rejects(() => meshTerminalResumeCommand.run({ session: parked.sessionId }, resumeCtx(home)), (error) => error.code === "resume-capacity-full");
      assert.equal(readAssignment(store, "parked").code, "needs-input");
    }),
  },
  {
    name: "69/04 task 03: leaving needs-input and rejoining the counted set are one assignment-row change",
    run: () => withStore(async ({ store }) => {
      seedParked(store, "parked");
      store.db.exec("BEGIN IMMEDIATE");
      const row = reserveParkedAssignmentResume(store, "parked", { now: NOW });
      assert.equal(row.code, "resumed");
      assert.equal(assignmentOccupiesDispatchSlot(row), true);
      assert.equal(readAssignment(store, "parked").code, "resumed");
      store.db.exec("COMMIT");
    }),
  },
  ...[
    ["accepted", null, true],
    ["running", null, true],
    ["running", "some-other-code", true],
    ["running", "needs-input", false],
    ["assigned", null, false],
    ["reclaimed", null, false],
    ["done", null, false],
    ["failed", null, false],
    ["withdrawn", null, false],
  ].map(([state, code, counted]) => ({
    name: `69/04 task 03 target-occupancy outline [state=${state}, code=${code ?? "none"}] -> ${counted ? "counted" : "not counted"}`,
    run: () => {
      const row = { targetNodeId: "worker-a", state, code };
      assert.equal(assignmentOccupiesDispatchSlot(row), counted);
      assert.equal(countDispatchSlotsByTarget([row]).get("worker-a") ?? 0, counted ? 1 : 0);
    },
  })),
];
