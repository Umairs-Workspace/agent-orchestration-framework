// src/loop-diag.mjs — the loop's EXIT-REASON recorder (2026-09-11).
//
// WHY. Twice on 2026-09-11 `aof work loop 127 …` ended with nothing on the terminal after its
// `Driving …` line: no stop id, no stack, no run-record settle. The run records narrowed both
// deaths to the same place — the driver's own kill of a session that had just finished — and
// could not name it. A node process that exits with nothing printed has done one of four
// things: called `process.exit`, thrown past every handler, DRAINED its event loop with a
// promise still pending, or been terminated from outside. Only the process itself can tell
// those apart, and only if something is listening when it happens.
//
// WHAT. `installLoopDiagnostics` registers one listener per way out and writes every
// observation, timestamped, to `~/.aof/mesh/logs/loop-diag.<stamp>.log` — BESIDE the daemon
// logs, in the aof home (honouring `AOF_GLOBAL_HOME`), never inside the checkout: a loop that
// halts must leave the tree exactly as it found it (78's black-box contract), and a log is not
// work. It tees BOTH stdout and stderr into the same file, so the log reads as the whole run —
// the loop's own `Driving …` narration, its account, any stack the terminal scrolled past —
// ending in its exit; and it writes an `alive` line each minute with the process's memory, so
// the last such line bounds when the process was last running. The log's path is announced
// once, on STDERR, the moment the loop first prints to stdout — i.e. when the loop has admitted
// the invocation and announced itself. A REFUSED invocation prints only its refusal, on stderr,
// and that stays byte-identical (52/02's argv table pins it); stdout is the loop's account and
// is never touched. It is installed by the loop command's LAUNCH seam — the foreground
// body an operator runs — and never by the `--json` probe, by `runLoopBody` (which tests drive
// in-process), or by any daemon.
//
// WHAT IT DOES NOT CHANGE. Node's default outcome for an uncaught exception or an unhandled
// rejection is a printed stack and exit code 1; registering a listener for either SUPPRESSES
// that default, so this module restores it by hand: log, print, exit 1. The SAME holds for a
// signal — any listener disables node's default exit — and the same repair applies (2026-09-13):
// a signal line is written, and if this recorder is the ONLY listener left for that signal the
// default is restored by hand, exit `128 + signo`. Measured before the repair: the loop shell's
// own `process.once("SIGINT")` is consumed by the first Ctrl+C, after which every further Ctrl+C
// was logged here and ignored — eleven `signal SIGINT` lines in one log, the process alive until
// `taskkill`. A listener that is not the last one defers to the others, exactly as before.
// `process.exit` is wrapped only to record the call site; the real exit still happens. Every
// write is best-effort — a diagnostic that could fail the thing it diagnoses is worse than none.
//
// `AOF_LOOP_DIAG=0` opts out. Idempotent per process: a second install answers the first's
// log path and registers nothing twice.
import { appendFileSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { constants as osConstants } from "node:os";
import path from "node:path";
import { globalMeshPaths } from "./workspace.mjs";
// Every catch below reports through the ONE degrade emitter (acd-no-new-silent-catch's
// sanctioned shape). It writes to degrade.log and never to the streams this module tees, so
// a failing diagnostic write cannot re-enter the tee; it is throttled per code and never
// throws, so it cannot fail the loop it is diagnosing either.
import { reportDegrade } from "./degrade.mjs";

export const LOOP_DIAG_ENV = "AOF_LOOP_DIAG";
export const LOOP_DIAG_PREFIX = "loop-diag.";
export const LOOP_DIAG_KEEP = 10;
const ALIVE_INTERVAL_MS = 60_000;

const installed = new WeakMap();

export function loopDiagLogDir(env = process.env) {
  return path.join(globalMeshPaths({ env }).meshRoot, "logs");
}

// The scope, made a safe single filename segment: a loop scope is a driver (`127`) or a range
// (`01-05`), never a slash — anything else collapses to `_`, and an absent one is `loop`.
export function loopDiagScopeTag(argv = []) {
  const list = Array.isArray(argv) ? argv : [];
  const at = list.indexOf("loop");
  const raw = at >= 0 && at + 1 < list.length ? list[at + 1] : null;
  const tag = typeof raw === "string" ? raw.replace(/[^A-Za-z0-9-]+/g, "_").replace(/^_+|_+$/g, "") : "";
  return tag.length > 0 ? tag : "loop";
}

export function loopDiagLogPath(dir, scopeTag = "loop", now = new Date()) {
  return path.join(dir, `${LOOP_DIAG_PREFIX}${scopeTag}.${now.toISOString().replace(/[:.]/g, "-")}.log`);
}

export function loopDiagEnabled(env = process.env) {
  const value = env?.[LOOP_DIAG_ENV];
  return !(value === "0" || value === "false" || value === "off");
}

// Keep the newest `keep` logs PER SCOPE — one file per loop run is the right grain, and keeping
// per scope is what stops a storm on one scope pruning another scope's log (the regression this
// fixes). The scope is the filename's second dot-segment (`loop-diag.<scope>.<stamp>.log`);
// timestamps sort lexically, so within a group the earliest names go first. Best-effort.
export function pruneLoopDiagLogs(dir, keep = LOOP_DIAG_KEEP, fs = { readdirSync, unlinkSync }) {
  let names;
  try {
    names = fs.readdirSync(dir).filter((name) => name.startsWith(LOOP_DIAG_PREFIX) && name.endsWith(".log"));
  } catch (error) {
    reportDegrade("loop-diag-prune", error);
    return [];
  }
  const byScope = new Map();
  for (const name of names) {
    const scope = name.slice(LOOP_DIAG_PREFIX.length).split(".")[0] || "loop";
    if (!byScope.has(scope)) byScope.set(scope, []);
    byScope.get(scope).push(name);
  }
  const removed = [];
  for (const group of byScope.values()) {
    group.sort();
    for (const name of group.slice(0, Math.max(0, group.length - keep))) {
      try { fs.unlinkSync(path.join(dir, name)); removed.push(name); } catch (error) { reportDegrade("loop-diag-prune", error); }
    }
  }
  return removed;
}

// The one line shape, so a reader can `grep` a log by event name.
export function formatLoopDiagLine(event, detail, now = new Date()) {
  return `${now.toISOString()} ${event}${detail == null || detail === "" ? "" : ` ${String(detail)}`}`;
}

export function installLoopDiagnostics({
  logDir,
  argv = [],
  proc = process,
  env = process.env,
  now = () => new Date(),
  fs = { appendFileSync, mkdirSync, readdirSync, unlinkSync },
  aliveIntervalMs = ALIVE_INTERVAL_MS,
} = {}) {
  if (!loopDiagEnabled(env)) return null;
  const prior = installed.get(proc);
  if (prior) return prior;
  const dir = typeof logDir === "string" && logDir.length > 0 ? logDir : loopDiagLogDir(env);

  const logPath = loopDiagLogPath(dir, loopDiagScopeTag(argv), now());
  const write = (event, detail) => {
    try { fs.appendFileSync(logPath, `${formatLoopDiagLine(event, detail, now())}\n`); } catch (error) { reportDegrade("loop-diag-write", error); }
  };
  try { fs.mkdirSync(path.dirname(logPath), { recursive: true }); } catch (error) { reportDegrade("loop-diag-write", error); }
  pruneLoopDiagLogs(path.dirname(logPath), LOOP_DIAG_KEEP, fs);

  write("start", `pid=${proc.pid} node=${proc.version} argv=${JSON.stringify(argv)}`);

  // Every way out, named. `beforeExit` fires ONLY on a drained loop — it is the one line that
  // says "nothing was left to wait on", which is what a silently abandoned promise looks like.
  const onBeforeExit = (code) => write("beforeExit", `code=${code} — the event loop drained: either the command finished, or a promise the loop was still waiting on was abandoned here (read the stdout lines above to tell which)`);
  const onExit = (code) => write("exit", `code=${code}`);
  const onUncaught = (error) => {
    write("uncaughtException", error?.stack ?? String(error));
    // Restore node's default: the stack on stderr, exit 1. The tee below records it too.
    try { proc.stderr.write(`${error?.stack ?? String(error)}\n`); } catch (writeError) { reportDegrade("loop-diag-stderr", writeError); }
    proc.exit(1);
  };
  const onUnhandled = (reason) => {
    write("unhandledRejection", reason?.stack ?? String(reason));
    // Node's default (`--unhandled-rejections=throw`) turns this into an uncaught exception.
    throw reason;
  };
  proc.on("beforeExit", onBeforeExit);
  proc.on("exit", onExit);
  proc.on("uncaughtException", onUncaught);
  proc.on("unhandledRejection", onUnhandled);
  const signals = [];
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
    const onSignal = () => {
      write("signal", signal);
      // Restore node's default ONLY when nothing else is listening: with the shell's own
      // listener still registered the signal is the shell's to answer (it halts after the
      // in-flight drive); once that `once` is consumed this is the last listener, and a
      // recorder that swallowed the signal would be the reason the process could not be
      // stopped. Exit through the wrapped `proc.exit` so the exit is recorded with its site.
      if (typeof proc.listenerCount === "function" && proc.listenerCount(signal) <= 1) {
        proc.exit(128 + (osConstants?.signals?.[signal] ?? 0));
      }
    };
    try { proc.on(signal, onSignal); signals.push([signal, onSignal]); } catch (error) { reportDegrade("loop-diag-signal", error); }
  }

  // `process.exit`, recorded with its call site, then performed for real.
  const realExit = typeof proc.exit === "function" ? proc.exit.bind(proc) : null;
  if (realExit) {
    proc.exit = (code) => {
      write("process.exit", `code=${code ?? proc.exitCode ?? 0}\n${new Error("exit call site").stack}`);
      return realExit(code);
    };
  }

  // Both streams, teed: the loop's own narration and account (stdout) and any printed stack
  // (stderr) survive the terminal they scrolled out of. The tee never changes what the streams
  // carry — it copies, then forwards.
  const realStdoutWrite = typeof proc.stdout?.write === "function" ? proc.stdout.write.bind(proc.stdout) : null;
  const realStderrWrite = typeof proc.stderr?.write === "function" ? proc.stderr.write.bind(proc.stderr) : null;
  // The one announcement — on stderr, through the ORIGINAL writer (so it is not teed back as
  // `stderr`), and only once the loop has printed something itself: a refused invocation says
  // nothing on stdout, so it gets no announcement and its stderr stays exactly its refusal.
  let announced = false;
  const announce = () => {
    if (announced || !realStderrWrite) return;
    announced = true;
    try { realStderrWrite(`Exit diagnostics: ${logPath}\n`); } catch (error) { reportDegrade("loop-diag-stderr", error); }
  };
  if (realStdoutWrite) {
    proc.stdout.write = (chunk, ...rest) => {
      write("stdout", String(chunk).trimEnd());
      const forwarded = realStdoutWrite(chunk, ...rest);
      announce();
      return forwarded;
    };
  }
  if (realStderrWrite) {
    proc.stderr.write = (chunk, ...rest) => {
      write("stderr", String(chunk).trimEnd());
      return realStderrWrite(chunk, ...rest);
    };
  }

  // The liveness line — unref'd, so it never keeps a finished loop alive.
  let alive = null;
  if (aliveIntervalMs > 0 && typeof proc.memoryUsage === "function") {
    alive = setInterval(() => {
      const usage = proc.memoryUsage();
      write("alive", `rss=${Math.round(usage.rss / 1048576)}MB heapUsed=${Math.round(usage.heapUsed / 1048576)}MB`);
    }, aliveIntervalMs);
    alive.unref?.();
  }

  const handle = {
    logPath,
    write,
    uninstall() {
      proc.off?.("beforeExit", onBeforeExit);
      proc.off?.("exit", onExit);
      proc.off?.("uncaughtException", onUncaught);
      proc.off?.("unhandledRejection", onUnhandled);
      for (const [signal, onSignal] of signals) proc.off?.(signal, onSignal);
      if (realExit) proc.exit = realExit;
      if (realStdoutWrite) proc.stdout.write = realStdoutWrite;
      if (realStderrWrite) proc.stderr.write = realStderrWrite;
      if (alive) clearInterval(alive);
      installed.delete(proc);
    },
  };
  installed.set(proc, handle);
  return handle;
}
