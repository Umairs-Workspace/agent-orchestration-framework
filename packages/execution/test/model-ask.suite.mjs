// milestone 201 / story 01 — the one-shot model ask (ADR-004 §2–§4).
//   task 00 · the launch: one builder for the argv, the environment scrubbed of the calling
//             session, and a working directory that is never the caller's.
//   task 01 · every way a `claude` goes wrong comes back as an outcome, never a throw, and a child
//             that does not answer in time is ended.
// The module against `fixtures/claude-stand-in.mjs`, a node script that prints what
// `claude -p --output-format json` prints. No case starts the real one.
import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MODEL_ASK, askModel, modelAskArgs, modelAskEnvironment, modelAskInput, readModelAnswer } from "../src/model-ask.mjs";

const STAND_IN = fileURLToPath(new URL("./fixtures/claude-stand-in.mjs", import.meta.url));
const EXECUTABLE = { command: process.execPath, args: [STAND_IN] };

// One ask against the stand-in. Answers the outcome and what the stand-in logged.
async function ask({ env = {}, timeoutMs = 10_000, input = "Query: q\n", model = "haiku", instruction = "Pick.", executable = EXECUTABLE } = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-model-ask-suite-"));
  const logFile = path.join(dir, "stand-in.log");
  try {
    const started = Date.now();
    const outcome = await askModel({ executable, model, instruction, input, timeoutMs, env: { ...process.env, STAND_IN_LOG: logFile, ...env } });
    const log = (await readFile(logFile, "utf8").catch(() => "")).split("\n").filter(Boolean).map((line) => JSON.parse(line));
    return { outcome, log, start: log.find((entry) => entry.start)?.start ?? null, stdin: log.find((entry) => "stdin" in entry)?.stdin ?? null, elapsedMs: Date.now() - started };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const within = (parent, child) => { const relative = path.relative(parent, child); return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)); };

