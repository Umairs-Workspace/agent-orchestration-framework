// test/session/agent-session-driver-transcript.test.mjs — milestone 53 / story 00, task 03
// (03_the-transcript-watches.feature; ADR-001 §1 and §3, RESEARCH §Q1 and §Q8).
//
// The half of the driver that has no PTY in it at all, and the half a local loop most
// needs to behave identically after the move. Both watches are PRODUCER-FED with zero
// model cooperation: Claude Code itself writes
// `<claudeProjectsDir({cwd, env})>/<session_id>.jsonl`, so the FIRST NEW `*.jsonl`
// basename after a pre-spawn snapshot NAMES the session, and the last settled assistant
// record in that file carries the outcome. Neither is a marker anyone had to be
// instructed to print — the F-38.05 lesson that a consumer with no producer reads green
// forever.
//
// THE HERMETIC SEAM IS `CLAUDE_CONFIG_DIR`. `claudeProjectsDir` reads it before it falls
// back to the home directory (src/work/observe.mjs), so a `mkdtemp` root plus a
// synthetic `cwd` gives every scenario below a real directory, real `.jsonl` files and
// real mtimes with no `~/.claude` anywhere near it — the idiom
// test/mesh/worker/mesh-worker-completion-detection.test.mjs already uses. `pollMs`, `idleMs`,
// `declaredIdleMs`, `maxWaitMs`, `now` and `sinceOffset` are all injectable, so no
// scenario wall-waits a production window and none of them is asserted by reading a
// constant back. Mtimes are set EXPLICITLY through `utimes` rather than trusted to the
// filesystem's own resolution, which on this tree's platform is coarse enough to make a
// "did the tree move?" assertion flaky for the wrong reason.
//
// THE TWO WINDOWS ARE THE POINT, and conflating them is the defect the whole design
// exists against. `end_turn` means the MODEL finished speaking, not that the WORK
// finished — a premature `done` destroys work and reports success, a late `done` only
// costs time. So a DECLARED outcome confirms after the short window, an UNDECLARED
// `end_turn` must out-wait the long one, and a LIVE pending question out-waits the long
// one too, because it is answerable at the terminal and parking it fast kills the
// session the operator is about to type into.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, utimes, stat } from "node:fs/promises";
import { utimesSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  defaultWatchTranscriptSessionId,
  defaultWatchTranscriptCompletion,
  driveInteractiveClaudeSession,
  HUMAN_INPUT_TOOL_NAMES,
  NEEDS_INPUT_SENTINEL,
  DIRECTIVE_COMPLETE_SENTINEL,
  NEEDS_INPUT_INSTRUCTION,
  DIRECTIVE_COMPLETE_INSTRUCTION,
  WORKER_SESSION_INSTRUCTION,
} from "../../src/agent-session-driver.mjs";
import * as driverModule from "../../src/agent-session-driver.mjs";
import { claudeProjectsDir, readLastAssistantTurn, askQuestionFromTurn, readAskQuestion } from "../../src/work/observe.mjs";
import { setDegradeSinkForTest } from "../../src/degrade.mjs";
import { fileURLToPath } from "node:url";
import { createFakeWhich, createFakePtySpawn } from "../support/mesh-worker-terminal-fixture.mjs";

// withTranscriptTree(fn) — a mkdtemp root carrying BOTH the hermetic CLAUDE_CONFIG_DIR
// and this scenario's AOF_GLOBAL_HOME, torn down in a finally. `cwd` is synthetic: it is
// only ever slugified into a directory name, never touched on disk.
async function withTranscriptTree(fn) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-transcript-"));
  const previousGlobalHome = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = path.join(root, "global-home");
  try {
    const env = { CLAUDE_CONFIG_DIR: path.join(root, "claude-cfg") };
    const cwd = path.join(root, "worktree");
    const dir = claudeProjectsDir({ cwd, env });
    return await fn({ root, env, cwd, dir });
  } finally {
    if (previousGlobalHome === undefined) delete process.env.AOF_GLOBAL_HOME;
    else process.env.AOF_GLOBAL_HOME = previousGlobalHome;
    await rm(root, { recursive: true, force: true });
  }
}

const assistant = (stop, text) => ({ type: "assistant", message: { role: "assistant", stop_reason: stop, content: [{ type: "text", text }] } });
const assistantStringContent = (stop, text) => ({ type: "assistant", message: { role: "assistant", stop_reason: stop, content: text } });
const toolUse = (name) => ({ type: "assistant", message: { role: "assistant", stop_reason: "tool_use", content: [{ type: "text", text: "working" }, { type: "tool_use", name, input: {} }] } });
const userRecord = () => ({ type: "user", message: { role: "user", content: [{ type: "tool_result", content: "answered" }] } });
const jsonl = (records) => `${records.map((r) => JSON.stringify(r)).join("\n")}\n`;

// A virtual clock for the two windows. `pollMs` stays a real (tiny) timer so the watch
// keeps ticking; `now` is what decides whether a quiet stretch has been long enough, and
// it moves only when a scenario says so.
function virtualClock() {
  let value = 1_000_000;
  return { now: () => value, advance: (ms) => { value += ms; } };
}

// A settled-or-not probe. `null` means "still watching after `ms`", which is a real
// assertion here: a watch that settled early on the wrong window is the premature-done
// defect, and a watch that never settles is the parked-forever one.
async function settledWithin(promise, ms) {
  const pending = Symbol("pending");
  const result = await Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(pending), ms))]);
  return result === pending ? { settled: false } : { settled: true, value: result };
}

// THE CEILING ON EVERY TERMINAL `await watch` IN THIS SUITE, and the reason it exists.
//
// Each scenario below drives a watch to the point where it MUST settle, then awaited it
// bare. When the watch settles that is free; when it does not, a bare await never
// returns — and because these watches poll (`pollMs: 10`), the process sits spinning at
// full tilt on one core with no output, no child process and no progress. A full-suite
// run stalled exactly that way for 148 minutes inside this file and was killed rather
// than diagnosed, because a hang reports nothing a failure would have named.
//
// 30s against a suite whose slowest scenario here is ~340ms: generous enough that a
// loaded machine never trips it, tight enough that the suite always terminates. A
// timeout is a FAILED assertion naming the watch, never a silent park.
const WATCH_CEILING_MS = 30_000;

async function settledOrFail(promise, what = "the watch") {
  const outcome = await settledWithin(promise, WATCH_CEILING_MS);
  assert.ok(outcome.settled, `${what} did not settle within ${WATCH_CEILING_MS}ms — it would have hung the run`);
  return outcome.value;
}

// Bump a path's mtime to an explicitly-chosen instant — see the header on why this is
// not left to the filesystem's own resolution.
let mtimeCursor = Date.UTC(2026, 7, 16, 9, 0, 0);
async function bumpMtime(file) {
  mtimeCursor += 60_000;
  const when = new Date(mtimeCursor);
  await utimes(file, when, when);
}

// The same bump, SYNCHRONOUS — for the one case that must change a file and advance the virtual
// clock in ONE event-loop turn (129's gate, 2026-09-22, F-77): an awaited bump yields, and a 10 ms
// poll can observe the movement at the OLD clock instant, after which advancing the clock settles
// the watch and the case fails about one run in three, alone and unloaded.
function bumpMtimeSync(file) {
  mtimeCursor += 60_000;
  const when = new Date(mtimeCursor);
  utimesSync(file, when, when);
}

