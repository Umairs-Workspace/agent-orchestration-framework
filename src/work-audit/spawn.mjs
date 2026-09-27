// THE ONE BOUNDED SPAWN SEAM FOR `aof work audit` — milestone 59 / story 01, ADR-002 §3.
//
// This milestone's whole value is that it RE-RUNS things instead of reading about them, and
// that is exactly what one milestone ago was forbidden: 66/ADR-004 §2 refuses a dynamic
// `import()` of a cited module, "because importing executes its module scope" — which is aof
// running a project's test code inside its own process. That refusal is right and is not
// weakened here. It is honoured by moving the execution somewhere it can be BOUNDED.
//
// So: no module under `src/work-audit/` imports project code, and every child process the
// family creates comes from THIS function. A second way to start a process is refused,
// because a bound one caller can route around is not a bound (FF-5904, and the gate that
// holds it is `test/arch/audit/acd-audit-never-imports-project-code.test.mjs`).
//
// FOUR PROPERTIES, each of which the seam's own suite drives over a real child:
//
//   1. AN ARGUMENT VECTOR, NEVER A SHELL STRING. `shell` is never passed, and a `command`
//      carrying whitespace or a shell metacharacter is REFUSED at the door rather than
//      handed to a shell that would re-split it. This repo has measured the other shape:
//      `acd-enroll-git-argv-no-shell` exists because a git invocation assembled as text is
//      an injection surface, and `wsl.exe` re-serialising its argument vector is the same
//      species one layer down (`.claude/rules/build-deploy-restart.md`).
//   2. A DEADLINE, ALWAYS. There is no unbounded call — `deadlineMs` defaults, and the
//      result NAMES the deadline that was applied so a report never has to guess it.
//   3. A KILL ON EXPIRY, and the kill is reported as an outcome of its own rather than
//      folded into a non-zero exit code. "It failed" and "it never finished" are different
//      findings and the audit addresses them differently.
//   4. THE OBSERVED EXIT CODE AND THE OBSERVED OUTPUT. ADR-004 §3: the oracle is the
//      message. A seam that dropped stderr would leave every consumer downstream of it
//      reasoning from a pass/fail count, which 56 measured as blind on a standing-red gate.
//
// A child that cannot be STARTED is a fifth case and it is reported, never swallowed: the
// result says `not-started` and names what was attempted, because "the command is missing"
// and "the command ran and failed" are the two answers an audit must not conflate.
//
// A CANCEL, ADDITIVELY (129/02, ADR-005 §1; rulings 2026-09-13). The loop family runs each
// lane's drive as a child of this seam (72/ADR-001 §5: one bounded spawn, never a second), and
// Windows delivers no POSIX signal to a child — so the parent's cancel is the child's STDIN.
// Three options, none of which an existing caller passes: `signal` (an `AbortSignal`),
// `graceMs` and `stdin: "pipe"`. An abort ENDS the child's stdin, waits `graceMs` for it to
// exit on its own, then kills it exactly as the deadline path does; the outcome is `aborted`,
// a fourth member of the vocabulary, and a child that exits within the grace is still
// `aborted` (the caller asked for the stop and got it) with its real exit code. The FIRST of
// the deadline and the abort to fire decides the outcome, and exactly one kill is ever sent.
import { spawn as spawnChildProcess } from "node:child_process";
import { existsSync } from "node:fs";

// The four terminal outcomes, frozen. Every result carries exactly one of them, and no
// consumer has to infer "did it finish?" from a null exit code.
export const SPAWN_OUTCOMES = Object.freeze(["exited", "deadline-expired", "not-started", "aborted"]);

// The default bound. Named here, once, so no call site carries a duration literal — the
// same rule 52's purity guard holds over the checks leaf (FF-5907).
export const DEFAULT_DEADLINE_MS = 60_000;

// The default GRACE an aborted child is given to exit on its own after its stdin is ended,
// before the kill (129/ADR-005 §1). Sized from a MEASUREMENT, not a guess (QA, review round 1,
// 2026-09-13): the drive child's real stdin-end → exit stop path took 7.08–7.15 s over three
// runs on an idle machine with a one-process fake tree — the driver's own bracket PLUS
// node-pty's 5 s console-list fallback (`AttachConsole failed`, because the driver's
// `taskkill /T` has already emptied the tree by the time node-pty enumerates it). A 10 s grace
// left under 3 s of margin for exactly the concurrent load milestone 129 exists to create, and
// a child killed inside its grace answers `aborted` with NO document — no session id for the
// parent to settle spend against. 20 s leaves the margin the measurement asks for; a caller
// (the loop, story 04) may still pass its own `graceMs`. A named constant, never an exported
// function: the seam's exported functions are pinned to exactly three.
export const DEFAULT_GRACE_MS = 20_000;