export const modelAskTests = [
  { name: "201/01 task00 · the launch argv is print mode, JSON output, no tools, no session, no MCP, no slash commands and no permission prompt, at the caller's model", run: () => {
    const args = modelAskArgs({ model: "haiku" });
    for (const flag of ["-p", "--no-session-persistence", "--strict-mcp-config", "--disable-slash-commands"]) assert.ok(args.includes(flag), `${flag} is in the launch`);
    assert.equal(args[args.indexOf("--output-format") + 1], "json");
    assert.equal(args[args.indexOf("--tools") + 1], "", "it is given no tools");
    assert.equal(args[args.indexOf("--permission-prompts") + 1], "none");
    assert.equal(args[args.indexOf("--model") + 1], "haiku");
    for (const never of ["--bare", "--dangerously-skip-permissions", "--allow-dangerously-skip-permissions", "--system-prompt", "--append-system-prompt"]) assert.ok(!args.includes(never), `${never} is never in the launch`);
    assert.equal(modelAskInput({ instruction: "Pick the cards.", input: "Query: q\n" }), "Pick the cards.\n\nQuery: q\n", "the instruction goes in on stdin, ahead of the question");
    assert.equal(modelAskInput({ input: "Query: q\n" }), "Query: q\n");
    assert.ok(!modelAskArgs({}).includes("--model"), "no model flag without a model");
    assert.ok(!modelAskArgs({ model: " " }).includes("--model"), "a blank model is no model");
  } },
  { name: "201/01 task00 E2 · the environment keeps HOME and PATH and drops every key that would attach the child to the calling session", run: () => {
    const env = modelAskEnvironment({ HOME: "/h", PATH: "/bin", CLAUDECODE: "1", CLAUDE_CODE_SSE_PORT: "4711", CLAUDE_CODE_ENTRYPOINT: "cli", VSCODE_PID: "9", CLAUDE_EFFORT: "max", TERM_PROGRAM: "vscode", ANTHROPIC_MODEL: "x" });
    assert.deepEqual(Object.keys(env).sort(), ["ANTHROPIC_MODEL", "CLAUDE_CODE_DISABLE_AUTO_MEMORY", "HOME", "PATH"]);
    assert.equal(env.CLAUDE_CODE_DISABLE_AUTO_MEMORY, "1", "auto-memory is off, so the child creates no project directory for its working directory");
    assert.equal(modelAskEnvironment({ CLAUDE_CODE_DISABLE_AUTO_MEMORY: "0" }).CLAUDE_CODE_DISABLE_AUTO_MEMORY, "1", "the caller's own value never reaches the child");
  } },
  { name: "201/01 task00 E1 · one process is started with the question on stdin, never in its arguments, in a fresh directory outside the caller's that is gone afterwards", run: async () => {
    const input = "Query: worktree junction\nPick at most 5 of the 1 cards below, or none.\n\n[1] a card line\nthe card's text\n";
    const { outcome, log, start, stdin } = await ask({ input, env: { STAND_IN_ANSWER: "[3, 1]", CLAUDECODE: "1", CLAUDE_CODE_SSE_PORT: "4711" } });
    assert.deepEqual(outcome, { outcome: MODEL_ASK.answered, text: "[3, 1]" });
    assert.equal(log.filter((entry) => entry.start).length, 1, "the stand-in was started exactly once");
    assert.equal(stdin, `Pick.\n\n${input}`, "stdin held the instruction, then the whole question");
    assert.ok(!start.argv.some((arg) => arg.includes("worktree junction") || arg.includes("the card's text") || arg.includes("Pick.")), "no argument holds the instruction, the query or a card's text");
    assert.ok(!within(process.cwd(), start.cwd), "its working directory is not the caller's and not inside it");
    assert.ok(within(await realTmp(), start.cwd), "…it is a directory under the OS temp directory");
    assert.equal(await exists(start.cwd), false, "…and it is removed once the ask is over");
    assert.ok(start.env.includes("HOME") && start.env.includes("PATH"));
    assert.ok(!start.env.includes("CLAUDECODE") && !start.env.includes("CLAUDE_CODE_SSE_PORT"), "nothing of the calling session reaches the child");
    assert.ok(start.env.includes("CLAUDE_CODE_DISABLE_AUTO_MEMORY"), "the child is started with its auto-memory off");
  } },
  { name: "201/01 task01 outline · what the model sends back: an answer | a fenced answer | prose | not JSON | a result marked as an error | no output | not signed in | ended by a signal", run: async () => {
    const rows = [
      { label: "answers [2]", env: { STAND_IN_ANSWER: "[2]" }, outcome: { outcome: "answered", text: "[2]" } },
      { label: "answers a fenced array", env: { STAND_IN_ANSWER: "```json\n[4, 2]\n```" }, outcome: { outcome: "answered", text: "```json\n[4, 2]\n```" } },
      { label: "answers prose", env: { STAND_IN_ANSWER: "none of these apply" }, outcome: { outcome: "answered", text: "none of these apply" } },
      { label: "exits 0 with output that is not JSON", env: { STAND_IN_MODE: "not-json" }, outcome: { outcome: "unreadable" } },
      { label: "exits 0 with a JSON result marked as an error", env: { STAND_IN_MODE: "error-result" }, outcome: { outcome: "failed", reason: "API Error: overloaded" } },
      { label: "exits 0 with no output", env: { STAND_IN_MODE: "no-output" }, outcome: { outcome: "unreadable" } },
      { label: "is not signed in", env: { STAND_IN_MODE: "not-logged-in" }, outcome: { outcome: "failed", reason: "Not logged in · Please run /login" } },
      { label: "is ended by a signal before it answers", env: { STAND_IN_MODE: "signal" }, outcome: { outcome: "failed", reason: "ended by SIGKILL" } },
    ];
    for (const row of rows) {
      const { outcome, log } = await ask({ env: row.env });
      assert.deepEqual(outcome, row.outcome, `[${row.label}]`);
      assert.equal(log.filter((entry) => entry.start).length, 1, `[${row.label}] a miss costs one attempt`);
    }
  } },
  { name: "201/01 task01 · a program that cannot be started is a failure, never a throw: a file that is not executable, a path that names nothing, and no executable at all", run: async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "aof-model-ask-noexec-"));
    try {
      const plain = path.join(dir, "claude");
      await writeFile(plain, "#!/bin/sh\necho '{}'\n", "utf8");
      await chmod(plain, 0o644);
      for (const executable of [{ command: plain, args: [] }, { command: path.join(dir, "absent"), args: [] }]) {
        const { outcome, log } = await ask({ executable });
        assert.equal(outcome.outcome, MODEL_ASK.failed, `${executable.command} cannot be started`);
        assert.equal(typeof outcome.reason, "string");
        assert.equal(log.length, 0, "nothing ran");
      }
      assert.deepEqual(await askModel({ executable: null, timeoutMs: 1000 }), { outcome: MODEL_ASK.failed, reason: "no executable to launch" });
      for (const timeoutMs of [undefined, 0, -1, Number.NaN, "1000"]) {
        assert.deepEqual(await askModel({ executable: EXECUTABLE, timeoutMs }), { outcome: MODEL_ASK.failed, reason: "no time limit" }, `a limit of ${String(timeoutMs)} starts nothing`);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  } },
  { name: "201/01 task01 E5 · a claude that does not answer in time is ended: the ask returns at the limit as a timeout and the process is no longer running", run: async () => {
    const { outcome, start, log, elapsedMs } = await ask({ timeoutMs: 1000, env: { STAND_IN_DELAY_MS: "30000" } });
    assert.deepEqual(outcome, { outcome: MODEL_ASK.timeout });
    assert.ok(elapsedMs < 5000, `the ask returned in ${elapsedMs} ms, well inside the stand-in's 30 s`);
    assert.ok(Number.isInteger(start.pid), "the stand-in had started");
    for (let waited = 0; alive(start.pid) && waited < 3000; waited += 50) await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(alive(start.pid), false, "the stand-in process is no longer running");
    assert.ok(!log.some((entry) => "answered" in entry), "it never answered");
  } },
  { name: "201/01 task01 · a longer limit waits for a slow answer: an answer after 300 ms is read under a 5 s limit", run: async () => {
    const { outcome } = await ask({ timeoutMs: 5000, env: { STAND_IN_DELAY_MS: "300", STAND_IN_ANSWER: "[2]" } });
    assert.deepEqual(outcome, { outcome: MODEL_ASK.answered, text: "[2]" });
  } },
  { name: "201/01 task01 · the answer reader takes the result document's text, the last result of an array, and nothing else", run: () => {
    assert.deepEqual(readModelAnswer('{"type":"result","subtype":"success","is_error":false,"result":"[1]"}\n'), { outcome: "answered", text: "[1]" });
    assert.deepEqual(readModelAnswer(JSON.stringify([{ type: "system" }, { type: "result", subtype: "success", result: "[]" }])), { outcome: "answered", text: "[]" });
    assert.deepEqual(readModelAnswer('{"type":"result","subtype":"success","result":""}'), { outcome: "answered", text: "" }, "an empty answer is the caller's to judge");
    assert.equal(readModelAnswer('{"type":"result","subtype":"error_max_turns","result":"x"}').outcome, "failed");
    for (const stdout of ["", "   ", "null", "[]", '"[1]"', '{"type":"result","subtype":"success"}', "[1, 2]"]) {
      assert.deepEqual(readModelAnswer(stdout), { outcome: "unreadable" }, JSON.stringify(stdout));
    }
  } },
];

async function realTmp() { const { realpath } = await import("node:fs/promises"); return realpath(os.tmpdir()); }
async function exists(target) { const { access } = await import("node:fs/promises"); return access(target).then(() => true, () => false); }