// ── milestone 131 / story 01, tasks 00-01 — the one reader of the last assistant turn, and the
// producer's four-line form (ADR-002). The reader moved out of the driver into the transcript
// family; the driver's outcome is a mapping over it, and the rows at the foot of this block are
// the delivered mapping read through the driver's own watch, unchanged.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DRIVER_SOURCE = path.join(repoRoot, "src", "agent-session-driver.mjs");

const textBlock = (text) => ({ type: "text", text });
const toolBlock = (name, input = {}) => ({ type: "tool_use", name, input });
const QUESTION_INPUT = { questions: [{ question: "Which store?", options: [{ label: "sqlite" }, { label: "json" }] }] };
// A(<stop>, <content>): a string content is kept as it is; a list's strings are text blocks.
const A = (stop, content) => ({
  type: "assistant",
  message: { stop_reason: stop, content: typeof content === "string" ? content : content.map((c) => (typeof c === "string" ? textBlock(c) : c)) },
});
const U = { type: "user", message: { content: "ok" } };
const joinRecords = (list, sep = "\n") => `${list.map((r) => (typeof r === "string" ? r : JSON.stringify(r))).join(sep)}${sep}`;

// The degrade sink, injected and reset around one call — `reportDegrade` throttles per code, so a
// sink that is not reset would hide the second scenario's event behind the first's.
async function withDegrades(fn) {
  const events = [];
  setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
  try {
    return await fn(events);
  } finally {
    setDegradeSinkForTest(undefined);
  }
}

// The instruction as delivered at 2bf716f, held as a literal rather than read through `git show`
// (a shallow clone has no such commit). The inserted paragraph removed, the current text must
// equal it byte for byte: the threshold for asking is not this story's to move.
const NEEDS_INPUT_INSTRUCTION_AT_2BF716F = `You are running autonomously on a worker machine with no human present to answer
questions in real time. If you reach a genuine judgment call you cannot safely
resolve on your own — one where guessing risks doing the wrong thing and a human would
need to weigh in — do not guess and do not stall silently. Instead, print the exact
line NEEDS_INPUT on its own line, with nothing else on that line, then
stop. Only use this for a real, blocking judgment call; keep working through every
task you can complete confidently without it.`;

const ADR_002_PARAGRAPH = 'Before you print it, write your question for a human reading it on a phone, as four short lines that begin exactly "Decision needed:", "Options:", "I would pick:" and "What the answer changes:" — the one decision you need, the options you weighed, the one you would take and why, and which tasks, files or later steps depend on the answer. Keep those four lines under 1,500 characters, and put any detail after them.';

const oneSpace = (text) => text.replace(/\s+/gu, " ");
const occurrences = (text, literal) => text.split(literal).length - 1;
// The stripper `acd-worker-driver-no-headless-print` runs over the whole driver source.
const stripLikeTheDriverControl = (source) => source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
const instructionTemplateOf = (source) => {
  const open = "NEEDS_INPUT_INSTRUCTION = `";
  const start = source.indexOf(open);
  assert.ok(start !== -1, "the NEEDS_INPUT_INSTRUCTION template literal was found");
  const bodyStart = start + open.length;
  return source.slice(bodyStart, source.indexOf("`;", bodyStart));
};

