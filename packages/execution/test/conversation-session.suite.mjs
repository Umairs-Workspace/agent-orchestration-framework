// milestone 172 / story 00 — the headless conversation (ADR-001).
//   task 00 · stream-json lines become conversation events in one reader (`readStreamJsonLine`)
//   task 01 · one session per key takes its turns in order, ends when idle, and never bypasses
//             permissions — the module against `fixtures/stand-in-claude.mjs`, a node script that
//             speaks stream-json, with the idle clock driven by hand.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { conversationLaunchArgs, createConversations, readStreamJsonLine } from "../src/conversation-session.mjs";
import { isSessionAttachmentKey, resolveSessionLaunch } from "../src/session-model.mjs";

const STAND_IN = fileURLToPath(new URL("./fixtures/stand-in-claude.mjs", import.meta.url));
const TOOLS = ["Read", "Grep", "Glob", "Write", "Bash(aof diagram scene:*)"];
const KEY = "171 ADR-003-push-stream.excalidraw";
const INVOKE = (id) => `/aof:diagram-review 171 ADR-003-push-stream.excalidraw${id ? ` ${id}` : ""}`;

// ── task 00 · the reader ─────────────────────────────────────────────────────────────────────────
const IN_FLIGHT = Object.freeze({ turn: true, requestId: "r7" });
const read = (line) => readStreamJsonLine(IN_FLIGHT, typeof line === "string" ? line : JSON.stringify(line));

const readerTests = [
  { name: "172/00 task00 · a text delta becomes a text event for the turn in flight", run: () => {
    const { events } = read({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: "The writer is " } } });
    assert.deepEqual(events, [{ type: "text", requestId: "r7", text: "The writer is " }]);
  } },
  { name: "172/00 task00 · a tool use becomes an activity event naming the tool", run: () => {
    const { events } = read({ type: "assistant", message: { content: [{ type: "text", text: "Reading." }, { type: "tool_use", name: "Bash", input: { command: "aof diagram scene 171 ADR-003-push-stream.excalidraw --action context --input c.json --json" } }] } });
    assert.deepEqual(events, [{ type: "activity", requestId: "r7", tool: "Bash", label: "aof diagram scene … --action context" }]);
  } },
  { name: "172/00 task00 · the result line ends the turn", run: () => {
    const { state, events } = read({ type: "result", subtype: "success", result: "Done.", permission_denials: [] });
    assert.deepEqual(events, [{ type: "turn-end", requestId: "r7", outcome: "done", denials: [] }]);
    assert.equal(state.turn, false, "the reader has no turn in flight");
    assert.equal(state.requestId, null);
  } },
  ...[
    '{"type":"system","subtype":"init","session_id":"s1"}',
    '{"type":"system","subtype":"hook_started"}',
    '{"type":"rate_limit_event"}',
    '{"type":"stream_event","event":{"type":"message_start"}}',
    '{"type":"user","message":{"content":[{"type":"tool_result","content":"ok"}]}}',
    "not json at all",
    '{"type":"a-type-from-a-later-claude"}',
  ].map((line) => ({ name: `172/00 task00 · a line the conversation does not use produces nothing: ${line}`, run: () => {
    const { state, events } = read(line);
    assert.deepEqual(events, []);
    assert.equal(state, IN_FLIGHT, "and the turn is still in flight");
  } })),
  { name: "172/00 task00 E10 · a denied tool is named on the turn's end", run: () => {
    const { events } = read({ type: "result", subtype: "success", result: "Answered without it.", permission_denials: [{ tool_name: "Bash", tool_input: { command: "git status" } }] });
    assert.deepEqual(events, [{ type: "turn-end", requestId: "r7", outcome: "done", denials: [{ tool: "Bash", input: "git status" }] }]);
  } },
  { name: "172/00 task00 · a result that is not a success ends the turn as failed", run: () => {
    const { events } = read({ type: "result", subtype: "error_during_execution", result: "" });
    assert.equal(events.length, 1);
    assert.equal(events[0].type, "turn-end"); assert.equal(events[0].requestId, "r7"); assert.equal(events[0].outcome, "failed");
  } },
];

// ── task 01 · the session module against the stand-in ───────────────────────────────────────────