// The two stdin modes. `"ignore"` is every existing caller's; `"pipe"` is the cancel channel.
// Anything else is a RETURNED `not-started` naming the value, the same shape
// `argumentVectorProblem` gives a bad argv — never a throw out of the seam.
const STDIN_MODES = Object.freeze(["ignore", "pipe"]);

// The frozen result envelope. A consumer that destructures it gets every key on every
// outcome, so "absent" never has to be read as "fine".
export const SPAWN_RESULT_KEYS = Object.freeze([
  "outcome",
  "command",
  "args",
  "attempted",
  "deadlineMs",
  "exitCode",
  "signal",
  "stdout",
  "stderr",
  "error",
]);

// A shell string wearing a command's clothes. A metacharacter in the EXECUTABLE position
// means the caller expected a shell to read it, and there is no shell here to do so.
//
// NARROWED AT REVIEW (2026-08-29), and the correction is this file's own doctrine applied to
// itself. The first version excluded whitespace because `process.execPath` on this machine is
// `C:\Program Files\nodejs\node.exe` — and then went on to refuse `'`, `#`, `~`, `!`, `*`, `?`
// and `$`, every one of which is legal in a real executable path. The architect ran the shapes:
// `C:\Users\O'Brien\node.exe`, `C:\dev\aof#2\node.exe`, `/home/user/node-v22!/bin/node` and —
// worst, because it is the SAME directory the paragraph above cites — `C:\PROGRA~1\nodejs\node.exe`,
// the 8.3 short form. On any of those the door refuses, `assembledSuite` answers `ok: false`, and
// EVERY census run reports `audit-runtime-membership-unavailable` while blaming a shell
// metacharacter in a path that is perfectly fine. "A rule that fires on the correct case is how a
// guard gets disabled" was written six lines above the rule that does exactly that.
//
// So the refusal now needs BOTH conditions:
//   1. the command holds a character that is shell CONTROL syntax on every platform — a newline,
//      a pipe, `&`, `;`, a redirect, a backtick or a double quote; AND
//   2. the command is not a file that EXISTS. A path on disk is not a shell string whatever
//      characters it contains, and `C:\dev\R&D\node.exe` is a legal Windows directory.
// A bare `node` resolved through PATH carries no control character and never reaches condition 2;
// a genuine shell string (`node -e "process.exit(0)"`) carries one and is not a file, so it is
// still refused at the door rather than handed to a shell that would re-split it.
const SHELL_SHAPED = /[\r\n"`|&;<>]/u;

// What was attempted, rendered for a human — a REPORT of the vector, never a re-parse of
// it. Quoted per element so a caller reading a finding can see where an argument ended.
export function attemptedCommand(command, args = []) {
  return [String(command), ...args.map((arg) => String(arg))]
    .map((part) => (/\s/u.test(part) ? JSON.stringify(part) : part))
    .join(" ");
}

// PURE given its inputs — the argument-vector refusal, so the rule is testable without starting
// anything. `exists` is injected (defaulting to a real `existsSync`) so the on-disk half of the
// rule can be driven against paths this machine does not have: the four shapes review measured
// are Windows-only, POSIX-only or short-form, and a regression that only reds on one operating
// system is a regression nobody sees.
// Returns null when the invocation is well-formed, else the reason it is refused.
export function argumentVectorProblem(command, args, exists = existsSync) {
  if (typeof command !== "string" || command.length === 0) {
    return "the command must be a non-empty string naming one executable";
  }
  if (SHELL_SHAPED.test(command) && !exists(command)) {
    return `the command "${command}" carries a shell metacharacter — this seam takes an ARGUMENT VECTOR, never a shell string; pass the executable as \`command\` and each word as its own element of \`args\``;
  }
  if (!Array.isArray(args)) {
    return "args must be an array — one element per argument, never one string the shell would re-split";
  }
  const bad = args.findIndex((arg) => typeof arg !== "string");
  if (bad >= 0) {
    return `args[${bad}] is ${typeof args[bad]}, not a string — every element of the vector reaches the child verbatim, so it must already be one`;
  }
  return null;
}

function result(fields) {
  const out = {
    outcome: fields.outcome,
    command: fields.command,
    args: fields.args,
    attempted: fields.attempted,
    deadlineMs: fields.deadlineMs,
    exitCode: fields.exitCode ?? null,
    signal: fields.signal ?? null,
    stdout: fields.stdout ?? "",
    stderr: fields.stderr ?? "",
    error: fields.error ?? null,
  };
  return Object.freeze(out);
}

// The kill's own failure is RECORDED, never swallowed. A child that had already exited is
// the ordinary case and the verdict stands either way — but "the kill did not land" is the
// one fact that would make an expiry (or an abort) report a lie, so it rides into the
// message rather than into a bare `catch {}` (m42 / TECH_DEBT item 3: best-effort must
// mean "does not crash", never "says nothing"). One phrase for both paths.
function killFailureNote(error) {
  return ` (the kill itself did not land: ${error?.message ?? String(error)} — the child had most likely already exited)`;
}

// Run one child under a deadline and hand back what was observed.
//
// `spawnChild` is injected so the seam's own failure modes (a spawn that throws
// synchronously, an `error` event with no child at all) are drivable without asking the
// operating system for a broken executable. It defaults to `node:child_process.spawn`, and
// note what is NOT in the options it builds: no `shell`, ever.
//
// `signal`, `graceMs` and `stdin` are 129/02's additive cancel (the header's last paragraph);
// a caller passing none of them is byte-identical to the seam as it was.
export async function runBounded({
  command,
  args = [],
  cwd,
  env,
  deadlineMs = DEFAULT_DEADLINE_MS,
  signal,
  graceMs,
  stdin = "ignore",
  spawnChild = spawnChildProcess,
  // 129/06 F-63 — THE CHILD'S OWN CONSOLE. On win32 a child spawned with piped stdio still
  // ATTACHES to its parent's console, and a console-scoped kill inside the child — node-pty's
  // ConPTY console-list agent, which enumerates and terminates every process of the console it
  // reaches — can then take the PARENT down (measured 2026-09-15 19:35Z: the loop died,
  // unbracketed, at a lane child's session kill; loop death #4 on 2026-09-13 was the same agent
  // from inside the loop). `ownConsole: true` spawns the child DETACHED on win32 — its own
  // console (hidden), no console shared with the caller — so nothing that kills a console the
  // child holds can reach the process that asked for it. Stdio pipes are handles, not the
  // console, so the document, stderr and the stdin cancel channel are untouched; the deadline,
  // grace and abort kills below still land (`child.kill` is by pid). Elsewhere a no-op.
  ownConsole = false,
} = {}) {
  const bound = Number.isFinite(deadlineMs) && deadlineMs > 0 ? deadlineMs : DEFAULT_DEADLINE_MS;
  // The grace is a positive safe integer or the named default — `0`, a negative, `NaN`,
  // `Infinity`, a numeric string and `null` all fall back, the same rule as the deadline's.
  const grace = Number.isSafeInteger(graceMs) && graceMs > 0 ? graceMs : DEFAULT_GRACE_MS;
  const attempted = attemptedCommand(command, Array.isArray(args) ? args : []);

  const refusal = argumentVectorProblem(command, args);
  if (refusal != null) {
    return result({
      outcome: "not-started",
      command,
      args: Array.isArray(args) ? Object.freeze([...args]) : args,
      attempted,
      deadlineMs: bound,
      error: refusal,
    });
  }

  const frozenArgs = Object.freeze([...args]);
  if (!STDIN_MODES.includes(stdin)) {
    return result({
      outcome: "not-started",
      command,
      args: frozenArgs,
      attempted,
      deadlineMs: bound,
      error: `stdin must be one of ${STDIN_MODES.map((mode) => JSON.stringify(mode)).join(", ")}, not ${JSON.stringify(stdin)} — "ignore" is the default and "pipe" is the cancel channel`,
    });
  }

  // A signal ALREADY aborted at the call never spawns (ruling 2026-09-13): the caller asked
  // for the stop before there was anything to stop, and starting a child only to kill it
  // would be a process nobody wanted.
  if (signal?.aborted === true) {
    return result({
      outcome: "aborted",
      command,
      args: frozenArgs,
      attempted,
      deadlineMs: bound,
      error: `${attempted} was aborted before start — the signal was already aborted when the seam was asked to run it`,
    });
  }

  let child;
  try {
    child = spawnChild(command, args, {
      cwd,
      env,
      stdio: [stdin, "pipe", "pipe"],
      windowsHide: true,
      ...(ownConsole === true && process.platform === "win32" ? { detached: true } : {}),
    });
  } catch (error) {
    return result({
      outcome: "not-started",
      command,
      args: frozenArgs,
      attempted,
      deadlineMs: bound,
      error: `could not start ${attempted}: ${error?.message ?? String(error)}`,
    });
  }

  return await new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let expired = false;
    // The abort fired first: it owns the verdict from here (129/ADR-005 §1).
    let aborted = false;
    // EXACTLY ONE KILL, whichever path sends it — the deadline expiring inside an abort's
    // grace kills now (the deadline is still the child's hard bound) and the grace timer is
    // disarmed; a grace ending after the deadline killed finds this already set.
    let killSent = false;
    // WHICH bound sent the one kill — "deadline" or "grace" — so an abort's message never
    // blames the grace for a kill the deadline sent (review nit, 2026-09-13).
    let killedBy = null;
    let killNote = "";
    let stdinNote = "";
    let graceTimer = null;

    const timer = setTimeout(() => {
      // The first to fire decides: a deadline that expires inside an abort's grace keeps the
      // abort's verdict, one that expires before any abort is its own outcome.
      if (!aborted) expired = true;
      if (graceTimer != null) { clearTimeout(graceTimer); graceTimer = null; }
      if (killSent) return;
      killSent = true;
      killedBy = "deadline";
      try {
        child.kill("SIGKILL");
      } catch (error) {
        killNote = killFailureNote(error);
      }
    }, bound);
    if (typeof timer.unref === "function") timer.unref();

    // The abort: end the child's stdin (only when it was piped — the cancel channel of
    // 129/02 task 01), wait the grace, then kill. A deadline that already expired, or a run
    // that already settled, is left exactly as it is — no stdin end, no second kill. Every
    // fault of the abort's own is recorded into the message, never thrown out of the seam.
    const onAbort = () => {
      if (settled || expired || aborted) return;
      aborted = true;
      if (stdin === "pipe") {
        try {
          child.stdin?.end?.();
        } catch (error) {
          stdinNote = ` (ending its stdin did not land: ${error?.message ?? String(error)})`;
        }
      }
      graceTimer = setTimeout(() => {
        graceTimer = null;
        if (settled || killSent) return;
        killSent = true;
        killedBy = "grace";
        try {
          child.kill("SIGKILL");
        } catch (error) {
          killNote = killFailureNote(error);
        }
      }, grace);
      if (typeof graceTimer.unref === "function") graceTimer.unref();
    };
    if (signal != null && typeof signal.addEventListener === "function") {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    const settle = (fields) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (graceTimer != null) { clearTimeout(graceTimer); graceTimer = null; }
      signal?.removeEventListener?.("abort", onAbort);
      resolve(result({ command, args: frozenArgs, attempted, deadlineMs: bound, stdout, stderr, ...fields }));
    };

    child.stdout?.setEncoding?.("utf8");
    child.stderr?.setEncoding?.("utf8");
    child.stdout?.on?.("data", (chunk) => { stdout += chunk; });
    child.stderr?.on?.("data", (chunk) => { stderr += chunk; });

    child.on("error", (error) => {
      settle({
        outcome: "not-started",
        error: `could not start ${attempted}: ${error?.message ?? String(error)}`,
      });
    });

    child.on("close", (code, exitSignal) => {
      if (aborted) {
        settle({
          outcome: "aborted",
          exitCode: code,
          signal: exitSignal,
          error: !killSent
            ? `${attempted} was aborted${stdinNote} and exited within its ${grace}ms grace`
            : killedBy === "deadline"
              ? `${attempted} was aborted${stdinNote} and its ${bound}ms deadline expired inside the ${grace}ms grace, so it was killed${killNote}`
              : `${attempted} was aborted${stdinNote} and did not exit within its ${grace}ms grace, so it was killed${killNote}`,
        });
        return;
      }
      if (expired) {
        settle({
          outcome: "deadline-expired",
          exitCode: code,
          signal: exitSignal,
          error: `${attempted} did not finish within its ${bound}ms deadline and was killed${killNote}`,
        });
        return;
      }
      settle({ outcome: "exited", exitCode: code, signal: exitSignal });
    });
  });
}
