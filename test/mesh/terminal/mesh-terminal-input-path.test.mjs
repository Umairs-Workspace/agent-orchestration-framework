// test/mesh/terminal/mesh-terminal-input-path.test.mjs — m42 "interactive worker terminals"
// (SECURITY T14's read-only decision operator-overridden 2026-07-27; the
// constrained shape is pinned structurally by
// test/arch/ui/acd-fleet-terminal-input-constrained.test.mjs — THIS suite covers the
// behavioural lanes):
//
//   1. the CONTROL router (createTerminalInputRouter): a valid terminal-input
//      relay envelope routes down the worker's stream connection via the SAME
//      dispatchDirective seam the withdraw notify uses; foreign kinds are
//      ignored; malformed frames drop loudly; a not-connected target drops with
//      ONE logged miss per tuple (never a per-keystroke log storm);
//   2. the WORKER stream client dispatches a terminal-input DOWN-frame to the
//      registered onTerminalInput handler (the onDirective/onWithdraw lane);
//   3. the WORKER delivery (over the REAL execution handler + driver + fake
//      PTY): input for the CAPTURED session id reaches term.write; a foreign
//      session id is dropped (logged once); after the run settles the registry
//      is cleared and input is dropped again;
//   4. the PENDING-QUESTION producer (defaultWatchTranscriptCompletion over a
//      temp CLAUDE_CONFIG_DIR): a live AskUserQuestion fires onPendingInput and
//      returns needs-input so the driver can kill-and-confirm the PTY before the
//      worker durably parks it; an answered question clears the signal;
//   5. the `code` column (schema v7): applyAssignmentStatusFrame persists the
//      status-refinement code VERBATIM PER FRAME — set by a needs-input frame,
//      CLEARED by the next code-less frame (deliberately unlike
//      runId/sessionId's absent-is-not-a-clear).
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile, appendFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createTerminalInputRouter } from "../../../src/mesh/terminal-input.mjs";
import { TERMINAL_INPUT_KIND, buildTerminalInputEnvelope, TERMINAL_FRAME_KIND, TERMINAL_RESUME_KIND, buildTerminalResumeEnvelope } from "../../../src/mesh/terminal-relay-bridge.mjs";
import { createWorkerStreamClient } from "../../../src/worker-stream-client.mjs";
import {
  createMeshWorkerExecutionHandler,
  createMeshWorkerTerminalInputHandler,
  createMeshWorkerTerminalResumeHandler,
  defaultWatchTranscriptCompletion,
  NEEDS_INPUT_SENTINEL,
  DIRECTIVE_COMPLETE_SENTINEL,
} from "../../../src/mesh/worker-execution.mjs";
import { meshWorktreePath } from "../../../src/mesh/worktree.mjs";
import { meshTerminalResumeCommand } from "../../../src/commands/mesh/terminal-resume.mjs";
import { updateAssignmentState, restoreParkedAssignmentResume } from "../../../src/assignment-record.mjs";
import { findWork } from "../../../src/work.mjs";
import { readRuns, startRun } from "../../../src/run-store.mjs";
import { claudeProjectsDir } from "../../../src/work/observe.mjs";
import { loadWorkspace } from "../../../src/work.mjs";
import { openGlobalWorkProjectionStore } from "../../../src/global-work-store.mjs";
import { assembleAssignmentRecord, insertAssignment, readAssignment } from "../../../src/assignment-record.mjs";
import { applyAssignmentStatusFrame } from "../../../src/control-stream-server.mjs";
import { withMeshWorkerExecFixture, markRepoPublished, seedNodeWorkspaceMembership, createStatusRecorder, scriptedPushExec } from "../../support/mesh-worker-exec-fixture.mjs";
import { createFakeWhich, createFakePtySpawn } from "../../support/mesh-worker-terminal-fixture.mjs";

const NOW = "2026-07-27T10:00:00.000Z";
const NODE_ID = "worker-a";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A CEILING ON EVERY BARE `await watch` IN THIS FILE — the same defect, and the same
// remedy, as the transcript-watch suite's own `settledOrFail` (deliberately NOT named
// here: a closed census gate owns which test files may name that module). These
// watches poll at `pollMs: 10`, so one that never settles does not merely fail: it
// spins the process forever with no output and no child, which is how a full-suite run
// stalls for hours and gets killed instead of diagnosed. A timeout here is a named
// assertion failure.
const WATCH_CEILING_MS = 30_000;

async function settledOrFail(promise, what = "the completion watch") {
  const pending = Symbol("pending");
  const result = await Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(pending), WATCH_CEILING_MS))]);
  assert.notEqual(result, pending, `${what} did not settle within ${WATCH_CEILING_MS}ms — it would have hung the run`);
  return result;
}

function waitFor(predicate, { timeoutMs = 3000, intervalMs = 10 } = {}) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (predicate()) { resolve(); return; }
      if (Date.now() - start > timeoutMs) { reject(new Error("timed out waiting for condition")); return; }
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