function readerAndProducerTests() {
  const readerRows = [
    { name: "records joined by CRLF", body: joinRecords([A("end_turn", ["Q", "NEEDS_INPUT"])], "\r\n"), turn: { stopReason: "end_turn", text: "Q\nNEEDS_INPUT\n", humanInputTool: null, answered: false } },
    { name: "a half-written trailing line", body: `${JSON.stringify(A("end_turn", ["Q"]))}\n{"type":"assistant","mess`, turn: { stopReason: "end_turn", text: "Q\n", humanInputTool: null, answered: false } },
    { name: "a string content", body: joinRecords([A("end_turn", "plain string content")]), turn: { stopReason: "end_turn", text: "plain string content", humanInputTool: null, answered: false } },
    { name: "text, an ordinary tool and a human-input tool", body: joinRecords([A("tool_use", ["Let me ask", toolBlock("Bash"), toolBlock("AskUserQuestion", QUESTION_INPUT)])]), turn: { stopReason: "tool_use", text: "Let me ask\n", humanInputTool: { name: "AskUserQuestion", input: QUESTION_INPUT }, answered: false } },
    { name: "an ordinary tool alone", body: joinRecords([A("tool_use", [toolBlock("Bash")])]), turn: { stopReason: "tool_use", text: "", humanInputTool: null, answered: false } },
    { name: "a human-input tool followed by a system record", body: joinRecords([A("tool_use", [toolBlock("AskUserQuestion", QUESTION_INPUT)]), { type: "system" }]), turn: { stopReason: "tool_use", text: "", humanInputTool: { name: "AskUserQuestion", input: QUESTION_INPUT }, answered: false } },
    { name: "a later assistant record whose message is not an object", body: joinRecords([A("end_turn", ["one"]), { type: "assistant", message: "x" }]), turn: { stopReason: "end_turn", text: "one\n", humanInputTool: null, answered: false } },
    { name: "a user record after the turn", body: joinRecords([A("end_turn", ["old"]), U]), turn: { stopReason: "end_turn", text: "old\n", humanInputTool: null, answered: true } },
    { name: "max_tokens", body: joinRecords([A("max_tokens", ["cut"])]), turn: { stopReason: "max_tokens", text: "cut\n", humanInputTool: null, answered: false } },
    { name: "no stop_reason key", body: joinRecords([{ type: "assistant", message: { content: [textBlock("streaming")] } }]), turn: { stopReason: null, text: "streaming\n", humanInputTool: null, answered: false } },
    { name: "a text block whose text is not a string", body: joinRecords([A("end_turn", ["a", { type: "text", text: 42 }, "b"])]), turn: { stopReason: "end_turn", text: "a\nb\n", humanInputTool: null, answered: false } },
  ];
  const end = (text) => ({ stopReason: "end_turn", text, humanInputTool: null, answered: false });
  const ask = (input, extra = {}) => ({ stopReason: "tool_use", text: "", humanInputTool: { name: "AskUserQuestion", input }, answered: false, ...extra });
  const questionRows = [
    [end("Decision needed: X\nNEEDS_INPUT\n"), "Decision needed: X"],
    [end("Run NEEDS_INPUT now\nNEEDS_INPUT\n"), "Run NEEDS_INPUT now"],
    [end("NEEDS_INPUT.\nNEEDS_INPUT_X\n"), "NEEDS_INPUT.\nNEEDS_INPUT_X"],
    [end("A\r\nNEEDS_INPUT\r\nB\r\n"), "A\r\nB"],
    [end("done\n"), "done"],
    [end("NEEDS_INPUT\nNEEDS_INPUT\n"), null],
    [end(""), null],
    [end("  \n\t\n"), null],
    [ask(QUESTION_INPUT, { text: "preamble\n" }), "Which store?\n- sqlite\n- json"],
    [ask({ questions: [{ question: "Q1", options: [{ label: "a" }, { label: "b" }] }, { question: "Q2", options: [{ label: "c" }] }] }), "Q1\n- a\n- b\n\nQ2\n- c"],
    [ask({ questions: [{ question: "Q3" }] }), "Q3"],
    [ask({}), null],
    [ask({ questions: [] }), null],
    [ask({ questions: "Q" }), null],
    [ask(QUESTION_INPUT, { answered: true }), null],
    [{ stopReason: null, text: "x\n", humanInputTool: null, answered: false }, null],
    [{ stopReason: "max_tokens", text: "cut\n", humanInputTool: null, answered: false }, null],
    [null, null],
  ];

  return [
    {
      name: "131/01 task00 — an ended turn answers its stop reason and its joined text; a pending human-input tool answers the block, and a user record after it answers answered",
      run: async () => withTranscriptTree(async ({ dir }) => {
        await mkdir(dir, { recursive: true });
        const file = path.join(dir, "S.jsonl");
        await writeFile(file, joinRecords([A("end_turn", ["Decision needed: move the residue?", "NEEDS_INPUT"])]), "utf8");
        assert.deepEqual(await readLastAssistantTurn(file), { stopReason: "end_turn", text: "Decision needed: move the residue?\nNEEDS_INPUT\n", humanInputTool: null, answered: false });

        await writeFile(file, joinRecords([A("tool_use", [toolBlock("AskUserQuestion", QUESTION_INPUT)])]), "utf8");
        const pending = await readLastAssistantTurn(file);
        assert.equal(pending.stopReason, "tool_use");
        assert.deepEqual(pending.humanInputTool, { name: "AskUserQuestion", input: QUESTION_INPUT });
        assert.equal(pending.answered, false);
        await writeFile(file, joinRecords([A("tool_use", [toolBlock("AskUserQuestion", QUESTION_INPUT)]), U]), "utf8");
        assert.equal((await readLastAssistantTurn(file)).answered, true, "a user record after the turn answers it");
      }),
    },
    {
      name: "131/01 task00 — the turn read from each transcript shape (eleven rows)",
      run: async () => withTranscriptTree(async ({ dir }) => {
        await mkdir(dir, { recursive: true });
        for (const row of readerRows) {
          const file = path.join(dir, "S.jsonl");
          await writeFile(file, row.body, "utf8");
          assert.deepEqual(await readLastAssistantTurn(file), row.turn, row.name);
        }
      }),
    },
    {
      name: "131/01 task00 — records at or before the resume baseline are not read; an absent, empty or turn-less transcript answers null",
      run: async () => withTranscriptTree(async ({ dir }) => {
        await mkdir(dir, { recursive: true });
        const file = path.join(dir, "S.jsonl");
        await writeFile(file, joinRecords([A("end_turn", ["Q", "NEEDS_INPUT"])]), "utf8");
        const baseline = (await stat(file)).size;
        await writeFile(file, `${await readFile(file, "utf8")}${JSON.stringify(A(null, ["streaming"]))}\n`, "utf8");
        assert.equal((await readLastAssistantTurn(file, baseline)).stopReason, null, "the post-baseline record, never the pre-baseline ended turn");

        assert.equal(await readLastAssistantTurn(path.join(dir, "absent.jsonl")), null, "an absent path");
        await writeFile(path.join(dir, "empty.jsonl"), "", "utf8");
        assert.equal(await readLastAssistantTurn(path.join(dir, "empty.jsonl")), null, "a zero-byte file");
        await writeFile(file, joinRecords([U, U]), "utf8");
        assert.equal(await readLastAssistantTurn(file), null, "only user records");
        await writeFile(file, "{ nope\n", "utf8");
        assert.equal(await readLastAssistantTurn(file), null, "only an unparseable line");
        await mkdir(path.join(dir, "D.jsonl"));
        assert.equal(await readLastAssistantTurn(path.join(dir, "D.jsonl")), null, "a directory");
      }),
    },
    {
      name: "131/01 task00 — the resume baseline keeps a record that starts on it and drops a line it cuts (ten rows, LF and CRLF)",
      run: async () => withTranscriptTree(async ({ dir }) => {
        await mkdir(dir, { recursive: true });
        const file = path.join(dir, "S.jsonl");
        for (const sep of ["\n", "\r\n"]) {
          const first = JSON.stringify(A("end_turn", ["one"]));
          const body = joinRecords([A("end_turn", ["one"]), A("end_turn", ["two"])], sep);
          await writeFile(file, body, "utf8");
          const E1 = Buffer.byteLength(first + sep);
          const N = Buffer.byteLength(body);
          const rows = sep === "\n"
            ? [[0, "two\n"], [5, "two\n"], [E1 - 1, "two\n"], [E1, "two\n"], [E1 + 1, null], [N, null], [N + 10, null]]
            : [[E1 - 1, "two\n"], [E1, "two\n"], [N, null]];
          for (const [offset, text] of rows) {
            const turn = await readLastAssistantTurn(file, offset);
            assert.equal(turn == null ? null : turn.text, text, `sep ${JSON.stringify(sep)}, offset ${offset}`);
          }
        }
      }),
    },
    {
      name: "131/01 task00 — the question is the turn's own words, and nothing else (eighteen rows, plus the two named scenarios)",
      run: () => {
        assert.equal(askQuestionFromTurn(end("Decision needed: X\nOptions: a, b\n  NEEDS_INPUT  \nafter\n")), "Decision needed: X\nOptions: a, b\nafter");
        assert.equal(askQuestionFromTurn(ask(QUESTION_INPUT)), "Which store?\n- sqlite\n- json");
        for (const [turn, question] of questionRows) {
          assert.equal(askQuestionFromTurn(turn), question, JSON.stringify(turn));
        }
      },
    },
    {
      name: "131/01 task00 — readAskQuestion composes the home, the reader and the question, never throws, and degrades a fault once by name",
      run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
        await mkdir(dir, { recursive: true });
        const file = path.join(dir, "S.jsonl");
        await writeFile(file, joinRecords([A("end_turn", "Decision needed: X\nNEEDS_INPUT")]), "utf8");
        await withDegrades(async (events) => {
          assert.equal(await readAskQuestion({ cwd, env, sessionId: "S", sinceOffset: 0 }), "Decision needed: X");
          assert.deepEqual(events, [], "the degrade sink received nothing");
        });
        await withDegrades(async (events) => {
          assert.equal(await readAskQuestion({ cwd, env, sessionId: "absent", sinceOffset: 0 }), null);
          assert.deepEqual(events.map((e) => e.code), ["ask-question-unreadable"]);
        });

        const rows = [
          { body: joinRecords([A("tool_use", [toolBlock("AskUserQuestion", QUESTION_INPUT)])]), id: "S", offset: 0, answer: "Which store?\n- sqlite\n- json", degrades: 0 },
          { body: joinRecords([A("end_turn", ["NEEDS_INPUT"])]), id: "S", offset: 0, answer: null, degrades: 0 },
          { body: joinRecords([A(null, ["x"])]), id: "S", offset: 0, answer: null, degrades: 0 },
          { dir: true, id: "S", offset: 0, answer: null, degrades: 1 },
          { body: joinRecords([U]), id: "S", offset: 0, answer: null, degrades: 1 },
          { body: joinRecords([A("end_turn", ["Decision needed: X", "NEEDS_INPUT"])]), id: "S", offset: "size", answer: null, degrades: 1 },
          { body: joinRecords([A("end_turn", ["Decision needed: X", "NEEDS_INPUT"])]), id: undefined, offset: 0, answer: null, degrades: 1 },
        ];
        for (const [index, row] of rows.entries()) {
          await rm(file, { recursive: true, force: true });
          if (row.dir) await mkdir(file);
          else await writeFile(file, row.body, "utf8");
          const sinceOffset = row.offset === "size" ? (await stat(file)).size : row.offset;
          await withDegrades(async (events) => {
            assert.equal(await readAskQuestion({ cwd, env, sessionId: row.id, sinceOffset }), row.answer, `row ${index}`);
            assert.equal(events.filter((e) => e.code === "ask-question-unreadable").length, row.degrades, `row ${index} degrades`);
          });
        }
      }),
    },
    {
      name: "131/01 task00 — the driver's outcome for each last turn is the one it gives today (nine rows, through the driver's own watch)",
      run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
        await mkdir(dir, { recursive: true });
        const rows = [
          [[A("end_turn", ["Q", "NEEDS_INPUT"])], { outcome: "needs-input", declared: true }],
          [[A("end_turn", ["all done", "AOF_DIRECTIVE_COMPLETE"])], { outcome: "done", declared: true }],
          [[A("end_turn", ["all done"])], { outcome: "done", declared: false }],
          [[A("end_turn", ["say NEEDS_INPUT here"])], { outcome: "done", declared: false }],
          [[A("tool_use", [toolBlock("AskUserQuestion", QUESTION_INPUT)])], { outcome: "needs-input", declared: true, pending: true }],
          [[A("tool_use", [toolBlock("AskUserQuestion", QUESTION_INPUT)]), U], null],
          [[A("tool_use", [toolBlock("Bash")])], null],
          [[A(null, ["x"])], null],
          [[A("max_tokens", ["cut"])], null],
        ];
        for (const [index, [records, outcome]] of rows.entries()) {
          const sessionId = `row-${index}`;
          const file = path.join(dir, `${sessionId}.jsonl`);
          await writeFile(file, joinRecords(records), "utf8");
          await bumpMtime(file);
          const controller = new AbortController();
          const watch = defaultWatchTranscriptCompletion({ cwd, env, sessionId, signal: controller.signal, pollMs: 10, idleMs: 0, declaredIdleMs: 0 });
          if (outcome == null) {
            assert.deepEqual(await settledWithin(watch, 150), { settled: false }, `row ${index} is not settled`);
            controller.abort();
            await settledOrFail(watch);
          } else {
            assert.deepEqual(await settledOrFail(watch), outcome, `row ${index}`);
          }
        }
      }),
    },
    {
      name: "131/01 task00 — the driver's scan is a mapping over the one reader: it imports readLastAssistantTurn, walks no transcript, and keeps the frozen seventeen",
      run: async () => {
        const driver = stripLikeTheDriverControl(await readFile(DRIVER_SOURCE, "utf8"));
        assert.match(driver, /import\s*\{[^}]*\breadLastAssistantTurn\b[^}]*\}\s*from\s*"\.\/work\/observe\.mjs"/u);
        const spawnRuntime = driver.slice(driver.indexOf("export function defaultSpawnRuntime("));
        assert.equal(occurrences(driver, "JSON.parse("), occurrences(spawnRuntime, "JSON.parse("), "the one JSON.parse left is the codex stdout parse in defaultSpawnRuntime");
        assert.equal(occurrences(driver, "stop_reason"), 1, "one stop_reason read is left in the driver");
        assert.equal(occurrences(spawnRuntime, "stop_reason"), 1, "…and it is defaultSpawnRuntime's, which is not a transcript scan");

        const srcRoot = path.join(repoRoot, "src");
        const { readdir } = await import("node:fs/promises");
        const walk = async (d) => (await Promise.all((await readdir(d, { withFileTypes: true })).map((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".mjs") ? [path.join(d, e.name)] : [])))).flat();
        for (const file of await walk(srcRoot)) {
          const rel = path.relative(srcRoot, file).split(path.sep).join("/");
          if (rel === "work/observe.mjs" || rel === "agent-session-driver.mjs") continue;
          assert.equal(occurrences(stripLikeTheDriverControl(await readFile(file, "utf8")), "stop_reason"), 0, `${rel} reads no stop_reason`);
        }
        assert.equal(Object.keys(driverModule).length, 17, "the driver's export set is still the frozen seventeen");
        assert.equal(driverModule.HUMAN_INPUT_TOOL_NAMES, HUMAN_INPUT_TOOL_NAMES);
      },
    },
    {
      name: "131/01 task01 — the paragraph is the ADR's text, before the sentinel sentence, with the four labels once each and in order",
      run: () => {
        const text = NEEDS_INPUT_INSTRUCTION;
        const before = text.indexOf("Before you print it");
        const instead = text.indexOf("Instead, print the exact");
        assert.ok(before !== -1 && instead > before, "the paragraph ends before the sentinel sentence");
        assert.equal(oneSpace(text.slice(before, instead)).trim(), ADR_002_PARAGRAPH, "the paragraph is ADR-002 §3's text");
        const labels = ["Decision needed:", "Options:", "I would pick:", "What the answer changes:"];
        const at = labels.map((label) => {
          assert.equal(occurrences(text, `"${label}"`), 1, `"${label}" appears exactly once`);
          return text.indexOf(label);
        });
        assert.deepEqual([...at].sort((a, b) => a - b), at, "the labels are asked in the ADR's order");
        assert.ok(at.every((i) => i > before && i < instead), "inside the one paragraph");
        assert.equal(occurrences(oneSpace(text), "1,500 characters"), 1);
      },
    },
    {
      name: "131/01 task01 — the producer adds no second copy of a literal the detectors read, and the threshold sentences are byte-identical to 2bf716f",
      run: () => {
        for (const [constant, literal, count] of [
          [NEEDS_INPUT_INSTRUCTION, "NEEDS_INPUT", 1],
          [NEEDS_INPUT_INSTRUCTION, "AOF_DIRECTIVE_COMPLETE", 0],
          [WORKER_SESSION_INSTRUCTION, "Decision needed:", 1],
          [WORKER_SESSION_INSTRUCTION, "What the answer changes:", 1],
        ]) {
          assert.equal(occurrences(constant, literal), count, `${literal} appears ${count} times`);
          assert.ok(constant.split("\n").every((line) => line.trim() !== "NEEDS_INPUT" && line.trim() !== "AOF_DIRECTIVE_COMPLETE"), "no line is a bare sentinel");
        }
        const text = NEEDS_INPUT_INSTRUCTION;
        const inserted = text.slice(text.indexOf("Before you print it"), text.indexOf("Instead, print the exact"));
        assert.equal(text.replace(inserted, ""), NEEDS_INPUT_INSTRUCTION_AT_2BF716F, "the threshold sentences are byte-identical");
        assert.ok(text.includes(`line ${NEEDS_INPUT_SENTINEL} on its own line`), "the sentinel is still requested on a line of its own");
        assert.equal(WORKER_SESSION_INSTRUCTION, `${NEEDS_INPUT_INSTRUCTION}\n\n${DIRECTIVE_COMPLETE_INSTRUCTION}`);
      },
    },
    {
      name: "131/01 task01 — the template holds nothing a comment-stripper would eat, and the stripped source keeps the instruction whole",
      run: async () => {
        const source = await readFile(DRIVER_SOURCE, "utf8");
        const raw = instructionTemplateOf(source);
        assert.ok(!raw.includes("`") && !raw.includes("//") && !raw.includes("/*"), "no backtick, no // and no /* inside the template");
        const stripped = oneSpace(instructionTemplateOf(stripLikeTheDriverControl(source)));
        for (const fragment of ["Before you print it", "put any detail after them.", "Instead, print the exact", "keep working through every"]) {
          assert.ok(stripped.includes(fragment), `the stripped template still holds "${fragment}"`);
        }
      },
    },
  ];
}

