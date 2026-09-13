// Traceability: milestone 69 / story 02. The PTY driver owns attempt deadlines,
// the loop owns the total ceiling, and the control tick owns pickup escalation.
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { driveInteractiveClaudeSession } from "../../src/agent-session-driver.mjs";
import { runLoopBody } from "../../src/commands/loop.mjs";
import { runControlDispatchReclaimTick } from "../../src/mesh/assignment-reclaim.mjs";
import { openGlobalWorkProjectionStore } from "../../src/global-work-store.mjs";
import { assembleAssignmentRecord, insertAssignment, readAssignment } from "../../src/assignment-record.mjs";
import { decideScheduleToClose } from "../../src/work/loop.mjs";
import { completeRun, readRuns, startRun } from "../../src/run-store.mjs";
import { createFakePtySpawn, createFakeWhich } from "../support/mesh-worker-terminal-fixture.mjs";
import { completingDriver, loopFixture } from "../loop/loop-command-probe.test.mjs";

const BRIEF = { itemRef: "69/02", worktreeCwd: "/tmp/wt", task: "deadline", command: "/aof:continue 69/02" };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const driverOptions = (fake, extra = {}) => ({
  ptySpawn: fake.spawn,
  which: createFakeWhich(["claude"]),
  watchTranscriptSessionId: async () => null,
  commandDelayMs: 0,
  killConfirmationMs: 50,
  ...extra,
});

async function withStore(run) {
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-four-deadlines-"));
  const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
  try {
    return await run(store);
  } finally {
    store.close?.();
    await rm(home, { recursive: true, force: true });
  }
}

const noClose = (store) => ({ db: store.db, paths: store.paths, close() {} });

