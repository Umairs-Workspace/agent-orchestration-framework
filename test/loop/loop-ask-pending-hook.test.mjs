import { defaultSessionDriver as _aofSessions } from "aof/session-services";
// 136/03 — A PENDING ASK IS READ FROM THE HOOK (ADR-004). Claude Code writes a pending
// AskUserQuestion call to the transcript only once it is answered (measured on 2.1.288 at 136's live
// run), so a PreToolUse hook records the call and the driver, the owner and the re-drive read that
// record. The re-drive's two texts (E4, E5) are in `loop-command-stops.test.mjs`, beside 131/03's
// verbatim case, on its composer fixture; this suite drives the reader, the driver's settle, the
// hook itself and its bundle registration.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const readPendingAsk = _aofSessions.workObserve.readPendingAsk;
const claudeProjectsDir = _aofSessions.workObserve.claudeProjectsDir;
const defaultWatchTranscriptCompletion = _aofSessions.agentSessionDriver.defaultWatchTranscriptCompletion;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HOOK = path.join(repoRoot, "packages", "core", "assets", "hooks", "ask-pending-enqueue.mjs");
const QUESTION = "08/00 Q1 · Discovery question";
const INPUT = { questions: [{ question: QUESTION, header: "Marker", options: [{ label: "A", description: "a" }, { label: "B", description: "b" }], multiSelect: false }] };

async function withTree(body) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-136-03-"));
  try {
    const itemDir = path.join(root, "wiki", "work", "08_milestone_x", "stories", "00_story_y");
    await mkdir(path.join(itemDir, "runs"), { recursive: true });
    const env = { CLAUDE_CONFIG_DIR: path.join(root, "claude") };
    const cwd = path.join(root, "tree");
    const projects = claudeProjectsDir({ cwd, env });
    await mkdir(projects, { recursive: true });
    const transcript = (records) => writeFile(path.join(projects, "S1.jsonl"), records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
    const record = (over = {}) => ({ runId: "R1", sessionId: "S1", toolUseId: "toolu_1", name: "AskUserQuestion", input: INPUT, at: "2026-10-03T21:45:50.000Z", ...over });
    const pending = (records) => writeFile(path.join(itemDir, "runs", ".asks-pending.ndjson"), records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
    // The last thing the transcript holds is an answered Bash call: nothing of the question.
    await transcript([
      { type: "assistant", message: { stop_reason: "tool_use", content: [{ type: "tool_use", id: "toolu_0", name: "Bash", input: { command: "aof work doctor" } }] } },
      { type: "user", message: { content: [{ type: "tool_result", tool_use_id: "toolu_0", content: "ok" }] } },
    ]);
    return await body({ itemDir, env, cwd, transcript, record, pending });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function runHook({ env, input }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [HOOK], { env, windowsHide: true });
    let out = "";
    child.stdout.on("data", (chunk) => { out += chunk; });
    child.stderr.on("data", (chunk) => { out += chunk; });
    child.on("close", (code) => resolve({ code, out }));
    child.stdin.end(input);
  });
}