export const agentSessionDriverTranscriptTests = [
  // ── the session-id watch ──────────────────────────────────────────────────────────
  {
    name: "53/00 task03 — the session id is the first NEW transcript basename to appear after the snapshot, never a pre-existing one",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "sess-old.jsonl"), "{}\n", "utf8");
      const watch = defaultWatchTranscriptSessionId({ cwd, env, maxWaitMs: 5000 });
      // The snapshot is the FIRST COMPLETED TICK, not the call — so the new file has to
      // land after that tick, not merely after this line.
      await new Promise((resolve) => setTimeout(resolve, 250));
      await writeFile(path.join(dir, "sess-new.jsonl"), "{}\n", "utf8");
      assert.equal(await settledOrFail(watch), "sess-new", "the new file's basename, without its extension");
    }),
  },
  {
    name: "53/00 task03 — the snapshot is the first completed tick: with several pre-existing .jsonl files and nothing new ever written, no pre-existing basename is ever resolved",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      await mkdir(dir, { recursive: true });
      for (const name of ["a.jsonl", "b.jsonl", "c.jsonl"]) await writeFile(path.join(dir, name), "{}\n", "utf8");
      assert.equal(await defaultWatchTranscriptSessionId({ cwd, env, maxWaitMs: 60 }), null, "null at the deadline — never one of the three already there");
    }),
  },
  {
    name: "53/00 task03 — an absent projects directory is an empty snapshot, never a throw: the directory is created later and its one .jsonl is resolved",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      const watch = defaultWatchTranscriptSessionId({ cwd, env, maxWaitMs: 5000 });
      await new Promise((resolve) => setTimeout(resolve, 250));
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "sess-late.jsonl"), "{}\n", "utf8");
      assert.equal(await settledOrFail(watch), "sess-late", "the basename that appeared after the empty snapshot");
    }),
  },
  {
    name: "53/00 task03 — a non-.jsonl file is never a session id, and a subsequent real .jsonl still is",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      await mkdir(dir, { recursive: true });
      const decoys = defaultWatchTranscriptSessionId({ cwd, env, maxWaitMs: 250 });
      await new Promise((resolve) => setTimeout(resolve, 60));
      await writeFile(path.join(dir, "notes.txt"), "x", "utf8");
      await writeFile(path.join(dir, "sess-half.jsonl.tmp"), "x", "utf8");
      assert.equal(await decoys, null, "neither the .txt nor the .jsonl.tmp is resolved");

      const real = defaultWatchTranscriptSessionId({ cwd, env, maxWaitMs: 5000 });
      await new Promise((resolve) => setTimeout(resolve, 250));
      await writeFile(path.join(dir, "sess-real.jsonl"), "{}\n", "utf8");
      assert.equal(await real, "sess-real", "a subsequent real .jsonl is");
    }),
  },
  {
    name: "53/00 task03 — an abort resolves null promptly, without waiting out the deadline; and an already-aborted signal short-circuits before any filesystem call",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      await mkdir(dir, { recursive: true });
      const controller = new AbortController();
      const started = Date.now();
      const watch = defaultWatchTranscriptSessionId({ cwd, env, signal: controller.signal, maxWaitMs: 60_000 });
      controller.abort();
      assert.equal(await settledOrFail(watch), null, "the watch resolves null on abort");
      assert.ok(Date.now() - started < 5000, "and it resolves without reaching its maxWaitMs");

      const already = new AbortController();
      already.abort();
      assert.equal(await defaultWatchTranscriptSessionId({ cwd, env, signal: already.signal, maxWaitMs: 60_000 }), null, "an already-aborted signal short-circuits");
    }),
  },
  {
    name: "53/00 task03 — the deadline degrades to a null session id rather than an unbounded loop, and the driver that consumes it reports sessionId: null rather than crashing",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      await mkdir(dir, { recursive: true });
      assert.equal(await defaultWatchTranscriptSessionId({ cwd, env, maxWaitMs: 30 }), null, "null at the deadline");

      // The consumer's own degrade, over the REAL watch: the driver is handed the
      // production seam with a tiny maxWaitMs and no transcript is ever written.
      const { spawn } = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
      const result = await driveInteractiveClaudeSession(
        { itemRef: "53/00", worktreeCwd: cwd, task: "demo", command: "/aof:verify 53/00" },
        {
          ptySpawn: spawn,
          which: createFakeWhich(["claude"]),
          env,
          commandDelayMs: 0,
          watchTranscriptSessionId: (args) => defaultWatchTranscriptSessionId({ ...args, maxWaitMs: 30 }),
        },
      );
      assert.deepEqual(result, { outcome: "done", sessionId: null }, "the driver reports sessionId: null, never a crash");
    }),
  },
  {
    name: "53/00 task03 — readdir failing on a tick is null at the deadline, never a throw (the projects path is a FILE, so every readdir rejects)",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      await mkdir(path.dirname(dir), { recursive: true });
      await writeFile(dir, "not a directory", "utf8");
      assert.equal(await defaultWatchTranscriptSessionId({ cwd, env, maxWaitMs: 60 }), null, "every tick's fs fault degrades to `nothing new this tick`");
    }),
  },

  // ── the completion watch: the last-record mapping ─────────────────────────────────
  {
    name: "53/00 task03 — the completion watch refuses a missing session id without touching the disk (absent, empty, and not-a-string)",
    run: async () => withTranscriptTree(async ({ env, cwd }) => {
      for (const sessionId of [undefined, "", null, 42, {}]) {
        assert.equal(await defaultWatchTranscriptCompletion({ cwd, env, sessionId }), null, `sessionId ${JSON.stringify(sessionId)} resolves null immediately`);
      }
      assert.equal(await defaultWatchTranscriptCompletion(), null, "and so does a call with no argument at all");
    }),
  },
  {
    name: "53/00 task03 — THE LAST-RECORD MAPPING: fourteen rows from the transcript's own final assistant record, decided over a real tree",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      await mkdir(dir, { recursive: true });
      // `idleMs: 0`/`declaredIdleMs: 0` in this lane: the WINDOW rule has its own lanes
      // below; here the MAPPING is what is under test, so the window is collapsed
      // rather than waited out.
      const settle = (sessionId, extra = {}) => defaultWatchTranscriptCompletion({ cwd, env, sessionId, pollMs: 10, idleMs: 0, declaredIdleMs: 0, ...extra });
      const write = async (sid, records) => {
        const file = path.join(dir, `${sid}.jsonl`);
        await writeFile(file, records == null ? "" : jsonl(records), "utf8");
        await bumpMtime(file);
        return file;
      };

      const rows = [
        { label: "end_turn, ordinary text", records: [assistant("end_turn", "All done.")], expect: { outcome: "done", declared: false } },
        { label: "end_turn carrying AOF_DIRECTIVE_COMPLETE on its line", records: [assistant("end_turn", `Everything is recorded.\n${DIRECTIVE_COMPLETE_SENTINEL}`)], expect: { outcome: "done", declared: true } },
        { label: "end_turn carrying NEEDS_INPUT on its line", records: [assistant("end_turn", `I hit a blocking decision.\n${NEEDS_INPUT_SENTINEL}`)], expect: { outcome: "needs-input", declared: true } },
        { label: "end_turn carrying BOTH sentinels — the human wins", records: [assistant("end_turn", `${DIRECTIVE_COMPLETE_SENTINEL}\n${NEEDS_INPUT_SENTINEL}`)], expect: { outcome: "needs-input", declared: true } },
        { label: "end_turn with string content rather than blocks", records: [assistantStringContent("end_turn", `done here\n${DIRECTIVE_COMPLETE_SENTINEL}`)], expect: { outcome: "done", declared: true } },
        { label: "tool_use, unanswered AskUserQuestion", records: [toolUse("AskUserQuestion")], expect: { outcome: "needs-input", declared: true, pending: true } },
        { label: "tool_use, AskUserQuestion with a user record behind it", records: [toolUse("AskUserQuestion"), userRecord()], expect: null },
        { label: "tool_use, Bash", records: [toolUse("Bash")], expect: null },
        { label: "tool_use, Edit", records: [toolUse("Edit")], expect: null },
        { label: "tool_use, Task", records: [toolUse("Task")], expect: null },
        { label: "stop_reason null", records: [assistant(null, "thinking")], expect: null },
        { label: "max_tokens", records: [assistant("max_tokens", "truncated")], expect: null },
        { label: "no assistant record at all", records: [{ type: "system" }, userRecord()], expect: null },
        { label: "file present but every line unparseable", records: null, unparseable: true, expect: null },
      ];

      for (const [index, row] of rows.entries()) {
        const sid = `row-${index}`;
        if (row.unparseable) {
          const file = path.join(dir, `${sid}.jsonl`);
          await writeFile(file, "{not json\nalso not json\n", "utf8");
          await bumpMtime(file);
        } else {
          await write(sid, row.records);
        }
        if (row.expect === null) {
          // "still working" never settles at all, so the assertion is that nothing
          // settles inside a generous window — not that null was returned.
          const probe = await settledWithin(settle(sid, { signal: AbortSignal.timeout(120) }), 400);
          assert.equal(probe.settled, true, `${row.label}: the aborted watch resolved`);
          assert.equal(probe.value, null, `${row.label}: nothing settled — an ABORT is what ended the watch, not an outcome`);
        } else {
          assert.deepEqual(await settle(sid), row.expect, row.label);
        }
      }

      // "file absent" — the fifteenth row, and the one with no file to write.
      const absent = await settledWithin(settle("never-written", { signal: AbortSignal.timeout(120) }), 400);
      assert.equal(absent.value, null, "file absent: nothing settles, and nothing throws");
    }),
  },
  {
    name: "53/00 task03 — an absent, empty or half-written transcript is `nothing settled yet` and never a throw, and a later complete record still settles normally",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      await mkdir(dir, { recursive: true });
      const file = path.join(dir, "half.jsonl");
      const settle = (extra = {}) => defaultWatchTranscriptCompletion({ cwd, env, sessionId: "half", pollMs: 10, idleMs: 0, declaredIdleMs: 0, ...extra });

      await writeFile(file, "", "utf8");
      await bumpMtime(file);
      assert.equal((await settledWithin(settle({ signal: AbortSignal.timeout(120) }), 400)).value, null, "a zero-length transcript settles nothing");

      await writeFile(file, `${JSON.stringify(assistant("end_turn", "ok")).slice(0, 40)}`, "utf8");
      await bumpMtime(file);
      assert.equal((await settledWithin(settle({ signal: AbortSignal.timeout(120) }), 400)).value, null, "a truncated JSON line settles nothing and raises nothing");

      await writeFile(file, jsonl([assistant("end_turn", "ok")]), "utf8");
      await bumpMtime(file);
      assert.deepEqual(await settle(), { outcome: "done", declared: false }, "and a later complete record still settles normally");
    }),
  },
  {
    name: "53/00 task03 — HUMAN_INPUT_TOOL_NAMES is the closed set that decides `waiting on a person`: an ordinary pending tool is genuinely still working and fires no pending report",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      assert.deepEqual(HUMAN_INPUT_TOOL_NAMES, ["AskUserQuestion"], "the closed set is exactly one tool name");
      await mkdir(dir, { recursive: true });
      for (const tool of ["Bash", "Edit", "Task"]) {
        const file = path.join(dir, `${tool}.jsonl`);
        await writeFile(file, jsonl([toolUse(tool)]), "utf8");
        await bumpMtime(file);
        const reports = [];
        const probe = await settledWithin(
          defaultWatchTranscriptCompletion({
            cwd, env, sessionId: tool, pollMs: 10, idleMs: 0, declaredIdleMs: 0,
            signal: AbortSignal.timeout(120),
            onPendingInput: () => reports.push("pending"),
            onPendingInputCleared: () => reports.push("cleared"),
          }),
          400,
        );
        assert.equal(probe.value, null, `a pending ${tool} call settles nothing`);
        assert.deepEqual(reports, [], `and fires no pending report for ${tool}`);
      }
    }),
  },

  // ── the completion watch: the two windows ─────────────────────────────────────────
  {
    name: "53/00 task03 — a declared outcome confirms after the SHORT window and an undeclared end_turn out-waits the LONG one",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      await mkdir(dir, { recursive: true });
      const declaredFile = path.join(dir, "declared.jsonl");
      const undeclaredFile = path.join(dir, "undeclared.jsonl");
      await writeFile(declaredFile, jsonl([assistant("end_turn", `finished\n${DIRECTIVE_COMPLETE_SENTINEL}`)]), "utf8");
      await writeFile(undeclaredFile, jsonl([assistant("end_turn", "finished, but never said so")]), "utf8");
      await bumpMtime(declaredFile);
      await bumpMtime(undeclaredFile);

      const clock = virtualClock();
      const opts = { cwd, env, pollMs: 10, declaredIdleMs: 1_000, idleMs: 500_000, now: clock.now };
      const declared = defaultWatchTranscriptCompletion({ ...opts, sessionId: "declared" });
      const undeclared = defaultWatchTranscriptCompletion({ ...opts, sessionId: "undeclared" });

      // Let both take their first tick (which is what starts the quiet stretch), then
      // move the clock past the SHORT window only.
      await new Promise((resolve) => setTimeout(resolve, 40));
      clock.advance(2_000);

      assert.deepEqual(await declared, { outcome: "done", declared: true }, "the declared outcome settles on the short window");
      const stillWaiting = await settledWithin(undeclared, 120);
      assert.equal(stillWaiting.settled, false, "the undeclared end_turn, quiet for the same stretch, has NOT settled — a premature done destroys work and reports success");

      clock.advance(600_000);
      assert.deepEqual(await undeclared, { outcome: "done", declared: false }, "it settles only once the long window has passed");
    }),
  },
  {
    name: "53/00 task03 — any movement anywhere in the session tree restarts the quiet stretch, so the outcome does not settle on the original clock",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      const sessionId = "tree";
      await mkdir(path.join(dir, sessionId, "subagents"), { recursive: true });
      const parent = path.join(dir, `${sessionId}.jsonl`);
      const child = path.join(dir, sessionId, "subagents", "agent-1.jsonl");
      await writeFile(parent, jsonl([assistant("end_turn", `settled\n${DIRECTIVE_COMPLETE_SENTINEL}`)]), "utf8");
      await writeFile(child, "{}\n", "utf8");
      await bumpMtime(parent);
      await bumpMtime(child);

      const clock = virtualClock();
      const watch = defaultWatchTranscriptCompletion({ cwd, env, sessionId, pollMs: 10, declaredIdleMs: 1_000, idleMs: 500_000, now: clock.now });
      await new Promise((resolve) => setTimeout(resolve, 40));
      // A file under <projectsDir>/<sessionId>/ is written BEFORE the window elapses — and the clock
      // advances in the SAME turn, so no poll can observe the movement at the old instant (F-77).
      bumpMtimeSync(child);
      clock.advance(2_000);
      const afterMovement = await settledWithin(watch, 200);
      assert.equal(afterMovement.settled, false, "the quiet stretch restarted — the outcome does not settle on the original clock");

      clock.advance(2_000);
      assert.deepEqual(await settledOrFail(watch), { outcome: "done", declared: true }, "and it settles once the tree has genuinely been quiet for the window");
    }),
  },
  {
    name: "53/00 task03 — a parent that finished over a still-writing subagent is never quiet: it settles only after the WHOLE tree stops moving",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      const sessionId = "parked-parent";
      await mkdir(path.join(dir, sessionId), { recursive: true });
      const parent = path.join(dir, `${sessionId}.jsonl`);
      const child = path.join(dir, sessionId, "subagent.jsonl");
      await writeFile(parent, jsonl([assistant("end_turn", "the parent turn ended")]), "utf8");
      await writeFile(child, "{}\n", "utf8");
      await bumpMtime(parent);
      await bumpMtime(child);

      const clock = virtualClock();
      const watch = defaultWatchTranscriptCompletion({ cwd, env, sessionId, pollMs: 10, declaredIdleMs: 1_000, idleMs: 5_000, now: clock.now });

      // The subagent keeps writing, and the clock keeps moving past the window. Neither
      // on its own is enough: the outcome must not settle while the TREE moves.
      let stillWriting = true;
      const writer = (async () => {
        while (stillWriting) {
          await bumpMtime(child);
          clock.advance(2_000);
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      })();
      const duringWrites = await settledWithin(watch, 300);
      assert.equal(duringWrites.settled, false, "it does not settle while the subagent keeps writing");
      stillWriting = false;
      await writer;

      clock.advance(10_000);
      assert.deepEqual(await settledOrFail(watch), { outcome: "done", declared: false }, "and settles only after the whole tree is quiet for the required window");
    }),
  },
  {
    name: "69/05 task00 — a live AskUserQuestion is reported and parks at once without waiting for either idle window",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      await mkdir(dir, { recursive: true });
      const file = path.join(dir, "live-question.jsonl");
      await writeFile(file, jsonl([toolUse("AskUserQuestion")]), "utf8");
      await bumpMtime(file);

      const reports = [];
      const clock = virtualClock();
      const watch = defaultWatchTranscriptCompletion({
        cwd, env, sessionId: "live-question", pollMs: 10, declaredIdleMs: 1_000, idleMs: 500_000, now: clock.now,
        onPendingInput: () => reports.push("pending"),
        onPendingInputCleared: () => reports.push("cleared"),
      });
      assert.deepEqual(await settledOrFail(watch), { outcome: "needs-input", declared: true, pending: true }, "the visible block parks immediately");
      assert.deepEqual(reports, ["pending"], "onPendingInput fires exactly once before the park");
      assert.equal(clock.now(), 1_000_000, "neither idle window had to advance");
    }),
  },
  {
    name: "69/05 task00 — a question already answered in the transcript is not parked as pending",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      await mkdir(dir, { recursive: true });
      const file = path.join(dir, "answered.jsonl");
      await writeFile(file, jsonl([toolUse("AskUserQuestion"), userRecord()]), "utf8");
      await bumpMtime(file);

      const reports = [];
      const controller = new AbortController();
      const clock = virtualClock();
      const watch = defaultWatchTranscriptCompletion({
        cwd, env, sessionId: "answered", pollMs: 10, declaredIdleMs: 1_000, idleMs: 500_000, now: clock.now,
        signal: controller.signal,
        onPendingInput: () => reports.push("pending"),
        onPendingInputCleared: () => reports.push("cleared"),
      });
      await new Promise((resolve) => setTimeout(resolve, 80));
      assert.deepEqual(reports, [], "history already carrying the answer never reports a pending block");

      clock.advance(600_000);
      const stillLive = await settledWithin(watch, 150);
      assert.equal(stillLive.settled, false, "and the outcome reads as still working — an answered question is a live session, not a parked one");
      controller.abort();
      assert.equal(await settledOrFail(watch), null, "an abort is what ends the watch, not an outcome");
    }),
  },
  {
    name: "69/05 task00 — a pending-report fault never prevents the immediate park",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      await mkdir(dir, { recursive: true });
      const file = path.join(dir, "faulty-hooks.jsonl");
      await writeFile(file, jsonl([toolUse("AskUserQuestion")]), "utf8");
      await bumpMtime(file);

      const clock = virtualClock();
      const watch = defaultWatchTranscriptCompletion({
        cwd, env, sessionId: "faulty-hooks", pollMs: 10, declaredIdleMs: 1_000, idleMs: 5_000, now: clock.now,
        onPendingInput: () => { throw new Error("a synchronous report fault"); },
        onPendingInputCleared: async () => { throw new Error("a rejected report"); },
      });
      assert.deepEqual(await settledOrFail(watch), { outcome: "needs-input", declared: true, pending: true }, "the watch still parks on its own rule, and the hook fault does not escape");
    }),
  },

  // ── the resume baseline ───────────────────────────────────────────────────────────
  {
    name: "53/00 task03 — sinceOffset is the resume baseline: the pre-baseline outcome is not returned, and a record written after it is",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      await mkdir(dir, { recursive: true });
      const file = path.join(dir, "resumed.jsonl");
      const parked = jsonl([assistant("end_turn", `parked here\n${NEEDS_INPUT_SENTINEL}`)]);
      await writeFile(file, parked, "utf8");
      await bumpMtime(file);
      const sinceOffset = (await stat(file)).size;

      const settle = (extra = {}) => defaultWatchTranscriptCompletion({ cwd, env, sessionId: "resumed", pollMs: 10, idleMs: 0, declaredIdleMs: 0, sinceOffset, ...extra });

      // Without a post-baseline record the pre-resume verdict must NOT be returned —
      // reading it as the verdict killed the fresh PTY ~12s after every resume.
      assert.equal((await settledWithin(settle({ signal: AbortSignal.timeout(120) }), 400)).value, null, "the pre-baseline outcome is not returned");

      await writeFile(file, `${parked}${jsonl([assistant("end_turn", `and now genuinely finished\n${DIRECTIVE_COMPLETE_SENTINEL}`)])}`, "utf8");
      await bumpMtime(file);
      assert.deepEqual(await settle(), { outcome: "done", declared: true }, "a record written after the baseline is");
    }),
  },
  {
    name: "53/00 task03 — a baseline that lands exactly on a record boundary keeps the next record, and one that cut mid-record drops its partial first line",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      await mkdir(dir, { recursive: true });
      const head = jsonl([assistant("end_turn", "pre-resume history")]);
      const tail = jsonl([assistant("end_turn", `after the baseline\n${DIRECTIVE_COMPLETE_SENTINEL}`)]);

      // ON the boundary: the byte before the offset is the newline that ends the head.
      const onBoundary = path.join(dir, "on-boundary.jsonl");
      await writeFile(onBoundary, `${head}${tail}`, "utf8");
      await bumpMtime(onBoundary);
      assert.deepEqual(
        await defaultWatchTranscriptCompletion({ cwd, env, sessionId: "on-boundary", pollMs: 10, idleMs: 0, declaredIdleMs: 0, sinceOffset: Buffer.byteLength(head, "utf8") }),
        { outcome: "done", declared: true },
        "the first post-baseline record is NOT dropped",
      );

      // MID-record: the offset lands inside the tail's only line, so that partial line
      // is dropped and nothing is left to settle.
      const midLine = path.join(dir, "mid-line.jsonl");
      await writeFile(midLine, `${head}${tail}`, "utf8");
      await bumpMtime(midLine);
      const midOffset = Buffer.byteLength(head, "utf8") + 20;
      const probe = await settledWithin(
        defaultWatchTranscriptCompletion({ cwd, env, sessionId: "mid-line", pollMs: 10, idleMs: 0, declaredIdleMs: 0, sinceOffset: midOffset, signal: AbortSignal.timeout(120) }),
        400,
      );
      assert.equal(probe.value, null, "a baseline that cut mid-record does drop its partial first line");
    }),
  },
  {
    name: "70/04 a byte completion offset survives multibyte pre-resume history and observes the fresh declared outcome",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      await mkdir(dir, { recursive: true });
      const file = path.join(dir, "multibyte-resume.jsonl");
      const head = jsonl([assistant("end_turn", "pre-resume café 🌍 漢字 history")]);
      const tail = jsonl([assistant("end_turn", `fresh completion\n${DIRECTIVE_COMPLETE_SENTINEL}`)]);
      await writeFile(file, head, "utf8");
      const sinceOffset = (await stat(file)).size;
      assert.ok(sinceOffset > head.length, "the regression requires UTF-8 byte and JavaScript character offsets to differ");

      const watch = defaultWatchTranscriptCompletion({
        cwd,
        env,
        sessionId: "multibyte-resume",
        pollMs: 10,
        idleMs: 0,
        declaredIdleMs: 0,
        sinceOffset,
        signal: AbortSignal.timeout(500),
      });
      await writeFile(file, `${head}${tail}`, "utf8");
      await bumpMtime(file);
      assert.deepEqual(await settledOrFail(watch), { outcome: "done", declared: true });
    }),
  },

  // ── the session-id watch's boundary table ─────────────────────────────────────────
  {
    name: "53/00 task03 — THE SESSION-ID WATCH'S BOUNDARY: every way it can end is a basename or null, never a throw and never an unbounded wait",
    run: async () => withTranscriptTree(async ({ root, env, cwd, dir }) => {
      const outcomes = [];
      const record = async (condition, promise) => {
        try {
          outcomes.push({ condition, resolved: await promise });
        } catch (error) {
          outcomes.push({ condition, threw: String(error?.message ?? error) });
        }
      };

      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "pre.jsonl"), "{}\n", "utf8");
      await record("only pre-existing .jsonl files exist", defaultWatchTranscriptSessionId({ cwd, env, maxWaitMs: 40 }));

      const appearing = defaultWatchTranscriptSessionId({ cwd, env, maxWaitMs: 5000 });
      await new Promise((resolve) => setTimeout(resolve, 250));
      await writeFile(path.join(dir, "fresh.jsonl"), "{}\n", "utf8");
      await record("a new .jsonl appears after the snapshot", appearing);

      await record("a .txt appears", (async () => {
        await writeFile(path.join(dir, "note.txt"), "x", "utf8");
        return defaultWatchTranscriptSessionId({ cwd: path.join(root, "another"), env, maxWaitMs: 40 });
      })());

      const midAbort = new AbortController();
      const aborting = defaultWatchTranscriptSessionId({ cwd, env, signal: midAbort.signal, maxWaitMs: 60_000 });
      setTimeout(() => midAbort.abort(), 20);
      await record("the signal aborts mid-watch", aborting);

      const preAborted = new AbortController();
      preAborted.abort();
      await record("the signal was already aborted", defaultWatchTranscriptSessionId({ cwd, env, signal: preAborted.signal, maxWaitMs: 60_000 }));

      await record("the projects directory never exists", defaultWatchTranscriptSessionId({ cwd: path.join(root, "no-such-worktree"), env, maxWaitMs: 40 }));

      const brokenCwd = path.join(root, "broken");
      const brokenDir = claudeProjectsDir({ cwd: brokenCwd, env });
      await mkdir(path.dirname(brokenDir), { recursive: true });
      await writeFile(brokenDir, "not a directory", "utf8");
      await record("readdir fails on a tick", defaultWatchTranscriptSessionId({ cwd: brokenCwd, env, maxWaitMs: 40 }));

      assert.equal(outcomes.length, 7, "every boundary row was exercised");
      assert.deepEqual(outcomes.filter((o) => "threw" in o), [], "no row throws");
      assert.deepEqual(
        outcomes.map((o) => [o.condition, o.resolved]),
        [
          ["only pre-existing .jsonl files exist", null],
          ["a new .jsonl appears after the snapshot", "fresh"],
          ["a .txt appears", null],
          ["the signal aborts mid-watch", null],
          ["the signal was already aborted", null],
          ["the projects directory never exists", null],
          ["readdir fails on a tick", null],
        ],
        "a basename or null — the whole contract",
      );
    }),
  },
  {
    name: "70/04 resumed default watcher path monitors the known existing transcript instead of waiting for a new basename",
    run: async () => withTranscriptTree(async ({ env, cwd, dir }) => {
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "known-session.jsonl"), "{}\n", "utf8");
      const fake = createFakePtySpawn({ onWrite: ({ emitExit }) => emitExit(0) });
      const result = await driveInteractiveClaudeSession(
        { itemRef: "70/04", worktreeCwd: cwd, task: "fix", command: "/aof:continue 70/04" },
        {
          ptySpawn: fake.spawn,
          which: createFakeWhich(["claude"]),
          env,
          resumeSessionId: "known-session",
          commandDelayMs: 0,
        },
      );
      assert.equal(result.sessionId, "known-session", "the known id survives without a new transcript basename");
      assert.deepEqual(fake.spawnCalls[0].args.slice(-2), ["--resume", "known-session"]);
    }),
  },
  ...readerAndProducerTests(),
];