export const fourDeadlinesTests = [
  {
    name: "69/02 task00 — start-to-close expiry kills the held PTY and resolves a retryable timeout",
    run: async () => {
      const fake = createFakePtySpawn();
      const result = await driveInteractiveClaudeSession(BRIEF, driverOptions(fake, {
        deadlinePolicy: { startToCloseMs: 15, heartbeatMs: 1_000, startupGraceMs: 1 },
        readHeartbeatAt: async () => null,
      }));
      assert.equal(fake.ptys[0].killed, true);
      assert.deepEqual(result, { outcome: "failed", failureReason: "timeout", sessionId: null });
    },
  },
  {
    name: "69/02 task00 — heartbeat silence expires only after startup grace and then kills with timeout",
    run: async () => {
      let heartbeatReads = 0;
      const fake = createFakePtySpawn();
      const result = await driveInteractiveClaudeSession(BRIEF, driverOptions(fake, {
        deadlinePolicy: { startToCloseMs: 1_000, heartbeatMs: 15, startupGraceMs: 15 },
        readHeartbeatAt: async () => { heartbeatReads += 1; return null; },
      }));
      assert.equal(heartbeatReads, 1, "the silence check runs after grace plus the heartbeat window");
      assert.equal(fake.ptys[0].killed, true);
      assert.equal(result.outcome, "failed");
      assert.equal(result.failureReason, "timeout");
    },
  },
  {
    name: "69/02 task00 — the local production caller resolves declared attempt bounds for every retry",
    run: async () => {
      const fx = await loopFixture({ cap: 3 });
      try {
        fx.workspace.config.work.loop = {
          startToCloseMs: 12,
          heartbeatMs: 1_000,
          startupGraceMs: 1,
          scheduleToCloseMs: 10_000,
        };
        const fake = createFakePtySpawn();
        const state = await runLoopBody({ scope: "03" }, {
          ...fx.ctx,
          agentSessionDriverOptions: {
            ptySpawn: fake.spawn,
            which: createFakeWhich(["claude"]),
            watchTranscriptSessionId: async () => null,
            commandDelayMs: 0,
          },
          report: () => {},
        });
        assert.equal(state.act.stop, "cap-exhausted");
        assert.equal(state.act.producer, "run-store:attempts-exhausted");
        assert.equal(fake.spawnCalls.length, 3, "the configured attempt deadline produced the normal three-attempt retry lineage");
        assert.ok(fake.ptys.every((pty) => pty.killed), "each timed-out attempt was killed by its own driver");
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "69/02 task00 — a consumed heartbeat extends silence while a settled session cancels every deadline",
    run: async () => {
      let emitExit;
      let heartbeatReads = 0;
      const fake = createFakePtySpawn({ onWrite: (event) => { emitExit = event.emitExit; } });
      const pending = driveInteractiveClaudeSession(BRIEF, driverOptions(fake, {
        deadlinePolicy: { startToCloseMs: 500, heartbeatMs: 30, startupGraceMs: 5 },
        readHeartbeatAt: async () => {
          heartbeatReads += 1;
          return new Date().toISOString();
        },
      }));
      await wait(45);
      assert.equal(heartbeatReads, 1, "the first due check consumed the latest tool-result heartbeat");
      emitExit(0);
      const result = await pending;
      assert.equal(result.outcome, "done");
      await wait(45);
      assert.equal(heartbeatReads, 1, "settlement removed the refreshed timer");
    },
  },
  {
    // SUPERSEDED IN ITS CALL SHAPE by 126/00 (ADR-001 §3-§4): the decider takes `elapsedMs`
    // rather than `{startedAt, now}`, because the instant arithmetic moved to the engine's
    // lineage summer. `69/02`'s delivered `.feature` is NOT edited — its own words are "elapsed
    // total across attempts", which is what the code now literally computes — and BOTH of its
    // observable claims survive here unchanged: 99 ms under a 100 ms ceiling is admitted, 100 ms
    // halts `deadline-exhausted` with `preserved-for-triage`.
    name: "69/02 task01 — schedule-to-close halts as exhausted with preserved-for-triage evidence",
    run: async () => {
      const admitted = decideScheduleToClose({ elapsedMs: 99, ceilingMs: 100 });
      assert.equal(admitted.admitted, true);
      const exhausted = decideScheduleToClose({ elapsedMs: 100, ceilingMs: 100 });
      assert.equal(exhausted.stop, "deadline-exhausted");
      assert.equal(exhausted.deadline, "scheduleToClose");
      assert.equal(exhausted.disposition, "preserved-for-triage");
    },
  },
  {
    name: "69/02 task01 — an expired retry lineage starts no new attempt and leaves the worktree intact",
    run: async () => {
      const fx = await loopFixture();
      try {
        fx.workspace.config.work.loop = { scheduleToCloseMs: 100 };
        const declaration = {
          loopRunId: "expired-lineage",
          scope: "03",
          level: "L2",
          cap: 3,
          phase: "continue",
          cycle: 1,
          startedAt: "2026-08-22T10:00:00.000Z",
        };
        const prior = await startRun(
          { ref: "03/01", dir: fx.storyDir },
          { brief: { loop: declaration }, now: "2026-08-22T10:00:00.000Z" },
        );
        // 126/00: the attempt itself now has to be the thing that spent the budget. Under the
        // wall-clock reading this fixture halted on the 100 ms between the root's `createdAt` and
        // `now` while the attempt ran only 50; under the attempt-series reading a 50 ms attempt
        // ADMITS and drives, so the attempt is 100 ms here and the claim this test makes — an
        // expired lineage mints nothing and leaves the worktree intact — is preserved exactly.
        await completeRun(
          { ref: "03/01", dir: fx.storyDir },
          { runId: prior.runId, outcome: "failed", failureReason: "timeout", now: "2026-08-22T10:00:00.100Z" },
        );
        const driver = completingDriver(fx);
        const state = await runLoopBody({
          scope: "03",
          resume: true,
          now: "2026-08-22T10:00:00.100Z",
        }, { ...fx.ctx, agentSessionDriverOptions: driver.options, report: () => {} });
        assert.equal(state.act.stop, "deadline-exhausted");
        assert.equal(state.act.producer, "loop:schedule-to-close>=ceiling");
        assert.equal(state.act.disposition, "preserved-for-triage");
        assert.equal(driver.spawnCalls.length, 0);
        assert.equal((await readRuns({ ref: "03/01", dir: fx.storyDir })).length, 1, "the failed root is preserved without minting a retry");
        await assert.doesNotReject(import("node:fs/promises").then(({ access }) => access(fx.storyDir)));
      } finally {
        await fx.cleanup();
      }
    },
  },
  {
    name: "69/02 task01 — assigned work past schedule-to-start is warned once and never dispatched",
    run: () => withStore(async (store) => {
      insertAssignment(store, assembleAssignmentRecord({
        assignmentId: "late-pickup",
        itemRef: "69/02",
        workspaceId: "ws-1",
        targetNodeId: "worker-a",
        issuer: "control-a",
        now: "2026-08-22T09:49:59.999Z",
      }));
      const attempts = [];
      const warnings = [];
      const pickupEscalatedIds = new Set();
      const server = {
        directiveTargets: new Map([["worker-a", {}]]),
        dispatchDirective(frame) { attempts.push(frame); return { sent: true }; },
      };
      const tick = () => runControlDispatchReclaimTick(
        { workDir: "/unused", projectRoot: "/unused", config: { work: { loop: { scheduleToStartMs: 10 * 60 * 1000 } } } },
        server,
        {
          workspaceId: "ws-1",
          now: "2026-08-22T10:00:00.000Z",
          openStore: async () => noClose(store),
          buildDirectiveFrame: (to, payload) => ({ to, ...payload }),
          resolveDispatchCommit: async () => null,
          pickupEscalatedIds,
          onDispatchLog: (entry) => warnings.push(entry),
        },
      );
      await tick();
      await tick();
      assert.deepEqual(attempts, []);
      assert.equal(warnings.length, 1, "one launcher lifetime surfaces the pickup expiry once");
      assert.equal(warnings[0].code, "assignment-pickup-deadline-exceeded");
      assert.equal(warnings[0].level, "warn");
      assert.equal(readAssignment(store, "late-pickup").state, "assigned", "escalation preserves the undispatched row");
    }),
  },
];
