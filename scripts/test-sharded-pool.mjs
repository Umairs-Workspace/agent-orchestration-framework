// THE SHARDED RUNNER'S POOL (160/04, ADR-005 §2) — the queue, the unit runner, the workers and the
// alone-retry pass, moved out of `scripts/test-sharded.mjs` so the pool can be driven with fake units and
// no registry. The runner keeps planning and reporting; the pool owns its units' lifetime.
//
// THE POOL STOPS WHEN ITS STDIN ENDS. `runBounded` kills its direct child only, so on Windows a gate that
// was stopped (or killed) used to leave this runner's workers running behind it. The gate launches the
// runner with `stdin: "pipe"` and ends that pipe on a stop; a parent that DIES closes the pipe the same
// way. On either, the pool kills every in-flight unit, starts no more, skips the alone-retries and
// resolves with what it has. Only a PIPE is watched: a terminal, the null device (an agent's shell hands
// node `NUL`, which ends at once) and a file never stop the pool.
//
// …AND AT ITS BUDGET (160/05, ADR-006 §2-§3). Given `budgetMs`, the pool stops the same way when the
// budget passes. A unit the pool killed — on a stop, at the budget, or at its own `unitTimeoutMs` — is
// NOT FINISHED: never a failure, never retried alone. The report says so, apart from the failures.
//
// Spawning is injected: `spawnUnit(unit, label)` answers `{ child, release }`, where `child` has
// `stdout`/`stderr` streams, emits `close` with the exit code, and has `kill()`; `release` (optional)
// runs once the unit closes. The pool parses what a unit printed in the shard entry's own vocabulary.
import { fstatSync } from "node:fs";
import { lostUnitFailure } from "./test-sharded-report.mjs";

// Is this stream's descriptor a pipe the parent holds the other end of? Windows reports a pipe as none of
// FIFO, character device or file; POSIX reports a FIFO or a socket.
export function stdinIsPipe(stream = process.stdin, fstat = () => fstatSync(0)) {
  if (stream == null || stream.isTTY === true) return false;
  let stat;
  try { stat = fstat(); } catch { return false; }
  if (stat.isFIFO() || stat.isSocket()) return true;
  return !(stat.isCharacterDevice() || stat.isFile() || stat.isDirectory() || stat.isBlockDevice());
}

const EXECUTED_LINE = /^# executed (\d+) cases/m;
const FAILED_LINE = /^not ok - (.*)$/gm;

// What one unit's output says: the cases it executed, the cases it named as failing, and whether it lost
// cases (exited having run fewer than it was assigned). A lane unit carries no case count. A unit the
// pool killed (`notFinished`) is neither ok nor failed: it names no failure, because a killed unit is
// never a `not ok` line and what it printed before the kill is not a confirmed result.
export function unitResult(unit, { code, output, seconds, notFinished = false }) {
  const executed = Number(EXECUTED_LINE.exec(output)?.[1] ?? -1);
  if (notFinished) return { unit, ok: false, notFinished: true, code, seconds, executed, failed: [], output };
  const failed = [...output.matchAll(FAILED_LINE)].map((match) => match[1]);
  const lost = !unit.lanes && executed !== unit.positions.length;
  if (lost) failed.push(lostUnitFailure(unit.key, executed, unit.positions.length));
  return { unit, ok: code === 0 && failed.length === 0 && !lost, code, seconds, executed, failed, output };
}

// A stopped pool, or one with a unit that did not finish, never reads as green.
export function poolExit(pool, verdictExit) {
  return pool.stopped || (pool.notFinished?.length ?? 0) > 0 ? 1 : verdictExit;
}

/**
 * Run `plan` (units, longest first) across `jobs` workers, then re-run each failed unit once, alone.
 *
 *   spawnUnit     — `(unit, label) => { child, release? }`
 *   stdin         — the stream whose end stops the pool, or null to watch nothing
 *   unitTimeoutMs — a unit still running at this bound is killed, and is not finished
 *   budgetMs      — the whole run's budget: when it passes, the pool stops as on its stdin's end
 *   drainMs       — how long an exited unit's output may stay open before the pool stops waiting for it
 *   onResult      — `(result, done, total)` after each pool unit closes
 *   writeLog      — `(label, output)` for each unit's log
 *
 * Resolves `{ results, flakes, failures, stopped, stoppedBy, killed, notFinished, notStarted }`: `killed`
 * and `notStarted` are the unit keys a stop left in flight and never began; `notFinished` is every unit the
 * pool killed, a stop's and a time limit's alike; `stoppedBy` is "stdin", "budget" or null.
 */
