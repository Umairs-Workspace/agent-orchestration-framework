// test/loop/loop-diag.test.mjs — the loop's HOME-SIDE files: the exit-reason recorder
// (src/loop-diag.mjs, 2026-09-11) and, since 130/01, the stop request (src/loop/stop-request.mjs).
//
// The recorder is exercised against an INJECTED process double: a real `process.on("exit")` or a
// wrapped `process.exit` registered in the test runner would outlive the test, so nothing in that
// half touches the real process, the real stderr or the real filesystem. The stop request's half
// (below) drives the same process double and writes only inside the isolated aof home the runner
// hands every test.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { EventEmitter } from "node:events";
import { access, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setDegradeSinkForTest } from "../../src/degrade.mjs";
import { globalMeshPaths } from "../../src/workspace.mjs";
import { stripComments } from "../support/source-slice.mjs";
import {
  STOP_LEVELS,
  STOP_STATES,
  clearStopRequest,
  createStopSource,
  loopStopsDir,
  markStopHonoured,
  readStopRequest,
  requestLoopStop,
  stopRequestPath,
} from "../../src/loop/stop-request.mjs";
import {
  answerAsk,
  askRequestPath,
  clearAsk,
  createAskPoll,
  loopAsksDir,
  openAsk,
  parkAsk,
  readAsk,
  readAsks,
} from "../../src/loop/ask-request.mjs";
import {
  LOOP_DIAG_ENV,
  LOOP_DIAG_KEEP,
  LOOP_DIAG_PREFIX,
  formatLoopDiagLine,
  installLoopDiagnostics,
  loopDiagEnabled,
  loopDiagLogDir,
  loopDiagLogPath,
  loopDiagScopeTag,
  pruneLoopDiagLogs,
  readLastLoopDiagEvent,
} from "../../src/loop-diag.mjs";

function fakeProcess() {
  const proc = new EventEmitter();
  proc.pid = 4242;
  proc.version = "v22.0.0-test";
  proc.exitCode = undefined;
  proc.exited = [];
  proc.exit = (code) => { proc.exited.push(code); };
  proc.stderrOut = [];
  proc.stderr = { write: (chunk) => { proc.stderrOut.push(String(chunk)); return true; } };
  proc.stdoutOut = [];
  proc.stdout = { write: (chunk) => { proc.stdoutOut.push(String(chunk)); return true; } };
  proc.memoryUsage = () => ({ rss: 100 * 1048576, heapUsed: 40 * 1048576 });
  return proc;
}

function fakeFs() {
  const files = new Map();
  return {
    files,
    appendFileSync: (file, text) => { files.set(file, (files.get(file) ?? "") + text); },
    mkdirSync: () => {},
    readdirSync: (dir) => [...files.keys()].filter((f) => path.dirname(f) === dir).map((f) => path.basename(f)),
    unlinkSync: (file) => { files.delete(file); },
  };
}

const ROOT = path.join("C:", "home", "mesh", "logs");
const at = new Date("2026-09-11T16:35:20.000Z");

const recorderTests = [
  {
    name: "loop-diag/00 the log lives beside the daemon logs in the aof home (honouring AOF_GLOBAL_HOME), never in the checkout; named by the install instant, every line timestamped",
    run() {
      const home = path.join("C:", "tmp", "aof-home");
      assert.equal(loopDiagLogDir({ AOF_GLOBAL_HOME: home }), path.join(home, "mesh", "logs"), "the global mesh logs directory, through the one resolver every daemon log uses");
      assert.equal(loopDiagScopeTag(["work", "loop", "127", "--level", "L2"]), "127", "the scope after `loop` becomes the filename tag");
      assert.equal(loopDiagScopeTag(["work", "loop", "01-05"]), "01-05", "a range is a safe segment as-is");
      assert.equal(loopDiagScopeTag(["work", "loop"]), "loop", "an absent scope falls back to `loop`");
      assert.equal(loopDiagScopeTag([]), "loop");
      const logPath = loopDiagLogPath(ROOT, "127", at);
      assert.equal(path.dirname(logPath), ROOT);
      assert.match(path.basename(logPath), /^loop-diag\.127\./, "the scope is the log's second dot-segment, so retention can be per-scope");
      assert.ok(path.basename(logPath).startsWith(LOOP_DIAG_PREFIX) && path.basename(logPath).endsWith(".log"));
      assert.ok(!/[:.]log$/.test(path.basename(logPath).slice(0, -4)), "no colon or dot in the stamp — a portable file name");
      assert.equal(formatLoopDiagLine("exit", "code=0", at), "2026-09-11T16:35:20.000Z exit code=0");
      assert.equal(formatLoopDiagLine("beforeExit", null, at), "2026-09-11T16:35:20.000Z beforeExit");
    },
  },
  {
    name: "loop-diag/00 AOF_LOOP_DIAG=0 opts out; absent, blank or anything else is ON — the recorder is a default while the silent deaths are being debugged",
    run() {
      assert.equal(loopDiagEnabled({}), true);
      assert.equal(loopDiagEnabled({ [LOOP_DIAG_ENV]: "" }), true);
      assert.equal(loopDiagEnabled({ [LOOP_DIAG_ENV]: "1" }), true);
      for (const off of ["0", "false", "off"]) assert.equal(loopDiagEnabled({ [LOOP_DIAG_ENV]: off }), false, `${off} opts out`);
      assert.equal(installLoopDiagnostics({ logDir: ROOT, proc: fakeProcess(), env: { [LOOP_DIAG_ENV]: "0" }, fs: fakeFs() }), null);
    },
  },
  {
    name: "loop-diag/00 every way out is recorded by name — a drained loop, a plain exit, a signal, an explicit process.exit with its call site — and stderr is teed into the log",
    run() {
      const proc = fakeProcess();
      const fs = fakeFs();
      const handle = installLoopDiagnostics({ logDir: ROOT, argv: ["work", "loop", "127"], proc, env: {}, fs, now: () => at, aliveIntervalMs: 0, build: () => "payload d90568d.20260921T230514" });
      assert.ok(handle && handle.logPath.startsWith(ROOT));
      assert.deepEqual(proc.stderrOut, [], "nothing is announced until the loop prints something itself — a refused invocation's stderr stays exactly its refusal");
      const log = () => fs.files.get(handle.logPath) ?? "";
      // 129/06 (2026-09-21): the tree that ran is on the first line — the payload was re-stamped
      // MID-run and the log could not say which tree the loop had loaded.
      assert.match(log(), /start pid=4242 node=v22\.0\.0-test build=payload d90568d\.20260921T230514 argv=\["work","loop","127"\]/);
      {
        const broken = fakeProcess();
        const brokenFs = fakeFs();
        const h = installLoopDiagnostics({ logDir: ROOT, argv: ["work", "loop", "127"], proc: broken, env: {}, fs: brokenFs, now: () => at, aliveIntervalMs: 0, build: () => { throw new Error("no stamp"); } });
        assert.match(brokenFs.files.get(h.logPath) ?? "", /start pid=4242 node=v22\.0\.0-test build=unknown argv=/, "a build reader that throws degrades to `unknown` and the start line is still written");
      }

      proc.emit("beforeExit", 0);
      assert.match(log(), /beforeExit code=0 — the event loop drained/);
      proc.emit("exit", 0);
      assert.match(log(), /\nexit code=0|Z exit code=0/);
      // The loop shell's own `process.once("SIGINT")` is registered, so the signal is the
      // shell's to answer: the recorder writes its line and defers (the case below is the other half).
      proc.once("SIGINT", () => {});
      proc.emit("SIGINT");
      assert.match(log(), /signal SIGINT/);
      assert.deepEqual(proc.exited, [], "with another listener present the recorder does not exit the process");

      proc.exit(7);
      assert.deepEqual(proc.exited, [7], "the real exit still happens");
      assert.match(log(), /process\.exit code=7\nError: exit call site/);

      proc.stderr.write("boom\n");
      assert.deepEqual(proc.stderrOut, ["boom\n"], "stderr still reaches its stream");
      assert.match(log(), /stderr boom/);
      proc.stderrOut.length = 0;
      proc.stdout.write("Driving 127/01 — continue, cycle 1 of 6, L2.\n");
      assert.deepEqual(proc.stdoutOut, ["Driving 127/01 — continue, cycle 1 of 6, L2.\n"], "stdout still reaches its stream, untouched");
      assert.deepEqual(proc.stderrOut, [`Exit diagnostics: ${handle.logPath}\n`], "…and the FIRST stdout line is what announces the log, once, on stderr");
      proc.stdout.write("Driving 127/02 — refine, cycle 1 of 6, L2.\n");
      assert.equal(proc.stderrOut.length, 1, "once");
      assert.match(log(), /stdout Driving 127\/01 — continue/, "…and the loop's own narration is in the log, so it reads as the whole run");
      assert.ok(!log().includes("stderr Exit diagnostics"), "the announcement itself is not teed back into the log");
      handle.uninstall();
    },
  },
  {
    name: "loop-diag/00 a signal is logged and, when the recorder is the LAST listener for it, node's default exit is RESTORED by hand (128 + signo) — the eleven-Ctrl+C shape measured 2026-09-13",
    run() {
      const proc = fakeProcess();
      const fs = fakeFs();
      const handle = installLoopDiagnostics({ logDir: ROOT, argv: ["work", "loop", "129", "--resume"], proc, env: {}, fs, now: () => at, aliveIntervalMs: 0 });
      const log = () => fs.files.get(handle.logPath) ?? "";
      // The shell's `once` listener, exactly as runLoopBody registers it: the FIRST Ctrl+C is its.
      let interrupted = null;
      proc.once("SIGINT", () => { interrupted = "SIGINT"; });
      proc.emit("SIGINT");
      assert.equal(interrupted, "SIGINT", "the shell saw the first signal");
      assert.deepEqual(proc.exited, [], "…and the recorder deferred to it");
      assert.equal((log().match(/signal SIGINT/g) ?? []).length, 1);
      // The `once` is consumed. Before the repair every further Ctrl+C was a logged line and
      // nothing else — eleven of them in loop-diag.129.2026-09-13T08-26-34-907Z.log, pid alive.
      assert.equal(proc.listenerCount("SIGINT"), 1, "the recorder is now the only SIGINT listener");
      proc.emit("SIGINT");
      assert.equal((log().match(/signal SIGINT/g) ?? []).length, 2, "the second signal is still recorded…");
      assert.deepEqual(proc.exited, [130], "…and node's default is restored by hand: exit 128 + 2");
      assert.match(log(), /process\.exit code=130\nError: exit call site/, "the exit goes through the wrapped process.exit, so the log names it");
      // The other signals take the same road with their own numbers; on a fake process each is last.
      proc.exited.length = 0;
      proc.emit("SIGTERM");
      assert.deepEqual(proc.exited, [128 + 15]);
      proc.exited.length = 0;
      proc.emit("SIGHUP");
      assert.deepEqual(proc.exited, [128 + 1]);
      // A persistent (non-once) sibling listener keeps deferring the recorder on every signal.
      proc.exited.length = 0;
      proc.on("SIGBREAK", () => {});
      proc.emit("SIGBREAK");
      proc.emit("SIGBREAK");
      assert.deepEqual(proc.exited, [], "a signal with another listener is never the recorder's to exit on");
      handle.uninstall();
      assert.equal(proc.listenerCount("SIGINT"), 0, "uninstall removes the signal listeners too");
    },
  },
  {
    name: "loop-diag/00 an uncaught exception is logged and then node's default is RESTORED by hand — stack on stderr, exit 1 — and an unhandled rejection is re-thrown so it takes the same road",
    run() {
      const proc = fakeProcess();
      const fs = fakeFs();
      const handle = installLoopDiagnostics({ logDir: ROOT, proc, env: {}, fs, now: () => at, aliveIntervalMs: 0 });
      const log = () => fs.files.get(handle.logPath) ?? "";
      proc.emit("uncaughtException", new Error("kaboom"));
      assert.match(log(), /uncaughtException Error: kaboom/);
      assert.ok(proc.stderrOut.some((line) => line.includes("Error: kaboom")), "the stack is printed, as node would have");
      assert.deepEqual(proc.exited, [1], "…and the process exits 1, as node would have");
      assert.throws(() => proc.emit("unhandledRejection", new Error("late")), /late/, "a rejection is re-thrown rather than swallowed");
      assert.match(log(), /unhandledRejection Error: late/);
      handle.uninstall();
    },
  },
  {
    name: "loop-diag/00 idempotent per process, fully reversible, and never a second listener — uninstall restores exit and stderr",
    run() {
      const proc = fakeProcess();
      const fs = fakeFs();
      const first = installLoopDiagnostics({ logDir: ROOT, proc, env: {}, fs, now: () => at, aliveIntervalMs: 0 });
      const second = installLoopDiagnostics({ logDir: ROOT, proc, env: {}, fs, now: () => at, aliveIntervalMs: 0 });
      assert.equal(second, first, "a second install answers the first handle");
      assert.equal(proc.listenerCount("exit"), 1);
      const wrappedExit = proc.exit;
      first.uninstall();
      assert.equal(proc.listenerCount("exit"), 0);
      assert.notEqual(proc.exit, wrappedExit, "process.exit is the original again");
      proc.stderr.write("after\n");
      assert.ok(!(fs.files.get(first.logPath) ?? "").includes("stderr after"), "stderr is no longer teed");
      proc.stdout.write("after\n");
      assert.ok(!(fs.files.get(first.logPath) ?? "").includes("stdout after"), "…nor stdout");
      const third = installLoopDiagnostics({ logDir: ROOT, proc, env: {}, fs, now: () => at, aliveIntervalMs: 0 });
      assert.notEqual(third, first, "after uninstall a fresh install is possible");
      third.uninstall();
    },
  },
  {
    name: "loop-diag/00 retention is PER SCOPE — the newest ten of EACH scope are kept, so a storm on one scope never prunes another's log (the regression this fixes)",
    run() {
      const fs = fakeFs();
      const dir = ROOT;
      // A 30-second relaunch storm on scope `01`: far more than ten, all one scope.
      for (let i = 0; i < LOOP_DIAG_KEEP + 5; i += 1) fs.files.set(path.join(dir, `${LOOP_DIAG_PREFIX}01.2026-09-11T00-${String(i).padStart(2, "0")}-00-000Z.log`), "storm");
      // One precious `127` death log, older than every storm entry.
      const precious = path.join(dir, `${LOOP_DIAG_PREFIX}127.2026-09-10T00-00-00-000Z.log`);
      fs.files.set(precious, "the death");
      fs.files.set(path.join(dir, "unrelated.log"), "y");
      const removed = pruneLoopDiagLogs(dir, LOOP_DIAG_KEEP, fs);
      assert.equal(removed.length, 5, "only the five oldest of the STORM scope are removed");
      assert.ok(removed.every((name) => name.startsWith(`${LOOP_DIAG_PREFIX}01.`)), "…and every removal is an `01` log");
      assert.ok(fs.files.has(precious), "the lone `127` log survives a flood on `01` — the whole point");
      assert.ok(fs.files.has(path.join(dir, "unrelated.log")), "a file that is not a diag log is never touched");
      assert.equal([...fs.files.keys()].filter((f) => path.basename(f).startsWith(`${LOOP_DIAG_PREFIX}01.`)).length, LOOP_DIAG_KEEP, "exactly ten `01` logs remain");
      assert.deepEqual(pruneLoopDiagLogs(path.join(ROOT, "missing"), LOOP_DIAG_KEEP, fs), [], "an absent directory is nothing to prune, never a throw");
    },
  },
];

