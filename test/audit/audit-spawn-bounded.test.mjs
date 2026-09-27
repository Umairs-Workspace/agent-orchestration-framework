// Traceability wiring for milestone 59 / story 01 —
// tasks/03_the-audit-runs-code-in-a-child-and-never-in-itself.feature.
//
// Covers every @executable scenario in that feature except the last, which is a claim about the
// FAMILY's source rather than about a run and is held by
// `test/arch/audit/acd-audit-never-imports-project-code.test.mjs` (FF-5904) — named there in the
// scenario's own words so the trace is readable from either end.
//
// Every lane drives the REAL seam over a REAL child process (`process.execPath`, never a shell,
// never a mock of `spawn` where the behaviour under test is the child's), because the four
// properties this seam exists for — an argument vector, a deadline, a kill on expiry, and the
// observed exit code and output — are all properties of what actually happened to a process.
// The one place a stub is used is the pair of not-started lanes, where the failure being driven
// is `spawn` itself refusing, and asking the operating system for a broken executable in a
// portable way is less honest than injecting the refusal.
//
//   03_… — the runner's assembled suite is obtained without importing it; a child that exceeds
//   its deadline is killed and reported with the deadline named; the exit code and output the
//   result reports are the ones observed; a command is passed as an argument vector and a shell
//   never sees it; a child that cannot be started is reported rather than swallowed.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EventEmitter } from "node:events";
import { runBounded, argumentVectorProblem, attemptedCommand, DEFAULT_DEADLINE_MS, DEFAULT_GRACE_MS, SPAWN_OUTCOMES, SPAWN_RESULT_KEYS } from "../../src/work-audit/spawn.mjs";
import { assembledSuite } from "../../src/work-audit/census.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// A marker the SYNTHETIC runner sets on `globalThis` at module scope. It is the whole proof of
// the first scenario: if the audit obtained the assembled suite by importing the runner, the
// marker would be set in THIS process. It is set in the child's.
const EVALUATED = "__AOF_5901_SYNTHETIC_RUNNER_EVALUATED__";

async function syntheticRunner(names) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-audit-runner-"));
  await mkdir(path.join(dir, "scripts"), { recursive: true });
  const file = path.join(dir, "scripts", "test.mjs");
  await writeFile(
    file,
    `globalThis[${JSON.stringify(EVALUATED)}] = true;\n`
      + `export const tests = ${JSON.stringify(names.map((name) => ({ name })))}.map((entry) => ({ name: entry.name, run: () => {} }));\n`,
    "utf8",
  );
  return { dir, file };
}

// ── 129/02 task 02's double ──────────────────────────────────────────────────────────────
// A `spawnChild` double: an EventEmitter child whose `stdout`/`stderr` support `setEncoding`
// and `on("data")`, whose `stdin` records every `end()` with a timestamp (or is `null`, for a
// child spawned with stdin ignored), whose `kill()` records every call with a timestamp, and
// whose `exit(code, signal)` emits `close` on demand. The scripted output is played on the
// next turn of the loop, after the seam has attached its listeners; `written()` resolves once
// it has been. A `kill()` that is not scripted to throw makes the child close with SIGKILL a
// turn later — what a real child does — so "the child never exits" is a child that only the
// kill can end. Every option bag is also recorded in EVERY_SPAWN_OPTIONS for the feature's
// last scenario.
const EVERY_SPAWN_OPTIONS = [];
// Node's timers and `Date.now()` are two millisecond clocks; a timer can observably fire one
// millisecond before the wall clock says it should. The slack is that one millisecond.
const CLOCK_SLACK_MS = 1;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, what, { timeoutMs = 2_000 } = {}) {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error(`timed out waiting for: ${what}`);
    await sleep(2);
  }
}

function spawnDouble({ stdout = "", stderr = "", exit = { code: 0, signal: null }, throws = null, stdinEndThrows = false, killThrows = false, noStdin = false } = {}) {
  const calls = [];
  const attempts = { count: 0 };
  let markWritten = () => {};
  const written = new Promise((resolve) => { markWritten = resolve; });
  const spawnChild = (command, args, options) => {
    EVERY_SPAWN_OPTIONS.push(options);
    attempts.count += 1;
    if (throws) throw throws;
    const child = new EventEmitter();
    child.stdout = Object.assign(new EventEmitter(), { setEncoding() {} });
    child.stderr = Object.assign(new EventEmitter(), { setEncoding() {} });
    child.stdin = noStdin ? null : {
      ends: [],
      end() {
        this.ends.push(Date.now());
        if (stdinEndThrows) throw new Error("stdin end fault");
      },
    };
    child.kills = [];
    child.kill = (signal) => {
      child.kills.push({ signal, at: Date.now() });
      if (killThrows) throw new Error("kill fault");
      setImmediate(() => child.emit("close", null, "SIGKILL"));
    };
    child.exit = (code, signal = null) => child.emit("close", code, signal);
    // A real child's handle keeps the event loop alive until it closes; the seam's own timers
    // are deliberately unref'd on that assumption. A double has no handle, so it holds the
    // loop itself until its `close` — without this the process simply exits, code 0, in the
    // middle of an await, and the runner prints no summary (measured while writing this).
    const handle = setInterval(() => {}, 1_000);
    child.on("close", () => clearInterval(handle));
    calls.push({ command, args, options, child });
    setImmediate(() => {
      if (stdout.length > 0) child.stdout.emit("data", stdout);
      if (stderr.length > 0) child.stderr.emit("data", stderr);
      markWritten();
      if (exit != null) child.exit(exit.code, exit.signal ?? null);
    });
    return child;
  };
  return { spawnChild, calls, attempts, written: () => written };
}