export async function runPool(plan, { jobs, spawnUnit, stdin = null, unitTimeoutMs, budgetMs = null, drainMs = 10_000, onResult = () => {}, writeLog = () => {}, now = Date.now }) {
  const inFlight = new Set();
  const killed = [];
  let stopped = false;
  let stoppedBy = null;
  const stop = (reason) => {
    if (stopped) return;
    stopped = true;
    stoppedBy = reason;
    for (const entry of inFlight) {
      entry.stopped = true;
      killed.push(entry.unit.key);
      try { entry.child.kill(); } catch { /* already gone */ }
    }
  };
  const onStdinEnd = () => stop("stdin");
  if (stdin != null) {
    stdin.on("end", onStdinEnd);
    stdin.on("close", onStdinEnd);
    stdin.resume?.();
  }
  const budgetTimer = Number.isFinite(budgetMs) && budgetMs > 0 ? setTimeout(() => stop("budget"), budgetMs) : null;

  function runUnit(unit, label) {
    return new Promise((resolve) => {
      const begun = now();
      const { child, release } = spawnUnit(unit, label);
      const entry = { unit, child, stopped: false, timedOut: false };
      inFlight.add(entry);
      let output = "";
      child.stdout?.on("data", (chunk) => { output += chunk; });
      child.stderr?.on("data", (chunk) => { output += chunk; });
      const timer = setTimeout(() => { entry.timedOut = true; child.kill(); }, unitTimeoutMs);
      // THE DRAIN (m160/F-01). `close` waits for every holder of the unit's output, and a process the unit
      // started can outlive it holding that output open — at the real budget one such unit kept the pool, and
      // the runner, alive past the gate's deadline. Once the unit itself has EXITED, its output gets `drainMs`
      // to close; then the pool's ends are destroyed, which closes the unit.
      let drain = null;
      child.on("exit", () => {
        drain = setTimeout(() => { child.stdout?.destroy?.(); child.stderr?.destroy?.(); }, drainMs);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        clearTimeout(drain);
        inFlight.delete(entry);
        try { release?.(); } catch { /* best-effort */ }
        const notFinished = entry.stopped || entry.timedOut;
        const result = { ...unitResult(unit, { code, output, seconds: (now() - begun) / 1000, notFinished }), ...(entry.stopped ? { stopped: true } : {}) };
        writeLog(label, output);
        resolve(result);
      });
    });
  }

  const results = [];
  let next = 0;
  let done = 0;
  async function worker() {
    while (!stopped && next < plan.length) {
      const unit = plan[next++];
      const result = await runUnit(unit, `u${String(plan.indexOf(unit)).padStart(4, "0")}`);
      results.push(result);
      done += 1;
      onResult(result, done, plan.length);
    }
  }
  try {
    await Promise.all(Array.from({ length: Math.min(jobs, plan.length) }, worker));

    // ONE ALONE-RETRY for each failed unit, after the pool has drained (so it runs without the load) — and none
    // for a unit that did not finish, or once the pool was stopped: a killed unit is not a result to confirm.
    const flakes = [];
    const failures = [];
    const unfinishedRetries = [];
    for (const result of results.filter((entry) => !entry.ok && entry.notFinished !== true)) {
      if (stopped) break;
      const retry = await runUnit(result.unit, `retry-${results.indexOf(result)}`);
      if (retry.notFinished) unfinishedRetries.push(retry);
      else (retry.ok ? flakes : failures).push({ first: result, retry });
    }
    const notFinished = [...results, ...unfinishedRetries]
      .filter((result) => result.notFinished === true)
      .map((result) => result.unit.key);
    return { results, flakes, failures, stopped, stoppedBy, killed, notFinished, notStarted: stopped ? plan.slice(next).map((unit) => unit.key) : [] };
  } finally {
    if (budgetTimer != null) clearTimeout(budgetTimer);
    stdin?.off?.("end", onStdinEnd);
    stdin?.off?.("close", onStdinEnd);
    stdin?.pause?.();
  }
}