// ---------------------------------------------------------------------------------------------
// milestone 130 / story 01 — THE STOP REQUEST HAS ONE HOME (`src/loop/stop-request.mjs`, ADR-001).
//
// The loop's SECOND home-side file, beside the recorder's log, and its suite sits beside the
// recorder's for that reason (test/loop is at its ceiling; story 05 owns every budget row). The
// file half is driven against the ISOLATED aof home the runner hands every test (a fresh
// `AOF_GLOBAL_HOME`, so `loopStopsDir()` resolves inside it and the real `~/.aof` is never
// touched) with the degrade sink injected; the source half against the same injected process
// double the recorder's cases use — never the real process — and an injected timer pair, so no
// interval and no signal listener outlives the runner.
// ---------------------------------------------------------------------------------------------

const TEN_KEYS = ["loopRunId", "scope", "workspaceId", "level", "state", "requestedAt", "escalatedAt", "honouredAt", "cancelled", "by"];
const BY = { node: "win-host-a", pid: 4242 };
const FIXED = () => new Date("2026-09-13T11:41:09.701Z");
const T = (n) => new Date(Date.UTC(2026, 8, 13, 11, 41, n)).toISOString();

// A clock answering the instants it is handed, in order — `T1, T2, T3, …` by default — so a
// scenario can say "the instant of the SECOND call" and "the clock now answers T1".
function clockOf(...instants) {
  const queue = instants.length > 0 ? [...instants] : [1, 2, 3, 4, 5, 6, 7, 8, 9].map(T);
  const now = () => new Date(queue.shift());
  now.queue = queue;
  return now;
}

// The injected degrade sink, RESET before every read: `setDegradeSinkForTest` also clears the
// per-code throttle, which is what lets two corrupt reads in one test each carry their own event.
function degradeEvents() {
  const events = [];
  setDegradeSinkForTest(() => ({ write: (event) => { events.push(event); } }));
  return events;
}

function fakeTimers() {
  const timers = { set: [], clear: [] };
  timers.setInterval = (fn, ms) => {
    const handle = { fn, ms, unrefs: 0, unref() { handle.unrefs += 1; return handle; } };
    timers.set.push(handle);
    return handle;
  };
  timers.clearInterval = (handle) => { timers.clear.push(handle); };
  return timers;
}

async function listTree(root) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true, recursive: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  return entries.map((entry) => path.relative(root, path.join(entry.parentPath ?? entry.path, entry.name))).sort();
}

const record = (over = {}) => ({
  loopRunId: "L1", scope: "129", workspaceId: "w1", level: 1, state: "requested",
  requestedAt: T(1), escalatedAt: null, honouredAt: null, cancelled: null, by: BY, ...over,
});
const writeRaw = (dir, id, text) => mkdir(dir, { recursive: true }).then(() => writeFile(stopRequestPath(dir, id), text, "utf8"));
const writeRecord = (dir, id, value) => writeRaw(dir, id, `${JSON.stringify(value, null, 2)}\n`);
const readRaw = (dir, id) => readFile(stopRequestPath(dir, id), "utf8");
const readJson = (dir, id) => readRaw(dir, id).then((text) => JSON.parse(text));

// A source over a fresh process double and fresh timers; the Background of task 02.
function sourceOver({ dir, proc = fakeProcess(), timers = fakeTimers(), ...rest } = {}) {
  const source = createStopSource({ loopRunId: "L1", dir, process: proc, pollMs: 2000, now: FIXED, timers, ...rest });
  return { source, proc, timers };
}

