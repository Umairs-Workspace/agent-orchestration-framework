import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRuntimeSession, createClaudeSessionAdapter } from "../src/runtime-session.mjs";
import { defaultSessionDriver } from "aof/session-services";
import { PHASE_BRIEF_MAX_CHARS } from "@aof/work/phase-brief";
import { createFakePtySpawn, createFakeWhich } from "../../../test/support/mesh-worker-terminal-fixture.mjs";

const contextText = "bounded phase context";
const brief = { itemRef: "154/00", worktreeCwd: "/tmp/aof-runtime-fixture", command: "/aof:continue 154/00 --solo",
  context: { itemRef: "154/00", phase: "continue", sections: [], truncated: false, dropped: [], notice: null,
    chars: contextText.length, ceiling: PHASE_BRIEF_MAX_CHARS, text: contextText } };
const nextTick = () => new Promise(resolve => setImmediate(resolve));
const door = () => ({ feed() {}, dispose() {}, markPaste() {}, evidence: async () => null });
const blockingQuestion = "Decision needed: Proceed?\nOptions: yes / no\nI would pick: yes\nWhat the answer changes: next task";

async function claudeFixture(kind, neutral) {
  const pty = createFakePtySpawn({ onWrite: ({ emitData, emitExit }) => {
    if (kind === "done") emitExit(0);
    if (kind === "failed") emitExit(1);
    if (kind === "question") emitData(`${blockingQuestion}\n${defaultSessionDriver.agentSessionDriver.NEEDS_INPUT_SENTINEL}\n`);
    if (kind === "cancelled") controller.abort();
  } });
  const controller = new AbortController();
  const options = { ptySpawn: pty.spawn, which: createFakeWhich(), commandDelayMs: 0,
    openSessionScreen: door, watchTranscriptSessionId: async () => "native-154", watchTranscriptCompletion: async () => null,
    signal: controller.signal, ...(kind === "timeout" ? { deadlinePolicy: { startToCloseMs: 20 } } : {}) };
  const runtime = createRuntimeSession({ adapters: { claude: createClaudeSessionAdapter({
    driveInteractiveClaudeSession: defaultSessionDriver.agentSessionDriver.driveInteractiveClaudeSession,
  }) } });
  const result = neutral ? runtime.drive(brief, options) : defaultSessionDriver.agentSessionDriver.driveInteractiveClaudeSession(brief, options);
  const settled = await result;
  assert.ok(pty.ptys[0].killed, "owned PTY is cleaned up");
  return { settled, input: pty.ptys[0].writes, argv: pty.spawnCalls[0].args };
}

