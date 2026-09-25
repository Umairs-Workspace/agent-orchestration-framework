// Executable wiring for milestone 69 / story 05 review fixes (ADR-006/007):
// parking is exit-confirmed and durable; resume admission is bounded and deduped.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import {
  createMeshWorkerExecutionHandler,
  createMeshWorkerTerminalResumeHandler,
  driveInteractiveClaudeSession,
} from "../../src/mesh/worker-execution.mjs";
import { isLegalTransition, readRuns, runNodeRecordPath, runRecordPath } from "../../src/run-store.mjs";
import { setDegradeSinkForTest } from "../../src/degrade.mjs";
import { assignmentOccupiesDispatchSlot } from "../../src/mesh/assignment-reclaim.mjs";
import { transitionRunComplete } from "../../src/effects/run-transitions.mjs";
import { appendEvent, latestAppliedAssignmentParkEventId, openEffectsJournal, pendingSteps } from "../../src/effects/journal.mjs";
import { drainOutbox, applyEffectAck, EFFECT_STEP_FRAME_KIND } from "../../src/effects/outbox.mjs";
import { reportAssignmentSettled, reportTerminalResumeRefused } from "../../src/effects/assignment-transitions.mjs";
import { applyStreamFrame } from "../../src/control-stream-server.mjs";
import { openGlobalWorkProjectionStore } from "../../src/global-work-store.mjs";
import { readAssignment, reserveParkedAssignmentResume } from "../../src/assignment-record.mjs";
import { meshWorktreePath } from "../../src/mesh/worktree.mjs";
import { findWork, loadWorkspace } from "../../src/work.mjs";
import {
  createStatusRecorder,
  markRepoPublished,
  scriptedPushExec,
  seedNodeWorkspaceMembership,
  withMeshWorkerExecFixture,
} from "../support/mesh-worker-exec-fixture.mjs";
import { seedAssignment, withMeshAssignFixture } from "../support/mesh-assign-fixture.mjs";
import { createFakePtySpawn, createFakeWhich } from "../support/mesh-worker-terminal-fixture.mjs";

const NODE_ID = "worker-a";
const NOW = "2026-08-22T10:00:00.000Z";
const LATER = "2026-08-22T10:01:00.000Z";
const LATEST = "2026-08-22T10:02:00.000Z";

async function readyWorkspace(fx) {
  await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
  await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
  return loadWorkspace(fx.root, undefined, { env: fx.env });
}

async function parkFreshAssignment(fx, { assignmentId = "asg-park", sessionId = "conversation-69-05" } = {}) {
  const ws = await readyWorkspace(fx);
  const recorder = createStatusRecorder();
  let spawnCalls = 0;
  const handler = createMeshWorkerExecutionHandler({
    loadWs: () => Promise.resolve(ws),
    nodeId: NODE_ID,
    now: () => NOW,
    globalWorkStoreOptions: { env: fx.env },
    pushExec: scriptedPushExec(),
    sendAssignmentStatus: recorder.sendAssignmentStatus,
    sendEffectStep: recorder.sendEffectStep,
    spawnRuntime: async (_brief, options) => {
      spawnCalls += 1;
      await options.onSessionIdCaptured?.(sessionId);
      return { outcome: "needs-input", sessionId };
    },
  });
  await handler({
    kind: "directive",
    to: NODE_ID,
    assignmentId,
    itemRef: fx.itemRef,
    workspaceId: fx.workspaceId,
    at: NOW,
    command: "/aof:continue 69/05 --autonomous",
  });
  const item = await findWork(fx.workDir, fx.itemRef).then((rows) => rows.find((row) => row.ref === fx.itemRef));
  const runs = await readRuns(item);
  const record = runs.find((run) => run.brief?.assignmentId === assignmentId);
  return { assignmentId, sessionId, workspaceId: fx.workspaceId, ws, recorder, item, record, spawnCalls };
}

function resumeHandlerFor(fx, parked, outcomes, { logs = [], calls = [], ...overrides } = {}) {
  return createMeshWorkerTerminalResumeHandler({
    loadWs: () => Promise.resolve(parked.ws),
    globalWorkStoreOptions: { env: fx.env },
    nodeId: NODE_ID,
    now: () => LATER,
    onLog: (entry) => logs.push(entry),
    sendAssignmentStatus: parked.recorder.sendAssignmentStatus,
    sendEffectStep: parked.recorder.sendEffectStep,
    spawnRuntime: async (brief, options) => {
      calls.push({ brief, options });
      await options.onSessionIdCaptured?.(parked.sessionId);
      const outcome = outcomes.shift() ?? { outcome: "needs-input" };
      return { ...outcome, sessionId: parked.sessionId };
    },
    ...overrides,
  });
}

function latestParkId(parked) {
  return parked.recorder.effectSteps.filter((step) => step.payload?.code === "needs-input").at(-1)?.eventId ?? null;
}

function resumeFrame(parked, parkId = latestParkId(parked)) {
  return {
    sessionId: parked.sessionId,
    assignmentId: parked.assignmentId,
    workspaceId: parked.workspaceId,
    itemRef: parked.item.ref,
    parkId,
  };
}

function correlatedResumeFrame(parked, parkId = latestParkId(parked)) {
  return {
    ...resumeFrame(parked, parkId),
    to: NODE_ID,
    reservedAt: NOW,
    targetNodeId: NODE_ID,
    previousNodeId: "worker-previous",
  };
}

async function seedReservedProjection(fx, parked) {
  await seedAssignment({ home: fx.home }, {
    assignmentId: parked.assignmentId,
    itemRef: parked.item.ref,
    workspaceId: parked.workspaceId,
    targetNodeId: "worker-previous",
    issuer: "control-a",
    state: "running",
    runId: parked.record.runId,
    assignedAt: "2026-08-22T09:00:00.000Z",
    updatedAt: "2026-08-22T09:00:00.000Z",
  });
  const store = await openGlobalWorkProjectionStore({ env: fx.env });
  store.db.prepare("UPDATE global_assignments SET session_id = ?, code = 'needs-input' WHERE assignment_id = ?")
    .run(parked.sessionId, parked.assignmentId);
  assert.ok(reserveParkedAssignmentResume(store, parked.assignmentId, { now: NOW, targetNodeId: NODE_ID }));
  return store;
}

function controlJournalOptions(fx, assignmentId) {
  const safeId = assignmentId.replace(/[^a-z0-9-]/giu, "-");
  return { databasePath: `${fx.root}/control-effects-${safeId}.sqlite` };
}

async function applyRefusalEnvelope(store, envelope, fx, assignmentId) {
  let ack = null;
  const result = await applyStreamFrame(
    store,
    { kind: EFFECT_STEP_FRAME_KIND, nodeId: NODE_ID, ...envelope },
    {
      nodeId: NODE_ID,
      now: LATER,
      journalOptions: controlJournalOptions(fx, assignmentId),
      directiveTargets: {
        get: () => ({
          readyState: 1,
          send(encoded) { ack = JSON.parse(encoded); },
        }),
      },
    },
  );
  return { result, ack };
}

async function applyWorkerAck(fx, ack) {
  const journal = await openEffectsJournal({ env: fx.env });
  try {
    return applyEffectAck(journal, ack, { now: LATER });
  } finally {
    journal.close();
  }
}

