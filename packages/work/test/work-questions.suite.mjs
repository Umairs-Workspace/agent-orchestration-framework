// Story 163 — `work:questions`'s own rules over injected seams: which ask is offered, when the
// answer line is withheld, how a worker row is outranked, and what the render prints. The
// end-to-end cases over real files, lanes and the mesh store are test/loop/loop-command-questions.
import assert from "node:assert/strict";
import { createQuestionsCommand } from "@aof/work/commands/questions";

const ASK_STATES = Object.freeze({ waiting: "waiting", parked: "parked", answered: "answered" });
const NOW = "2026-10-17T14:32:00.000Z";

function ask(fields) {
  return { runId: "R1", ref: "011", workspaceId: "w1", scope: null, phase: "build", question: "Which store?", askedAt: "2026-10-17T14:02:00.000Z", state: ASK_STATES.waiting, parkedAt: null, ...fields };
}

// A command over fixed asks, fixed run states (by runId) and a fixed worker overlay.
function commandOver({ asks = [], running = new Set(), overlay = new Map() } = {}) {
  const { questionsCommand } = createQuestionsCommand({
    ASK_STATES,
    loopAsksDir: () => "/asks",
    readAsks: async (_dir, { workspaceId, allWorkspaces }) => asks.filter((record) => allWorkspaces === true || record.workspaceId === workspaceId),
    askEnvFor: () => ({}),
    askRunStopped: (record, runs) => runs.find((run) => run.runId === record.runId)?.state !== "running",
    runsBehindAsk: async ({ ref }) => asks.filter((record) => record.ref === ref).map((record) => ({ runId: record.runId, state: running.has(record.runId) ? "running" : "failed" })),
    readExecutionOverlay: async () => overlay,
    awaitsAnswer: (execution) => execution?.code === "needs-input",
    executionScopeRef: (ref) => ref.split("/")[0],
    resolveWorkspaceId: () => "w1",
    formatElapsed: (ms) => `${Math.floor(ms / 60000)}m`,
    loadWorkspace: async () => { throw new Error("no other checkout in this suite"); },
    globalMeshPaths: () => ({ workspacesRoot: "/no-such-descriptors" }),
    reportDegrade: () => {},
  });
  return questionsCommand;
}

const ctx = { workspace: { projectRoot: "/repo", config: { name: "aof" } } };

export const workQuestionsTests = [
  {
    name: "work-questions/00 the latest open ask on a ref is the one offered, as answerAsk would pick it",
    run: async () => {
      const command = commandOver({
        asks: [ask({ runId: "RA", askedAt: "2026-10-17T09:00:00.000Z", question: "first?" }), ask({ runId: "RB", askedAt: "2026-10-17T11:00:00.000Z", question: "second?" })],
        running: new Set(["RA", "RB"]),
      });
      const rows = await command.run({ now: NOW }, ctx);
      assert.deepEqual(rows.map((row) => row.runId), ["RB"]);
    },
  },
  {
    name: "work-questions/00 a ref whose latest ask is answered offers nothing, even over an older open one",
    run: async () => {
      const command = commandOver({
        asks: [ask({ runId: "RA", askedAt: "2026-10-17T09:00:00.000Z" }), ask({ runId: "RB", askedAt: "2026-10-17T11:00:00.000Z", state: ASK_STATES.answered })],
        running: new Set(["RA", "RB"]),
      });
      assert.deepEqual(await command.run({ now: NOW }, ctx), []);
      assert.equal(command.cli.render([]), "No open questions.");
    },
  },
  {
    name: "work-questions/00 a stopped run withholds the answer line and names the resume that clears it",
    run: async () => {
      const [row] = await commandOver({ asks: [ask({ ref: "04/02" })] }).run({ now: NOW }, ctx);
      assert.equal(row.liveness, "stale");
      assert.equal(row.answer, null);
      assert.equal(row.resume, "aof work loop 04 --resume", "the ask's scope, else the ref's top-level item");
    },
  },
  {
    name: "work-questions/00 a worker ask is listed unless a local ask holds the same ref",
    run: async () => {
      const worker = { code: "needs-input", nodeId: "node-9549", updatedAt: "2026-10-17T14:05:00.000Z", ask: { question: "worker?", phase: "build", askedAt: "2026-10-17T14:05:00.000Z" } };
      const shadowed = await commandOver({ asks: [ask({ ref: "05/01" })], running: new Set(["R1"]), overlay: new Map([["05/01", worker]]) }).run({ now: NOW }, ctx);
      assert.deepEqual(shadowed.map((row) => row.question), ["Which store?"]);
      const listed = await commandOver({ overlay: new Map([["05/01", worker], ["06", { code: null }]]) }).run({ now: NOW }, ctx);
      assert.deepEqual(listed.map((row) => [row.ref, row.node, row.question]), [["05/01", "node-9549", "worker?"]]);
    },
  },
  {
    name: "work-questions/00 the render numbers labelled choices and spells the age from the injected ladder",
    run: async () => {
      const command = commandOver({ asks: [ask({ runtime: "codex", choices: [{ label: "disk", description: "survives restarts" }, "memory"] })], running: new Set(["R1"]) });
      const text = command.cli.render(await command.run({ now: NOW }, ctx));
      assert.ok(text.startsWith("1 open question(s):\n\n011 · build · codex — asked 2026-10-17T14:02:00.000Z (30m ago) — workspace aof"), text);
      assert.ok(text.includes("  1. disk — survives restarts\n  2. memory"), text);
      assert.ok(text.endsWith('  answer: aof work answer 011 "…"'), text);
    },
  },
];