const stopRequestTests = [
  // ---- task 00: the request lives in the aof home ------------------------------------------
  {
    name: "130/01 stop-request/00 the directory and the path are derived from the mesh root, and only there",
    run() {
      const H = path.join("C:", "tmp", "aof-home");
      const dir = loopStopsDir({ AOF_GLOBAL_HOME: H });
      assert.equal(dir, path.join(H, "mesh", "loop-stops"), "the sibling of logs/ and loop-fixes/, under the mesh root");
      assert.equal(stopRequestPath(dir, "27dbcc7a-3e23-402b-96fd-b59131131c56"), path.join(dir, "27dbcc7a-3e23-402b-96fd-b59131131c56.json"));
      const other = path.join("C:", "tmp", "another-home");
      assert.equal(loopStopsDir({ AOF_GLOBAL_HOME: other }), path.join(other, "mesh", "loop-stops"), "a different AOF_GLOBAL_HOME answers under THAT home");
      assert.equal(loopStopsDir({ AOF_GLOBAL_HOME: other }), path.join(globalMeshPaths({ env: { AOF_GLOBAL_HOME: other } }).meshRoot, "loop-stops"), "the resolver is globalMeshPaths, never os.homedir()");
    },
  },
  {
    name: "130/01 stop-request/00 a written request is the ten keys, in order, whole — and the temp + rename write leaves nothing behind",
    async run() {
      const dir = loopStopsDir();
      await requestLoopStop(dir, { loopRunId: "L1", scope: "129", workspaceId: "w1", by: BY, now: FIXED });
      const raw = await readJson(dir, "L1");
      assert.deepEqual(Object.keys(raw), TEN_KEYS, "the ten keys, in the frozen order");
      assert.deepEqual(raw, { loopRunId: "L1", scope: "129", workspaceId: "w1", level: 1, state: "requested", requestedAt: "2026-09-13T11:41:09.701Z", escalatedAt: null, honouredAt: null, cancelled: null, by: { node: "win-host-a", pid: 4242 } });
      assert.deepEqual((await readdir(dir)).filter((name) => name.startsWith(".tmp-")), [], "no .tmp-* entry remains");
      assert.deepEqual(await readStopRequest(dir, "L1"), raw, "the read is the file's content");
    },
  },
  {
    name: "130/01 stop-request/00 the key set never shrinks — an omitted carried field (by, scope, workspaceId) is written null in its slot",
    async run() {
      const dir = loopStopsDir();
      for (const [given, key] of [
        [{ scope: "129", workspaceId: "w1" }, "by"],
        [{ workspaceId: "w1", by: BY }, "scope"],
        [{ scope: "129", by: BY }, "workspaceId"],
      ]) {
        await clearStopRequest(dir, "L2");
        await requestLoopStop(dir, { loopRunId: "L2", now: FIXED, ...given });
        const raw = await readJson(dir, "L2");
        assert.deepEqual(Object.keys(raw), TEN_KEYS, `omitting ${key}: the keys are the ten, in order`);
        assert.equal(raw[key], null, `omitting ${key}: it reads null`);
      }
    },
  },
  {
    name: "130/01 stop-request/00 the write never lands under the checkout — the process's working directory is untouched and the file is under <H>/mesh/loop-stops",
    async run() {
      const H = process.env.AOF_GLOBAL_HOME;
      const dir = loopStopsDir();
      const C = await mkdtemp(path.join(os.tmpdir(), "aof-stop-checkout-"));
      const previousCwd = process.cwd();
      try {
        await writeFile(path.join(C, "README.md"), "a fixture checkout\n");
        process.chdir(C);
        const before = await listTree(C);
        await requestLoopStop(dir, { loopRunId: "L1", scope: "129", workspaceId: "w1", by: BY, now: FIXED });
        assert.deepEqual(await listTree(C), before, "a recursive listing of the checkout after the call deep-equals the one before it");
        await access(path.join(H, "mesh", "loop-stops", "L1.json"));
      } finally {
        process.chdir(previousCwd);
        await rm(C, { recursive: true, force: true });
      }
    },
  },
  {
    name: "130/01 stop-request/00 the read is absence-tolerant and degrades anything that is not a record to null — one coded event carrying the path, never a throw",
    async run() {
      const dir = loopStopsDir();
      const filePath = stopRequestPath(dir, "L1");
      const ten = record();
      const rows = [
        ["does not exist", async () => { await mkdir(dir, { recursive: true }); await rm(filePath, { force: true }); }, null, 0],
        ["does not exist, nor does dir itself", async () => { await rm(dir, { recursive: true, force: true }); }, null, 0],
        ["holds the ten-key record", () => writeRecord(dir, "L1", ten), ten, 0],
        ["holds the ten-key record plus an unknown eleventh key", () => writeRecord(dir, "L1", { ...ten, eleventh: "kept" }), { ...ten, eleventh: "kept" }, 0],
        ["is empty (zero bytes)", () => writeRaw(dir, "L1", ""), null, 1],
        ["holds `{ not json`", () => writeRaw(dir, "L1", "{ not json"), null, 1],
        ["holds a JSON array", () => writeRaw(dir, "L1", "[]"), null, 1],
        ["holds JSON null", () => writeRaw(dir, "L1", "null"), null, 1],
        ["holds { loopRunId } with no level", () => writeRecord(dir, "L1", { loopRunId: "L1" }), null, 1],
        ["holds the record with level 0", () => writeRecord(dir, "L1", { ...ten, level: 0 }), null, 1],
        ["holds the record with level 3", () => writeRecord(dir, "L1", { ...ten, level: 3 }), null, 1],
        ["holds the record with level \"2\" (a string)", () => writeRecord(dir, "L1", { ...ten, level: "2" }), null, 1],
      ];
      try {
        for (const [state, arrange, answer, degrades] of rows) {
          await arrange();
          const events = degradeEvents();
          const read = await readStopRequest(dir, "L1");
          assert.deepEqual(read, answer, `the file ${state}: the answer`);
          assert.equal(events.length, degrades, `the file ${state}: ${degrades} degrade event(s)`);
          for (const event of events) {
            assert.equal(event.code, "loop-stop-request", `the file ${state}: the event's code`);
            assert.equal(event.path, filePath, `the file ${state}: the event carries the file's path`);
          }
        }
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  {
    name: "130/01 stop-request/00 an id that is not one filename segment is refused by every export before the filesystem is touched, naming loopRunId",
    async run() {
      const H = process.env.AOF_GLOBAL_HOME;
      const dir = loopStopsDir();
      for (const id of [undefined, "", "../L1", "a/b", "a\\b", "a:b"]) {
        const label = JSON.stringify(id ?? "undefined");
        assert.throws(() => stopRequestPath(dir, id), /loopRunId/, `stopRequestPath refuses ${label}`);
        await assert.rejects(requestLoopStop(dir, { loopRunId: id, by: BY, now: FIXED }), /loopRunId/, `requestLoopStop refuses ${label}`);
        await assert.rejects(readStopRequest(dir, id), /loopRunId/, `readStopRequest refuses ${label}`);
        await assert.rejects(markStopHonoured(dir, id, { now: FIXED, cancelled: null }), /loopRunId/, `markStopHonoured refuses ${label}`);
        await assert.rejects(clearStopRequest(dir, id), /loopRunId/, `clearStopRequest refuses ${label}`);
        const emitter = new EventEmitter();
        assert.throws(() => createStopSource({ loopRunId: id, dir, process: emitter, pollMs: 0 }), /loopRunId/, `createStopSource refuses ${label}`);
        assert.deepEqual(emitter.eventNames(), [], `createStopSource refusing ${label} registered no listener`);
      }
      await assert.rejects(access(dir), { code: "ENOENT" }, "dir still does not exist");
      assert.deepEqual(await listTree(H), [], "nothing was written anywhere under H");
    },
  },
  {
    name: "130/01 stop-request/00 the level word map has exactly two entries and is frozen — and so is the state word map beside it (review close, 2026-09-21)",
    run() {
      assert.deepEqual(STOP_LEVELS, { drain: 1, cancel: 2 });
      assert.throws(() => { STOP_LEVELS.kill = 3; }, TypeError, "assigning a third key throws");
      assert.deepEqual(Object.keys(STOP_LEVELS), ["drain", "cancel"]);
      // A consumer that must ask whether a request is honoured asks through this map rather than
      // spelling the word — the invariant the sweep below holds needs a door, and this is it.
      assert.deepEqual(STOP_STATES, { requested: "requested", honoured: "honoured" });
      assert.throws(() => { STOP_STATES.cleared = "cleared"; }, TypeError, "a third state word cannot be added — cleared is the file's absence, never a state");
    },
  },
  {
    name: "130/01 stop-request/00 the home-side literals have one home — `loop-stops` and the state words are spelled in stop-request.mjs and in no other module under src/",
    async run() {
      const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
      const own = "src/loop/stop-request.mjs";
      const modules = (await readdir(path.join(root, "src"), { withFileTypes: true, recursive: true }))
        .filter((entry) => entry.isFile() && entry.name.endsWith(".mjs"))
        .map((entry) => path.relative(root, path.join(entry.parentPath ?? entry.path, entry.name)).split(path.sep).join("/"))
        .sort();
      assert.ok(modules.includes(own), "the module is on disk");
      assert.ok(modules.length > 50, "the sweep is non-vacuous");
      // A module that speaks of a stop request at all: the token set the shell, the verb and the
      // faces would use. `"requested"` names a recovery-push and a resync state elsewhere, so the
      // word is refused only in a module that also speaks of the stop request; FF-13001 (story 05)
      // is the sweep proper.
      const speaksOfStops = /stop-request|stopRequest|StopRequest|loopStop|LoopStop|STOP_LEVELS/;
      for (const rel of modules) {
        const code = stripComments(await readFile(path.join(root, rel), "utf8"));
        if (rel === own) {
          assert.ok(code.includes("loop-stops"), "the home spells the segment");
          assert.ok(code.includes('"honoured"') && code.includes('"requested"'), "the home spells both state words");
          assert.match(code, /import \{ globalMeshPaths \} from "\.\.\/workspace\.mjs"/, "the resolver is imported, never re-spelled");
          assert.match(code, /import \{[^}]*\bwriteText\b[^}]*\} from "\.\.\/fs\.mjs"/, "every write goes through writeText");
          assert.match(code, /import \{ reportDegrade \} from "\.\.\/degrade\.mjs"/, "a corrupt file reports through the one degrade emitter");
          continue;
        }
        assert.ok(!code.includes("loop-stops"), `${rel} spells the loop-stops segment — the one home is ${own}`);
        assert.ok(!/["']honoured["']/.test(code), `${rel} spells "honoured" — the state words live in ${own}`);
        if (/["']requested["']/.test(code)) {
          assert.ok(!speaksOfStops.test(code), `${rel} spells "requested" as a stop-request state — the state words live in ${own}`);
        }
      }
    },
  },

  // ---- task 01: the ladder is 129/04's, and the lifecycle -----------------------------------
  {
    name: "130/01 stop-request/01 each requestLoopStop answers what it did and the file reads the ladder's state — create at 1, escalate once to 2, then unchanged; honoured is unchanged and says so",
    async run() {
      const dir = loopStopsDir();
      const ask = (now) => requestLoopStop(dir, { loopRunId: "L1", scope: "129", workspaceId: "w1", by: BY, now });
      const rows = [
        ["does not exist", async () => {}, { created: true, escalated: false, level: 1, state: "requested" }, 1, "requested", null],
        ["is level 1 requested", async (now) => { await ask(now); }, { created: false, escalated: true, level: 2, state: "requested" }, 2, "requested", T(2)],
        ["is level 2 requested", async (now) => { await ask(now); await ask(now); }, { created: false, escalated: false, level: 2, state: "requested" }, 2, "requested", T(2)],
        ["is level 1 honoured", async (now) => { await ask(now); await markStopHonoured(dir, "L1", { now, cancelled: null }); }, { created: false, escalated: false, level: 1, state: "honoured" }, 1, "honoured", null],
        ["is level 2 honoured", async (now) => { await ask(now); await ask(now); await markStopHonoured(dir, "L1", { now, cancelled: null }); }, { created: false, escalated: false, level: 2, state: "honoured" }, 2, "honoured", T(2)],
      ];
      for (const [before, arrange, answer, level, state, escalatedAt] of rows) {
        await clearStopRequest(dir, "L1");
        const now = clockOf();
        await arrange(now);
        const first = before === "does not exist" ? null : await readJson(dir, "L1");
        const got = await ask(now);
        const file = await readJson(dir, "L1");
        assert.deepEqual(got, { ...answer, record: file }, `the request ${before}: the answer says what it did, and carries the record`);
        assert.equal(file.level, level, `the request ${before}: level`);
        assert.equal(file.state, state, `the request ${before}: state`);
        assert.equal(file.escalatedAt, escalatedAt, `the request ${before}: escalatedAt`);
        if (first) assert.equal(file.requestedAt, first.requestedAt, `the request ${before}: requestedAt is the first write's`);
        assert.deepEqual(Object.keys(file), TEN_KEYS, `the request ${before}: still the ten keys in order`);
      }
    },
  },
  {
    name: "130/01 stop-request/01 the level never climbs past two — four calls leave level 2 with the SECOND call's escalatedAt, the third and fourth unchanged",
    async run() {
      const dir = loopStopsDir();
      const now = clockOf();
      const answers = [];
      for (let i = 0; i < 4; i += 1) answers.push(await requestLoopStop(dir, { loopRunId: "L1", scope: "129", workspaceId: "w1", by: BY, now }));
      const file = await readJson(dir, "L1");
      assert.equal(file.level, 2);
      assert.equal(file.escalatedAt, T(2), "the instant of the SECOND call");
      assert.equal(file.requestedAt, T(1));
      for (const late of answers.slice(2)) assert.deepEqual(late, { created: false, escalated: false, level: 2, state: "requested", record: file });
    },
  },
  {
    name: "130/01 stop-request/01 an escalation by another writer keeps the creator's by and requestedAt — it rewrites level and escalatedAt only",
    async run() {
      const dir = loopStopsDir();
      const now = clockOf();
      await requestLoopStop(dir, { loopRunId: "L1", scope: "129", workspaceId: "w1", by: BY, now });
      const got = await requestLoopStop(dir, { loopRunId: "L1", scope: "130", workspaceId: "w2", by: { node: "aof-wsl", pid: 77 }, now });
      assert.equal(got.escalated, true);
      const file = await readJson(dir, "L1");
      assert.deepEqual(file, record({ level: 2, escalatedAt: T(2) }), "level 2, escalatedAt T2; by, requestedAt, scope and workspaceId the creator's");
    },
  },
  {
    name: "130/01 stop-request/01 a clock that goes backwards is written as given, never compared or clamped — escalatedAt and honouredAt earlier than requestedAt",
    async run() {
      const dir = loopStopsDir();
      for (const [label, call, field] of [
        ["requestLoopStop", (now) => requestLoopStop(dir, { loopRunId: "L1", scope: "129", workspaceId: "w1", by: BY, now }), "escalatedAt"],
        ["markStopHonoured", (now) => markStopHonoured(dir, "L1", { now, cancelled: null }), "honouredAt"],
      ]) {
        await clearStopRequest(dir, "L1");
        await requestLoopStop(dir, { loopRunId: "L1", scope: "129", workspaceId: "w1", by: BY, now: clockOf(T(3)) });
        await call(clockOf(T(1)));
        const file = await readJson(dir, "L1");
        assert.equal(file[field], T(1), `${label}: ${field} is the clock's answer, earlier than requestedAt`);
        assert.equal(file.requestedAt, T(3), `${label}: requestedAt is untouched`);
      }
    },
  },
  {
    name: "130/01 stop-request/01 markStopHonoured closes the request once and records what was cancelled; a second mark is the idempotent re-mark",
    async run() {
      const dir = loopStopsDir();
      const RUN = "20260913T110303238Z-0000";
      const ask = (now) => requestLoopStop(dir, { loopRunId: "L1", scope: "129", workspaceId: "w1", by: BY, now });
      const rows = [
        ["is level 1 requested", async (now) => { await ask(now); }, null, 1, T(2), null],
        ["is level 2 requested", async (now) => { await ask(now); await ask(now); }, RUN, 2, T(3), RUN],
        ["is level 2 honoured at T5 with cancelled null", async (now) => { await ask(now); await ask(now); now.queue.unshift(T(5)); await markStopHonoured(dir, "L1", { now, cancelled: null }); }, RUN, 2, T(5), null],
      ];
      for (const [before, arrange, cancelled, level, honouredAt, written] of rows) {
        await clearStopRequest(dir, "L1");
        const now = clockOf();
        await arrange(now);
        const got = await markStopHonoured(dir, "L1", { now, cancelled });
        const file = await readJson(dir, "L1");
        assert.equal(file.state, "honoured", `the request ${before}: state`);
        assert.equal(file.level, level, `the request ${before}: level is untouched`);
        assert.equal(file.honouredAt, honouredAt, `the request ${before}: honouredAt`);
        assert.equal(file.cancelled, written, `the request ${before}: cancelled`);
        assert.deepEqual(got, file, `the request ${before}: the answer is the record`);
        assert.deepEqual(Object.keys(file), TEN_KEYS);
      }
    },
  },
  {
    name: "130/01 stop-request/01 marking an absent request honoured is a no-op that answers null and creates no file",
    async run() {
      const dir = loopStopsDir();
      assert.equal(await markStopHonoured(dir, "L9", { now: FIXED, cancelled: null }), null);
      await assert.rejects(access(stopRequestPath(dir, "L9")), { code: "ENOENT" });
    },
  },
  {
    name: "130/01 stop-request/01 clearStopRequest deletes the file whatever its state, answers the record it deleted, and tolerates absence",
    async run() {
      const dir = loopStopsDir();
      const ask = (now) => requestLoopStop(dir, { loopRunId: "L1", scope: "129", workspaceId: "w1", by: BY, now });
      for (const [state, arrange, cleared] of [
        ["is level 1 requested", async (now) => { await ask(now); }, true],
        ["is level 2 honoured", async (now) => { await ask(now); await ask(now); await markStopHonoured(dir, "L1", { now, cancelled: null }); }, true],
        ["does not exist", async () => {}, false],
      ]) {
        await clearStopRequest(dir, "L1");
        await arrange(clockOf());
        const expected = cleared ? await readJson(dir, "L1") : null;
        const got = await clearStopRequest(dir, "L1");
        assert.deepEqual(got, { cleared, record: expected }, `the request ${state}: the answer`);
        assert.equal(await readStopRequest(dir, "L1"), null, `the request ${state}: gone`);
      }
    },
  },
  {
    name: "130/01 stop-request/01 a corrupt file is null to every writer after one degrade, and each says what it did — request overwrites whole, mark leaves it, clear deletes it",
    async run() {
      const dir = loopStopsDir();
      try {
        // requestLoopStop: overwritten whole, level 1.
        await writeRaw(dir, "L1", "{ not json");
        let events = degradeEvents();
        const asked = await requestLoopStop(dir, { loopRunId: "L1", scope: "129", workspaceId: "w1", by: BY, now: clockOf() });
        let file = await readJson(dir, "L1");
        assert.deepEqual(asked, { created: true, escalated: false, level: 1, state: "requested", record: file });
        assert.deepEqual(file, record());
        assert.equal(events.length, 1, "requestLoopStop: one degrade event");
        assert.equal(events[0].code, "loop-stop-request");
        // markStopHonoured: null, the file left as it was.
        await writeRaw(dir, "L1", "{ not json");
        events = degradeEvents();
        assert.equal(await markStopHonoured(dir, "L1", { now: FIXED, cancelled: null }), null);
        assert.equal(await readRaw(dir, "L1"), "{ not json", "markStopHonoured leaves a corrupt file");
        assert.equal(events.length, 1, "markStopHonoured: one degrade event");
        assert.equal(events[0].code, "loop-stop-request");
        // clearStopRequest: gone, record null.
        events = degradeEvents();
        assert.deepEqual(await clearStopRequest(dir, "L1"), { cleared: true, record: null });
        await assert.rejects(access(stopRequestPath(dir, "L1")), { code: "ENOENT" }, "clearStopRequest deletes a corrupt file");
        assert.equal(events.length, 1, "clearStopRequest: one degrade event");
        assert.equal(events[0].code, "loop-stop-request");
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  {
    name: "130/01 stop-request/01 two writers racing on one id both see a whole file — last rename wins, each write whole",
    async run() {
      const dir = loopStopsDir();
      const ask = () => requestLoopStop(dir, { loopRunId: "L1", scope: "129", workspaceId: "w1", by: BY, now: clockOf() });
      const settled = await Promise.allSettled([ask(), ask()]);
      assert.deepEqual(settled.map((outcome) => outcome.status), ["fulfilled", "fulfilled"], "neither call threw");
      const file = await readJson(dir, "L1");
      assert.deepEqual(Object.keys(file), TEN_KEYS, "one ten-key record");
      assert.ok(file.level === 1 || file.level === 2, `level 1 or 2, got ${file.level}`);
      assert.equal(file.state, "requested");
    },
  },
  {
    name: "130/01 stop-request/01 an escalation racing a mark on one id leaves one whole answer, never a torn file",
    async run() {
      const dir = loopStopsDir();
      await requestLoopStop(dir, { loopRunId: "L1", scope: "129", workspaceId: "w1", by: BY, now: clockOf() });
      const settled = await Promise.allSettled([
        requestLoopStop(dir, { loopRunId: "L1", scope: "129", workspaceId: "w1", by: BY, now: clockOf() }),
        markStopHonoured(dir, "L1", { now: clockOf(), cancelled: null }),
      ]);
      assert.deepEqual(settled.map((outcome) => outcome.status), ["fulfilled", "fulfilled"], "neither call threw");
      const file = await readJson(dir, "L1");
      assert.deepEqual(Object.keys(file), TEN_KEYS, "one ten-key record");
      const shape = `${file.level} ${file.state}`;
      assert.ok(["2 requested", "1 honoured", "2 honoured"].includes(shape), `one of the three whole answers, got ${shape}`);
    },
  },

  // ---- task 02: createStopSource composes the signals and the file --------------------------
  {
    name: "130/01 stop-request/02 a fresh source is level 0 with no producer and an unaborted signal, and has read nothing — one SIGINT and one SIGTERM listener, nothing else",
    async run() {
      const dir = loopStopsDir();
      await writeRecord(dir, "L1", record({ level: 2, escalatedAt: T(2) }));
      const { source, proc } = sourceOver({ dir });
      assert.equal(source.level(), 0);
      assert.equal(source.producer(), null);
      assert.equal(source.request(), null, "construction reads nothing");
      assert.equal(source.signal.aborted, false);
      assert.equal(proc.listenerCount("SIGINT"), 1);
      assert.equal(proc.listenerCount("SIGTERM"), 1);
      assert.equal(proc.listenerCount("SIGHUP"), 0);
      assert.equal(proc.listenerCount("SIGBREAK"), 0);
      assert.deepEqual(Object.keys(source).sort(), ["level", "poll", "producer", "request", "signal", "start", "stop"], "the seven members 129/04's seam names");
      source.stop();
    },
  },
  {
    name: "130/01 stop-request/02 process signals climb the ladder — the first to 1, the second to 2 and the abort — and after the second the source is deaf",
    run() {
      const dir = loopStopsDir();
      for (const [signals, level, producer, aborted, listeners] of [
        [["SIGINT"], 1, "SIGINT", false, 1],
        [["SIGTERM"], 1, "SIGTERM", false, 1],
        [["SIGHUP"], 0, null, false, 1],
        [["SIGINT", "SIGINT"], 2, "SIGINT", true, 0],
        [["SIGTERM", "SIGTERM"], 2, "SIGTERM", true, 0],
        [["SIGINT", "SIGTERM"], 2, "SIGTERM", true, 0],
        [["SIGTERM", "SIGINT"], 2, "SIGINT", true, 0],
        [["SIGINT", "SIGINT", "SIGINT"], 2, "SIGINT", true, 0],
        [["SIGINT", "SIGINT", "SIGTERM"], 2, "SIGINT", true, 0],
      ]) {
        const label = signals.join(", ");
        const { source, proc } = sourceOver({ dir });
        for (const signal of signals) proc.emit(signal);
        assert.equal(source.level(), level, `${label}: level`);
        assert.equal(source.producer(), producer, `${label}: producer`);
        assert.equal(source.signal.aborted, aborted, `${label}: aborted`);
        assert.equal(proc.listenerCount("SIGINT"), listeners, `${label}: SIGINT listeners`);
        assert.equal(proc.listenerCount("SIGTERM"), listeners, `${label}: SIGTERM listeners`);
        assert.deepEqual(proc.exited, [], `${label}: proc.exit was never called`);
        source.stop();
      }
    },
  },
  {
    name: "130/01 stop-request/02 with the recorder installed first, the third signal is nobody's but node's — exit 128 + signo, only on the THIRD, three signal lines logged",
    run() {
      const dir = loopStopsDir();
      for (const [signals, exit] of [
        [["SIGINT", "SIGINT", "SIGINT"], 130],
        [["SIGINT", "SIGTERM", "SIGTERM"], 143],
        [["SIGTERM", "SIGINT", "SIGINT"], 130],
      ]) {
        const label = signals.join(", ");
        const proc = fakeProcess();
        const fs = fakeFs();
        const handle = installLoopDiagnostics({ logDir: ROOT, argv: ["work", "loop", "130"], proc, env: {}, fs, now: () => at, aliveIntervalMs: 0 });
        const { source } = sourceOver({ dir, proc });
        proc.emit(signals[0]);
        proc.emit(signals[1]);
        assert.deepEqual(proc.exited, [], `${label}: two signals are the source's — drain, then cancel — and nobody exits`);
        assert.equal(source.level(), 2, `${label}: the source is at 2 after the second`);
        proc.emit(signals[2]);
        assert.deepEqual(proc.exited, [exit], `${label}: the third reaches node's default through the recorder's last-listener repair`);
        assert.equal(((fs.files.get(handle.logPath) ?? "").match(/ signal SIG/g) ?? []).length, 3, `${label}: three signal lines`);
        source.stop();
        handle.uninstall();
      }
    },
  },
  {
    name: "130/01 stop-request/02 the file's level raises the source's level on a poll and names the request as the producer — the level, never the state",
    async run() {
      const dir = loopStopsDir();
      const ten = record();
      const rows = [
        ["does not exist", () => rm(stopRequestPath(dir, "L1"), { force: true }), 0, null, null, false, 1],
        ["is level 1 requested", () => writeRecord(dir, "L1", ten), 1, "stop-request", ten, false, 1],
        ["is level 2 requested", () => writeRecord(dir, "L1", { ...ten, level: 2, escalatedAt: T(2) }), 2, "stop-request", { ...ten, level: 2, escalatedAt: T(2) }, true, 0],
        ["is level 1 honoured", () => writeRecord(dir, "L1", { ...ten, state: "honoured", honouredAt: T(2) }), 1, "stop-request", { ...ten, state: "honoured", honouredAt: T(2) }, false, 1],
        ["is level 2 honoured", () => writeRecord(dir, "L1", { ...ten, level: 2, state: "honoured", escalatedAt: T(2), honouredAt: T(3) }), 2, "stop-request", { ...ten, level: 2, state: "honoured", escalatedAt: T(2), honouredAt: T(3) }, true, 0],
        ["holds `{ not json`", () => writeRaw(dir, "L1", "{ not json"), 0, null, null, false, 1],
        ["holds { loopRunId } with no level", () => writeRecord(dir, "L1", { loopRunId: "L1" }), 0, null, null, false, 1],
      ];
      try {
        for (const [file, arrange, level, producer, request, aborted, listeners] of rows) {
          await arrange();
          degradeEvents();
          const { source, proc } = sourceOver({ dir });
          await source.poll();
          assert.equal(source.level(), level, `the file ${file}: level`);
          assert.equal(source.producer(), producer, `the file ${file}: producer`);
          assert.deepEqual(source.request(), request, `the file ${file}: request()`);
          assert.equal(source.signal.aborted, aborted, `the file ${file}: aborted`);
          assert.equal(proc.listenerCount("SIGINT"), listeners, `the file ${file}: listeners`);
          source.stop();
        }
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  {
    name: "130/01 stop-request/02 the producer is whoever raised the level to its current value, and an equal raise does not rename it",
    async run() {
      const dir = loopStopsDir();
      const { source, proc } = sourceOver({ dir });
      proc.emit("SIGINT");
      await writeRecord(dir, "L1", record());
      await source.poll();
      assert.equal(source.level(), 1);
      assert.equal(source.producer(), "SIGINT", "the file's equal raise does not rename the producer");
      await writeRecord(dir, "L1", record({ level: 2, escalatedAt: T(2) }));
      await source.poll();
      assert.equal(source.level(), 2);
      assert.equal(source.producer(), "stop-request", "the file raised it to 2");
      proc.emit("SIGINT");
      assert.equal(source.level(), 2);
      assert.equal(source.producer(), "stop-request", "the listeners went at 2 — a later signal is nobody's here");
      source.stop();
    },
  },
  {
    name: "130/01 stop-request/02 the mirror — the file first, then the signals",
    async run() {
      const dir = loopStopsDir();
      const { source, proc } = sourceOver({ dir });
      await writeRecord(dir, "L1", record());
      await source.poll();
      proc.emit("SIGINT");
      assert.equal(source.level(), 1);
      assert.equal(source.producer(), "stop-request");
      proc.emit("SIGINT");
      assert.equal(source.level(), 2);
      assert.equal(source.producer(), "SIGINT");
      assert.equal(source.signal.aborted, true);
      source.stop();
    },
  },
  {
    name: "130/01 stop-request/02 the level and the producer never fall — a file that vanishes or turns corrupt after raising them changes request() only",
    async run() {
      const dir = loopStopsDir();
      try {
        for (const [level, then, mutate, aborted] of [
          [1, "is deleted", () => rm(stopRequestPath(dir, "L1"), { force: true }), false],
          [2, "is deleted", () => rm(stopRequestPath(dir, "L1"), { force: true }), true],
          [2, "is overwritten with `{ bad`", () => writeRaw(dir, "L1", "{ bad"), true],
        ]) {
          const label = `level ${level}, then the file ${then}`;
          await writeRecord(dir, "L1", record(level === 2 ? { level: 2, escalatedAt: T(2) } : {}));
          degradeEvents();
          const { source } = sourceOver({ dir });
          await source.poll();
          assert.equal(source.level(), level, `${label}: raised`);
          await mutate();
          await source.poll();
          assert.equal(source.level(), level, `${label}: the level never falls`);
          assert.equal(source.producer(), "stop-request", `${label}: the producer never falls`);
          assert.equal(source.signal.aborted, aborted, `${label}: aborted`);
          assert.equal(source.request(), null, `${label}: request() alone follows the file`);
          source.stop();
        }
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  {
    name: "130/01 stop-request/02 the signal aborts exactly once and is never re-armed — by two signals, then a file at 2, then a third signal",
    async run() {
      const dir = loopStopsDir();
      const { source, proc } = sourceOver({ dir });
      const signal = source.signal;
      let aborts = 0;
      signal.addEventListener("abort", () => { aborts += 1; });
      proc.emit("SIGINT");
      proc.emit("SIGINT");
      assert.equal(aborts, 1);
      assert.equal(signal.aborted, true);
      await writeRecord(dir, "L1", record({ level: 2, escalatedAt: T(2) }));
      await source.poll();
      proc.emit("SIGINT");
      assert.equal(aborts, 1, "still exactly once");
      assert.equal(source.signal, signal, "the same object");
      source.stop();
    },
  },
  {
    name: "130/01 stop-request/02 a process that already has signal listeners keeps them — the source removes only its own",
    run() {
      const dir = loopStopsDir();
      const proc = fakeProcess();
      let priorInt = 0;
      let priorTerm = 0;
      proc.on("SIGINT", () => { priorInt += 1; });
      proc.on("SIGTERM", () => { priorTerm += 1; });
      const { source } = sourceOver({ dir, proc });
      assert.equal(proc.listenerCount("SIGINT"), 2);
      proc.emit("SIGINT");
      proc.emit("SIGINT");
      assert.equal(priorInt, 2, "the prior listener saw both");
      assert.equal(proc.listenerCount("SIGINT"), 1, "the source's own listener went at 2; the prior one stays");
      assert.equal(proc.listenerCount("SIGTERM"), 1);
      source.stop();
      proc.emit("SIGINT");
      assert.equal(proc.listenerCount("SIGINT"), 1, "stop removes nothing that is not the source's");
      assert.equal(priorInt, 3);
      assert.equal(priorTerm, 0);
      assert.equal(source.level(), 2);
    },
  },
  {
    name: "130/01 stop-request/02 start arms one unref'd interval at pollMs; stop clears it, removes the listeners, and is terminal — a later start arms nothing and a later signal raises nothing",
    run() {
      const dir = loopStopsDir();
      const { source, proc, timers } = sourceOver({ dir });
      source.start();
      source.start();
      assert.equal(timers.set.length, 1, "one interval");
      assert.equal(timers.set[0].ms, 2000, "at pollMs");
      assert.equal(timers.set[0].unrefs, 1, "unref'd");
      source.stop();
      source.stop();
      assert.deepEqual(timers.clear, [timers.set[0]], "cleared once, with that handle");
      assert.equal(proc.listenerCount("SIGINT"), 0);
      assert.equal(proc.listenerCount("SIGTERM"), 0);
      source.start();
      proc.emit("SIGINT");
      proc.emit("SIGINT");
      assert.equal(timers.set.length, 1, "stop is terminal — start arms nothing after it");
      assert.equal(source.level(), 0);
      assert.equal(source.signal.aborted, false);
    },
  },
  {
    name: "130/01 stop-request/02 stop before start removes the listeners and clears nothing",
    run() {
      const dir = loopStopsDir();
      const { source, proc, timers } = sourceOver({ dir });
      source.stop();
      assert.deepEqual(timers.clear, [], "clearInterval was never called");
      assert.equal(proc.listenerCount("SIGINT"), 0);
      assert.equal(proc.listenerCount("SIGTERM"), 0);
    },
  },
  {
    name: "130/01 stop-request/02 the interval is armed only for a finite positive pollMs, and the default is 2000; poll() reads the file regardless",
    async run() {
      const dir = loopStopsDir();
      await writeRecord(dir, "L1", record());
      for (const [label, given, armed] of [
        ["no pollMs key", {}, 2000],
        ["pollMs: 2000", { pollMs: 2000 }, 2000],
        ["pollMs: 250", { pollMs: 250 }, 250],
        ["pollMs: 0", { pollMs: 0 }, null],
        ["pollMs: -1", { pollMs: -1 }, null],
        ["pollMs: NaN", { pollMs: NaN }, null],
        ["pollMs: \"2000\"", { pollMs: "2000" }, null],
      ]) {
        const proc = fakeProcess();
        const timers = fakeTimers();
        const source = createStopSource({ loopRunId: "L1", dir, process: proc, timers, ...given });
        source.start();
        if (armed == null) assert.equal(timers.set.length, 0, `${label}: never armed`);
        else {
          assert.equal(timers.set.length, 1, `${label}: armed once`);
          assert.equal(timers.set[0].ms, armed, `${label}: with ${armed}`);
        }
        await source.poll();
        assert.deepEqual(source.request(), record(), `${label}: poll() still reads the file`);
        source.stop();
      }
    },
  },
  {
    name: "130/01 stop-request/02 the armed interval's tick is a poll — the file's level reaches the source without an explicit poll()",
    async run() {
      const dir = loopStopsDir();
      await writeRecord(dir, "L1", record({ level: 2, escalatedAt: T(2) }));
      const { source, timers } = sourceOver({ dir });
      source.start();
      timers.set[0].fn();
      // The tick's read is a real fs read; wait for it, bounded.
      for (let waited = 0; source.level() < 2 && waited < 2000; waited += 20) await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(source.level(), 2, "the interval's tick is a poll");
      assert.equal(source.signal.aborted, true);
      source.stop();
    },
  },
  {
    name: "130/01 stop-request/02 a real interval never holds a finished process open — a child that starts a source with the real process and the default pollMs exits on its own",
    async run() {
      const module = pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "loop", "stop-request.mjs")).href;
      const script = [
        `import { createStopSource, loopStopsDir } from ${JSON.stringify(module)};`,
        `const source = createStopSource({ loopRunId: "L1", dir: loopStopsDir() });`,
        `source.start();`,
      ].join("\n");
      const startedAt = Date.now();
      const outcome = await new Promise((resolve) => {
        execFile(process.execPath, ["--input-type=module", "-e", script], { env: { ...process.env }, timeout: 3000, windowsHide: true }, (error, stdout, stderr) => {
          resolve({ error, stdout, stderr });
        });
      });
      assert.equal(outcome.error, null, `the child exited on its own within 3 seconds: ${outcome.error?.message ?? ""} ${outcome.stderr}`);
      assert.ok(Date.now() - startedAt < 3000, "within 3 seconds");
    },
  },
];

// ---------------------------------------------------------------------------------------------
// milestone 131 / story 01, tasks 02-03 — THE ASK HAS ONE HOME (`src/loop/ask-request.mjs`,
// ADR-003 §1-§2). The loop's THIRD home-side file, beside the stop request, and driven the same
// way: inside the isolated aof home the runner hands every test, with the degrade sink injected
// and reset before every read, and the poll over an injected timer pair.
// ---------------------------------------------------------------------------------------------

const FIFTEEN_KEYS = ["runId", "ref", "workspaceId", "loopRunId", "scope", "sessionId", "phase", "node", "question", "askedAt", "state", "parkedAt", "answer", "answeredAt", "by"];
const ASK = { runId: "R1", ref: "131/01", workspaceId: "w1", loopRunId: "L1", scope: "131", sessionId: "S1", phase: "refine", node: "node-7297", question: "Decision needed: X" };
const ASK_NOW = () => new Date("2026-09-23T17:00:00.000Z");
const ANSWER_BY = { actor: "you", via: "cli", node: "node-7297" };
const ANSWER_NOW = () => new Date("2026-09-23T17:05:00.000Z");
const askRecord = (over = {}) => ({ ...ASK, askedAt: "2026-09-23T17:00:00.000Z", state: "waiting", parkedAt: null, answer: null, answeredAt: null, by: null, ...over });
const writeAskRaw = (dir, id, text) => mkdir(dir, { recursive: true }).then(() => writeFile(askRequestPath(dir, id), text, "utf8"));
const writeAskRecord = (dir, id, value) => writeAskRaw(dir, id, `${JSON.stringify(value, null, 2)}\n`);
const readAskRaw = (dir, id) => readFile(askRequestPath(dir, id), "utf8");
const freshAsksDir = async () => {
  const dir = loopAsksDir();
  await rm(dir, { recursive: true, force: true });
  return dir;
};
// A rejection's code and status, read off the thrown error.
async function refusal(promise) {
  try {
    await promise;
  } catch (error) {
    return { code: error.code, status: error.status, message: error.message };
  }
  return null;
}

// Each prior state the file can hold, arranged for the run R1.
const PRIORS = {
  absent: async (dir) => { await rm(askRequestPath(dir, "R1"), { force: true }); },
  waiting: (dir) => writeAskRecord(dir, "R1", askRecord()),
  parked: (dir) => writeAskRecord(dir, "R1", askRecord({ state: "parked", parkedAt: "2026-09-23T17:30:00.000Z" })),
  answered: (dir) => writeAskRecord(dir, "R1", askRecord({ state: "answered", answer: "b", answeredAt: "2026-09-23T17:05:00.000Z", by: ANSWER_BY })),
  corrupt: (dir) => writeAskRaw(dir, "R1", "{ not json"),
};

const askRequestTests = [
  // ---- task 02: the ask file lives in the aof home ------------------------------------------
  {
    name: "131/01 ask-request/02 the directory and the path derive from the mesh root, and only there",
    run() {
      const H = path.join("C:", "tmp", "aof-home");
      const dir = loopAsksDir({ AOF_GLOBAL_HOME: H });
      assert.equal(dir, path.join(H, "mesh", "loop-asks"));
      assert.equal(askRequestPath(dir, "20260923T173003685Z-0000"), path.join(dir, "20260923T173003685Z-0000.json"));
      assert.equal(dir, path.join(globalMeshPaths({ env: { AOF_GLOBAL_HOME: H } }).meshRoot, "loop-asks"), "the resolver is globalMeshPaths");
    },
  },
  {
    name: "131/01 ask-request/02 an opened ask is the fifteen keys, in order, waiting, whole — and nothing of the temp write remains",
    async run() {
      const dir = await freshAsksDir();
      await openAsk(dir, { ...ASK, now: ASK_NOW });
      const raw = JSON.parse(await readAskRaw(dir, "R1"));
      assert.deepEqual(Object.keys(raw), FIFTEEN_KEYS);
      assert.deepEqual(raw, askRecord());
      assert.deepEqual((await readdir(dir)).filter((name) => name.startsWith(".tmp-")), []);
      assert.deepEqual(await readAsk(dir, "R1"), raw);
    },
  },
  {
    name: "131/01 ask-request/02 openAsk writes a whole waiting record over whatever the file held — absent, waiting, parked, answered or corrupt",
    async run() {
      const dir = await freshAsksDir();
      for (const [prior, arrange] of Object.entries(PRIORS)) {
        await arrange(dir);
        await openAsk(dir, { ...ASK, question: "Decision needed: Y", now: () => new Date("2026-09-23T18:00:00.000Z") });
        degradeEvents();
        assert.deepEqual(await readAsk(dir, "R1"), askRecord({ question: "Decision needed: Y", askedAt: "2026-09-23T18:00:00.000Z" }), `over a ${prior} file`);
      }
      setDegradeSinkForTest(undefined);
    },
  },
  {
    name: "131/01 ask-request/02 the key set never shrinks — an omitted carried field is written null in its slot",
    async run() {
      const dir = await freshAsksDir();
      for (const omitted of ["loopRunId", "scope", "node", "sessionId"]) {
        await openAsk(dir, { ...ASK, [omitted]: undefined, now: ASK_NOW });
        const raw = JSON.parse(await readAskRaw(dir, "R1"));
        assert.deepEqual(Object.keys(raw), FIFTEEN_KEYS, `omitting ${omitted}`);
        assert.equal(raw[omitted], null, `omitting ${omitted}: it reads null`);
      }
    },
  },
  {
    name: "131/01 ask-request/02 parkAsk moves a waiting ask and nothing else; the answer that won the race stands; clearing is quiet twice",
    async run() {
      const dir = await freshAsksDir();
      const at = () => new Date("2026-09-23T19:00:00.000Z");
      const rows = [
        ["waiting", askRecord({ state: "parked", parkedAt: "2026-09-23T19:00:00.000Z" }), "changed", 0],
        ["parked", "unchanged", "byte-unchanged", 0],
        ["answered", "unchanged", "byte-unchanged", 0],
        ["absent", null, "absent", 0],
        ["corrupt", null, "byte-unchanged", 1],
      ];
      try {
        for (const [prior, answer, after, degrades] of rows) {
          await PRIORS[prior](dir);
          const before = prior === "absent" ? null : await readAskRaw(dir, "R1");
          const events = degradeEvents();
          const parked = await parkAsk(dir, "R1", { now: at });
          if (answer === "unchanged") assert.deepEqual(parked, JSON.parse(before), `${prior}: that record, unchanged`);
          else assert.deepEqual(parked, answer, `${prior}: the answer`);
          if (after === "byte-unchanged") assert.equal(await readAskRaw(dir, "R1"), before, `${prior}: the file is byte-unchanged`);
          if (after === "absent") await assert.rejects(access(askRequestPath(dir, "R1")), { code: "ENOENT" }, `${prior}: still absent`);
          if (after === "changed") assert.equal((await readAsk(dir, "R1")).parkedAt, "2026-09-23T19:00:00.000Z");
          assert.equal(events.filter((e) => e.code === "loop-ask-request").length, degrades, `${prior}: degrades`);
        }

        await PRIORS.waiting(dir);
        const events = degradeEvents();
        await clearAsk(dir, "R1");
        await clearAsk(dir, "R1");
        await assert.rejects(access(askRequestPath(dir, "R1")), { code: "ENOENT" });
        assert.deepEqual(events, [], "clearing twice is quiet");
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  {
    name: "131/01 ask-request/02 the write never lands under the checkout",
    async run() {
      const dir = loopAsksDir();
      const C = await mkdtemp(path.join(os.tmpdir(), "aof-ask-checkout-"));
      const previousCwd = process.cwd();
      try {
        await writeFile(path.join(C, "README.md"), "a fixture checkout\n");
        process.chdir(C);
        const before = await listTree(C);
        await openAsk(dir, { ...ASK, now: ASK_NOW });
        assert.deepEqual(await listTree(C), before);
        await access(path.join(process.env.AOF_GLOBAL_HOME, "mesh", "loop-asks", "R1.json"));
      } finally {
        process.chdir(previousCwd);
        await rm(C, { recursive: true, force: true });
      }
    },
  },
  {
    name: "131/01 ask-request/02 the read is absence-tolerant and degrades anything that is not a record to null — one coded event carrying the path",
    async run() {
      const dir = await freshAsksDir();
      const filePath = askRequestPath(dir, "R1");
      const fifteen = askRecord();
      const rows = [
        ["does not exist, nor does dir", async () => { await rm(dir, { recursive: true, force: true }); }, null, 0],
        ["holds the fifteen-key waiting record", () => writeAskRecord(dir, "R1", fifteen), fifteen, 0],
        ["holds `{ not json`", () => writeAskRaw(dir, "R1", "{ not json"), null, 1],
        ["holds the record with state done", () => writeAskRecord(dir, "R1", { ...fifteen, state: "done" }), null, 1],
        ["holds the record plus an unknown key", () => writeAskRecord(dir, "R1", { ...fifteen, extra: 1 }), { ...fifteen, extra: 1 }, 0],
        ["holds { state: parked } and nothing else", () => writeAskRecord(dir, "R1", { state: "parked" }), { state: "parked" }, 0],
        ["is empty (zero bytes)", () => writeAskRaw(dir, "R1", ""), null, 1],
        ["holds a JSON array", () => writeAskRaw(dir, "R1", "[]"), null, 1],
        ["holds JSON null", () => writeAskRaw(dir, "R1", "null"), null, 1],
        ["holds the record with state WAITING", () => writeAskRecord(dir, "R1", { ...fifteen, state: "WAITING" }), null, 1],
        ["holds the record with no state key", () => { const { state, ...rest } = fifteen; return writeAskRecord(dir, "R1", rest); }, null, 1],
        ["is a directory", async () => { await rm(filePath, { force: true }); await mkdir(filePath, { recursive: true }); }, null, 1],
      ];
      try {
        for (const [state, arrange, answer, degrades] of rows) {
          await arrange();
          const events = degradeEvents();
          assert.deepEqual(await readAsk(dir, "R1"), answer, `the file ${state}`);
          assert.equal(events.length, degrades, `the file ${state}: degrades`);
          for (const event of events) {
            assert.equal(event.code, "loop-ask-request");
            assert.equal(event.path, filePath);
          }
        }
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  {
    name: "131/01 ask-request/02 a runId that is not one filename segment is refused by every export before the filesystem is touched, naming runId",
    async run() {
      const dir = await freshAsksDir();
      for (const id of ["../R1", "a/b", undefined, "", "..", ".hidden", "a\\b", "a:b", "R 1", 42]) {
        const label = JSON.stringify(id ?? "undefined");
        assert.throws(() => askRequestPath(dir, id), (e) => e instanceof TypeError && /runId/.test(e.message), `askRequestPath refuses ${label}`);
        await assert.rejects(openAsk(dir, { ...ASK, runId: id, now: ASK_NOW }), (e) => e instanceof TypeError && /runId/.test(e.message), `openAsk refuses ${label}`);
        await assert.rejects(parkAsk(dir, id, { now: ASK_NOW }), TypeError, `parkAsk refuses ${label}`);
        await assert.rejects(readAsk(dir, id), TypeError, `readAsk refuses ${label}`);
        await assert.rejects(clearAsk(dir, id), TypeError, `clearAsk refuses ${label}`);
        assert.throws(() => createAskPoll({ dir, runId: id, pollMs: 0 }), TypeError, `createAskPoll refuses ${label}`);
      }
      await assert.rejects(access(dir), { code: "ENOENT" }, "dir still does not exist");
    },
  },
  {
    name: "131/01 ask-request/02 readAsks answers one workspace's records, ordered, skipping what is not a record — and [] quietly for an empty answer",
    async run() {
      const dir = await freshAsksDir();
      try {
        for (const [state, arrange] of [
          ["does not exist", async () => {}],
          ["exists and is empty", () => mkdir(dir, { recursive: true })],
          ["holds only R3 for w2", () => writeAskRecord(dir, "R3", askRecord({ runId: "R3", workspaceId: "w2" }))],
          ["holds only a .tmp entry", async () => { await rm(dir, { recursive: true, force: true }); await mkdir(dir, { recursive: true }); await writeFile(path.join(dir, ".tmp-R1.json-1-2-x"), "{"); }],
        ]) {
          await arrange();
          const events = degradeEvents();
          assert.deepEqual(await readAsks(dir, { workspaceId: "w1" }), [], `dir ${state}`);
          assert.deepEqual(events, [], `dir ${state}: nothing degraded`);
        }

        await rm(dir, { recursive: true, force: true });
        await writeAskRecord(dir, "R1", askRecord({ runId: "R1", state: "answered", askedAt: "2026-09-23T17:02:00.000Z" }));
        await writeAskRecord(dir, "R2", askRecord({ runId: "R2", askedAt: "2026-09-23T17:01:00.000Z" }));
        await writeAskRecord(dir, "R4", askRecord({ runId: "R4", state: "parked", askedAt: "2026-09-23T17:01:00.000Z" }));
        await writeAskRecord(dir, "R3", askRecord({ runId: "R3", workspaceId: "w2", askedAt: "2026-09-23T17:00:00.000Z" }));
        await writeAskRaw(dir, "R6", "{ not json");
        await writeFile(path.join(dir, ".tmp-R5.json-1-2-x"), JSON.stringify(askRecord()).slice(0, 40));
        await writeFile(path.join(dir, "notes.txt"), "notes");
        const events = degradeEvents();
        assert.deepEqual((await readAsks(dir, { workspaceId: "w1" })).map((r) => r.runId), ["R2", "R4", "R1"]);
        assert.deepEqual(events.map((e) => [e.code, e.path]), [["loop-ask-request", askRequestPath(dir, "R6")]]);
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  {
    name: "131/01 ask-request/02 the poll reads the file on its unref'd interval, arms only for a positive finite pollMs, and a corrupt file answers null without rejecting",
    async run() {
      const dir = await freshAsksDir();
      const timers = fakeTimers();
      const poll = createAskPoll({ dir, runId: "R1", pollMs: 5, timers });
      assert.equal(poll.ask(), null, "construction reads nothing");
      poll.start();
      assert.equal(timers.set.length, 1);
      await writeAskRecord(dir, "R1", askRecord({ state: "answered", answer: "b" }));
      timers.set[0].fn();
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(poll.ask().state, "answered");
      assert.equal(timers.set[0].unrefs, 1, "the interval was unref'd");
      poll.stop();
      assert.deepEqual(timers.clear, [timers.set[0]], "after stop() no interval is held");

      for (const [pollMs, armed, period] of [[undefined, 1, 2000], [5, 1, 5], [0, 0, null], [-1, 0, null], ["5", 0, null], [Infinity, 0, null]]) {
        const t = fakeTimers();
        const p = createAskPoll({ dir, runId: "R1", ...(pollMs === undefined ? {} : { pollMs }), timers: t });
        p.start();
        assert.equal(t.set.length, armed, `pollMs ${String(pollMs)}`);
        if (period != null) assert.equal(t.set[0].ms, period);
        assert.equal(p.ask(), null);
        p.stop();
      }

      await writeAskRaw(dir, "R1", "{ not json");
      const events = degradeEvents();
      try {
        const t = fakeTimers();
        const p = createAskPoll({ dir, runId: "R1", pollMs: 5, timers: t });
        p.start();
        t.set[0].fn();
        await new Promise((resolve) => setTimeout(resolve, 20));
        assert.equal(p.ask(), null);
        assert.deepEqual(events.map((e) => e.code), ["loop-ask-request"]);
        p.stop();
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  {
    name: "131/01 ask-request/02 the ask's words have one home: no other src module spells loop-asks, and the module imports its three leaves",
    async run() {
      const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
      const files = (await readdir(srcRoot, { recursive: true })).filter((f) => f.endsWith(".mjs"));
      assert.ok(files.length > 100, `the sweep read src/ — ${files.length} modules`);
      for (const rel of files) {
        if (rel.split(path.sep).join("/") === "loop/ask-request.mjs") continue;
        assert.ok(!stripComments(await readFile(path.join(srcRoot, rel), "utf8")).includes("loop-asks"), `${rel} spells loop-asks`);
      }
      const own = await readFile(path.join(srcRoot, "loop", "ask-request.mjs"), "utf8");
      assert.match(own, /import\s*\{[^}]*\bglobalMeshPaths\b[^}]*\}\s*from\s*"\.\.\/workspace\.mjs"/u);
      assert.match(own, /import\s*\{[^}]*\bwriteText\b[^}]*\}\s*from\s*"\.\.\/fs\.mjs"/u);
      assert.match(own, /import\s*\{[^}]*\breportDegrade\b[^}]*\}\s*from\s*"\.\.\/degrade\.mjs"/u);
    },
  },

  // ---- task 03: the answer is sanitised once ------------------------------------------------
  {
    name: "131/01 ask-request/03 an answer to a waiting ask is stored verbatim with who and when; a parked ask takes one too and keeps its parkedAt",
    async run() {
      const dir = await freshAsksDir();
      await openAsk(dir, { ...ASK, now: ASK_NOW });
      const text = "  take b — the residue is ignored\n";
      const written = await answerAsk(dir, { workspaceId: "w1", ref: "131/01", text, by: ANSWER_BY, now: ANSWER_NOW });
      const read = await readAsk(dir, "R1");
      assert.deepEqual(written, read, "it answers the written record");
      assert.equal(read.state, "answered");
      assert.equal(read.answer, text);
      assert.equal(read.answeredAt, "2026-09-23T17:05:00.000Z");
      assert.deepEqual(read.by, ANSWER_BY);

      await openAsk(dir, { ...ASK, now: ASK_NOW });
      await parkAsk(dir, "R1", { now: () => new Date("2026-09-23T17:03:00.000Z") });
      await answerAsk(dir, { workspaceId: "w1", ref: "131/01", text: "b", by: ANSWER_BY, now: ANSWER_NOW });
      const parked = await readAsk(dir, "R1");
      assert.equal(parked.state, "answered");
      assert.equal(parked.parkedAt, "2026-09-23T17:03:00.000Z", "its parkedAt is kept");
    },
  },
  {
    name: "131/01 ask-request/03 a bad answer is refused 400 before any file is read — blank, over-long, control characters, in that order (twenty-five rows)",
    async run() {
      const dir = await freshAsksDir();
      await openAsk(dir, { ...ASK, now: ASK_NOW });
      const before = await readAskRaw(dir, "R1");
      const a = (n) => "a".repeat(n);
      const rows = [
        ["131/01", "", "answer-empty"],
        ["131/01", "  \n\t ", "answer-empty"],
        ["131/01", a(8001), "answer-too-long"],
        ["131/01", "ok\u001b[201~rm -rf .", "answer-control-chars"],
        ["131/01", "ok\u007f", "answer-control-chars"],
        ["999/99", "", "answer-empty"],
        ["131/01", undefined, "answer-empty"],
        ["131/01", null, "answer-empty"],
        ["131/01", 42, "answer-empty"],
        ["131/01", "\r\n", "answer-empty"],
        ["131/01", " 　", "answer-empty"],
        ["131/01", "\u000b", "answer-empty"],
        ["131/01", "\u000c", "answer-empty"],
        ["131/01", "\u0000ok", "answer-control-chars"],
        ["131/01", "ok\u0000", "answer-control-chars"],
        ["131/01", "\u0000", "answer-control-chars"],
        ["131/01", "a\u0008b", "answer-control-chars"],
        ["131/01", "a\u000bb", "answer-control-chars"],
        ["131/01", "a\u000cb", "answer-control-chars"],
        ["131/01", "ok\u001f", "answer-control-chars"],
        ["131/01", "\u001b[201~", "answer-control-chars"],
        ["131/01", `${a(8001)}\u0000`, "answer-too-long"],
        ["131/01", "😀".repeat(8001), "answer-too-long"],
        ["131/01", `${a(8000)}😀`, "answer-too-long"],
        ["999/99", "ok\u001b", "answer-control-chars"],
      ];
      for (const [ref, text, code] of rows) {
        const got = await refusal(answerAsk(dir, { workspaceId: "w1", ref, text, by: ANSWER_BY, now: ANSWER_NOW }));
        assert.deepEqual(got && { code: got.code, status: got.status }, { code, status: 400 }, `${JSON.stringify(text)?.slice(0, 40)} → ${code}`);
      }
      assert.equal(await readAskRaw(dir, "R1"), before, "the file for R1 is byte-unchanged");

      const absent = await freshAsksDir();
      const got = await refusal(answerAsk(absent, { workspaceId: "w1", ref: "131/01", text: "ok\u001b", by: ANSWER_BY, now: ANSWER_NOW }));
      assert.deepEqual({ code: got.code, status: got.status }, { code: "answer-control-chars", status: 400 });
      await assert.rejects(access(absent), { code: "ENOENT" }, "dir still does not exist");
    },
  },
  {
    name: "131/01 ask-request/03 the whitespace controls and the upper limit are admitted, and stored exactly (ten rows)",
    async run() {
      const dir = await freshAsksDir();
      for (const text of ["a\tb\r\nc", "a".repeat(8000), "\ta", "a\r", "x\n", "😀".repeat(8000), `${"a".repeat(7999)}😀`, "café — naïve 😀", "a b", "[201~ with no ESC"]) {
        await openAsk(dir, { ...ASK, now: ASK_NOW });
        const written = await answerAsk(dir, { workspaceId: "w1", ref: "131/01", text, by: ANSWER_BY, now: ANSWER_NOW });
        assert.equal(written.answer, text);
        assert.equal((await readAsk(dir, "R1")).answer, text);
      }
    },
  },
  {
    name: "131/01 ask-request/03 the first answer wins and the refusal names who gave it; a ref with no ask answers null and writes nothing; another workspace is untouched",
    async run() {
      const dir = await freshAsksDir();
      await openAsk(dir, { ...ASK, now: ASK_NOW });
      await openAsk(dir, { ...ASK, runId: "R2", workspaceId: "w2", now: ASK_NOW });
      await answerAsk(dir, { workspaceId: "w1", ref: "131/01", text: "b", by: ANSWER_BY, now: ANSWER_NOW });
      const second = await refusal(answerAsk(dir, { workspaceId: "w1", ref: "131/01", text: "c", by: { actor: "board", via: "board", node: "node-7297" }, now: ANSWER_NOW }));
      assert.equal(second.code, "ask-already-answered");
      assert.equal(second.status, 409);
      assert.match(second.message, /\byou\b/u, "the refusal names who gave the first answer");
      assert.equal((await readAsk(dir, "R1")).answer, "b");
      assert.equal((await readAsk(dir, "R2")).state, "waiting", "another workspace's ask for the same ref is not touched");

      const listing = (await readdir(dir)).sort();
      assert.equal(await answerAsk(dir, { workspaceId: "w1", ref: "131/02", text: "b", by: ANSWER_BY, now: ANSWER_NOW }), null);
      assert.deepEqual((await readdir(dir)).sort(), listing, "the listing is unchanged");
    },
  },
  {
    name: "131/01 ask-request/03 the answer after each prior state of the ask, and of two asks for one ref the latest askedAt is the ask",
    async run() {
      const dir = await freshAsksDir();
      const answerB = () => answerAsk(dir, { workspaceId: "w1", ref: "131/01", text: "b", by: ANSWER_BY, now: ANSWER_NOW });

      await openAsk(dir, { ...ASK, now: ASK_NOW });
      await parkAsk(dir, "R1", { now: ASK_NOW });
      await answerAsk(dir, { workspaceId: "w1", ref: "131/01", text: "a", by: ANSWER_BY, now: ANSWER_NOW });
      const refused = await refusal(answerB());
      assert.deepEqual([refused.code, refused.status], ["ask-already-answered", 409]);
      assert.match(refused.message, /\byou\b/u);
      assert.equal((await readAsk(dir, "R1")).answer, "a");

      await openAsk(dir, { ...ASK, question: "Decision needed: Y", now: ASK_NOW });
      const reasked = await answerB();
      assert.equal(reasked.question, "Decision needed: Y");
      assert.equal(reasked.answer, "b");

      await clearAsk(dir, "R1");
      assert.equal(await answerB(), null);
      await assert.rejects(access(askRequestPath(dir, "R1")), { code: "ENOENT" }, "no file is created");

      await writeAskRaw(dir, "R1", "{ not json");
      degradeEvents();
      assert.equal(await answerB(), null);
      assert.equal(await readAskRaw(dir, "R1"), "{ not json", "the corrupt file is byte-unchanged");
      setDegradeSinkForTest(undefined);

      for (const [r1, r3, outcome] of [["answered", "waiting", "answers"], ["waiting", "answered", "refuses"], ["waiting", "parked", "answers"]]) {
        await rm(dir, { recursive: true, force: true });
        const at = (hh) => ({ askedAt: `2026-09-23T17:${hh}:00.000Z` });
        const stateOf = (s) => (s === "answered" ? { state: "answered", answer: "x", answeredAt: "2026-09-23T17:04:00.000Z", by: ANSWER_BY } : s === "parked" ? { state: "parked", parkedAt: "2026-09-23T17:04:00.000Z" } : {});
        await writeAskRecord(dir, "R1", askRecord({ ...at("00"), ...stateOf(r1) }));
        await writeAskRecord(dir, "R3", askRecord({ runId: "R3", ...at("03"), ...stateOf(r3) }));
        const r1Before = await readAskRaw(dir, "R1");
        if (outcome === "answers") {
          const written = await answerB();
          assert.equal(written.runId, "R3", `${r1}/${r3}: R3's record`);
          assert.equal(written.state, "answered");
          assert.equal(written.answer, "b");
        } else {
          const got = await refusal(answerB());
          assert.deepEqual([got.code, got.status], ["ask-already-answered", 409], `${r1}/${r3}`);
        }
        assert.equal(await readAskRaw(dir, "R1"), r1Before, `${r1}/${r3}: R1's file is byte-unchanged`);
      }
    },
  },
];

// ---------------------------------------------------------------------------------------------
// milestone 131 / story 03, task 06 — `readLastLoopDiagEvent`: a dying loop cannot post, so its death
// is reported by the next invocation, and this is the cause it names — the last line the recorder
// wrote, in its own shape, from the scope's newest earlier log.
// ---------------------------------------------------------------------------------------------
const diagEventTests = [
  {
    name: "131/03 loop-diag/06 the last line of the log is read in the recorder's own shape, or not at all (twelve rows)",
    async run() {
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-diag-read-"));
      try {
        const file = path.join(dir, "loop-diag.03.2026-09-23T15-00-00-000Z.log");
        for (const [body, answer] of [
          ["2026-09-23T15:00:00.000Z exit code=1\n", { at: "2026-09-23T15:00:00.000Z", event: "exit", detail: "code=1" }],
          ["2026-09-23T15:00:00.000Z beforeExit\n", { at: "2026-09-23T15:00:00.000Z", event: "beforeExit", detail: null }],
          ["2026-09-23T15:00:00.000Z uncaught TypeError: x is not a function\n", { at: "2026-09-23T15:00:00.000Z", event: "uncaught", detail: "TypeError: x is not a function" }],
          ["2026-09-23T15:00:00.000Z stdout 03 — halted on x (producer y).\n", { at: "2026-09-23T15:00:00.000Z", event: "stdout", detail: "03 — halted on x (producer y)." }],
          ["2026-09-23T15:00:00.000Z exit code=1\n\n\n", { at: "2026-09-23T15:00:00.000Z", event: "exit", detail: "code=1" }],
          ["2026-09-23T15:00:00.000Z alive\r\n2026-09-23T15:00:00.000Z exit code=1\r\n", { at: "2026-09-23T15:00:00.000Z", event: "exit", detail: "code=1" }],
          ["2026-09-23T15:00:00.000Z uncaught Error\n    at run (file:///x.mjs:1:2)\n", null],
          ["2026-09-23T15:00:00.000Z\n", null],
          ["2026-09-23T15:00:00.000Z  exit code=1\n", null],
          ["2026-09-23 15:00:00 exit code=1\n", null],
          ["2026-02-30T15:00:00.000Z exit code=1\n", null],
          ["", null],
        ]) {
          await writeFile(file, body, "utf8");
          assert.deepEqual(await readLastLoopDiagEvent({ dir, scopeTag: "03" }), answer, JSON.stringify(body));
        }
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "131/03 loop-diag/06 the newest earlier log of the scope is the one read (ten rows)",
    async run() {
      const log = (tag, hh) => `loop-diag.${tag}.2026-09-23T${hh}-00-00-000Z.log`;
      const line = (hh) => `2026-09-23T${hh}:00:00.000Z exit code=${hh}\n`;
      const rows = [
        [{ [log("03", "15")]: line("15"), [log("03", "16")]: line("16") }, "03", log("03", "16"), "15", 0],
        [{ [log("03", "15")]: line("15"), [log("03", "16")]: line("16") }, "03", null, "16", 0],
        [{ [log("03", "15")]: line("15"), [log("03-05", "16")]: line("16") }, "03", null, "15", 0],
        [{ [log("12", "15")]: line("15"), [log("127", "16")]: line("16") }, "12", null, "15", 0],
        [{ [log("03", "16")]: line("16") }, "03", log("03", "16"), null, 0],
        [{ [log("03", "15")]: line("15"), [log("03", "16")]: "" }, "03", null, null, 0],
        [{ [log("03", "15")]: line("15"), [log("03", "16")]: "dir" }, "03", null, null, 1],
        [{ [log("03", "15")]: line("15"), [`${log("03", "16")}.bak`]: line("16") }, "03", null, "15", 0],
        [{ [log("04", "16")]: line("16") }, "03", null, null, 0],
        [null, "03", null, null, 0],
      ];
      try {
        for (const [index, [files, tag, exclude, read, degrades]] of rows.entries()) {
          const dir = path.join(await mkdtemp(path.join(os.tmpdir(), "aof-diag-newest-")), "logs");
          if (files != null) {
            await mkdir(dir, { recursive: true });
            for (const [name, body] of Object.entries(files)) {
              if (body === "dir") await mkdir(path.join(dir, name));
              else await writeFile(path.join(dir, name), body, "utf8");
            }
          }
          const events = degradeEvents();
          const answer = await readLastLoopDiagEvent({ dir, scopeTag: tag, ...(exclude == null ? {} : { exclude: path.join(dir, exclude) }) });
          assert.equal(answer == null ? null : answer.detail.replace("code=", ""), read, `row ${index}`);
          assert.equal(events.filter((e) => e.code === "loop-diag-read").length, degrades, `row ${index}: degrades`);
          await rm(path.dirname(dir), { recursive: true, force: true });
        }
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
];

// ONE export, both halves: the index spreads `loopDiagTests` and nothing else (no index edit —
// test/loop is at its ceiling), and a selected run takes every runner-shaped array a file exports,
// so a second exported array holding the same entries would run them twice.
export const loopDiagTests = [...recorderTests, ...stopRequestTests, ...askRequestTests, ...diagEventTests];