// A clock the test advances: a timeout runs when its time is reached, never otherwise.
function manualTimers() {
  let now = 0; let seq = 0;
  const due = new Map();
  return {
    timers: { setTimeout: (fn, ms) => { const id = ++seq; due.set(id, { fn, at: now + ms }); return id; }, clearTimeout: (id) => due.delete(id) },
    advance(ms) {
      const until = now + ms;
      for (;;) {
        const next = [...due.entries()].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        due.delete(next[0]); now = next[1].at; next[1].fn();
      }
      now = until;
    },
    get armed() { return due.size; },
  };
}

const until = async (predicate, what, withinMs = 5000) => {
  const started = Date.now();
  while (!(await predicate())) {
    if (Date.now() - started > withinMs) throw new Error(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};
const running = (child) => child.exitCode === null && child.signalCode === null;

async function withConversations(run, { env: extra = {}, launch, baseEnv } = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-conversation-"));
  const logFile = path.join(dir, "stand-in.jsonl");
  const clock = manualTimers();
  const children = [];
  const spawns = [];
  const terminated = [];
  const env = { ...(baseEnv ?? process.env), STAND_IN_LOG: logFile, ...Object.fromEntries(Object.entries(extra).map(([key, value]) => [key, value === "__dir__" ? dir : value])) };
  const conversations = createConversations({
    resolveExecutable: () => ({ command: process.execPath, args: [STAND_IN] }),
    ...(launch ? { launch } : {}),
    env,
    timers: clock.timers,
    spawnChild: (command, args, options) => { const child = spawn(command, args, options); spawns.push({ command, args, options }); children.push(child); return child; },
    terminate: async (child) => { terminated.push({ pid: child.pid, stdinClosed: child.stdin.writableEnded }); if (running(child)) child.kill("SIGKILL"); },
  });
  const log = async () => (await readFile(logFile, "utf8").catch(() => "")).split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const received = async () => (await log()).filter((entry) => "received" in entry).map((entry) => entry.received);
  const order = async () => (await log()).filter((entry) => !("start" in entry)).map((entry) => ("received" in entry ? `in:${entry.received}` : `out:${entry.result}`));
  const release = () => writeFile(path.join(dir, "release"), "");
  try { await run({ conversations, clock, children, spawns, terminated, log, received, order, release, dir }); }
  finally {
    await conversations.close();
    for (const child of children) if (running(child)) child.kill("SIGKILL");
    await rm(dir, { recursive: true, force: true });
  }
}
// A subscriber that records every event it is handed.
const recorder = () => { const events = []; const listener = (event) => events.push(event); return { events, listener }; };
const turnEnded = (events, requestId) => events.some((event) => event.type === "turn-end" && event.requestId === requestId);

const sessionTests = [
  { name: "172/00 task01 E1 · the first delivery starts a session in the project root, typed the invocation", run: () => withConversations(async ({ conversations, children, spawns, log, received }) => {
    const root = process.cwd();
    const { outcome } = await conversations.deliver(KEY, { cwd: root, text: INVOKE("r7"), requestId: "r7", tools: TOOLS });
    assert.equal(outcome, "started");
    assert.equal(children.length, 1, "one stand-in process runs");
    assert.equal(spawns[0].options.cwd, root);
    await until(async () => (await received()).length === 1, "the first message");
    assert.equal((await log()).find((entry) => entry.start).start.cwd, path.resolve(root), "in the project root");
    assert.deepEqual(await received(), [INVOKE("r7")]);
  }) },
  { name: "172/00 task01 E2 · two subscribers on one key share one session and one live turn", run: () => withConversations(async ({ conversations, children }) => {
    const a = recorder(); const b = recorder();
    conversations.subscribe(KEY, a.listener); conversations.subscribe(KEY, b.listener);
    await conversations.deliver(KEY, { cwd: process.cwd(), text: INVOKE("r7"), requestId: "r7", tools: TOOLS });
    await until(() => turnEnded(a.events, "r7") && turnEnded(b.events, "r7"), "r7's turn-end on both");
    assert.equal(children.length, 1, "exactly one stand-in process runs");
    const live = (events) => events.filter((event) => ["turn", "text", "turn-end"].includes(event.type));
    assert.deepEqual(live(a.events), live(b.events));
    assert.equal(live(a.events).filter((e) => e.type === "text").map((e) => e.text).join(""), "The writer is another process");
    assert.ok(live(a.events).every((event) => event.requestId === "r7"));
  }, { env: { STAND_IN_TEXT: "The writer is another process" } }) },
  { name: "172/00 task01 E3 · another diagram gets its own session", run: () => withConversations(async ({ conversations, children, spawns }) => {
    await conversations.deliver(KEY, { cwd: process.cwd(), text: INVOKE("r7"), requestId: "r7", tools: TOOLS });
    const { outcome } = await conversations.deliver("171 ADR-001-overlay.excalidraw", { cwd: process.cwd(), text: "/aof:diagram-review 171 ADR-001-overlay.excalidraw r2", requestId: "r2", tools: TOOLS });
    assert.equal(outcome, "started");
    assert.equal(children.length, 2, "two stand-in processes run, one per key");
    assert.notEqual(spawns[0], spawns[1]);
  }) },
  { name: "172/00 task01 E4 · a delivery during a turn waits for the turn to end", run: () => withConversations(async ({ conversations, received, order, release }) => {
    const seen = recorder(); conversations.subscribe(KEY, seen.listener);
    await conversations.deliver(KEY, { cwd: process.cwd(), text: INVOKE("r7"), requestId: "r7", tools: TOOLS });
    await until(async () => (await received()).length === 1, "r7 received");
    assert.deepEqual(await conversations.deliver(KEY, { cwd: process.cwd(), text: INVOKE("r5"), requestId: "r5", tools: TOOLS }), { outcome: "queued" });
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.deepEqual(await received(), [INVOKE("r7")], "r5 is not written while r7 is answered");
    await release();
    await until(async () => (await received()).length === 2, "r5 received");
    assert.deepEqual((await order()).slice(0, 3), [`in:${INVOKE("r7")}`, `out:${INVOKE("r7")}`, `in:${INVOKE("r5")}`]);
    await release();
    await until(() => turnEnded(seen.events, "r5"), "r5's turn-end");
  }, { env: { STAND_IN_HOLD_DIR: "__dir__" } }) },
  { name: "172/00 task01 E5 · deliveries queued during one turn are answered in the order they came", run: () => withConversations(async ({ conversations, received, order }) => {
    const seen = recorder(); conversations.subscribe(KEY, seen.listener);
    await conversations.deliver(KEY, { cwd: process.cwd(), text: INVOKE("r7"), requestId: "r7", tools: TOOLS });
    for (const id of ["r5", "r8", null]) assert.equal((await conversations.deliver(KEY, { cwd: process.cwd(), text: INVOKE(id), requestId: id, tools: TOOLS })).outcome, "queued");
    await until(() => turnEnded(seen.events, null), "the batch's turn-end");
    assert.deepEqual(await received(), [INVOKE("r7"), INVOKE("r5"), INVOKE("r8"), INVOKE()]);
    const steps = await order();
    assert.deepEqual(steps, [INVOKE("r7"), INVOKE("r5"), INVOKE("r8"), INVOKE()].flatMap((text) => [`in:${text}`, `out:${text}`]), "each after the previous turn's result");
    assert.deepEqual(seen.events.filter((e) => e.type === "turn").map((e) => e.requestId), ["r7", "r5", "r8", null]);
  }, { env: { STAND_IN_DELAY_MS: "60" } }) },
];

// E6 proper, and the idle-clock edges: one subscriber, the clock driven by hand.
async function idleSession(fx, { hold = false } = {}) {
  const seen = recorder();
  const leave = fx.conversations.subscribe(KEY, seen.listener);
  await fx.conversations.deliver(KEY, { cwd: process.cwd(), text: INVOKE("r7"), requestId: "r7", tools: TOOLS });
  if (!hold) await until(() => turnEnded(seen.events, "r7"), "r7 answered");
  else await until(async () => (await fx.received()).length === 1, "r7 received");
  return { seen, leave };
}
const MINUTE = 60_000;
const idleTests = [
  { name: "172/00 task01 E6 · the session ends ten minutes after its last subscriber left, closing stdin then the tree", run: () => withConversations(async (fx) => {
    const { seen, leave } = await idleSession(fx);
    leave();
    fx.clock.advance(10 * MINUTE);
    await until(() => fx.terminated.length === 1, "the tree ended");
    assert.equal(fx.terminated[0].stdinClosed, true, "stdin was closed before the tree was ended");
    assert.equal(fx.terminated[0].pid, fx.children[0].pid);
    assert.deepEqual(fx.conversations.snapshot(KEY), { type: "snapshot", state: "ended", reason: "idle", requestId: null, text: "", queued: 0 }, "the session's end names the reason idle");
    assert.ok(!seen.events.some((e) => e.type === "session" && e.state === "ended"), "the subscriber had left before it ended");
  }) },
  { name: "172/00 task01 · a session one second short of the idle limit still runs", run: () => withConversations(async (fx) => {
    const { leave } = await idleSession(fx);
    leave();
    fx.clock.advance(10 * MINUTE - 1000);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(fx.terminated.length, 0);
    assert.ok(running(fx.children[0]), "the stand-in is still running");
  }) },
  { name: "172/00 task01 E7 · a subscriber returning within ten minutes stops the idle clock", run: () => withConversations(async (fx) => {
    const { leave } = await idleSession(fx);
    leave();
    fx.clock.advance(4 * MINUTE);
    fx.conversations.subscribe(KEY, () => {});
    fx.clock.advance(20 * MINUTE);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(fx.terminated.length, 0);
    assert.ok(running(fx.children[0]), "the stand-in is still running");
  }) },
  { name: "172/00 task01 · a turn in flight holds the session even with no subscriber", run: () => withConversations(async (fx) => {
    const { seen, leave } = await idleSession(fx, { hold: true });
    leave();
    fx.clock.advance(15 * MINUTE);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(running(fx.children[0]), "still running with r7 in flight");
    const after = recorder(); const rejoin = fx.conversations.subscribe(KEY, after.listener);
    await fx.release();
    await until(() => turnEnded(after.events, "r7"), "r7's result");
    rejoin();
    fx.clock.advance(10 * MINUTE - 1000);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(running(fx.children[0]), "still running 9:59 after the result");
    fx.clock.advance(1000);
    await until(() => fx.terminated.length === 1, "ended 10 minutes after the result");
    void seen;
  }, { env: { STAND_IN_HOLD_DIR: "__dir__" } }) },
  { name: "172/00 task01 E8 · a process that exits mid-turn ends the turn as failed and the session as ended", run: () => withConversations(async (fx) => {
    const seen = recorder(); fx.conversations.subscribe(KEY, seen.listener);
    await fx.conversations.deliver(KEY, { cwd: process.cwd(), text: INVOKE("r7"), requestId: "r7", tools: TOOLS });
    assert.equal((await fx.conversations.deliver(KEY, { cwd: process.cwd(), text: INVOKE("r5"), requestId: "r5", tools: TOOLS })).outcome, "queued");
    await until(() => seen.events.some((e) => e.type === "session" && e.state === "ended"), "the session ended");
    assert.equal(fx.children[0].exitCode, 1);
    assert.deepEqual(seen.events.find((e) => e.type === "turn-end"), { type: "turn-end", requestId: "r7", outcome: "failed", denials: [] });
    assert.deepEqual(seen.events.find((e) => e.type === "session" && e.state === "ended"), { type: "session", state: "ended", reason: "exited" });
    assert.deepEqual(await fx.received(), [INVOKE("r7")], "r5 is not delivered to any process");
    assert.equal(fx.children.length, 1);
  }, { env: { STAND_IN_EXIT: "mid-turn" } }) },
  { name: "172/00 task01 · an ended session is not resumed; the next delivery starts a fresh one", run: () => withConversations(async (fx) => {
    const seen = recorder(); fx.conversations.subscribe(KEY, seen.listener);
    await fx.conversations.deliver(KEY, { cwd: process.cwd(), text: INVOKE("r7"), requestId: "r7", tools: TOOLS });
    await until(() => seen.events.some((e) => e.type === "session" && e.state === "ended"), "the first session ended");
    assert.equal((await fx.conversations.deliver(KEY, { cwd: process.cwd(), text: INVOKE("r5"), requestId: "r5", tools: TOOLS })).outcome, "started");
    assert.equal(fx.children.length, 2, "a new stand-in process starts");
    assert.ok(!fx.spawns[1].args.includes("--resume") && !fx.spawns[1].args.includes("--continue"), "without --resume");
    await until(async () => (await fx.received()).length === 2, "r5 received");
    assert.equal((await fx.received())[1], INVOKE("r5"), "its first message is r5's invocation");
  }, { env: { STAND_IN_EXIT: "mid-turn" } }) },
];

// E9 and the launch's model, effort and environment.
const launchTests = [
  { name: "172/00 task01 E9 · the launch denies what it does not allow and never skips permissions", run: () => withConversations(async ({ conversations, spawns }) => {
    await conversations.deliver(KEY, { cwd: process.cwd(), text: INVOKE("r7"), requestId: "r7", tools: TOOLS });
    const { command, args, options } = spawns[0];
    assert.equal(command, process.execPath);
    const launched = args.slice(1);
    assert.deepEqual(launched, conversationLaunchArgs({ tools: TOOLS }));
    for (const flag of ["-p", "--include-partial-messages"]) assert.ok(launched.includes(flag), flag);
    for (const [flag, value] of [["--input-format", "stream-json"], ["--output-format", "stream-json"], ["--permission-prompts", "none"]]) assert.equal(launched[launched.indexOf(flag) + 1], value, flag);
    assert.deepEqual(launched.slice(launched.indexOf("--allowedTools") + 1), TOOLS, "--allowedTools is followed by exactly those five tools");
    for (const banned of ["--dangerously-skip-permissions", "--allow-dangerously-skip-permissions", "bypassPermissions"]) assert.ok(!launched.some((arg) => arg.includes(banned)), banned);
    assert.equal(options.shell, false, "spawned with an argument vector and no shell");
  }) },
  { name: "172/00 task01 · the launch carries the refine phase's model and effort, and scrubs the session-attachment keys", run: async () => {
    const config = { work: { agents: { session: { models: { refine: "opus" }, effort: { refine: "high" } } } } };
    const baseEnv = { PATH: process.env.PATH, CLAUDECODE: "1", CLAUDE_CODE_SSE_PORT: "1234" };
    await withConversations(async ({ conversations, spawns, log }) => {
      await conversations.deliver(KEY, { cwd: process.cwd(), text: INVOKE("r7"), requestId: "r7", tools: TOOLS });
      const args = spawns[0].args;
      assert.equal(args[args.indexOf("--model") + 1], "opus");
      assert.equal(args[args.indexOf("--effort") + 1], "high");
      assert.ok("PATH" in spawns[0].options.env);
      assert.ok(!("CLAUDECODE" in spawns[0].options.env) && !("CLAUDE_CODE_SSE_PORT" in spawns[0].options.env));
      await until(async () => (await log()).some((entry) => entry.start), "the stand-in started");
      const seenEnv = (await log()).find((entry) => entry.start).start.env;
      assert.ok(seenEnv.includes("PATH") && !seenEnv.includes("CLAUDECODE") && !seenEnv.includes("CLAUDE_CODE_SSE_PORT"), "the child's own environment");
    }, { baseEnv, launch: () => resolveSessionLaunch(config, "refine") });
    // The loop's session driver scrubs its spawn with the same predicate, imported from session-model.mjs.
    const driver = await readFile(new URL("../src/session-driver.mjs", import.meta.url), "utf8");
    assert.match(driver, /import \{ isSessionAttachmentKey \} from "\.\/session-model\.mjs";/u);
    assert.doesNotMatch(driver, /const isSessionAttachmentKey\s*=/u, "the driver carries no copy of its own");
    assert.ok(["CLAUDECODE", "CLAUDE_CODE_SSE_PORT", "VSCODE_PID", "TERM_PROGRAM"].every(isSessionAttachmentKey));
    assert.ok(!isSessionAttachmentKey("PATH"));
  } },
  { name: "172/00 task01 · with no claude to launch the delivery is refused as unavailable and nothing is kept", run: async () => {
    const conversations = createConversations({ resolveExecutable: () => null });
    await assert.rejects(conversations.deliver(KEY, { cwd: process.cwd(), text: INVOKE("r7"), requestId: "r7", tools: TOOLS }), (error) => error.code === "architect-session-unavailable" && error.status === 503);
    assert.equal(conversations.snapshot(KEY).state, "none");
  } },
  { name: "172/00 task01 · a snapshot carries the turn in flight and the text written so far", run: () => withConversations(async ({ conversations, received, release }) => {
    const seen = recorder(); conversations.subscribe(KEY, seen.listener);
    assert.deepEqual(conversations.snapshot(KEY), { type: "snapshot", state: "none", requestId: null, text: "", queued: 0 });
    await conversations.deliver(KEY, { cwd: process.cwd(), text: INVOKE("r7"), requestId: "r7", tools: TOOLS });
    await until(async () => (await received()).length === 1 && seen.events.some((e) => e.type === "activity"), "r7 under way");
    assert.deepEqual(conversations.snapshot(KEY), { type: "snapshot", state: "answering", requestId: "r7", text: "The writer is another process", queued: 0 });
    await release();
    await until(() => turnEnded(seen.events, "r7"), "r7's result");
    assert.equal(conversations.snapshot(KEY).state, "idle");
  }, { env: { STAND_IN_HOLD_DIR: "__dir__", STAND_IN_TEXT: "The writer is another process" } }) },
];

export const conversationSessionTests = [...readerTests, ...sessionTests, ...idleTests, ...launchTests];