export const loopAskPendingHookTests = [
  {
    name: "136/03 task00 E1 — the hook's record is the pending question, composed as a pending tool's",
    run: () => withTree(async ({ itemDir, env, cwd, record, pending }) => {
      await pending([record({ toolUseId: "toolu_old", at: "2026-10-03T21:40:00.000Z", input: { questions: [{ question: "an older one" }] } }), record()]);
      const read = await readPendingAsk({ itemDir, sessionId: "S1", since: "2026-10-03T21:44:47.000Z", cwd, env });
      assert.deepEqual(read, { question: `${QUESTION}\n- A\n- B`, toolUseId: "toolu_1", at: "2026-10-03T21:45:50.000Z" });
      assert.equal(await readPendingAsk({ itemDir, sessionId: "S2", cwd, env }), null, "another session's record is not this session's question");
      assert.equal(await readPendingAsk({ itemDir: path.join(itemDir, "absent"), sessionId: "S1", cwd, env }), null, "no record file is no question");
    }),
  },
  {
    name: "136/03 task00 E1 — the driver's completion watch settles needs-input, pending, on the record alone",
    run: () => withTree(async ({ itemDir, env, cwd, record, pending }) => {
      await pending([record()]);
      const settled = await defaultWatchTranscriptCompletion({ cwd, env, sessionId: "S1", pollMs: 5, idleMs: 60000, pendingAsk: { itemDir, since: "2026-10-03T21:44:47.000Z" } });
      assert.deepEqual(settled, { outcome: "needs-input", declared: true, pending: true });
    }),
  },
  {
    name: "136/03 task00 E2 — a call with a result in the transcript is not waiting",
    run: () => withTree(async ({ itemDir, env, cwd, transcript, record, pending }) => {
      await pending([record()]);
      await transcript([{ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "toolu_1", content: "A" }] } }]);
      assert.equal(await readPendingAsk({ itemDir, sessionId: "S1", cwd, env }), null);
    }),
  },
  {
    name: "136/03 task00 E3 — a record from before the drive began is history, so a resumed session is not waiting",
    run: () => withTree(async ({ itemDir, env, cwd, record, pending }) => {
      await pending([record()]);
      assert.equal(await readPendingAsk({ itemDir, sessionId: "S1", since: "2026-10-03T23:26:17.000Z", cwd, env }), null);
      const watch = defaultWatchTranscriptCompletion({ cwd, env, sessionId: "S1", pollMs: 5, idleMs: 60000, declaredIdleMs: 60000, signal: AbortSignal.timeout(200), pendingAsk: { itemDir, since: "2026-10-03T23:26:17.000Z" } });
      assert.equal(await watch, null, "the watch never settles on a record older than its drive");
    }),
  },
  {
    name: "136/03 task00 E1 — the hook appends the PreToolUse call beside the run's heartbeats, and prints nothing",
    run: () => withTree(async ({ itemDir }) => {
      const event = { session_id: "S1", tool_name: "AskUserQuestion", tool_input: INPUT, tool_use_id: "toolu_9", hook_event_name: "PreToolUse" };
      const { code, out } = await runHook({ env: { ...process.env, AOF_RUN_ITEM_DIR: itemDir, AOF_RUN_ID: "R9" }, input: JSON.stringify(event) });
      assert.deepEqual([code, out], [0, ""]);
      const lines = (await readFile(path.join(itemDir, "runs", ".asks-pending.ndjson"), "utf8")).trim().split("\n").map((l) => JSON.parse(l));
      assert.equal(lines.length, 1);
      const { at, ...rest } = lines[0];
      assert.deepEqual(rest, { runId: "R9", sessionId: "S1", toolUseId: "toolu_9", name: "AskUserQuestion", input: INPUT });
      assert.ok(Number.isFinite(Date.parse(at)));
    }),
  },
  ...[
    ["no run in the env", (itemDir) => ({ ...process.env, AOF_RUN_ITEM_DIR: "", AOF_RUN_ID: "" }), JSON.stringify({ session_id: "S1", tool_use_id: "t", tool_input: INPUT })],
    ["a run in the env", (itemDir) => ({ ...process.env, AOF_RUN_ITEM_DIR: itemDir, AOF_RUN_ID: "R9" }), "not json {"],
  ].map(([environment, envOf, input]) => ({
    name: `136/03 task00 E6 — the hook writes nothing and succeeds: ${environment}, ${input.startsWith("not") ? "input that is not JSON" : "a well-formed call"}`,
    run: () => withTree(async ({ itemDir }) => {
      const { code, out } = await runHook({ env: envOf(itemDir), input });
      assert.deepEqual([code, out], [0, ""]);
      assert.equal(existsSync(path.join(itemDir, "runs", ".asks-pending.ndjson")), false);
    }),
  })),
  {
    name: "136/03 task00 — the bundle registers the hook on PreToolUse for AskUserQuestion, and the reader names the hook's file",
    run: async () => {
      const assets = path.join(repoRoot, "packages", "core", "assets");
      const bundle = JSON.parse(await readFile(path.join(assets, "bundle.json"), "utf8"));
      const entries = bundle.members;
      const ids = entries.map((entry) => entry.id);
      assert.ok(ids.includes("ask-pending-enqueue") && ids.includes("claude-ask-pending"), ids.join(", "));
      const asset = entries.find((entry) => entry.id === "ask-pending-enqueue");
      assert.equal(asset.target, ".claude/hooks/aof/ask-pending-enqueue.mjs");
      const hook = JSON.parse(await readFile(path.join(assets, "hooks", "claude-ask-pending.json"), "utf8"));
      assert.deepEqual([hook.event, hook.matcher, hook.claude.args[0]], ["PreToolUse", "AskUserQuestion", "${CLAUDE_PROJECT_DIR}/.claude/hooks/aof/ask-pending-enqueue.mjs"]);
      assert.ok(_aofSessions.workObserve.HUMAN_INPUT_TOOL_NAMES.includes(hook.matcher), "the matcher is a human-input tool");
      const reader = await readFile(path.join(repoRoot, "packages", "work", "src", "observe.mjs"), "utf8");
      const writer = await readFile(HOOK, "utf8");
      for (const source of [reader, writer]) assert.ok(source.includes(".asks-pending.ndjson"), "the writer and the reader name one file");
    },
  },
];