export const meshTerminalInputPathTests = [
  // ── 1. the control router ────────────────────────────────────────────────
  {
    name: "terminal-input/router: a valid envelope routes DOWN the worker's stream connection as { kind, to, sessionId, bytes, at }",
    async run() {
      const dispatched = [];
      const router = createTerminalInputRouter({
        dispatchDirective: (directive) => { dispatched.push(directive); return { sent: true }; },
        now: () => NOW,
      });
      const ok = router.apply(buildTerminalInputEnvelope("worker-a", "sess-1", "yes\r"));
      assert.equal(ok, true);
      assert.deepEqual(dispatched, [{ kind: TERMINAL_INPUT_KIND, to: "worker-a", sessionId: "sess-1", bytes: "yes\r", at: NOW }]);
    },
  },
  {
    name: "terminal-input/router: kind-blind to everything else — a terminal-frame (the mirror's own kind, riding the SAME subscriber socket) is ignored untouched",
    async run() {
      const dispatched = [];
      const router = createTerminalInputRouter({ dispatchDirective: (d) => { dispatched.push(d); return { sent: true }; }, now: () => NOW });
      assert.equal(router.apply({ kind: TERMINAL_FRAME_KIND, nodeId: "worker-a", signal: { sessionId: "sess-1", bytes: "output" } }), false);
      assert.equal(router.apply({ kind: "presence", nodeId: "worker-a" }), false);
      assert.equal(router.apply(null), false);
      assert.equal(dispatched.length, 0, "no foreign kind ever reaches dispatchDirective");
    },
  },
  {
    name: "terminal-input/router: a malformed frame (missing nodeId/sessionId/bytes) drops with a coded warn, never a dispatch",
    async run() {
      const dispatched = [];
      const logs = [];
      const router = createTerminalInputRouter({
        dispatchDirective: (d) => { dispatched.push(d); return { sent: true }; },
        now: () => NOW,
        onLog: (entry) => logs.push(entry),
      });
      assert.equal(router.apply(buildTerminalInputEnvelope("worker-a", null, "x")), false, "no sessionId");
      assert.equal(router.apply(buildTerminalInputEnvelope(null, "sess-1", "x")), false, "no nodeId");
      assert.equal(router.apply(buildTerminalInputEnvelope("worker-a", "sess-1", "")), false, "empty bytes");
      assert.equal(dispatched.length, 0);
      assert.ok(logs.every((l) => l.code === "terminal-input-invalid" && l.level === "warn"), "each drop is a coded warn");
      assert.equal(logs.length, 3);
    },
  },
  {
    name: "terminal-input/router: a not-connected target drops with ONE logged miss per (nodeId, sessionId) — an offline worker never causes a per-keystroke log storm",
    async run() {
      const logs = [];
      const router = createTerminalInputRouter({
        dispatchDirective: () => ({ sent: false, code: "assignment-target-not-connected" }),
        now: () => NOW,
        onLog: (entry) => logs.push(entry),
      });
      assert.equal(router.apply(buildTerminalInputEnvelope("worker-a", "sess-1", "a")), false);
      assert.equal(router.apply(buildTerminalInputEnvelope("worker-a", "sess-1", "b")), false);
      assert.equal(router.apply(buildTerminalInputEnvelope("worker-a", "sess-1", "c")), false);
      const misses = logs.filter((l) => l.code === "terminal-input-target-not-connected");
      assert.equal(misses.length, 1, "the miss is reported once per tuple, then silent");
      assert.equal(router.apply(buildTerminalInputEnvelope("worker-a", "sess-2", "d")), false);
      assert.equal(logs.filter((l) => l.code === "terminal-input-target-not-connected").length, 2, "a DIFFERENT tuple gets its own one report");
    },
  },

  // ── 2. the worker stream client's dispatch lane ──────────────────────────
  {
    name: "terminal-input/client: a terminal-input DOWN-frame dispatches to the registered onTerminalInput handler (the onDirective/onWithdraw lane)",
    async run() {
      let deliver = null;
      const transport = {
        onMessage(fn) { deliver = fn; },
        connect: async () => {},
        send: async () => {},
      };
      const client = createWorkerStreamClient({ nodeId: NODE_ID, workspaceId: "ws-1", transport });
      const received = [];
      client.onTerminalInput((frame) => received.push(frame));
      assert.ok(deliver, "the client registered its receive listener");
      deliver(JSON.stringify({ kind: TERMINAL_INPUT_KIND, to: NODE_ID, sessionId: "sess-1", bytes: "yes\r", at: NOW }));
      assert.equal(received.length, 1);
      assert.equal(received[0].sessionId, "sess-1");
      assert.equal(received[0].bytes, "yes\r");
      // A directive still routes to ITS lane, not this one.
      deliver(JSON.stringify({ kind: "directive", to: NODE_ID, assignmentId: "a1", itemRef: "35/00", workspaceId: "ws-1", at: NOW }));
      assert.equal(received.length, 1, "a directive frame never reaches the terminal-input handler");
    },
  },

  // ── 3. worker delivery over the REAL execution handler + driver + fake PTY ──
  {
    name: "terminal-input/worker: input for the CAPTURED session reaches the live PTY's term.write; a foreign session drops (logged once); a settled run drops (registry cleared)",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      await markRepoPublished(fx.root, { workspaceId: fx.workspaceId });
      await seedNodeWorkspaceMembership({ home: fx.home }, { nodeId: NODE_ID, workspaceId: fx.workspaceId });
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });
      const recorder = createStatusRecorder();
      const sessionId = "sess-input-live";

      // The fake PTY: capture the exit lever from the driver's own command write,
      // but DO NOT exit — the session stays live while input is injected.
      let exitLever = null;
      const which = createFakeWhich(["claude"]);
      const { spawn, ptys } = createFakePtySpawn({ onWrite: ({ emitExit }) => { exitLever = exitLever ?? emitExit; } });

      const handler = createMeshWorkerExecutionHandler({
        pushExec: scriptedPushExec(),
        loadWs: () => Promise.resolve(ws),
        nodeId: NODE_ID,
        sendAssignmentStatus: recorder.sendAssignmentStatus,
    sendEffectStep: recorder.sendEffectStep,
        now: () => NOW,
        globalWorkStoreOptions: { env: fx.env },
        ptySpawn: spawn,
        which,
        commandDelayMs: 10,
        watchTranscriptSessionId: async () => sessionId,
      });

      const logs = [];
      const inputHandler = createMeshWorkerTerminalInputHandler({ onLog: (entry) => logs.push(entry) });

      const running = handler({ kind: "directive", to: NODE_ID, assignmentId: "asg-input", itemRef: fx.itemRef, workspaceId: fx.workspaceId, at: NOW, command: "/aof:continue 35/00" });

      // Wait until the PTY is live AND the session binding exists (the driver's
      // command write proves the spawn; the binding lands when the injected
      // session-id watch resolves).
      await waitFor(() => exitLever != null && ptys.length === 1);
      await waitFor(() => {
        inputHandler({ kind: TERMINAL_INPUT_KIND, sessionId, bytes: "probe\r" });
        return ptys[0].writes.includes("probe\r");
      });

      // The real assertion: a routed answer reaches the live PTY verbatim.
      inputHandler({ kind: TERMINAL_INPUT_KIND, sessionId, bytes: "option 2\r" });
      assert.ok(ptys[0].writes.includes("option 2\r"), "input for the captured session reaches term.write");

      // A FOREIGN session id is a drop — logged once, never a write, never a redirect.
      const writesBefore = ptys[0].writes.length;
      inputHandler({ kind: TERMINAL_INPUT_KIND, sessionId: "sess-someone-else", bytes: "evil\r" });
      inputHandler({ kind: TERMINAL_INPUT_KIND, sessionId: "sess-someone-else", bytes: "evil2\r" });
      assert.equal(ptys[0].writes.length, writesBefore, "a foreign session id never writes any PTY");
      assert.equal(logs.filter((l) => l.code === "terminal-input" && /no live PTY/.test(l.message)).length, 1, "the foreign-session drop is logged ONCE, not per keystroke (delivery breadcrumbs are separate lines)");

      // Settle the run; the registry must clear — late input is a drop.
      exitLever(0);
      await running;
      const settledWrites = ptys[0].writes.length;
      inputHandler({ kind: TERMINAL_INPUT_KIND, sessionId, bytes: "too late\r" });
      assert.equal(ptys[0].writes.length, settledWrites, "input never reaches a PTY whose bracket has settled (registry cleared)");
    }),
  },

  // ── 4. the pending-question lane (the REAL completion watch) ─────────────
  {
    name: "69/05 task00 — a live AskUserQuestion fires onPendingInput once and parks immediately, without the idle window",
    async run() {
      const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-pending-question-"));
      try {
        const cwd = path.join(tmp, "project");
        await mkdir(cwd, { recursive: true });
        const env = { CLAUDE_CONFIG_DIR: path.join(tmp, "claude") };
        const projectsDir = claudeProjectsDir({ cwd, env });
        await mkdir(projectsDir, { recursive: true });
        const sessionId = "sess-pending-1";
        const file = path.join(projectsDir, `${sessionId}.jsonl`);
        await writeFile(file, `${JSON.stringify({ type: "assistant", message: { stop_reason: "tool_use", content: [{ type: "tool_use", name: "AskUserQuestion", input: { questions: [] } }] } })}\n`, "utf8");

        let pendingFired = 0;
        let clearedFired = 0;
        const start = Date.now();
        const watch = defaultWatchTranscriptCompletion({
          cwd, env, sessionId,
          pollMs: 10,
          declaredIdleMs: 40,
          idleMs: 600,
          onPendingInput: () => { pendingFired += 1; },
          onPendingInputCleared: () => { clearedFired += 1; },
        });

        const result = await settledOrFail(watch);
        assert.equal(pendingFired, 1, "the pending report fires ONCE per episode, not per poll tick");
        assert.equal(clearedFired, 0);
        assert.equal(result.outcome, "needs-input");
        assert.equal(result.declared, true);
        assert.equal(result.pending, true, "the settled outcome still says it was a live question");
        assert.ok(Date.now() - start < 500, "the visible block does not wait for idleMs");
      } finally {
        await rm(tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "69/05 task00 — a question whose answer is already present is not mistaken for a pending block",
    async run() {
      const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-pending-answered-"));
      try {
        const cwd = path.join(tmp, "project");
        await mkdir(cwd, { recursive: true });
        const env = { CLAUDE_CONFIG_DIR: path.join(tmp, "claude") };
        const projectsDir = claudeProjectsDir({ cwd, env });
        await mkdir(projectsDir, { recursive: true });
        const sessionId = "sess-pending-2";
        const file = path.join(projectsDir, `${sessionId}.jsonl`);
        await writeFile(file, `${JSON.stringify({ type: "assistant", message: { stop_reason: "tool_use", content: [{ type: "tool_use", name: "AskUserQuestion", input: {} }] } })}\n${JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", content: "option 2" }] } })}\n`, "utf8");

        let pendingFired = 0;
        let clearedFired = 0;
        const watch = defaultWatchTranscriptCompletion({
          cwd, env, sessionId,
          pollMs: 10,
          declaredIdleMs: 40,
          idleMs: 5000,
          onPendingInput: () => { pendingFired += 1; },
          onPendingInputCleared: () => { clearedFired += 1; },
        });

        await sleep(80);
        assert.equal(pendingFired, 0, "an answered question is not reported pending");
        assert.equal(clearedFired, 0, "there was no pending episode to clear");
        await appendFile(file, `${JSON.stringify({ type: "assistant", message: { stop_reason: "end_turn", content: [{ type: "text", text: `done.\n${DIRECTIVE_COMPLETE_SENTINEL}\n` }] } })}\n`, "utf8");
        const result = await settledOrFail(watch);
        assert.equal(result.outcome, "done", "after the answer the watch settles the REAL completion");
        assert.equal(result.declared, true);
        assert.equal(pendingFired, 0);
      } finally {
        await rm(tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "terminal-input/pending: the SENTINEL needs-input (turn ENDED on the protocol line) still settles after the short declared window — parking that turn is correct",
    async run() {
      const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-pending-sentinel-"));
      try {
        const cwd = path.join(tmp, "project");
        await mkdir(cwd, { recursive: true });
        const env = { CLAUDE_CONFIG_DIR: path.join(tmp, "claude") };
        const projectsDir = claudeProjectsDir({ cwd, env });
        await mkdir(projectsDir, { recursive: true });
        const sessionId = "sess-sentinel-1";
        const file = path.join(projectsDir, `${sessionId}.jsonl`);
        await writeFile(file, `${JSON.stringify({ type: "assistant", message: { stop_reason: "end_turn", content: [{ type: "text", text: `I need a decision.\n${NEEDS_INPUT_SENTINEL}\n` }] } })}\n`, "utf8");

        let pendingFired = 0;
        const start = Date.now();
        const result = await defaultWatchTranscriptCompletion({
          cwd, env, sessionId,
          pollMs: 10,
          declaredIdleMs: 40,
          idleMs: 60_000,
          onPendingInput: () => { pendingFired += 1; },
        });
        assert.ok(Date.now() - start < 10_000, "the sentinel lane settles on the SHORT window (nowhere near idleMs)");
        assert.equal(result.outcome, "needs-input");
        assert.equal(result.declared, true);
        assert.notEqual(result.pending, true, "an ended turn is NOT a live question");
        assert.equal(pendingFired, 0, "the pending report is for LIVE questions only");
      } finally {
        await rm(tmp, { recursive: true, force: true });
      }
    },
  },

  // ── 5. the `code` column rides the status frame verbatim ─────────────────
  {
    name: "terminal-input/code: applyAssignmentStatusFrame persists the status-refinement code per frame — set by needs-input, CLEARED by the next code-less frame; sessionId keeps its absent-is-not-a-clear",
    async run() {
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-code-column-"));
      try {
        const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
        try {
          const record = assembleAssignmentRecord({ itemRef: "35/00", workspaceId: "ws-1", targetNodeId: NODE_ID, issuer: "control-a", now: NOW });
          insertAssignment(store, record);

          await applyAssignmentStatusFrame(store, { kind: "assignment-status", nodeId: NODE_ID, assignmentId: record.assignmentId, state: "running", runId: "run-1", sessionId: "sess-1", at: NOW }, { nodeId: NODE_ID, now: NOW });
          assert.equal(readAssignment(store, record.assignmentId).code, null, "a plain running frame carries no code");

          await applyAssignmentStatusFrame(store, { kind: "assignment-status", nodeId: NODE_ID, assignmentId: record.assignmentId, state: "running", runId: "run-1", code: "needs-input", at: NOW }, { nodeId: NODE_ID, now: NOW });
          const waiting = readAssignment(store, record.assignmentId);
          assert.equal(waiting.code, "needs-input", "the needs-input frame sets the code");
          assert.equal(waiting.sessionId, "sess-1", "a code-carrying frame WITHOUT a sessionId never erases the captured one");

          await applyAssignmentStatusFrame(store, { kind: "assignment-status", nodeId: NODE_ID, assignmentId: record.assignmentId, state: "running", runId: "run-1", at: NOW }, { nodeId: NODE_ID, now: NOW });
          const cleared = readAssignment(store, record.assignmentId);
          assert.equal(cleared.code, null, "the next code-less frame CLEARS the code — verbatim per frame, the answered question stops reading as waiting");
          assert.equal(cleared.sessionId, "sess-1");
        } finally {
          store.close?.();
        }
      } finally {
        await rm(home, { recursive: true, force: true });
      }
    },
  },

  // ── 6. the RESUME lane (m42 quick-fix: `aof mesh terminal-resume`) ───────
  {
    name: "terminal-resume/router: a valid resume envelope routes DOWN the holder's stream with its worktree-resolution context; a context-less one drops with a coded warn",
    async run() {
      const dispatched = [];
      const logs = [];
      const router = createTerminalInputRouter({
        dispatchDirective: (d) => { dispatched.push(d); return { sent: true }; },
        now: () => NOW,
        onLog: (entry) => logs.push(entry),
      });
      const ok = router.apply(buildTerminalResumeEnvelope("worker-a", {
        sessionId: "sess-1",
        assignmentId: "asg-1",
        workspaceId: "ws-1",
        itemRef: "18",
        reservedAt: NOW,
        previousNodeId: "worker-a",
        parkId: "park-1",
      }));
      assert.equal(ok, true);
      assert.deepEqual(dispatched, [{
        kind: TERMINAL_RESUME_KIND,
        to: "worker-a",
        sessionId: "sess-1",
        assignmentId: "asg-1",
        workspaceId: "ws-1",
        itemRef: "18",
        reservedAt: NOW,
        targetNodeId: "worker-a",
        previousNodeId: "worker-a",
        parkId: "park-1",
        at: NOW,
      }]);
      assert.equal(router.apply(buildTerminalResumeEnvelope("worker-a", { sessionId: "sess-1" })), false, "no assignment/workspace context — dropped");
      assert.ok(logs.some((l) => l.code === "terminal-resume-invalid"), "the context-less drop is a coded warn");
      assert.equal(dispatched.length, 1);
    },
  },
  {
    name: "terminal-resume/client: a terminal-resume DOWN-frame dispatches to the registered onTerminalResume handler",
    async run() {
      let deliver = null;
      const transport = { onMessage(fn) { deliver = fn; }, connect: async () => {}, send: async () => {} };
      const client = createWorkerStreamClient({ nodeId: NODE_ID, workspaceId: "ws-1", transport });
      const received = [];
      client.onTerminalResume((frame) => received.push(frame));
      deliver(JSON.stringify({ kind: TERMINAL_RESUME_KIND, to: NODE_ID, sessionId: "sess-1", assignmentId: "asg-1", workspaceId: "ws-1", itemRef: "18", parkId: "park-1", at: NOW }));
      assert.equal(received.length, 1);
      assert.equal(received[0].assignmentId, "asg-1");
    },
  },
  {
    name: "69/05 task01 — a resume CONTINUES the parked run, revives its row, keeps the resumed id live from the first byte, and settles that same record; missing worktree / already-live are logged no-ops",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });
      const oldSessionId = "sess-resume-old";
      const assignmentId = "asg-resume-1";
      const worktreePath = meshWorktreePath(fx.root, assignmentId);
      await mkdir(worktreePath, { recursive: true });
      const driverEnv = { ...process.env, CLAUDE_CONFIG_DIR: path.join(fx.tmp, "claude-resume-one") };
      const transcriptDir = claudeProjectsDir({ cwd: worktreePath, env: driverEnv });
      await mkdir(transcriptDir, { recursive: true });
      await writeFile(path.join(transcriptDir, `${oldSessionId}.jsonl`), "", "utf8");
      const item = await findWork(fx.workDir, fx.itemRef).then((m) => m.find((r) => r.ref === fx.itemRef));
      const parked = await startRun(item, { now: NOW, sessionId: oldSessionId, brief: { assignmentId, itemRef: fx.itemRef } });

      const { spawn, spawnCalls, ptys } = createFakePtySpawn({});
      const logs = [];
      const recorder = createStatusRecorder();
      let completionResolve = null;
      const resumeHandler = createMeshWorkerTerminalResumeHandler({
        loadWs: () => Promise.resolve(ws),
        globalWorkStoreOptions: { env: fx.env },
        nodeId: NODE_ID,
        now: () => NOW,
        onLog: (entry) => logs.push(entry),
        onOutputChunk: () => {},
        onSessionEnd: () => {},
        sendAssignmentStatus: recorder.sendAssignmentStatus,
    sendEffectStep: recorder.sendEffectStep,
        ptySpawn: spawn,
        which: createFakeWhich(["claude"]),
        env: driverEnv,
        commandDelayMs: 0,
        livenessIntervalMs: 0,
        watchTranscriptCompletion: () => new Promise((resolve) => { completionResolve = resolve; }),
      });
      const inputHandler = createMeshWorkerTerminalInputHandler({ onLog: () => {} });

      // A missing worktree refuses before any spawn or run mint.
      await resumeHandler({ sessionId: "sess-gone", assignmentId: "asg-gone", workspaceId: fx.workspaceId, itemRef: fx.itemRef, parkId: "park-gone" });
      assert.equal(spawnCalls.length, 0, "no worktree, no spawn");
      assert.ok(logs.some((l) => l.level === "warn" && /worktree is gone/.test(l.message)));

      // The real resume, driven through the REAL driver. No session-id watch is
      // injected: the bracket must KNOW the id (claude --resume keeps it) — a
      // derived-id design left the live session invisible (measured 2026-07-27).
      const running = resumeHandler({ sessionId: oldSessionId, assignmentId, workspaceId: fx.workspaceId, itemRef: fx.itemRef, parkId: "park-resume-1" });
      await waitFor(() => spawnCalls.length === 1);
      assert.ok(spawnCalls[0].args.includes("--resume") && spawnCalls[0].args.includes(oldSessionId), "the spawn carries --resume <sessionId>");
      assert.equal(spawnCalls[0].options.cwd, worktreePath, "the PTY runs IN the assignment's retained worktree");

      // The row revives (running + code resumed) and the RESUMED id is on the
      // frames immediately — the tuple the row (and any open tab) already holds.
      await waitFor(() => recorder.frames.some((f) => f.state === "running" && f.sessionId === oldSessionId));
      assert.equal(recorder.frames[0].state, "running");
      assert.equal(recorder.frames[0].code, "resumed", "the revival frame carries the sanctioned resume code");

      // Input binds under the RESUMED id, live from spawn.
      await waitFor(() => {
        inputHandler({ kind: TERMINAL_INPUT_KIND, sessionId: oldSessionId, bytes: "carry on\r" });
        return ptys[0].writes.includes("carry on\r");
      });

      // A second resume while live is a no-op (never a second run/PTY).
      await resumeHandler({ sessionId: oldSessionId, assignmentId, workspaceId: fx.workspaceId, itemRef: fx.itemRef, parkId: "park-resume-1" });
      assert.equal(spawnCalls.length, 1, "already-live resume never double-spawns");
      assert.ok(logs.some((l) => /already has a live session/.test(l.message)));

      // Completion settles the RUN RECORD and the ROW — like any run.
      // Wait for the driver to have REACHED its completion watch before resolving it:
      // `completionResolve` is assigned inside `watchTranscriptCompletion`, and nothing
      // above this point orders that assignment before here. Its sibling lane below
      // guards the same call the same way; without the guard this lane throws
      // "completionResolve is not a function" on the losing side of the race.
      await waitFor(() => completionResolve != null);
      completionResolve({ outcome: "done" });
      await running;
      const doneFrame = recorder.frames.at(-1);
      assert.equal(doneFrame.state, "done");
      assert.equal(doneFrame.sessionId, oldSessionId);
      const runs = await readRuns(item);
      const resumedRun = runs.find((r) => r.runId === parked.runId);
      assert.ok(resumedRun, "the parked run record remains the one record");
      assert.equal(resumedRun.state, "done", "the run record settled with the session");
      assert.equal(runs.length, 1, "resume minted no second run record");

      // …and the registries are swept.
      const writesAfter = ptys[0].writes.length;
      inputHandler({ kind: TERMINAL_INPUT_KIND, sessionId: oldSessionId, bytes: "too late\r" });
      assert.equal(ptys[0].writes.length, writesAfter, "input never reaches a settled resume (registry swept)");
    }),
  },
  {
    name: "terminal-resume/worker: a resume that PARKED needs-input resumes AGAIN as the SAME run — the paused record continues (same runId), never a second record into the duplicate-run wall",
    run: async () => withMeshWorkerExecFixture(async (fx) => {
      const ws = await loadWorkspace(fx.root, undefined, { env: fx.env });
      const assignmentId = "asg-repark-1";
      const worktreePath = meshWorktreePath(fx.root, assignmentId);
      await mkdir(worktreePath, { recursive: true });
      const driverEnv = { ...process.env, CLAUDE_CONFIG_DIR: path.join(fx.tmp, "claude-resume-twice") };
      const transcriptDir = claudeProjectsDir({ cwd: worktreePath, env: driverEnv });
      await mkdir(transcriptDir, { recursive: true });
      await writeFile(path.join(transcriptDir, "sess-old-a.jsonl"), "", "utf8");
      const item = await findWork(fx.workDir, fx.itemRef).then((m) => m.find((r) => r.ref === fx.itemRef));
      const parked = await startRun(item, { now: NOW, sessionId: "sess-old-a", brief: { assignmentId, itemRef: fx.itemRef } });

      const { spawn, spawnCalls } = createFakePtySpawn({});
      const recorder = createStatusRecorder();
      const logs = [];
      let completionResolve = null;
      const resumeHandler = createMeshWorkerTerminalResumeHandler({
        loadWs: () => Promise.resolve(ws),
        globalWorkStoreOptions: { env: fx.env },
        nodeId: NODE_ID,
        now: () => NOW,
        onLog: (entry) => logs.push(entry),
        onOutputChunk: () => {},
        onSessionEnd: () => {},
        sendAssignmentStatus: recorder.sendAssignmentStatus,
    sendEffectStep: recorder.sendEffectStep,
        ptySpawn: spawn,
        which: createFakeWhich(["claude"]),
        env: driverEnv,
        commandDelayMs: 0,
        livenessIntervalMs: 0,
        watchTranscriptCompletion: () => new Promise((resolve) => { completionResolve = resolve; }),
      });

      // First resume → parks needs-input again: the same record stays RUNNING.
      const first = resumeHandler({ sessionId: "sess-old-a", assignmentId, workspaceId: fx.workspaceId, itemRef: fx.itemRef, parkId: "park-a" });
      await waitFor(() => completionResolve != null && recorder.frames.length >= 1);
      const mintedRunId = recorder.frames[0].runId;
      assert.equal(mintedRunId, parked.runId, "the first resume already continues the parked run");
      completionResolve({ outcome: "needs-input" });
      await first;
      assert.ok(recorder.frames.some((f) => f.state === "running" && f.code === "needs-input"), "the park reported needs-input");
      assert.equal((await readRuns(item)).find((r) => r.runId === mintedRunId)?.state, "running", "the parked run record stays running — the run paused, it did not end");

      // Second resume → CONTINUES the same run: same runId, no duplicate-run wall.
      completionResolve = null;
      const second = resumeHandler({ sessionId: "sess-old-a", assignmentId, workspaceId: fx.workspaceId, itemRef: fx.itemRef, parkId: "park-b" });
      await waitFor(() => spawnCalls.length === 2 && completionResolve != null);
      assert.ok(logs.some((l) => /continuing PAUSED run/.test(l.message)), "the continuation is logged as the same run resuming");
      const revival = recorder.frames.filter((f) => f.code === "resumed").at(-1);
      assert.equal(revival.runId, mintedRunId, "the revival frame carries the SAME runId — one run, paused and resumed");
      completionResolve({ outcome: "done" });
      await second;
      assert.equal((await readRuns(item)).find((r) => r.runId === mintedRunId)?.state, "done", "completion settles the ONE record");
      assert.equal((await readRuns(item)).filter((r) => r.brief?.assignmentId === assignmentId).length, 1, "one assignment, one run record — never a duplicate");
    }),
  },
  {
    name: "terminal-resume/baseline: the completion watch IGNORES the pre-resume transcript tail (the stale parked sentinel killed every resume ~12s in) and settles only on POST-resume records",
    async run() {
      const tmp = await mkdtemp(path.join(os.tmpdir(), "aof-resume-baseline-"));
      try {
        const cwd = path.join(tmp, "wt");
        await mkdir(cwd, { recursive: true });
        const env = { CLAUDE_CONFIG_DIR: path.join(tmp, "claude") };
        const projectsDir = claudeProjectsDir({ cwd, env });
        await mkdir(projectsDir, { recursive: true });
        const sessionId = "sess-stale-tail";
        const file = path.join(projectsDir, `${sessionId}.jsonl`);
        // The PRE-resume history: the session parked on the sentinel this morning.
        await writeFile(file, `${JSON.stringify({ type: "assistant", message: { stop_reason: "end_turn", content: [{ type: "text", text: `blocked.\n${NEEDS_INPUT_SENTINEL}\n` }] } })}\n`, "utf8");
        const { size: sinceOffset } = await (await import("node:fs/promises")).stat(file);

        let settled = null;
        const watch = defaultWatchTranscriptCompletion({
          cwd, env, sessionId,
          pollMs: 10, declaredIdleMs: 30, idleMs: 60_000,
          sinceOffset,
        }).then((result) => { settled = result; return result; });

        // The stale tail must NOT settle the watch — the resumed session is alive.
        await sleep(150);
        assert.equal(settled, null, "the pre-resume sentinel is HISTORY, not a verdict — the fresh PTY must not be killed");

        // A POST-resume completion settles normally.
        await appendFile(file, `${JSON.stringify({ type: "assistant", message: { stop_reason: "end_turn", content: [{ type: "text", text: `carried on and finished.\n${DIRECTIVE_COMPLETE_SENTINEL}\n` }] } })}\n`, "utf8");
        const result = await settledOrFail(watch);
        assert.equal(result.outcome, "done", "a record written AFTER the resume is the real outcome");
        assert.equal(result.declared, true);
      } finally {
        await rm(tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "terminal-input/launch-env: a worker session's env is SCRUBBED of the IDE-attachment vector (CLAUDE_CODE_SSE_PORT / TERM_PROGRAM / VSCODE_*) — a daemon-spawned claude must never attach to a human's editor",
    async run() {
      const { resolveInteractiveDriverLaunch } = await import("../../../src/mesh/worker-execution.mjs");
      const launch = resolveInteractiveDriverLaunch("claude", {
        which: createFakeWhich(["claude"]),
        env: {
          PATH: "/usr/bin",
          HOME: "/Users/op",
          CLAUDE_CODE_SSE_PORT: "45064",
          TERM_PROGRAM: "vscode",
          TERM_PROGRAM_VERSION: "1.130.0",
          VSCODE_GIT_IPC_HANDLE: "/tmp/vscode-git.sock",
          VSCODE_INJECTION: "1",
        },
      });
      assert.ok(launch, "the launch resolves");
      assert.equal(launch.env.CLAUDE_CODE_SSE_PORT, undefined, "the IDE SSE port never reaches a worker session (measured live: it attached the session to the operator's VS Code and killed pty stdin)");
      assert.equal(launch.env.TERM_PROGRAM, undefined);
      assert.equal(launch.env.TERM_PROGRAM_VERSION, undefined);
      assert.ok(Object.keys(launch.env).every((k) => !k.startsWith("VSCODE_")), "no VSCODE_* var survives");
      assert.equal(launch.env.PATH, "/usr/bin", "non-IDE env rides through untouched");
      assert.equal(launch.env.HOME, "/Users/op");
      assert.ok(typeof launch.env.AOF_TERMINAL_SESSION === "string", "the provider's own session env is intact");
    },
  },
  {
    name: "terminal-resume/apply-seam: `running` + code `resumed` from the HOLDER revives a FAILED row — and ONLY that (no code stays refused; withdrawn stays terminal)",
    async run() {
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-resume-revival-"));
      try {
        const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
        try {
          const mkFailedRow = () => {
            const record = assembleAssignmentRecord({ itemRef: "18", workspaceId: "ws-1", targetNodeId: NODE_ID, issuer: "control-a", now: NOW });
            insertAssignment(store, record);
            updateAssignmentState(store, record.assignmentId, "failed", { now: NOW });
            return record.assignmentId;
          };

          const revivable = mkFailedRow();
          const revived = await applyAssignmentStatusFrame(store, { kind: "assignment-status", nodeId: NODE_ID, assignmentId: revivable, state: "running", runId: "run-r1", code: "resumed", at: NOW }, { nodeId: NODE_ID, now: NOW });
          assert.equal(revived.applied, true, "the sanctioned revival applies");
          assert.equal(readAssignment(store, revivable).state, "running");
          assert.equal(readAssignment(store, revivable).code, "resumed");

          const stale = mkFailedRow();
          const refused = await applyAssignmentStatusFrame(store, { kind: "assignment-status", nodeId: NODE_ID, assignmentId: stale, state: "running", runId: "run-r2", at: NOW }, { nodeId: NODE_ID, now: NOW });
          assert.equal(refused.skipped, true, "a code-less running frame on a failed row is still the stale-frame class — refused");
          assert.equal(refused.code, "assignment-status-already-terminal");

          const withdrawnId = mkFailedRow();
          updateAssignmentState(store, withdrawnId, "withdrawn", { now: NOW });
          const stillTerminal = await applyAssignmentStatusFrame(store, { kind: "assignment-status", nodeId: NODE_ID, assignmentId: withdrawnId, state: "running", runId: "run-r3", code: "resumed", at: NOW }, { nodeId: NODE_ID, now: NOW });
          assert.equal(stillTerminal.skipped, true, "a WITHDRAWN row does not revive — the operator's own decision stands");

          const notHolder = mkFailedRow();
          const wrongNode = await applyAssignmentStatusFrame(store, { kind: "assignment-status", nodeId: "worker-b", assignmentId: notHolder, state: "running", runId: "run-r4", code: "resumed", at: NOW }, { nodeId: "worker-b", now: NOW });
          assert.equal(wrongNode.skipped, true, "the revival is still holder-only (T6)");
          assert.equal(wrongNode.code, "assignment-status-not-holder");
        } finally {
          store.close?.();
        }
      } finally {
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "terminal-resume/cli: resolves the session's assignment from the store, pushes the envelope to the holder (or --node override); unknown session and unconfigured relay refuse loudly",
    async run() {
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-resume-cli-"));
      try {
        const store = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
        let assignmentId;
        try {
          const record = assembleAssignmentRecord({ itemRef: "18", workspaceId: "ws-1", targetNodeId: "umamis-mac-mini", issuer: "control-a", now: NOW });
          insertAssignment(store, record);
          updateAssignmentState(store, record.assignmentId, "running", { now: NOW, runId: "run-17", sessionId: "sess-89d1", code: "needs-input" });
          assignmentId = record.assignmentId;
        } finally {
          store.close?.();
        }

        const pushed = [];
        const ctx = {
          workspace: { config: { work: { dispatch: { concurrency: 1 } } } },
          globalWorkStoreOptions: { env: { AOF_GLOBAL_HOME: home } },
          createTerminalResumePush: () => ({ push: async (envelope) => { pushed.push(envelope); }, close() {} }),
          // Nothing worker-side runs in this unit — the confirm poll must give up
          // fast and report honestly (dispatched, NOT confirmed).
          confirmTimeoutMs: 50,
        };
        const result = await meshTerminalResumeCommand.run({ session: "sess-89d1" }, ctx);
        assert.equal(result.ok, true);
        assert.equal(result.confirmed, false, "no worker moved the row — the CLI must NOT claim success (the fire-and-forget lie, measured twice live)");
        assert.equal(result.node, "umamis-mac-mini", "the holder comes from the assignment row");
        assert.equal(result.assignmentId, assignmentId);
        assert.equal(pushed[0].kind, TERMINAL_RESUME_KIND);
        assert.equal(pushed[0].nodeId, "umamis-mac-mini");
        assert.equal(pushed[0].signal.sessionId, "sess-89d1");
        assert.equal(pushed[0].signal.assignmentId, assignmentId);
        assert.equal(pushed[0].signal.workspaceId, "ws-1");
        assert.equal(pushed[0].signal.itemRef, "18");
        assert.equal(pushed[0].signal.previousNodeId, "umamis-mac-mini");
        assert.equal(typeof pushed[0].signal.reservedAt, "string");
        assert.match(pushed[0].signal.parkId, new RegExp(`^assignment-park:${assignmentId}:`, "u"), "a legacy parked row still receives a durable row-version identity");
        let probe = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
        try {
          assert.equal(readAssignment(probe, assignmentId).code, "resumed", "an ambiguous timeout keeps the counted reservation");
          restoreParkedAssignmentResume(probe, assignmentId, {
            reservedAt: pushed[0].signal.reservedAt,
            reservedTargetNodeId: "umamis-mac-mini",
            previousTargetNodeId: "umamis-mac-mini",
            now: "2026-08-22T10:00:01.000Z",
          });
        } finally { probe.close?.(); }

        const overrideCtx = {
          ...ctx,
          createTerminalResumePush: () => ({
            async push(envelope) {
              pushed.push(envelope);
              const ack = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
              try { updateAssignmentState(ack, assignmentId, "running", { now: "2099-01-01T00:00:00.000Z", code: "resumed" }); }
              finally { ack.close?.(); }
            },
            close() {},
          }),
        };
        const overridden = await meshTerminalResumeCommand.run({ session: "sess-89d1", node: "other-node" }, overrideCtx);
        assert.equal(overridden.node, "other-node", "--node overrides the row's holder");
        assert.equal(overridden.confirmed, true);
        probe = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
        try {
          assert.equal(readAssignment(probe, assignmentId).targetNodeId, "other-node", "assignment attribution follows the actual resume destination");
          updateAssignmentState(probe, assignmentId, "running", { now: "2099-01-01T00:00:01.000Z", code: "needs-input" });
        } finally { probe.close?.(); }

        // Feed a real running producer row into the shared scheduler count. At
        // bound=1 the parked row remains needs-input and no third envelope leaves.
        probe = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
        let occupyingId;
        try {
          const occupying = assembleAssignmentRecord({ itemRef: "19", workspaceId: "ws-1", targetNodeId: "other-node", issuer: "control-a", now: NOW });
          insertAssignment(probe, occupying);
          updateAssignmentState(probe, occupying.assignmentId, "running", { now: new Date().toISOString(), runId: "run-busy", code: null });
          occupyingId = occupying.assignmentId;
        } finally { probe.close?.(); }
        await assert.rejects(
          () => meshTerminalResumeCommand.run({ session: "sess-89d1" }, ctx),
          (error) => error.code === "resume-capacity-full" && /1\/1/u.test(error.message),
          "resume admission consumes the scheduler's real counted set before changing the park",
        );
        assert.equal(pushed.length, 2, "a full actual target receives no resume envelope");
        probe = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
        try {
          assert.equal(readAssignment(probe, assignmentId).code, "needs-input", "the answer stays parked for a later slot");
          probe.db.prepare("DELETE FROM global_assignments WHERE assignment_id = ?").run(occupyingId);
        } finally { probe.close?.(); }

        // Only running/needs-input is resumable. Ordinary running and terminal
        // rows reject before another relay frame, naming the linked run context.
        probe = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
        try {
          updateAssignmentState(probe, assignmentId, "running", { now: new Date().toISOString(), code: null });
        } finally { probe.close?.(); }
        await assert.rejects(
          () => meshTerminalResumeCommand.run({ session: "sess-89d1" }, ctx),
          (error) => error.code === "session-not-parked" && /run run-17/u.test(error.message),
          "an ordinary-running stale answer is rejected with run context",
        );

        probe = await openGlobalWorkProjectionStore({ env: { AOF_GLOBAL_HOME: home } });
        try {
          updateAssignmentState(probe, assignmentId, "done", { now: new Date().toISOString(), code: null });
        } finally { probe.close?.(); }
        await assert.rejects(
          () => meshTerminalResumeCommand.run({ session: "sess-89d1" }, ctx),
          (error) => error.code === "session-not-parked" && /state done.*run run-17/u.test(error.message),
          "a settled answer is rejected cleanly with run context",
        );

        await assert.rejects(
          () => meshTerminalResumeCommand.run({ session: "sess-nobody" }, ctx),
          (error) => error.code === "session-unknown",
          "a session no assignment captured refuses loudly",
        );
        await assert.rejects(
          () => meshTerminalResumeCommand.run({ session: "sess-89d1" }, { ...ctx, createTerminalResumePush: () => null }),
          (error) => error.code === "relay-unconfigured",
          "no loopback relay here (not the control node) refuses loudly",
        );
      } finally {
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  // 131/04 — hoisted below.
  ...resumeAnswerRouterTests(),
];

// ---- 131/04 task 03 — the control router forwards the answer on the DOWN frame, unlogged ---------
function resumeAnswerRouterTests() {
  const BY = { actor: "umami", via: "board", node: "node-7297" };
  const A = { text: "zq-answer-marker", by: BY, askedAt: null };
  const FIELDS = { sessionId: "sess-1", assignmentId: "asg-1", workspaceId: "ws-1", itemRef: "18", reservedAt: NOW, previousNodeId: "worker-a", parkId: "park-1" };
  const ELEVEN = {
    kind: TERMINAL_RESUME_KIND, to: "worker-a", sessionId: "sess-1", assignmentId: "asg-1", workspaceId: "ws-1", itemRef: "18",
    reservedAt: NOW, targetNodeId: "worker-a", previousNodeId: "worker-a", parkId: "park-1", at: NOW,
  };
  // The envelope as the relay carries it: `signal.answer` set to exactly what a case names, even a
  // shape the builder would never make.
  const envelopeWith = (answer) => {
    const envelope = buildTerminalResumeEnvelope("worker-a", FIELDS);
    return answer === undefined ? envelope : { ...envelope, signal: { ...envelope.signal, answer } };
  };
  const routerFor = (sent = true) => {
    const dispatched = [];
    const logs = [];
    const router = createTerminalInputRouter({
      dispatchDirective: (frame) => { dispatched.push(frame); return { sent }; },
      now: () => NOW,
      onLog: (entry) => logs.push(entry),
    });
    return { router, dispatched, logs };
  };
  return [
    {
      name: "131/04 task03 — the control router forwards the answer on the DOWN frame and does not log it",
      run() {
        const { router, dispatched, logs } = routerFor();
        assert.equal(router.apply(envelopeWith({ text: "take b", by: BY, askedAt: null })), true);
        assert.equal(router.apply(envelopeWith(undefined)), true);
        assert.deepEqual(dispatched[0], { ...ELEVEN, answer: { text: "take b", by: BY, askedAt: null } }, "today's eleven keys plus answer");
        assert.deepEqual(dispatched[1], ELEVEN, "without answer, today's eleven-key frame exactly");
        assert.equal(JSON.stringify(dispatched[1]), JSON.stringify(ELEVEN), "…byte for byte, in order");
        assert.ok(logs.length > 0, "the router did log its resume lines");
        for (const entry of logs) assert.ok(!entry.message.includes("take b"), "no log line contains the answer");
      },
    },
    {
      name: "131/04 task03 — the router forwards a usable answer, drops any other, and never refuses the frame for it (ten rows)",
      run() {
        const rows = [
          [A, A],
          [{ text: "zq-answer-marker" }, { text: "zq-answer-marker", by: null, askedAt: null }],
          [{ ...A, extra: "x" }, A],
          [{ text: "   ", by: BY, askedAt: null }, { text: "   ", by: BY, askedAt: null }],
          [{ text: "", by: BY, askedAt: null }, null],
          [{ text: 42, by: BY }, null],
          [{ by: BY, askedAt: null }, null],
          ["zq-answer-marker", null],
          [null, null],
          [["zq-answer-marker"], null],
        ];
        for (const [index, [answer, expected]] of rows.entries()) {
          const { router, dispatched, logs } = routerFor();
          assert.equal(router.apply(envelopeWith(answer)), true, `row ${index}: apply answers true`);
          assert.equal(dispatched.length, 1, `row ${index}: one frame`);
          assert.deepEqual(dispatched[0], expected == null ? ELEVEN : { ...ELEVEN, answer: expected }, `row ${index}: the frame`);
          const offline = routerFor(false);
          offline.router.apply(envelopeWith(answer));
          for (const entry of [...logs, ...offline.logs]) assert.ok(!entry.message.includes("zq-answer-marker"), `row ${index}: no log line contains the marker`);
          assert.ok(offline.logs.some((entry) => entry.code === "terminal-resume-target-not-connected"), `row ${index}: the not-connected line was logged`);
        }
      },
    },
  ];
}