export const runtimeSessionTests = [
  ...["done", "failed", "question", "cancelled", "timeout"].map(kind => ({
    name: `154/00 task00 — Claude compatibility: ${kind}`,
    run: async () => {
      const legacy = await claudeFixture(kind, false);
      const neutral = await claudeFixture(kind, true);
      const { question, ...compatibleResult } = neutral.settled;
      assert.deepEqual({ ...neutral, settled: compatibleResult }, legacy);
      if (kind === "question") assert.equal(question, blockingQuestion);
      assert.equal(neutral.settled.sessionId, "native-154");
      assert.equal(neutral.settled.outcome, kind === "done" ? "done" : kind === "question" ? "needs-input" : "failed");
      if (kind === "cancelled" || kind === "timeout") assert.equal(neutral.settled.failureReason, kind);
      if (kind === "done") assert.ok(neutral.input[0].includes(brief.command) && neutral.input[0].includes(contextText));
    },
  })),
  {
    name: "154/00 task01 — Claude blocking question is durable before needs-input settles",
    run: async () => {
      let release;
      const waiting = new Promise(resolve => { release = resolve; });
      const pty = createFakePtySpawn({ onWrite: ({ emitData }) => emitData(`${blockingQuestion}\n${defaultSessionDriver.agentSessionDriver.NEEDS_INPUT_SENTINEL}\n`) });
      let published;
      let settled = false;
      const result = defaultSessionDriver.runtimeSession.drive(brief, { ptySpawn: pty.spawn, which: createFakeWhich(),
        commandDelayMs: 0, openSessionScreen: door, watchTranscriptSessionId: async () => "native-question-154",
        watchTranscriptCompletion: async () => null, onQuestion: async question => { published = question; await waiting; },
      }).then(value => { settled = true; return value; });
      while (published == null) await nextTick();
      assert.equal(published, blockingQuestion);
      assert.equal(settled, false);
      release();
      assert.equal((await result).question, blockingQuestion);
      assert.ok(pty.ptys[0].killed);
    },
  },
  {
    name: "154/00 task00 — Claude native availability is checked without unsafe transcript paths",
    run: async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-154-resume-"));
      try {
        const runtime = createRuntimeSession({ adapters: { claude: createClaudeSessionAdapter({ driveInteractiveClaudeSession: assert.fail,
          claudeProjectsDir: () => dir }) } });
        await writeFile(path.join(dir, "native-154.jsonl"), "{}");
        assert.equal(await runtime.canResume("claude", "native-154", { cwd: dir }), true);
        assert.equal(await runtime.canResume("claude", "missing", { cwd: dir }), false);
        assert.equal(await runtime.canResume("claude", "../native-154", { cwd: dir }), false);
      } finally { await rm(dir, { recursive: true, force: true }); }
    },
  },
  {
    name: "154/00 task01 — a queued identity is not delivered twice at terminal settlement",
    run: async () => {
      let release;
      const waiting = new Promise(resolve => { release = resolve; });
      const identities = [];
      const runtime = createRuntimeSession({ adapters: { fixture: { drive: async (_brief, options) => {
        options.onActivity({ type: "output" });
        options.onIdentity("native-154");
        return { outcome: "done", sessionId: "native-154" };
      } } } });
      const result = runtime.drive(brief, { runtime: "fixture", onActivity: () => waiting, onIdentity: id => identities.push(id) });
      await nextTick();
      release();
      await result;
      assert.deepEqual(identities, ["native-154"]);
    },
  },
  {
    name: "154/00 task00 — unsupported runtime is refused before spawn",
    run: async () => {
      const runtime = createRuntimeSession({ adapters: { claude: { drive: assert.fail } } });
      assert.deepEqual(await runtime.drive(brief, { runtime: "unknown-assistant" }), {
        outcome: "failed", failureReason: "unsupported_runtime", sessionId: null, processStarted: false,
      });
      assert.equal(runtime.capabilities("unknown-assistant"), null);
      assert.equal(await runtime.canResume("unknown-assistant", "native"), false);
    },
  },
  {
    name: "154/00 task01 — terminal result awaits ordered durable callbacks",
    run: async () => {
      let release;
      const wait = new Promise(resolve => { release = resolve; });
      const facts = [];
      const question = { token: "154/00 Q1", text: "Proceed?", options: ["yes", "no"] };
      const runtime = createRuntimeSession({ adapters: { fixture: { drive: async (_brief, options) => {
        options.onIdentity("native-154");
        options.onQuestion(question);
        options.onUsage({ input: 100 });
        return { outcome: "needs-input", sessionId: "native-154", question };
      } } } });
      let settled = false;
      const result = runtime.drive(brief, { runtime: "fixture", onIdentity: async id => { await wait; facts.push(id); },
        onQuestion: q => facts.push(q), onUsage: u => facts.push(u) }).then(value => { settled = true; return value; });
      await nextTick();
      assert.equal(settled, false);
      release();
      assert.equal((await result).sessionId, "native-154");
      assert.deepEqual(facts, ["native-154", question, { input: 100 }]);
    },
  },
  ...["Identity", "Question", "Usage"].map(kind => ({
    name: `154/00 task01 — failed ${kind.toLowerCase()} persistence aborts and cleans the owned process`,
    run: async () => {
      let cleaned = false;
      const runtime = createRuntimeSession({ adapters: { fixture: { drive: async (_brief, options) => {
        const stopped = new Promise(resolve => options.signal.addEventListener("abort", () => { cleaned = true; resolve({ outcome: "failed", failureReason: "cancelled" }); }, { once: true }));
        options[`on${kind}`](kind === "Identity" ? "native-154" : { fixture: true });
        return stopped;
      } } } });
      const result = await runtime.drive(brief, { runtime: "fixture", [`on${kind}`]: async () => { throw new Error("storage unavailable"); } });
      assert.equal(cleaned, true);
      assert.equal(result.outcome, "failed");
      assert.equal(result.failureReason, "persistence_failed");
      assert.equal(result.persistenceEvent, kind.toLowerCase());
    },
  })),
  {
    name: "154/00 task01 — persistence failure crosses the real Claude callback bridge",
    run: async () => {
      const pty = createFakePtySpawn();
      const runtime = createRuntimeSession({ adapters: { claude: createClaudeSessionAdapter({
        driveInteractiveClaudeSession: defaultSessionDriver.agentSessionDriver.driveInteractiveClaudeSession,
      }) } });
      const result = await runtime.drive(brief, { ptySpawn: pty.spawn, which: createFakeWhich(), openSessionScreen: door,
        watchTranscriptSessionId: async () => "native-154", watchTranscriptCompletion: async () => null,
        onIdentity: async () => { throw new Error("identity store refused"); } });
      assert.equal(result.failureReason, "persistence_failed");
      assert.equal(result.sessionId, "native-154");
      assert.ok(pty.ptys[0].killed);
    },
  },
  {
    name: "154/00 task00 — resumability delegates native availability without inventing identity",
    run: async () => {
      const runtime = createRuntimeSession({ adapters: { fixture: { drive: assert.fail,
        capabilities: { resume: true }, canResume: async id => id === "available-native" } } });
      assert.deepEqual(runtime.capabilities("fixture"), { resume: true });
      assert.equal(await runtime.canResume("fixture", "available-native"), true);
      assert.equal(await runtime.canResume("fixture", "missing-native"), false);
      assert.equal(await runtime.canResume("fixture", null), false);
    },
  },
  {
    name: "154/00 task01 — native identity is never synthesized; malformed adapter results fail",
    run: async () => {
      const runtime = createRuntimeSession({ adapters: { fixture: { drive: async () => ({ outcome: "completed" }) } } });
      assert.deepEqual(await runtime.drive(brief, { runtime: "fixture" }), { outcome: "failed", failureReason: "invalid_session_result", sessionId: null });
    },
  },
];
