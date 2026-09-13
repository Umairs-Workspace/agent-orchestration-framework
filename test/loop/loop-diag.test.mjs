// test/loop/loop-diag.test.mjs — the loop's exit-reason recorder (src/loop-diag.mjs, 2026-09-11).
//
// The module is exercised against an INJECTED process double: a real `process.on("exit")` or a
// wrapped `process.exit` registered in the test runner would outlive the test, so nothing here
// touches the real process, the real stderr or the real filesystem.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import path from "node:path";
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

export const loopDiagTests = [
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
      const handle = installLoopDiagnostics({ logDir: ROOT, argv: ["work", "loop", "127"], proc, env: {}, fs, now: () => at, aliveIntervalMs: 0 });
      assert.ok(handle && handle.logPath.startsWith(ROOT));
      assert.deepEqual(proc.stderrOut, [], "nothing is announced until the loop prints something itself — a refused invocation's stderr stays exactly its refusal");
      const log = () => fs.files.get(handle.logPath) ?? "";
      assert.match(log(), /start pid=4242 node=v22\.0\.0-test argv=\["work","loop","127"\]/);

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