export const auditSpawnBoundedTests = [
  // ══ Scenario: the runner's assembled suite is obtained without importing it ══════════
  {
    name: "audit-spawn/03 the runner's assembled suite comes from a child process, and no project module is imported into the audit's own process",
    async run() {
      assert.equal(globalThis[EVALUATED], undefined, "precondition: the synthetic runner has not been evaluated in this process");
      const { dir, file } = await syntheticRunner(["alpha/one", "alpha/two", "beta/one"]);
      try {
        const answer = await assembledSuite({ repoRoot, runner: file, deadlineMs: 30_000 });
        assert.equal(answer.ok, true, `the assembled suite was obtained: ${answer.error ?? ""}`);
        assert.deepEqual(answer.names, ["alpha/one", "alpha/two", "beta/one"], "the answer is the names the runner assembled");

        // THE POINT. The runner's module scope ran — in the child. Had the audit reached the
        // same answer by `import()`, this marker would be set here, which is 66/ADR-004 §2's
        // refusal ("importing executes its module scope") stated as an observation.
        assert.equal(globalThis[EVALUATED], undefined, "the runner's module scope did NOT run in the audit's process — the answer came from a child");
        assert.equal(answer.result.outcome, "exited", "and it came through the bounded seam, which reported a terminal outcome");
        assert.equal(answer.result.exitCode, 0, "the child exited 0");
        assert.equal(answer.result.deadlineMs, 30_000, "the seam names the deadline it applied");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },

  // ══ Scenario: a child that exceeds its deadline is killed and reported ═══════════════
  {
    name: "audit-spawn/03 a child that will not finish within its deadline is killed, and the result reports the expiry and names the deadline that was applied",
    async run() {
      const started = Date.now();
      const result = await runBounded({
        command: process.execPath,
        // A child that would outlive the audit by a wide margin if nothing bounded it.
        args: ["-e", "setInterval(() => {}, 1000); process.stdout.write('alive');"],
        deadlineMs: 400,
      });
      const elapsed = Date.now() - started;

      assert.equal(result.outcome, "deadline-expired", `the outcome is the expiry, not a plain non-zero exit: ${JSON.stringify(result)}`);
      assert.equal(result.deadlineMs, 400, "the result NAMES the deadline that was applied — a report never has to guess it");
      assert.match(result.error, /400ms deadline/u, "and the message quotes it too");
      assert.match(result.error, /killed/u, "the message says the child was killed");
      assert.ok(elapsed < 20_000, `it was killed at the deadline rather than run to completion (elapsed ${elapsed}ms)`);
      // The kill is a DIFFERENT outcome from a failure. "It failed" and "it never finished" are
      // two findings and an audit must not conflate them.
      assert.notEqual(result.outcome, "exited", "an expired child is not reported as an ordinary exit");
      assert.ok(result.stdout.includes("alive"), "and the output observed before the kill is still handed back");
    },
  },

  // ══ Scenario: the exit code the result reports is the one that was observed ══════════
  {
    name: "audit-spawn/03 the result carries the exit code the child actually returned and the output it actually produced",
    async run() {
      const result = await runBounded({
        command: process.execPath,
        args: ["-e", "process.stdout.write('OUT-MARKER'); process.stderr.write('ERR-MARKER'); process.exit(17);"],
        deadlineMs: 30_000,
      });
      assert.equal(result.outcome, "exited", "the child exited on its own");
      assert.equal(result.exitCode, 17, "the exit code is the one the child returned — not a boolean, not a normalisation");
      assert.equal(result.stdout, "OUT-MARKER", "stdout is what the child wrote");
      assert.equal(result.stderr, "ERR-MARKER", "stderr is what the child wrote");
      assert.equal(result.error, null, "a non-zero exit is not an error of the seam's");

      // ADR-004 §3 — the oracle is the message. A seam that dropped stderr would leave every
      // consumer downstream reasoning from a pass/fail count, which 56 measured as blind on a
      // standing-red gate.
      assert.deepEqual(Object.keys(result).sort(), [...SPAWN_RESULT_KEYS].sort(), "the envelope is complete on every outcome, so absent never has to be read as fine");
      assert.ok(SPAWN_OUTCOMES.includes(result.outcome), "the outcome is one of the frozen vocabulary (four since 129/02: `aborted` joined)");
    },
  },

  // ══ Scenario: a command is passed as an argument vector ═════════════════════════════
  {
    name: "audit-spawn/03 arguments carrying characters a shell would interpret reach the child unchanged, and no shell interprets them",
    async run() {
      // Every one of these is a shell control character on at least one of this repo's three
      // platforms. If ANY shell sat between the seam and the child, the child would not see
      // them: `&` would background, `|` would pipe, `>` would redirect, `$HOME` would expand,
      // and `*` would glob against the working directory.
      const hostile = 'a & b | c > d ; e $HOME `whoami` * ? "quoted" \'single\'';
      const result = await runBounded({
        command: process.execPath,
        args: ["-e", "process.stdout.write(process.argv[1] ?? '<none>')", hostile],
        deadlineMs: 30_000,
      });
      assert.equal(result.outcome, "exited", `the child ran: ${JSON.stringify(result)}`);
      assert.equal(result.exitCode, 0, "and exited 0");
      assert.equal(result.stdout, hostile, "the argument reached the child BYTE-for-byte — no shell split it, expanded it, redirected on it or globbed it");
      assert.deepEqual(result.args, ["-e", "process.stdout.write(process.argv[1] ?? '<none>')", hostile], "and the result reports the vector it was given");

      // The other half of the same rule: a SHELL STRING in the executable position is refused
      // at the door rather than handed to a shell, because there is no shell here to read it.
      const refusal = await runBounded({ command: "node -e \"process.exit(0)\"", args: [], deadlineMs: 1000 });
      assert.equal(refusal.outcome, "not-started", "a shell string is refused rather than run");
      assert.match(refusal.error, /ARGUMENT VECTOR/u, "and the refusal says why");
      assert.equal(argumentVectorProblem(process.execPath, ["-e", hostile]), null, "a well-formed vector is not refused — including one whose ARGUMENTS are hostile");
      assert.match(String(argumentVectorProblem(process.execPath, "-e --json")), /never one string the shell would re-split/u, "and a string where the vector should be is refused by name");

      // ── REGRESSION (review, 2026-08-29): THE DOOR MUST NOT REFUSE A REAL EXECUTABLE ──────
      //
      // The first refusal keyed on a character class holding `'`, `#`, `~`, `!`, `*`, `?` and
      // `$`, every one of which is legal in an executable path. The consequence was not a
      // cosmetic one: `runBounded` would answer `not-started` at the door, `assembledSuite`
      // would answer `ok: false`, and EVERY census run on such a machine would report
      // `audit-runtime-membership-unavailable` — blaming a shell metacharacter in a path that
      // is fine. The last of these is the same `C:\Program Files\nodejs` directory the seam's
      // own header cites, in 8.3 short form.
      //
      // `exists` is injected so these four shapes are driven on every platform. A path that is
      // a FILE is not a shell string, whatever characters it holds.
      const realExecutables = [
        ["C:\\Users\\O'Brien\\node.exe", "an apostrophe in a surname"],
        ["C:\\dev\\aof#2\\node.exe", "a hash in a directory name"],
        ["C:\\PROGRA~1\\nodejs\\node.exe", "the 8.3 short form of Program Files — the SAME directory this seam's header cites"],
        ["/home/user/node-v22!/bin/node", "an exclamation mark in a version directory"],
        ["C:\\dev\\R&D\\node.exe", "an ampersand — shell control syntax, and a legal Windows directory"],
        ["/opt/tools;v2/node", "a semicolon — shell control syntax, and a legal POSIX path"],
      ];
      for (const [executable, why] of realExecutables) {
        assert.equal(
          argumentVectorProblem(executable, ["-e", "process.exit(0)"], () => true),
          null,
          `a real executable is NOT refused at the door — ${why}: ${executable}`,
        );
      }
      // …and the refusal still fires on a genuine shell string, which is not a file.
      for (const shellString of ['node -e "process.exit(0)"', "node --version | head -1", "node && echo done", "sh -c `whoami`"]) {
        assert.match(
          String(argumentVectorProblem(shellString, [], () => false)),
          /ARGUMENT VECTOR/u,
          `a shell string that is not a file on disk is still refused: ${shellString}`,
        );
      }
      // The two conditions are genuinely BOTH required — neither alone decides.
      assert.equal(argumentVectorProblem("node && echo done", [], () => true), null, "condition 2 alone: a path that exists is not a shell string, whatever it contains");
      assert.equal(argumentVectorProblem("/usr/local/bin/node", [], () => false), null, "condition 1 alone: a command with no control character is not refused merely for being unresolvable — PATH resolution is the OS's job, and a miss is reported as not-started");
      // And the real one this repository actually runs on, through the real predicate.
      assert.equal(argumentVectorProblem(process.execPath, ["-e", "process.exit(0)"]), null, `this machine's own process.execPath is accepted by the shipped predicate: ${process.execPath}`);
    },
  },

  // ══ Scenario: a child that cannot be started is reported rather than swallowed ═══════
  {
    name: "audit-spawn/03 a command that cannot be started is reported as not-started and the result names what was attempted",
    async run() {
      const missing = "aof-no-such-executable-59-01";
      const args = ["--census", "test/arch"];

      // (a) the asynchronous shape — `spawn` returns a child that immediately errors (ENOENT).
      const asyncRefusal = await runBounded({
        command: missing,
        args,
        deadlineMs: 5_000,
        spawnChild: () => {
          const listeners = new Map();
          const child = {
            stdout: { setEncoding() {}, on() {} },
            stderr: { setEncoding() {}, on() {} },
            kill() {},
            on(event, fn) { listeners.set(event, fn); return child; },
          };
          setTimeout(() => listeners.get("error")?.(Object.assign(new Error(`spawn ${missing} ENOENT`), { code: "ENOENT" })), 0);
          return child;
        },
      });
      assert.equal(asyncRefusal.outcome, "not-started", "the result reports that it could not be STARTED — not that it failed");
      assert.equal(asyncRefusal.exitCode, null, "there is no exit code to report, and none is invented");
      assert.match(asyncRefusal.error, /could not start/u, "the result says it could not be started");
      assert.ok(asyncRefusal.error.includes(attemptedCommand(missing, args)), `the result NAMES what was attempted — got: ${asyncRefusal.error}`);
      assert.ok(asyncRefusal.error.includes("--census"), "including the arguments, so a reader can see the whole invocation");

      // (b) the synchronous shape — `spawn` throws before there is any child at all.
      const syncRefusal = await runBounded({
        command: missing,
        args,
        deadlineMs: 5_000,
        spawnChild: () => { throw new Error("EACCES: permission denied"); },
      });
      assert.equal(syncRefusal.outcome, "not-started", "a spawn that throws is the same finding, not an exception the caller has to catch");
      assert.match(syncRefusal.error, /EACCES/u, "and the underlying reason survives into the report");
      assert.ok(syncRefusal.error.includes(attemptedCommand(missing, args)), "naming what was attempted");

      // "The command is missing" and "the command ran and failed" are two answers an audit must
      // not conflate, so they are two OUTCOMES and neither is inferable from an exit code.
      assert.notEqual(asyncRefusal.outcome, "exited", "not-started is not an exit");
      assert.equal(asyncRefusal.deadlineMs, 5_000, "and even a child that never started reports the bound it would have had");
    },
  },

  // ══ The seam's own defaults — a bound that has to be asked for is not a bound ════════
  {
    name: "audit-spawn/03 self-check — every call is bounded whether or not the caller says so, and a nonsense deadline falls back to the declared default rather than to none",
    async run() {
      assert.equal(typeof DEFAULT_DEADLINE_MS, "number");
      assert.ok(DEFAULT_DEADLINE_MS > 0, "the default bound is a real duration");
      const defaulted = await runBounded({ command: process.execPath, args: ["-e", "process.exit(0)"] });
      assert.equal(defaulted.deadlineMs, DEFAULT_DEADLINE_MS, "a caller that names no deadline still gets one, and the result says which");
      for (const nonsense of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, null, "soon"]) {
        const result = await runBounded({ command: process.execPath, args: ["-e", "process.exit(0)"], deadlineMs: nonsense });
        assert.equal(result.deadlineMs, DEFAULT_DEADLINE_MS, `deadlineMs=${String(nonsense)} falls back to the declared default rather than to no bound at all`);
      }
    },
  },

  // ══ The census's read of a runner that cannot answer ════════════════════════════════
  {
    name: "audit-spawn/03 self-check — a runner the child cannot evaluate is reported as unobtained, never as an empty assembled suite",
    async run() {
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-audit-badrunner-"));
      try {
        const file = path.join(dir, "broken-runner.mjs");
        await writeFile(file, "export const tests = ;\n", "utf8");
        const answer = await assembledSuite({ repoRoot, runner: file, deadlineMs: 30_000 });
        assert.equal(answer.ok, false, "the read failed");
        assert.deepEqual(answer.names, [], "and it yielded no names");
        assert.match(answer.error, /was not obtained/u, "the result says the assembled suite was NOT obtained — an empty array would read as a runner that assembles nothing");
        assert.equal(answer.result.outcome, "exited", "the child ran and reported for itself");
        assert.notEqual(answer.result.exitCode, 0, "with a non-zero exit code the caller can see");

        const noExport = path.join(dir, "no-export.mjs");
        await writeFile(noExport, "export const notTheSuite = 1;\n", "utf8");
        const second = await assembledSuite({ repoRoot, runner: noExport, deadlineMs: 30_000 });
        assert.equal(second.ok, false, "a runner that publishes no assembled array cannot be membership-checked");
        assert.match(second.error, /exports no assembled array|was not obtained/u, "and the reason is reported rather than guessed at");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // milestone 129 / story 02 — tasks/02_run-bounded-gains-abort.feature (ADR-005 §1; rulings
  // 2026-09-13). The seam gains `signal`, `graceMs` and `stdin: "pipe"`, additively: an abort
  // ends the child's stdin, waits the grace, then kills, and answers `aborted`; the first of
  // the deadline and the abort to fire decides, with exactly one kill. Every lane below drives
  // the REAL seam over an injected `spawnChild` DOUBLE — the properties under test are the
  // seam's own sequencing (what it ends, when it kills, what it answers), and a double is the
  // only way to observe "the child did not exit" without a real process that must then be
  // reaped. The double records every spawn option, every `stdin.end()` and every `kill()`
  // with a timestamp, and exits on demand.
  // ═══════════════════════════════════════════════════════════════════════════════════════
  {
    name: "129/02 task02 the outcome vocabulary gains aborted — SPAWN_OUTCOMES is exactly the four",
    run: () => {
      assert.deepEqual([...SPAWN_OUTCOMES], ["exited", "deadline-expired", "not-started", "aborted"], "the vocabulary is exactly the four, in the delivered order");
      assert.ok(Object.isFrozen(SPAWN_OUTCOMES), "and still frozen");
      assert.ok(Number.isSafeInteger(DEFAULT_GRACE_MS) && DEFAULT_GRACE_MS > 0, "the grace default is a named positive integer");
    },
  },
  {
    name: "129/02 task02 an abort ends stdin, waits the grace, then kills — outcome aborted, the abort and the kill both named, output captured before the kill retained",
    run: async () => {
      const controller = new AbortController();
      const double = spawnDouble({ stdout: "partial", stderr: "warn", exit: null });
      const pending = runBounded({ command: process.execPath, args: ["-e", "0"], stdin: "pipe", graceMs: 50, signal: controller.signal, spawnChild: double.spawnChild });
      await double.written();
      const abortedAt = Date.now();
      controller.abort();
      const result = await pending;
      const child = double.calls[0].child;
      assert.equal(child.stdin.ends.length, 1, "the child's stdin.end() was called exactly once");
      assert.equal(child.kills.length, 1, "kill() was called exactly once");
      assert.equal(child.kills[0].signal, "SIGKILL", "…as SIGKILL, exactly as the deadline path kills");
      assert.ok(child.stdin.ends[0] <= child.kills[0].at, "the stdin end preceded the kill");
      assert.ok(child.kills[0].at - abortedAt >= 50 - CLOCK_SLACK_MS, `the kill came no sooner than the 50ms grace after the abort (measured ${child.kills[0].at - abortedAt}ms)`);
      assert.equal(result.outcome, "aborted");
      assert.match(result.error, /abort/u, "the error names the abort");
      assert.match(result.error, /killed/u, "…and that the kill was needed");
      assert.equal(result.stdout, "partial", "the stdout captured before the kill is retained");
      assert.equal(result.stderr, "warn", "…and the stderr");
      assert.deepEqual(Object.keys(result).sort(), [...SPAWN_RESULT_KEYS].sort(), "the envelope is complete on the aborted outcome");
    },
  },
  {
    name: "129/02 task02 a child that exits within the grace is aborted with its own exit code and no kill — code 0, code 3, and a SIGTERM signal",
    run: async () => {
      for (const [exitCode, exitSignal] of [[0, null], [3, null], [null, "SIGTERM"]]) {
        const controller = new AbortController();
        const double = spawnDouble({ exit: null });
        const pending = runBounded({ command: process.execPath, args: ["-e", "0"], stdin: "pipe", graceMs: 500, signal: controller.signal, spawnChild: double.spawnChild });
        await double.written();
        controller.abort();
        await sleep(20);
        double.calls[0].child.exit(exitCode, exitSignal);
        const result = await pending;
        assert.equal(double.calls[0].child.kills.length, 0, `kill() was never called (exit ${exitCode}/${exitSignal})`);
        assert.equal(result.outcome, "aborted", "the caller asked for the stop and got it — still aborted");
        assert.equal(result.exitCode, exitCode, "with the child's real exit code");
        assert.equal(result.signal, exitSignal, "and its real signal");
        assert.match(result.error, /abort/u);
        assert.doesNotMatch(result.error, /killed/u, "no kill is claimed when none was needed");
      }
    },
  },
  {
    name: "129/02 task02 an abort after the run settled changes nothing — exited, deadline-expired and not-started all stand",
    run: async () => {
      // exited
      {
        const controller = new AbortController();
        const double = spawnDouble({ exit: { code: 0 } });
        const result = await runBounded({ command: process.execPath, args: ["-e", "0"], stdin: "pipe", signal: controller.signal, spawnChild: double.spawnChild });
        assert.equal(result.outcome, "exited");
        controller.abort();
        await sleep(10);
        assert.equal(double.calls[0].child.stdin.ends.length, 0, "no stdin end after an exited settle");
        assert.equal(double.calls[0].child.kills.length, 0, "no kill after an exited settle");
      }
      // deadline-expired
      {
        const controller = new AbortController();
        const double = spawnDouble({ exit: null });
        const result = await runBounded({ command: process.execPath, args: ["-e", "0"], stdin: "pipe", deadlineMs: 30, signal: controller.signal, spawnChild: double.spawnChild });
        assert.equal(result.outcome, "deadline-expired");
        assert.equal(double.calls[0].child.kills.length, 1, "the deadline's one kill");
        controller.abort();
        await sleep(10);
        assert.equal(double.calls[0].child.stdin.ends.length, 0, "no stdin end after a deadline settle");
        assert.equal(double.calls[0].child.kills.length, 1, "and no second kill");
      }
      // not-started
      {
        const controller = new AbortController();
        const double = spawnDouble({ throws: new Error("EACCES: permission denied") });
        const result = await runBounded({ command: process.execPath, args: ["-e", "0"], stdin: "pipe", signal: controller.signal, spawnChild: double.spawnChild });
        assert.equal(result.outcome, "not-started");
        assert.doesNotThrow(() => controller.abort(), "an abort after a not-started settle is a no-op");
        await sleep(10);
        assert.equal(double.attempts.count, 1, "the spawn was attempted exactly once, and the abort attempted no second");
      }
    },
  },
  {
    name: "129/02 task02 the abort's own faults are recorded, never thrown, and the sequence still completes — a throwing stdin.end, a throwing kill, and a child with no stdin",
    run: async () => {
      // stdin.end() throws → the kill still follows the grace
      {
        const controller = new AbortController();
        const double = spawnDouble({ exit: null, stdinEndThrows: true });
        const pending = runBounded({ command: process.execPath, args: ["-e", "0"], stdin: "pipe", graceMs: 20, signal: controller.signal, spawnChild: double.spawnChild });
        await double.written();
        const abortedAt = Date.now();
        controller.abort();
        const result = await pending;
        const child = double.calls[0].child;
        assert.equal(result.outcome, "aborted", "resolved, not rejected, and aborted");
        assert.equal(child.kills.length, 1, "kill() was still called");
        assert.ok(child.kills[0].at - abortedAt >= 20 - CLOCK_SLACK_MS, `…no sooner than the 20ms grace (measured ${child.kills[0].at - abortedAt}ms)`);
      }
      // kill() throws → recorded in the message
      {
        const controller = new AbortController();
        const double = spawnDouble({ exit: null, killThrows: true });
        const pending = runBounded({ command: process.execPath, args: ["-e", "0"], stdin: "pipe", graceMs: 20, signal: controller.signal, spawnChild: double.spawnChild });
        await double.written();
        controller.abort();
        const child = double.calls[0].child;
        await waitFor(() => child.kills.length === 1, "the kill was attempted");
        // A kill that threw sent nothing, so the double's child is exited by hand to settle.
        child.exit(null, "SIGKILL");
        const result = await pending;
        assert.equal(result.outcome, "aborted");
        assert.match(result.error, /the kill itself did not land/u, "the kill's own fault rides the message, in the deadline path's phrase");
      }
      // stdin: "ignore" → the child has no stdin; nothing is ended and the kill still follows the grace
      {
        const controller = new AbortController();
        const double = spawnDouble({ exit: null, noStdin: true });
        const pending = runBounded({ command: process.execPath, args: ["-e", "0"], stdin: "ignore", graceMs: 20, signal: controller.signal, spawnChild: double.spawnChild });
        await double.written();
        const abortedAt = Date.now();
        controller.abort();
        const result = await pending;
        const child = double.calls[0].child;
        assert.equal(child.stdin, null, "guard: the double's child carried no stdin");
        assert.equal(result.outcome, "aborted");
        assert.equal(child.kills.length, 1, "kill() was called");
        assert.ok(child.kills[0].at - abortedAt >= 20 - CLOCK_SLACK_MS, `…no sooner than the 20ms grace (measured ${child.kills[0].at - abortedAt}ms)`);
      }
    },
  },
  {
    name: "129/02 task02 graceMs is a positive integer or the named default — 40 is honoured; absent, 0, -1, NaN, Infinity, \"40\" and null all take the default",
    run: async () => {
      // The explicit value: the kill follows the abort no sooner than 40ms.
      {
        const controller = new AbortController();
        const double = spawnDouble({ exit: null });
        const pending = runBounded({ command: process.execPath, args: ["-e", "0"], stdin: "pipe", graceMs: 40, signal: controller.signal, spawnChild: double.spawnChild });
        await double.written();
        const abortedAt = Date.now();
        controller.abort();
        await pending;
        const child = double.calls[0].child;
        assert.equal(child.kills.length, 1);
        assert.ok(child.kills[0].at - abortedAt >= 40 - CLOCK_SLACK_MS, `graceMs 40 is applied (measured ${child.kills[0].at - abortedAt}ms)`);
      }
      // The default rows. DEFAULT_GRACE_MS is sized for a real child's graceful stop (seconds),
      // so these rows do not wait it out: each proves the applied grace is NOT the nonsense
      // value — no kill has followed the abort by a bound comfortably above every explicit
      // value in this feature — and that the abort WAS observed (stdin ended), then exits the
      // child within the grace. A row that passed because the abort path was dead would fail
      // on the stdin end and on the outcome.
      const probeMs = 150;
      assert.ok(DEFAULT_GRACE_MS > probeMs * 4, `the probe window is well inside the default (${DEFAULT_GRACE_MS}ms)`);
      const nonsense = [["absent", undefined], ["0", 0], ["-1", -1], ["NaN", Number.NaN], ["Infinity", Number.POSITIVE_INFINITY], ['"40"', "40"], ["null", null]];
      for (const [label, graceMs] of nonsense) {
        const controller = new AbortController();
        const double = spawnDouble({ exit: null });
        const pending = runBounded({
          command: process.execPath,
          args: ["-e", "0"],
          stdin: "pipe",
          ...(graceMs === undefined ? {} : { graceMs }),
          signal: controller.signal,
          spawnChild: double.spawnChild,
        });
        await double.written();
        controller.abort();
        await sleep(probeMs);
        const child = double.calls[0].child;
        assert.equal(child.stdin.ends.length, 1, `graceMs=${label}: the abort was observed (stdin ended)`);
        assert.equal(child.kills.length, 0, `graceMs=${label}: no kill within ${probeMs}ms — the applied grace is the default, not the value given`);
        child.exit(0, null);
        const result = await pending;
        assert.equal(result.outcome, "aborted", `graceMs=${label}: the child exited within the (default) grace`);
        assert.equal(child.kills.length, 0, `graceMs=${label}: and no kill was ever sent`);
      }
    },
  },
  {
    name: "129/02 task02 callers passing no new option are byte-identical — stdio stays [ignore, pipe, pipe], windowsHide true, no shell key; stdin: \"pipe\" alone changes the first slot",
    run: async () => {
      const controller = new AbortController();
      const rows = [
        [{}, ["ignore", "pipe", "pipe"], "{ command, args }"],
        [{ deadlineMs: 10 }, ["ignore", "pipe", "pipe"], "{ command, args, deadlineMs: 10 }"],
        [{ stdin: "ignore" }, ["ignore", "pipe", "pipe"], '{ command, args, stdin: "ignore" }'],
        [{ graceMs: 50 }, ["ignore", "pipe", "pipe"], "{ command, args, graceMs: 50 }"],
        [{ signal: controller.signal }, ["ignore", "pipe", "pipe"], "{ command, args, signal } never aborting"],
        [{ stdin: "pipe" }, ["pipe", "pipe", "pipe"], '{ command, args, stdin: "pipe" }'],
      ];
      for (const [extra, stdio, label] of rows) {
        const double = spawnDouble({ exit: { code: 0 } });
        const result = await runBounded({ command: process.execPath, args: ["-e", "0"], ...extra, spawnChild: double.spawnChild });
        const options = double.calls[0].options;
        assert.deepEqual(options.stdio, stdio, `${label}: stdio`);
        assert.equal(options.windowsHide, true, `${label}: windowsHide`);
        assert.equal("shell" in options, false, `${label}: no shell key`);
        assert.equal(result.outcome, "exited", `${label}: exited`);
        assert.deepEqual(Object.keys(result).sort(), [...SPAWN_RESULT_KEYS].sort(), `${label}: the envelope`);
      }
    },
  },
  {
    name: "129/02 task02 the deadline and the abort are two different outcomes — a never-aborting signal beside a 30ms deadline is deadline-expired, and stdin is never ended",
    run: async () => {
      const controller = new AbortController();
      const double = spawnDouble({ exit: null });
      const result = await runBounded({ command: process.execPath, args: ["-e", "0"], stdin: "pipe", deadlineMs: 30, signal: controller.signal, spawnChild: double.spawnChild });
      assert.equal(result.outcome, "deadline-expired", "never aborted");
      assert.match(result.error, /30ms deadline/u, "the deadline is still named");
      assert.equal(double.calls[0].child.stdin.ends.length, 0, "stdin.end() was never called");
    },
  },
  {
    name: "129/02 task02 the first of the deadline and the abort to fire decides, with one kill — (30, 100, 10ms) aborted; (30, 5, 10ms) aborted; (30, 100, 50ms) deadline-expired",
    run: async () => {
      for (const [deadlineMs, graceMs, abortAt, outcome] of [[30, 100, 10, "aborted"], [30, 5, 10, "aborted"], [30, 100, 50, "deadline-expired"]]) {
        const controller = new AbortController();
        const double = spawnDouble({ exit: null });
        const pending = runBounded({ command: process.execPath, args: ["-e", "0"], stdin: "pipe", deadlineMs, graceMs, signal: controller.signal, spawnChild: double.spawnChild });
        await double.written();
        setTimeout(() => controller.abort(), abortAt);
        const result = await pending;
        // Let a late abort land before counting, so a second kill would be seen.
        await sleep(abortAt + 20);
        const child = double.calls[0].child;
        assert.equal(result.outcome, outcome, `deadline ${deadlineMs} / grace ${graceMs} / abort at ${abortAt}ms → ${outcome}`);
        assert.equal(child.kills.length, 1, `…and exactly one kill (${child.kills.length})`);
        if (outcome === "deadline-expired") assert.equal(child.stdin.ends.length, 0, "a deadline that expired first leaves stdin alone when the abort lands later");
      }
    },
  },
  {
    name: "129/02 task02 a signal already aborted at the call never spawns — aborted, exitCode null, aborted before start",
    run: async () => {
      const controller = new AbortController();
      controller.abort();
      const double = spawnDouble({ exit: { code: 0 } });
      const result = await runBounded({ command: process.execPath, args: ["-e", "0"], stdin: "pipe", signal: controller.signal, spawnChild: double.spawnChild });
      assert.equal(double.calls.length, 0, "the spawn double was never called");
      assert.equal(result.outcome, "aborted");
      assert.equal(result.exitCode, null);
      assert.match(result.error, /aborted before start/);
      assert.deepEqual(Object.keys(result).sort(), [...SPAWN_RESULT_KEYS].sort(), "the envelope is complete even without a child");
    },
  },
  {
    name: "129/02 task02 an unknown stdin value is a RETURNED not-started naming the value — inherit, overlapped, 0",
    run: async () => {
      for (const stdin of ["inherit", "overlapped", 0]) {
        const double = spawnDouble({ exit: { code: 0 } });
        const result = await runBounded({ command: process.execPath, args: ["-e", "0"], stdin, spawnChild: double.spawnChild });
        assert.equal(double.calls.length, 0, `stdin=${JSON.stringify(stdin)}: the spawn double was never called`);
        assert.equal(result.outcome, "not-started", `stdin=${JSON.stringify(stdin)}: a returned refusal, never a throw`);
        assert.ok(result.error.includes(JSON.stringify(stdin)), `stdin=${JSON.stringify(stdin)}: the error names the value — got: ${result.error}`);
      }
    },
  },
  {
    name: "129/02 task02 no shell on any path — every spawn option bag this feature produced has exactly the keys cwd, env, stdio, windowsHide",
    run: () => {
      assert.ok(EVERY_SPAWN_OPTIONS.length >= 20, `non-vacuity: ${EVERY_SPAWN_OPTIONS.length} spawn option bags were recorded by the feature's lanes`);
      for (const options of EVERY_SPAWN_OPTIONS) {
        assert.deepEqual(Object.keys(options).sort(), ["cwd", "env", "stdio", "windowsHide"], "the option key set is exactly the four — no shell, no timeout, nothing else");
      }
    },
  },
  // ── 129/06 task 02 — F-63: the child's own console ───────────────────────────
  //
  // `…/06_story_the-second-live-run/tasks/02_the-lane-child-owns-its-console.feature`. A
  // console-scoped kill inside a child that shares the caller's console can take the caller
  // down (loop death #5, 2026-09-15 19:35Z). `ownConsole: true` spawns the child detached on
  // win32 — its own hidden console — and is a no-op elsewhere; callers passing nothing are
  // byte-identical (the row above still holds: exactly the four keys).
  {
    name: "129/06 task02 ownConsole: true spawns the child detached on win32 and adds no key elsewhere; absent, the option bag is the four keys",
    run: async () => {
      for (const [extra, label] of [[{}, "absent"], [{ ownConsole: false }, "false"]]) {
        const double = spawnDouble({ exit: { code: 0 } });
        await runBounded({ command: process.execPath, args: ["-e", "0"], ...extra, spawnChild: double.spawnChild });
        assert.deepEqual(Object.keys(double.calls[0].options).sort(), ["cwd", "env", "stdio", "windowsHide"], `ownConsole ${label}: the four keys, no detached`);
      }
      const double = spawnDouble({ exit: { code: 0 } });
      const result = await runBounded({ command: process.execPath, args: ["-e", "0"], ownConsole: true, stdin: "pipe", spawnChild: double.spawnChild });
      const options = double.calls[0].options;
      if (process.platform === "win32") {
        assert.equal(options.detached, true, "win32: the child holds its own console");
        assert.deepEqual(Object.keys(options).sort(), ["cwd", "detached", "env", "stdio", "windowsHide"], "…one added key, nothing else");
      } else {
        assert.deepEqual(Object.keys(options).sort(), ["cwd", "env", "stdio", "windowsHide"], "off win32 the option is a no-op");
      }
      assert.deepEqual(options.stdio, ["pipe", "pipe", "pipe"], "the stdio pipes — document, stderr, the cancel channel — are untouched");
      assert.equal(options.windowsHide, true, "the console is hidden");
      assert.equal(result.outcome, "exited");
    },
  },
];