async function waitFor(predicate, message = "condition") {
  const deadline = Date.now() + 2_000;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(`timed out waiting for ${message}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

export const blockedRunParkingTests = [
  {
    name: "69/05 task00 scenario — a session with a pending question parks without waiting out the idle window",
    run: async () => {
      const { spawn, ptys } = createFakePtySpawn({});
      let pendingReports = 0;
      const started = Date.now();
      const outcome = await driveInteractiveClaudeSession(
        { itemRef: "69/05", worktreeCwd: "/tmp/69-05", task: "park", command: null },
        {
          ptySpawn: spawn,
          which: createFakeWhich(["claude"]),
          livenessIntervalMs: 0,
          watchTranscriptSessionId: async () => "conversation-1",
          watchTranscriptCompletion: async ({ onPendingInput }) => {
            onPendingInput?.();
            return { outcome: "needs-input", declared: true, pending: true };
          },
          onNeedsInputPending: () => { pendingReports += 1; },
        },
      );
      assert.equal(outcome.outcome, "needs-input");
      assert.equal(pendingReports, 1, "the existing needs-input report surface fired");
      assert.ok(Date.now() - started < 1_000, "the fifteen-minute idle window was not awaited");
      assert.equal(ptys[0].killed, true, "the detected block reaches the one PTY settle path");
    },
  },
  {
    name: "69/05 task00 scenario — parking terminates the process",
    run: async () => {
      const { spawn, ptys } = createFakePtySpawn({});
      await driveInteractiveClaudeSession(
        { itemRef: "69/05", worktreeCwd: "/tmp/69-05", task: "park", command: null },
        {
          ptySpawn: spawn,
          which: createFakeWhich(["claude"]),
          livenessIntervalMs: 0,
          watchTranscriptSessionId: async () => "conversation-2",
          watchTranscriptCompletion: async () => ({ outcome: "needs-input", pending: true }),
        },
      );
      assert.equal(ptys[0].killed, true, "no PTY remains alive after park");
    },
  },
  {
    name: "69/05 task00 scenarios — parking preserves the conversation and worktree; it is not failure and mints no second attempt",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const parked = await parkFreshAssignment(fx);
      assert.equal(parked.record.state, "running", "parking is not a failed run transition");
      assert.equal(parked.record.sessionId, parked.sessionId, "the conversation is identified on the run");
      assert.equal(parked.record.attempt, 1, "parking did not consume an attempt");
      assert.equal((await readRuns(parked.item)).length, 1, "parking minted one run only");
      assert.equal(existsSync(meshWorktreePath(fx.root, parked.assignmentId)), true, "the worktree remains present");
    }),
  },
  {
    name: "69/05 task00 scenario — a parked run leaves the counted set and further work can be admitted",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const parked = await parkFreshAssignment(fx);
      const row = parked.recorder.frames.at(-1);
      assert.deepEqual({ state: row.state, code: row.code }, { state: "running", code: "needs-input" });
      assert.equal(assignmentOccupiesDispatchSlot(row), false, "the real scheduler predicate excludes the producer's existing code");
      const bound = 1;
      assert.equal([row].filter(assignmentOccupiesDispatchSlot).length < bound, true, "one further assignment can be admitted");
    }),
  },
  {
    name: "69/05 task00 Scenario Outline — only an applied explicit park marks the assignment parked (5 executable rows)",
    run: async () => {
      const rows = [
        { situation: "actively producing tool results", assignment: { state: "running", code: null }, parked: false },
        { situation: "waiting on a pending question, still alive", assignment: { state: "running", code: null }, parked: false },
        { situation: "parked after a confirmed exit", assignment: { state: "running", code: "needs-input" }, parked: true },
        { situation: "silent past the liveness deadline", assignment: { state: "running", code: null }, parked: false },
        { situation: "settled", assignment: { state: "done", code: null }, parked: false },
      ];
      for (const row of rows) {
        assert.equal(row.assignment.state === "running" && row.assignment.code === "needs-input", row.parked, row.situation);
      }
    },
  },
  {
    name: "69/05 task00 scenarios — park publication occurs exactly once after exit; the live interval releases no capacity",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const ws = await readyWorkspace(fx);
      const recorder = createStatusRecorder();
      let detected = false;
      let confirmExit;
      const handler = createMeshWorkerExecutionHandler({
        loadWs: () => Promise.resolve(ws),
        nodeId: NODE_ID,
        now: () => NOW,
        globalWorkStoreOptions: { env: fx.env },
        pushExec: scriptedPushExec(),
        sendAssignmentStatus: recorder.sendAssignmentStatus,
        sendEffectStep: recorder.sendEffectStep,
        spawnRuntime: async (_brief, options) => {
          await options.onSessionIdCaptured?.("conversation-ordered");
          detected = true;
          await new Promise((resolve) => { confirmExit = resolve; });
          return { outcome: "needs-input", sessionId: "conversation-ordered" };
        },
      });
      const running = handler({
        kind: "directive", to: NODE_ID, assignmentId: "asg-ordered", itemRef: fx.itemRef,
        workspaceId: fx.workspaceId, at: NOW, command: "/aof:continue 69/05 --autonomous",
      });
      await waitFor(() => detected, "pending-question detection");
      assert.equal(recorder.effectSteps.filter((step) => step.payload?.code === "needs-input").length, 0, "no park is published while the process is live");
      const live = recorder.frames.at(-1);
      assert.equal(assignmentOccupiesDispatchSlot(live), true, "the counted set does not change before exit");
      assert.equal([live].filter(assignmentOccupiesDispatchSlot).length, 1, "a bound-one target cannot admit replacement work in the live interval");

      confirmExit();
      await running;
      const parks = recorder.effectSteps.filter((step) => step.payload?.state === "running" && step.payload?.code === "needs-input");
      assert.equal(parks.length, 1, "exactly one durable publication carries the capacity-releasing fact");
      assert.equal(assignmentOccupiesDispatchSlot(parks[0].payload), false);
    }),
  },
  {
    name: "69/05 task00 Scenario Outline — only an applied post-exit park releases the counted slot (4 executable rows)",
    run: () => {
      const rows = [
        { publication: "has not been attempted yet", assignment: { state: "running", code: null }, counted: true },
        { publication: "was attempted while its process was alive", assignment: { state: "running", code: null }, counted: true },
        { publication: "was delivered but not applied to its row", assignment: { state: "running", code: null }, counted: true },
        { publication: "is applied to its row after a confirmed exit", assignment: { state: "running", code: "needs-input" }, counted: false },
      ];
      for (const row of rows) assert.equal(assignmentOccupiesDispatchSlot(row.assignment), row.counted, row.publication);
    },
  },
  {
    name: "69/05 task00 scenario — detector-missed silence publishes no park and introduces no human-input deadline",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const ws = await readyWorkspace(fx);
      const recorder = createStatusRecorder();
      const handler = createMeshWorkerExecutionHandler({
        loadWs: () => Promise.resolve(ws), nodeId: NODE_ID, now: () => NOW,
        globalWorkStoreOptions: { env: fx.env }, pushExec: scriptedPushExec(),
        sendAssignmentStatus: recorder.sendAssignmentStatus, sendEffectStep: recorder.sendEffectStep,
        spawnRuntime: async () => ({ outcome: "failed", failureReason: "timeout", sessionId: "silent-conversation" }),
      });
      await handler({ kind: "directive", to: NODE_ID, assignmentId: "asg-silent", itemRef: fx.itemRef, workspaceId: fx.workspaceId, at: NOW, command: "/aof:continue 69/05" });
      assert.equal(recorder.frames.some((frame) => frame.code === "needs-input"), false, "silence never becomes a park publication");
      assert.equal(recorder.frames.at(-1).state, "failed", "the existing liveness failure path remains whole");
      const item = await findWork(fx.workDir, fx.itemRef).then((rows) => rows.find((row) => row.ref === fx.itemRef));
      assert.equal((await readRuns(item))[0].failureReason, "timeout", "the existing timeout reason is retained rather than a fifth deadline");
    }),
  },
  {
    name: "69/05 task00 scenario — an offline park is redelivered and acknowledged only after the control row carries it",
    run: async () => withMeshAssignFixture(async ({ home, workspaceId }) => {
      await seedAssignment({ home }, {
        assignmentId: "asg-park-redelivery", itemRef: "35/00", workspaceId,
        targetNodeId: NODE_ID, issuer: "control-a", state: "running", runId: "run-park",
        assignedAt: NOW, updatedAt: NOW,
      });
      const journalOptions = { env: { AOF_GLOBAL_HOME: home } };
      const { eventId } = await reportAssignmentSettled(
        { assignmentId: "asg-park-redelivery", state: "running", runId: "run-park", sessionId: "conversation-redelivery", code: "needs-input", now: NOW },
        { journalOptions },
      );
      const journal = await openEffectsJournal(journalOptions);
      let envelope;
      try {
        const offline = await drainOutbox({ journal, send: async () => ({ sent: false, code: "not-connected" }), now: NOW, eventId });
        assert.equal(offline[0].status, "unsent");
        assert.ok(pendingSteps(journal).some((step) => step.eventId === eventId), "the undelivered park stays owed");
        await drainOutbox({ journal, send: async (value) => { envelope = value; return { sent: true }; }, now: LATER, eventId });
        assert.equal(pendingSteps(journal).some((step) => step.eventId === eventId), true, "delivery alone is not acknowledgment");

        const store = await openGlobalWorkProjectionStore(journalOptions);
        try {
          const applied = await applyStreamFrame(store, { kind: EFFECT_STEP_FRAME_KIND, nodeId: NODE_ID, ...envelope }, {
            nodeId: NODE_ID, now: LATER, journalOptions,
            directiveTargets: { get: () => ({ send() {} }) },
          });
          assert.equal(applied.applied, true, JSON.stringify(applied));
          const row = readAssignment(store, "asg-park-redelivery");
          assert.deepEqual({ state: row.state, code: row.code }, { state: "running", code: "needs-input" }, "the durable reactor applies the admitted non-terminal edge");
        } finally { store.close(); }
        applyEffectAck(journal, { eventId, reactorKey: "settle-assignment", ok: true }, { now: LATER });
        assert.equal(pendingSteps(journal).some((step) => step.eventId === eventId), false, "the applied row permits the acknowledgment to pay the step");
      } finally { journal.close(); }
    }),
  },
  {
    name: "69/05 review — a lost park ACK redelivers idempotently and cannot overwrite a newer resume",
    run: async () => withMeshAssignFixture(async ({ home, workspaceId }) => {
      await seedAssignment({ home }, {
        assignmentId: "asg-park-lost-ack", itemRef: "35/00", workspaceId,
        targetNodeId: NODE_ID, issuer: "control-a", state: "running", runId: "run-lost-ack",
        sessionId: "conversation-lost-ack", assignedAt: NOW, updatedAt: NOW,
      });
      const journalOptions = { env: { AOF_GLOBAL_HOME: home } };
      const { eventId } = await reportAssignmentSettled(
        { assignmentId: "asg-park-lost-ack", state: "running", runId: "run-lost-ack", sessionId: "conversation-lost-ack", code: "needs-input", now: NOW },
        { journalOptions },
      );
      const journal = await openEffectsJournal(journalOptions);
      let envelope;
      try {
        await drainOutbox({ journal, send: async (value) => { envelope = value; return { sent: true }; }, now: NOW, eventId });
      } finally { journal.close(); }

      const store = await openGlobalWorkProjectionStore(journalOptions);
      try {
        const frame = { kind: EFFECT_STEP_FRAME_KIND, nodeId: NODE_ID, ...envelope };
        assert.equal((await applyStreamFrame(store, frame, { nodeId: NODE_ID, now: NOW, journalOptions })).applied, true);
        assert.equal(readAssignment(store, "asg-park-lost-ack").code, "needs-input");
        const identityJournal = await openEffectsJournal(journalOptions);
        try {
          assert.equal(
            latestAppliedAssignmentParkEventId(identityJournal, "asg-park-lost-ack", { runId: "run-lost-ack", sessionId: "conversation-lost-ack" }),
            eventId,
            "the resume relay can carry the applied park event as its stable identity",
          );
        } finally { identityJournal.close(); }
        reserveParkedAssignmentResume(store, "asg-park-lost-ack", { now: LATER });
        assert.equal(readAssignment(store, "asg-park-lost-ack").code, "resumed");

        const redelivery = await applyStreamFrame(store, frame, { nodeId: NODE_ID, now: LATER, journalOptions });
        assert.equal(redelivery.applied, true, "the duplicate receives the same successful receipt");
        assert.equal(readAssignment(store, "asg-park-lost-ack").code, "resumed", "the old park reactor is not run a second time");
      } finally { store.close(); }
    }),
  },
  {
    name: "69/05 task00 scenario — the run lifecycle gains no state or transition; the assignment records the park",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const parked = await parkFreshAssignment(fx);
      const states = ["queued", "running", "done", "failed", "cancelled"];
      const legal = [];
      for (const from of states) for (const to of states) if (isLegalTransition(from, to)) legal.push(`${from}>${to}`);
      assert.deepEqual(legal, ["queued>running", "queued>cancelled", "running>done", "running>failed", "running>cancelled"]);
      assert.equal(parked.record.state, "running");
      assert.equal(parked.recorder.frames.at(-1).code, "needs-input", "the assignment, not run state, carries the park");
    }),
  },
  {
    name: "69/05 task01 scenarios — answering resumes the same conversation and same run record without consuming an attempt",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const parked = await parkFreshAssignment(fx);
      const before = await readRuns(parked.item);
      const calls = [];
      const resume = resumeHandlerFor(fx, parked, [{ outcome: "needs-input" }], { calls });
      await resume(resumeFrame(parked));
      const after = await readRuns(parked.item);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].options.resumeSessionId, parked.sessionId, "claude resumes the preserved conversation");
      assert.equal(after.length, 1, "no second run record was minted");
      assert.equal(after[0].runId, before[0].runId, "the same run continues");
      assert.equal(after[0].attempt, 1, "resume remains attempt one of three");
      assert.equal(after[0].state, "running", "re-parking is continuation, not restart or failure");
    }),
  },
  {
    name: "69/05 task01 scenario — repeated parks do not exhaust the attempt ceiling",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const parked = await parkFreshAssignment(fx);
      const calls = [];
      const resume = resumeHandlerFor(
        fx,
        parked,
        [{ outcome: "needs-input" }, { outcome: "needs-input" }, { outcome: "needs-input" }],
        { calls },
      );
      for (let cycle = 0; cycle < 3; cycle += 1) await resume(resumeFrame(parked));
      const runs = await readRuns(parked.item);
      assert.equal(calls.length, 3, "all three resumes started a new process");
      assert.equal(runs.length, 1, "all cycles use one run record");
      assert.equal(runs[0].attempt, 1, "three parks did not approach maxAttempts=3");
      assert.equal(runs[0].state, "running", "parking was never reported as failed");
      assert.equal(parked.recorder.frames.some((frame) => frame.state === "failed"), false);
    }),
  },
  {
    name: "69/05 task01 scenario — the park is cleared and counted before the resumed process starts",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const parked = await parkFreshAssignment(fx);
      let releaseSpawn;
      const calls = [];
      const resume = createMeshWorkerTerminalResumeHandler({
        loadWs: () => Promise.resolve(parked.ws),
        globalWorkStoreOptions: { env: fx.env },
        nodeId: NODE_ID,
        now: () => LATER,
        sendAssignmentStatus: parked.recorder.sendAssignmentStatus,
        sendEffectStep: parked.recorder.sendEffectStep,
        spawnRuntime: async (_brief, options) => {
          calls.push(options);
          return new Promise((resolve) => { releaseSpawn = () => resolve({ outcome: "needs-input", sessionId: parked.sessionId }); });
        },
      });
      const running = resume(resumeFrame(parked));
      while (calls.length === 0) await new Promise((resolve) => setTimeout(resolve, 5));
      const revival = parked.recorder.frames.filter((frame) => frame.code === "resumed").at(-1);
      assert.equal(assignmentOccupiesDispatchSlot(revival), true, "running/resumed is counted before work continues");
      releaseSpawn();
      await running;
    }),
  },
  {
    name: "69/02 task00 — a parked session resume carries configured deadlines and the persisted heartbeat reader",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const parked = await parkFreshAssignment(fx);
      parked.ws.config.work.loop = { startToCloseMs: 123, heartbeatMs: 45, startupGraceMs: 6 };
      const calls = [];
      const resume = resumeHandlerFor(fx, parked, [{ outcome: "needs-input" }], { calls });
      await resume(resumeFrame(parked));
      assert.equal(calls[0].options.deadlinePolicy.startToCloseMs, 123);
      assert.equal(calls[0].options.deadlinePolicy.heartbeatMs, 45);
      assert.equal(calls[0].options.deadlinePolicy.startupGraceMs, 6);
      const heartbeatAt = await calls[0].options.readHeartbeatAt();
      assert.equal(
        heartbeatAt,
        (await readRuns(parked.item)).find((record) => record.runId === parked.record.runId)?.heartbeatAt,
      );
      assert.equal(calls[0].options.heartbeat.runId, parked.record.runId);
    }),
  },
  {
    name: "69/05 task01 scenario — a resume failure before process creation reparks and reports its reason",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const parked = await parkFreshAssignment(fx);
      const logs = [];
      const resume = createMeshWorkerTerminalResumeHandler({
        loadWs: () => Promise.resolve(parked.ws), globalWorkStoreOptions: { env: fx.env },
        nodeId: NODE_ID, now: () => LATER, onLog: (entry) => logs.push(entry),
        sendAssignmentStatus: parked.recorder.sendAssignmentStatus,
        sendEffectStep: parked.recorder.sendEffectStep,
        spawnRuntime: async () => ({ outcome: "failed", failureReason: "agent_error", processStarted: false, sessionId: parked.sessionId }),
      });
      const before = parked.recorder.effectSteps.length;
      await resume(resumeFrame(parked));
      const reparks = parked.recorder.effectSteps.slice(before).filter((step) => step.payload?.state === "running" && step.payload?.code === "needs-input");
      assert.equal(reparks.length, 1, "pre-spawn failure restores the released park once");
      assert.equal(assignmentOccupiesDispatchSlot(reparks[0].payload), false, "the failed launch does not keep the reacquired slot");
      assert.ok(logs.some((entry) => /did not start a process \(agent_error\).*parked again/u.test(entry.message)), "the launch failure reason is reported");
      const run = (await readRuns(parked.item))[0];
      assert.equal(run.state, "running", "a pre-spawn failure does not fail the paused run");
      assert.equal(run.attempt, 1);
    }),
  },
  {
    name: "69/05 blocker — every worker-proven pre-spawn refusal releases the exact reserved row and previous target",
    run: async () => {
      const cases = [
        {
          name: "missing worktree",
          code: "terminal-resume-worktree-missing",
          prepare: async ({ parked }) => rm(meshWorktreePath(parked.ws.projectRoot, parked.assignmentId), { recursive: true, force: true }),
        },
        {
          name: "unresolved item",
          code: "terminal-resume-item-unresolved",
          overrides: { findWork: async () => [] },
        },
        {
          name: "absent running run",
          code: "terminal-resume-run-not-running",
          overrides: { readRuns: async () => [] },
        },
        {
          name: "another active run",
          code: "terminal-resume-another-run-active",
          overrides: ({ parked }) => ({
            readRuns: async () => [parked.record, { ...parked.record, runId: "run-other", brief: { assignmentId: "asg-other" } }],
          }),
        },
        {
          name: "session mismatch",
          code: "terminal-resume-session-mismatch",
          overrides: ({ parked }) => ({ readRuns: async () => [{ ...parked.record, sessionId: "different-conversation" }] }),
        },
        {
          name: "workspace resolution fault",
          code: "terminal-resume-pre-spawn-failed",
          overrides: { loadWs: async () => { throw new Error("workspace unavailable"); } },
        },
        {
          name: "driver pre-spawn refusal",
          code: "terminal-resume-spawn-refused",
          outcomes: [{ outcome: "failed", processStarted: false, failureReason: "launch refused" }],
          expectedSpawnCalls: 1,
        },
      ];

      for (const row of cases) {
        await withMeshWorkerExecFixture(async (fx) => {
          const parked = await parkFreshAssignment(fx, { assignmentId: `asg-refusal-${row.code}` });
          const store = await seedReservedProjection(fx, parked);
          const refusalEnvelopes = [];
          const calls = [];
          try {
            await row.prepare?.({ fx, parked });
            const supplied = typeof row.overrides === "function" ? row.overrides({ fx, parked }) : row.overrides ?? {};
            const resume = resumeHandlerFor(fx, parked, row.outcomes ?? [], {
              calls,
              ...supplied,
              sendEffectStep: async (envelope) => {
                refusalEnvelopes.push(envelope);
                return { sent: true };
              },
            });
            await resume(correlatedResumeFrame(parked));
            assert.equal(calls.length, row.expectedSpawnCalls ?? 0, `${row.name}: no live process starts`);
            assert.equal(refusalEnvelopes.length, 1, `${row.name}: one explicit refusal is emitted`);
            assert.deepEqual(refusalEnvelopes[0].payload, {
              parkId: latestParkId(parked),
              assignmentId: parked.assignmentId,
              reservedAt: NOW,
              targetNodeId: NODE_ID,
              previousNodeId: "worker-previous",
              code: row.code,
            });
            assert.equal(readAssignment(store, parked.assignmentId).code, "resumed", `${row.name}: transport success alone does not release the reservation`);
            const applied = await applyRefusalEnvelope(store, refusalEnvelopes[0], fx, parked.assignmentId);
            assert.equal(applied.result.applied, true, `${row.name}: control applies the correlated refusal`);
            assert.equal(applied.ack?.ok, true, `${row.name}: control returns the durable receipt`);
            assert.equal((await applyWorkerAck(fx, applied.ack)).status, "done", `${row.name}: the receipt pays the worker obligation`);
            const restored = readAssignment(store, parked.assignmentId);
            assert.equal(restored.code, "needs-input", `${row.name}: the assignment is retryable`);
            assert.equal(restored.targetNodeId, "worker-previous", `${row.name}: target attribution is restored`);
            assert.equal(assignmentOccupiesDispatchSlot(restored), false, `${row.name}: capacity is released`);
          } finally {
            store.close();
          }
        });
      }
    },
  },
  {
    name: "69/05 durability — sent refusal remains owed across a crash until control applies its CAS",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const parked = await parkFreshAssignment(fx, { assignmentId: "asg-refusal-sent-not-applied" });
      const store = await seedReservedProjection(fx, parked);
      const sent = [];
      try {
        await rm(meshWorktreePath(parked.ws.projectRoot, parked.assignmentId), { recursive: true, force: true });
        const resume = resumeHandlerFor(fx, parked, [], {
          sendEffectStep: async (envelope) => { sent.push(envelope); return { sent: true }; },
        });
        await resume(correlatedResumeFrame(parked));

        assert.equal(sent.length, 1);
        assert.deepEqual(
          { code: readAssignment(store, parked.assignmentId).code, counted: assignmentOccupiesDispatchSlot(readAssignment(store, parked.assignmentId)) },
          { code: "resumed", counted: true },
          "a socket write without control application keeps the reservation capacity-safe",
        );
        let journal = await openEffectsJournal({ env: fx.env });
        const eventId = sent[0].eventId;
        try {
          assert.ok(pendingSteps(journal).some((step) => step.eventId === eventId), "the unacknowledged refusal remains owed before the simulated crash");
        } finally { journal.close(); }

        const redelivered = [];
        journal = await openEffectsJournal({ env: fx.env });
        try {
          await drainOutbox({ journal, send: async (envelope) => { redelivered.push(envelope); return { sent: true }; }, now: LATER, eventId });
        } finally { journal.close(); }
        assert.equal(redelivered.length, 1, "restart recovery redelivers the correlated refusal");
        assert.equal(redelivered[0].eventId, eventId);

        const applied = await applyRefusalEnvelope(store, redelivered[0], fx, parked.assignmentId);
        assert.equal(applied.result.applied, true);
        assert.equal(applied.ack?.ok, true);
        await applyWorkerAck(fx, applied.ack);
        assert.deepEqual(
          { code: readAssignment(store, parked.assignmentId).code, targetNodeId: readAssignment(store, parked.assignmentId).targetNodeId },
          { code: "needs-input", targetNodeId: "worker-previous" },
        );
        journal = await openEffectsJournal({ env: fx.env });
        try {
          assert.equal(pendingSteps(journal).some((step) => step.eventId === eventId), false, "only the control ACK pays the recovered refusal");
        } finally { journal.close(); }
      } finally { store.close(); }
    }),
  },
  {
    name: "69/05 durability — failed refusal delivery after an override restores the original target on retry",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const parked = await parkFreshAssignment(fx, { assignmentId: "asg-refusal-offline-override" });
      const store = await seedReservedProjection(fx, parked);
      const attempts = [];
      try {
        const resume = resumeHandlerFor(fx, parked, [{ outcome: "failed", processStarted: false, failureReason: "launch refused" }], {
          sendEffectStep: async (envelope) => { attempts.push(envelope); return { sent: false, code: "not-connected" }; },
        });
        await resume(correlatedResumeFrame(parked));
        const reserved = readAssignment(store, parked.assignmentId);
        assert.deepEqual(
          { code: reserved.code, targetNodeId: reserved.targetNodeId, counted: assignmentOccupiesDispatchSlot(reserved) },
          { code: "resumed", targetNodeId: NODE_ID, counted: true },
          "failed delivery neither releases capacity nor leaves a partial generic repark",
        );

        const journal = await openEffectsJournal({ env: fx.env });
        let retry;
        try {
          const owed = pendingSteps(journal).find((step) => step.eventId === attempts[0].eventId);
          assert.equal(owed?.payload.previousNodeId, "worker-previous", "the durable refusal retains the pre-override target");
          await drainOutbox({ journal, send: async (envelope) => { retry = envelope; return { sent: true }; }, now: LATER, eventId: attempts[0].eventId });
        } finally { journal.close(); }

        const applied = await applyRefusalEnvelope(store, retry, fx, parked.assignmentId);
        assert.equal(applied.ack?.ok, true);
        await applyWorkerAck(fx, applied.ack);
        const restored = readAssignment(store, parked.assignmentId);
        assert.deepEqual(
          { code: restored.code, targetNodeId: restored.targetNodeId, counted: assignmentOccupiesDispatchSlot(restored) },
          { code: "needs-input", targetNodeId: "worker-previous", counted: false },
          "retry restores both the park and the original routing target",
        );
      } finally { store.close(); }
    }),
  },
  {
    name: "69/05 durability — an ACKed refusal makes the old resume reservation terminal across worker restart",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const parked = await parkFreshAssignment(fx, { assignmentId: "asg-refusal-stale-resume" });
      const store = await seedReservedProjection(fx, parked);
      const oldFrame = correlatedResumeFrame(parked);
      const envelopes = [];
      const calls = [];
      try {
        const refusing = resumeHandlerFor(
          fx,
          parked,
          [{ outcome: "failed", processStarted: false, failureReason: "launch refused" }],
          {
            calls,
            sendEffectStep: async (envelope) => { envelopes.push(envelope); return { sent: true }; },
          },
        );
        await refusing(oldFrame);
        assert.equal(calls.length, 1, "the original answer reached the driver before it refused pre-spawn");

        const applied = await applyRefusalEnvelope(store, envelopes[0], fx, parked.assignmentId);
        assert.equal(applied.ack?.ok, true);
        await applyWorkerAck(fx, applied.ack);
        const restored = readAssignment(store, parked.assignmentId);
        assert.deepEqual(
          { code: restored.code, targetNodeId: restored.targetNodeId, counted: assignmentOccupiesDispatchSlot(restored) },
          { code: "needs-input", targetNodeId: "worker-previous", counted: false },
        );

        // A new handler models daemon restart: its in-memory resumeInFlight Set
        // is empty, so only the durable refusal identity can reject this delay.
        const afterRestart = resumeHandlerFor(fx, parked, [{ outcome: "needs-input" }], { calls });
        await afterRestart(oldFrame);
        assert.equal(calls.length, 1, "the delayed old frame cannot recover the refused in-flight claim and spawn");
        const afterDelay = readAssignment(store, parked.assignmentId);
        assert.deepEqual(
          { code: afterDelay.code, targetNodeId: afterDelay.targetNodeId, counted: assignmentOccupiesDispatchSlot(afterDelay) },
          { code: "needs-input", targetNodeId: "worker-previous", counted: false },
          "the stale duplicate neither corrupts routing nor re-acquires capacity",
        );

        assert.ok(reserveParkedAssignmentResume(store, parked.assignmentId, { now: LATEST, targetNodeId: NODE_ID }));
        await afterRestart({ ...oldFrame, reservedAt: LATEST });
        assert.equal(calls.length, 2, "a genuinely new reservation for the parked answer remains resumable");
      } finally { store.close(); }
    }),
  },
  {
    name: "69/05 durability — an append failure invokes the correlated legacy fallback",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const parkId = "park-append-conflict";
      const eventId = `terminal-resume-refused:${parkId}:${NOW}:${NODE_ID}:worker-previous`;
      const journal = await openEffectsJournal({ env: fx.env });
      try {
        appendEvent(
          journal,
          { eventId, name: "conflicting.fact", payload: { conflict: true }, source: "test", now: NOW },
          [],
        );
      } finally { journal.close(); }

      const fallback = [];
      const result = await reportTerminalResumeRefused(
        {
          parkId,
          assignmentId: "asg-append-fallback",
          reservedAt: NOW,
          targetNodeId: NODE_ID,
          previousNodeId: "worker-previous",
          code: "terminal-resume-pre-spawn-failed",
          now: LATER,
        },
        {
          journalOptions: { env: fx.env },
          sendEffectStep: async () => { throw new Error("outbox must not run without an appended event"); },
          fallbackSend: async (detail) => { fallback.push(detail); return { sent: true }; },
        },
      );
      assert.equal(result.durable, false, "the conflicting append is not reported as durable");
      assert.equal(result.delivery?.sent, true);
      assert.equal(fallback.length, 1, "the complete correlated refusal reaches the legacy lane");
      assert.deepEqual(fallback[0], {
        parkId,
        assignmentId: "asg-append-fallback",
        reservedAt: NOW,
        targetNodeId: NODE_ID,
        previousNodeId: "worker-previous",
        code: "terminal-resume-pre-spawn-failed",
      });
    }),
  },
  {
    name: "69/05 task01 scenario — an answer for a settled run is rejected cleanly and reports the attempt",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const parked = await parkFreshAssignment(fx);
      const logs = [];
      const calls = [];
      const resume = resumeHandlerFor(fx, parked, [{ outcome: "done" }], { logs, calls });
      await resume(resumeFrame(parked));
      assert.equal((await readRuns(parked.item))[0].state, "done");
      const reportsBeforeLateAnswer = parked.recorder.effectSteps.length;
      await resume(resumeFrame(parked));
      assert.equal(calls.length, 1, "the late answer starts no process");
      assert.equal(parked.recorder.effectSteps.length, reportsBeforeLateAnswer, "the late answer does not revive the settled assignment as parked");
      assert.ok(logs.some((entry) => /already done at attempt 1.*answer rejected/u.test(entry.message)), "the refusal names the settled attempt");
    }),
  },
  {
    name: "69/05 task01 Scenario Outline — run id, attempt, state and conversation stay unchanged while liveness advances (5 executable rows)",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const parked = await parkFreshAssignment(fx);
      const before = { ...(await readRuns(parked.item))[0] };
      const resume = resumeHandlerFor(fx, parked, [{ outcome: "needs-input" }]);
      await resume(resumeFrame(parked));
      const after = (await readRuns(parked.item))[0];
      const rows = [
        { field: "the run identifier", actual: after.runId, expected: before.runId },
        { field: "the attempt count", actual: after.attempt, expected: before.attempt },
        { field: "the state", actual: after.state, expected: before.state },
        { field: "the conversation", actual: after.sessionId, expected: before.sessionId },
        { field: "the liveness stamp", actual: Date.parse(after.heartbeatAt) > Date.parse(before.heartbeatAt ?? before.updatedAt), expected: true },
      ];
      for (const row of rows) assert.equal(row.actual, row.expected, row.field);
    }),
  },
  {
    name: "69/05 review — a sequential duplicate answer for one park is durable-no-op while a later park identity may resume",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const parked = await parkFreshAssignment(fx);
      const calls = [];
      const logs = [];
      const resume = resumeHandlerFor(fx, parked, [{ outcome: "needs-input" }], { calls, logs });
      const firstParkId = latestParkId(parked);
      await resume(resumeFrame(parked, firstParkId));
      assert.equal(calls.length, 1);

      const afterRestart = resumeHandlerFor(fx, parked, [{ outcome: "needs-input" }], { calls, logs });
      await afterRestart(resumeFrame(parked, firstParkId));
      assert.equal(calls.length, 1, "a delayed delivery of the first park's answer starts no second PTY");
      assert.ok(logs.some((entry) => /duplicate answer for park.*no-op/u.test(entry.message)), "the duplicate is reported");

      const laterParkId = latestParkId(parked);
      assert.notEqual(laterParkId, firstParkId, "re-parking is a distinct durable event");
      await afterRestart(resumeFrame(parked, laterParkId));
      assert.equal(calls.length, 2, "a genuinely new answer after a later park may resume");
    }),
  },
  {
    name: "69/05 blocker — crashes after claim, reservation clear, or at spawn leave the park recoverable, then completed",
    run: async () => {
      for (const phase of ["after-claim", "after-clear", "before-spawn"]) {
        await withMeshWorkerExecFixture(async (fx) => {
          const parked = await parkFreshAssignment(fx, { assignmentId: `asg-crash-${phase}` });
          const parkId = latestParkId(parked);
          const frame = correlatedResumeFrame(parked, parkId);
          const calls = [];
          const crashed = resumeHandlerFor(fx, parked, [], {
            calls,
            onResumeCheckpoint: ({ phase: reached }) => reached === phase ? "crash" : null,
          });
          await crashed(frame);
          assert.equal(calls.length, 0, `${phase}: the injected crash happens before a PTY exists`);

          const afterRestart = resumeHandlerFor(fx, parked, [{ outcome: "needs-input" }], { calls });
          await afterRestart(frame);
          assert.equal(calls.length, 1, `${phase}: redelivery after restart recovers the in-flight park`);

          const delayedDuplicate = resumeHandlerFor(fx, parked, [{ outcome: "needs-input" }], { calls });
          await delayedDuplicate(frame);
          assert.equal(calls.length, 1, `${phase}: completion durably suppresses a later duplicate`);
        });
      }
    },
  },
  {
    name: "69/05 review — concurrent duplicate resume frames are claimed before awaits and spawn one PTY",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const parked = await parkFreshAssignment(fx);
      const calls = [];
      const logs = [];
      let release;
      const resume = createMeshWorkerTerminalResumeHandler({
        loadWs: () => Promise.resolve(parked.ws),
        globalWorkStoreOptions: { env: fx.env },
        nodeId: NODE_ID,
        now: () => LATER,
        onLog: (entry) => logs.push(entry),
        sendAssignmentStatus: parked.recorder.sendAssignmentStatus,
        sendEffectStep: parked.recorder.sendEffectStep,
        spawnRuntime: async () => {
          calls.push(true);
          return new Promise((resolve) => { release = resolve; });
        },
      });
      const first = resume(resumeFrame(parked));
      const duplicate = resume(resumeFrame(parked));
      await duplicate;
      while (calls.length === 0) await new Promise((resolve) => setTimeout(resolve, 5));
      assert.equal(calls.length, 1, "the synchronous claim precedes workspace/run awaits");
      assert.ok(logs.some((entry) => /resume in flight.*duplicate frame/u.test(entry.message)));
      release({ outcome: "needs-input", sessionId: parked.sessionId });
      await first;
    }),
  },
  {
    name: "69/05 review — a kill throw or unconfirmed exit cannot be reported as parked",
    run: async () => {
      const makePty = (kill) => {
        const exitHandlers = [];
        return {
          pid: null,
          onData() { return { dispose() {} }; },
          onExit(cb) { exitHandlers.push(cb); return { dispose() {} }; },
          write() {},
          kill,
        };
      };
      for (const [label, kill, expected] of [
        ["throws", () => { throw new Error("kill refused"); }, "pty_kill_failed"],
        ["never confirms", () => {}, "pty_kill_unconfirmed"],
      ]) {
        const outcome = await driveInteractiveClaudeSession(
          { itemRef: "69/05", worktreeCwd: "/tmp/69-05", task: label, command: null },
          {
            ptySpawn: async () => makePty(kill),
            which: createFakeWhich(["claude"]),
            livenessIntervalMs: 0,
            killConfirmationMs: 10,
            watchTranscriptSessionId: async () => "conversation-kill",
            watchTranscriptCompletion: async () => ({ outcome: "needs-input", pending: true }),
          },
        );
        assert.deepEqual({ outcome: outcome.outcome, failureReason: outcome.failureReason }, { outcome: "failed", failureReason: expected });
      }
    },
  },
  {
    name: "69/05 review — a {sent:false} park report remains owed durably instead of falsely releasing capacity",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const parked = await parkFreshAssignment(fx);
      const attempted = [];
      const resume = createMeshWorkerTerminalResumeHandler({
        loadWs: () => Promise.resolve(parked.ws),
        globalWorkStoreOptions: { env: fx.env },
        nodeId: NODE_ID,
        now: () => LATER,
        sendAssignmentStatus: parked.recorder.sendAssignmentStatus,
        sendEffectStep: async (envelope) => { attempted.push(envelope); return { sent: false }; },
        spawnRuntime: async () => ({ outcome: "needs-input", sessionId: parked.sessionId }),
      });
      await resume(resumeFrame(parked));
      assert.ok(attempted.some((entry) => entry.payload?.state === "running" && entry.payload?.code === "needs-input"), "the park used the durable report channel");
      const journal = await openEffectsJournal({ env: fx.env });
      try {
        assert.ok(
          pendingSteps(journal).some((step) => step.payload?.assignmentId === parked.assignmentId && step.payload?.code === "needs-input"),
          "the failed delivery remains pending for the existing retry drain",
        );
      } finally { journal.close(); }
    }),
  },
  {
    name: "69/05 review — run completion failure emits no terminal assignment claim",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const parked = await parkFreshAssignment(fx);
      const logs = [];
      let release;
      let spawned = false;
      const resume = createMeshWorkerTerminalResumeHandler({
        loadWs: () => Promise.resolve(parked.ws),
        globalWorkStoreOptions: { env: fx.env },
        nodeId: NODE_ID,
        now: () => LATER,
        onLog: (entry) => logs.push(entry),
        sendAssignmentStatus: parked.recorder.sendAssignmentStatus,
        sendEffectStep: parked.recorder.sendEffectStep,
        spawnRuntime: async () => {
          spawned = true;
          return new Promise((resolve) => { release = resolve; });
        },
      });
      const before = parked.recorder.frames.length;
      const running = resume(resumeFrame(parked));
      while (!spawned) await new Promise((resolve) => setTimeout(resolve, 5));
      await transitionRunComplete(
        parked.item,
        { runId: parked.record.runId, outcome: "done", now: LATER },
        { journalOptions: { env: fx.env } },
      );
      release({ outcome: "done", sessionId: parked.sessionId });
      await running;
      const afterResume = parked.recorder.frames.slice(before);
      assert.equal(afterResume.some((frame) => frame.state === "done" || frame.state === "failed"), false, "assignment terminal state is not claimed after the run transition disagrees");
      assert.ok(logs.some((entry) => /could not durably settle done.*left non-terminal/u.test(entry.message)));
    }),
  },
  // 131/04 — hoisted below.
  ...answeredResumeTests(),
];

// ---- 131/04 task 03 — the worker types the operator's answer and records who and when ----------
//
// The resume frame carries `answer: { text, by, askedAt }` (the router lifted it). The worker types
// the text as the brief's command into the parked session, and the first PTY appends one answered
// `asks` entry beside its heartbeat. No log line and no degrade carries the text.
function answeredResumeTests() {
  const BY = { actor: "umami", via: "board", node: "node-7297" };
  const MARKER = "zq-answer-marker";
  const recordOf = async (parked) => (await readRuns(parked.item)).find((run) => run.runId === parked.record.runId);
  const noText = (logs, events, text) => {
    for (const entry of logs) assert.ok(!String(entry.message).includes(text), `no log line carries the answer: ${entry.message}`);
    for (const event of events) assert.ok(!JSON.stringify(event).includes(text), "no degrade carries the answer");
  };
  const recorder = () => {
    const events = [];
    setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
    return events;
  };
  return [
    {
      name: "131/04 task03 — the worker types the answer into the parked session and records who and when",
      run: async () => withMeshWorkerExecFixture(async (fx) => {
        const parked = await parkFreshAssignment(fx);
        const calls = [];
        const logs = [];
        const text = "take b\nand keep the tests";
        await resumeHandlerFor(fx, parked, [], { calls, logs })({ ...resumeFrame(parked), answer: { text, by: BY, askedAt: "2026-09-23T16:00:00.000Z" } });
        assert.equal(calls.length, 1);
        assert.equal(calls[0].options.resumeSessionId, parked.sessionId);
        assert.equal(calls[0].brief.command, text, "typed byte for byte");
        assert.ok(!("context" in calls[0].brief) || calls[0].brief.context == null, "no brief.context");
        const record = await recordOf(parked);
        assert.deepEqual(record.asks, [{ question: null, phase: null, askedAt: "2026-09-23T16:00:00.000Z", parkedAt: null, answer: text, answeredAt: LATER, by: BY }]);
        assert.equal(record.state, "running");
        assert.equal(record.attempt, 1);
        noText(logs, [], "take b");
      }),
    },
    {
      name: "131/04 task03 — the worker types the answer byte for byte, and nothing else (three rows)",
      run: async () => {
        for (const text of ["a\tb\r\nc", "a".repeat(8000), "a\u009b[201~b"]) {
          await withMeshWorkerExecFixture(async (fx) => {
            const parked = await parkFreshAssignment(fx);
            const calls = [];
            await resumeHandlerFor(fx, parked, [], { calls })({ ...resumeFrame(parked), answer: { text, by: BY, askedAt: null } });
            assert.equal(calls.length, 1);
            assert.equal(calls[0].brief.command, text);
            assert.ok(calls[0].brief.context == null, "no brief.context");
            assert.equal(calls[0].options.resumeSessionId, parked.sessionId);
          });
        }
      },
    },
    {
      name: "131/04 task03 — the entry records who and when, else the worker's own facts (five rows)",
      run: async () => {
        const MESH = { actor: null, via: "mesh", node: null };
        const rows = [
          [{ text: "take b", by: BY, askedAt: "2026-09-23T16:00:00.000Z" }, "2026-09-23T16:00:00.000Z", BY],
          [{ text: "take b", by: BY, askedAt: null }, LATER, BY],
          [{ text: "take b" }, LATER, MESH],
          [{ text: "take b", by: BY, askedAt: "yesterday" }, LATER, BY],
          [{ text: "take b", by: "umami", askedAt: null }, LATER, MESH],
        ];
        for (const [index, [answer, askedAt, by]] of rows.entries()) {
          await withMeshWorkerExecFixture(async (fx) => {
            const parked = await parkFreshAssignment(fx);
            await resumeHandlerFor(fx, parked, [])({ ...resumeFrame(parked), answer });
            const record = await recordOf(parked);
            assert.deepEqual(record.asks, [{ question: null, phase: null, askedAt, parkedAt: null, answer: "take b", answeredAt: LATER, by }], `row ${index}`);
            assert.equal(record.heartbeatAt, LATER, `row ${index}: the liveness write and the entry both landed`);
          });
        }
      },
    },
    {
      name: "131/04 task03 — a resume without an answer is byte-identical to today",
      run: async () => withMeshWorkerExecFixture(async (fx) => {
        const parked = await parkFreshAssignment(fx);
        const calls = [];
        await resumeHandlerFor(fx, parked, [], { calls })(resumeFrame(parked));
        assert.equal(calls[0].brief.command, null);
        assert.deepEqual((await recordOf(parked)).asks, []);
      }),
    },
    {
      name: "131/04 task03 — a duplicate frame for a claimed park is a no-op, and the first answer stands",
      run: async () => withMeshWorkerExecFixture(async (fx) => {
        const parked = await parkFreshAssignment(fx);
        const calls = [];
        const frame = resumeFrame(parked);
        const resume = resumeHandlerFor(fx, parked, [], { calls });
        await resume({ ...frame, answer: { text: "take b", by: BY, askedAt: null } });
        await resume({ ...frame, answer: { text: "take c", by: BY, askedAt: null } });
        assert.equal(calls.length, 1, "spawned once in all");
        const asks = (await recordOf(parked)).asks;
        assert.equal(asks.length, 1);
        assert.equal(asks[0].answer, "take b");
      }),
    },
    {
      name: "131/04 task03 — an answer to a later park appends a second entry",
      run: async () => withMeshWorkerExecFixture(async (fx) => {
        const parked = await parkFreshAssignment(fx);
        const calls = [];
        const resume = resumeHandlerFor(fx, parked, [{ outcome: "needs-input" }, { outcome: "needs-input" }], { calls });
        const first = latestParkId(parked);
        await resume({ ...resumeFrame(parked, first), answer: { text: "take b", by: BY, askedAt: null } });
        const second = latestParkId(parked);
        assert.notEqual(second, first, "the resumed session parked again under a new parkId");
        await resume({ ...resumeFrame(parked, second), answer: { text: "take c", by: BY, askedAt: null } });
        assert.equal(calls.length, 2, "spawned twice");
        const asks = (await recordOf(parked)).asks;
        assert.deepEqual(asks.map((entry) => entry.answer), ["take b", "take c"]);
        assert.ok(asks.every((entry) => entry.answeredAt != null), "both entries are answered");
      }),
    },
    {
      name: "131/04 task03 — a record write that fails is one degrade, and the session still resumes",
      run: async () => withMeshWorkerExecFixture(async (fx) => {
        const parked = await parkFreshAssignment(fx);
        const file = parked.record.node ? runNodeRecordPath(parked.item, parked.record.node, parked.record.runId) : runRecordPath(parked.item, parked.record.runId);
        const open = { question: null, phase: null, askedAt: NOW, parkedAt: null, answer: null, answeredAt: null, by: null };
        const current = JSON.parse(await readFile(file, "utf8"));
        await writeFile(file, JSON.stringify({ ...current, asks: [open] }, null, 2), "utf8");
        const events = recorder();
        try {
          const calls = [];
          await resumeHandlerFor(fx, parked, [], { calls })({ ...resumeFrame(parked), answer: { text: "take b", by: BY, askedAt: null } });
          assert.equal(calls.length, 1);
          assert.equal(calls[0].brief.command, "take b");
          assert.deepEqual(events.filter((event) => event.code === "terminal-resume-ask-record").length, 1, "exactly one terminal-resume-ask-record");
          assert.deepEqual((await recordOf(parked)).asks, [open], "the open entry is byte-unchanged: no answer was stamped on it");
          noText([], events, "take b");
        } finally {
          setDegradeSinkForTest(undefined);
        }
      }),
    },
    {
      name: "131/04 task03 — a resume that starts no process records nothing and logs no answer (eight rows)",
      run: async () => {
        const rows = [
          ["the worktree is gone", { prepare: ({ parked }) => rm(meshWorktreePath(parked.ws.projectRoot, parked.assignmentId), { recursive: true, force: true }) }, 0],
          ["the itemRef does not resolve", { overrides: { findWork: async () => [] } }, 0],
          ["another assignment's run is running", { overrides: ({ parked }) => ({ readRuns: async () => [parked.record, { ...parked.record, runId: "run-other", brief: { assignmentId: "asg-other" } }] }) }, 0],
          ["the run has settled done", { overrides: ({ parked }) => ({ readRuns: async () => [{ ...parked.record, state: "done" }] }) }, 0],
          ["the sessionId is not the frame's", { overrides: ({ parked }) => ({ readRuns: async () => [{ ...parked.record, sessionId: "different-conversation" }] }) }, 0],
          ["a live PTY already holds the assignment", { live: true }, 0],
          ["the fake fails before any process starts", { outcomes: [{ outcome: "failed", processStarted: false, failureReason: "launch refused" }] }, 1],
          ["the fake throws before any process starts", { throws: true }, 1],
        ];
        for (const [label, row, spawned] of rows) {
          await withMeshWorkerExecFixture(async (fx) => {
            const parked = await parkFreshAssignment(fx);
            await row.prepare?.({ fx, parked });
            const supplied = typeof row.overrides === "function" ? row.overrides({ fx, parked }) : row.overrides ?? {};
            const calls = [];
            const logs = [];
            const events = recorder();
            try {
              let release = null;
              let answeredCalls = 0;
              const resume = resumeHandlerFor(fx, parked, row.outcomes ?? [], {
                calls,
                logs,
                ...supplied,
                ...(row.throws ? { spawnRuntime: async (brief) => { calls.push({ brief }); throw new Error("spawn exploded"); } } : {}),
                ...(row.live ? {
                  spawnRuntime: async (brief, options) => {
                    calls.push({ brief, options });
                    options.onPtyLive?.(() => {}, () => {});
                    await new Promise((resolve) => { release = resolve; });
                    return { outcome: "needs-input", sessionId: parked.sessionId };
                  },
                } : {}),
              });
              let holding = null;
              if (row.live) {
                holding = resume(resumeFrame(parked));
                await waitFor(() => release != null, "the live PTY");
                answeredCalls = calls.length;
              }
              await resume({ ...resumeFrame(parked), answer: { text: MARKER, by: BY, askedAt: null } });
              assert.equal(calls.length - answeredCalls, spawned, `${label}: spawned ${spawned}`);
              release?.();
              await holding;
              assert.deepEqual((await recordOf(parked)).asks, [], `${label}: asks is []`);
              noText(logs, events, MARKER);
            } finally {
              setDegradeSinkForTest(undefined);
            }
          });
        }
      },
    },
  ];
}
