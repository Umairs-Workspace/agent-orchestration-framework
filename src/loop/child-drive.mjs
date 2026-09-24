// src/loop/child-drive.mjs — A LANE'S DRIVE IS A CHILD PROCESS (milestone 129 / story 02;
// ADR-005 §1, ADR-008 §1-§2; FF-12902).
//
// Three loop deaths on 2026-09-12 happened at the driver's kill of a finished session inside
// the loop's own process, and N PTY drivers in one process would multiply that surface by N.
// So the loop family never loads the session driver: per lane it spawns `aof work drive
// <phase> <ref> --run <id> [--fix <file>] --json` as a SEPARATE PROCESS through `runBounded`
// (72/ADR-001 §5 — the one bounded, shell-less spawn seam; this module is the ONLY place the
// family reaches it) and reads EXACTLY ONE JSON document from its stdout — the `--json` face's
// contract, success or refusal. A lane's death is then one lane's `runtime_offline`, never
// the loop's.
//
// 2026-09-24 — THE SEQUENTIAL DRIVE IS A CHILD TOO. `aof work loop 006` (another workspace,
// `sequential`, refine phase) died twice in one day at the same line — `tree-terminated ok:true`
// → `pty-released`, then nothing — while every lane child on the same host survived the same
// console-list kill with "AttachConsole failed" on its own stderr. The shell's in-process drive
// was the one PTY left inside the loop's process; `drivePhase` now reaches this seam too when
// the foreground launch hands it `ctx.spawnPhaseDrive`. So the answer's MAPPING to a drive
// outcome has two callers and one home here (`childDriveOutcome`), with the cancel grace and
// the fix file's path beside it.
//
// What this module does NOT do, by construction: it touches no run record (the child
// heartbeats the lent id; the parent settles it), prints nothing, imports no session driver
// and never a shell.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isPackaged } from "../asset-base.mjs";
import { runBounded } from "../work-audit/spawn.mjs";
import { globalMeshPaths } from "../workspace.mjs";

// THE CANCEL GRACE — the family's one named constant (129/04 ruling): how long an aborted
// child is given to exit on its own after its stdin is ended, before it is killed. NOT a config
// key: a knob on how long to wait for a child the operator has already cancelled twice is a
// knob nobody tunes.
export const LANE_CANCEL_GRACE_MS = 10000;

// The fix file's home — under the aof home (`AOF_GLOBAL_HOME` honoured), NEVER in a checkout
// (ADR-005 §3): a lane's `git add -A` would otherwise commit it.
export function loopFixFilePath(runId, { env } = {}) {
  return path.join(globalMeshPaths({ env }).meshRoot, "loop-fixes", `${runId}.json`);
}

// childDriveOutcome(answer) — a `spawnLaneDrive` answer read as the driver outcome the settle
// consumes: the document's own outcome when one parsed, `died` → `failed / runtime_offline`,
// `timeout` → `failed / timeout`, `aborted` → `cancelled`, a refusal → `failed / agent_error`
// carrying its code. A `failed` that names no reason is `agent_error`.
export function childDriveOutcome(answer) {
  const document = answer?.document ?? null;
  const outcome = answer?.outcome === "document"
    ? { outcome: document?.outcome ?? "failed", ...(document?.failureReason != null ? { failureReason: document.failureReason } : {}), ...(document?.sessionId != null ? { sessionId: document.sessionId } : {}) }
    : answer?.outcome === "timeout"
      ? { outcome: "failed", failureReason: "timeout" }
      : answer?.outcome === "aborted"
        ? { outcome: "cancelled" }
        : answer?.outcome === "refused"
          ? { outcome: "failed", failureReason: "agent_error", refusal: document?.code ?? null }
          : { outcome: "failed", failureReason: "runtime_offline" };
  if (outcome.outcome === "failed" && outcome.failureReason == null) outcome.failureReason = "agent_error";
  return outcome;
}

// WHICH ARGV, decided by INTERPRETER IDENTITY — never by file presence (review round 1,
// 2026-09-13, reproduced at the source). `process.execPath` is either a Node runtime or the
// `aof` single executable, and the two take different vectors:
//   · Node: `[<this tree's src/cli.mjs>, work, drive, …]` — the entry resolved from THIS module's
//     own location, so the payload install and the repo tree each spawn their own CLI, never
//     whichever `aof` is first on PATH;
//   · a SEA — the payload-first launcher AND the embedded bundle alike: the exe IS the CLI
//     (`scripts/sea-entry.mjs` hands `process.argv.slice(2)` to `run()` verbatim), so the verb
//     words are the WHOLE argv. An entry element here is an `Unknown command "…cli.mjs"`,
//     exit 1, no document — every lane `died` at t=0. And under the payload launcher
//     `<exeDir>/src/cli.mjs` EXISTS on disk beside `aof.exe`, which is exactly why "cli.mjs
//     on disk ⇔ execPath is node" was the wrong discriminator.
// `isPackaged()` is the ONE SEA-detection home (`src/asset-base.mjs`, a zero-import leaf that
// also carries the test sentinel), the same seam every asset read keys on.
//
// The entry is resolved LAZILY, on the Node branch only: the embedded CJS bundle rewrites
// `import.meta` to `{}`, so a module-scope `new URL("../cli.mjs", import.meta.url)` would throw
// `ERR_INVALID_URL` at load and take the whole loop family with it (the hazard
// `src/asset-base.mjs`'s header names). `import.meta.url` is never touched on the packaged branch.
function cliEntry() {
  return fileURLToPath(new URL("../cli.mjs", import.meta.url));
}

// How much of the child's stderr rides the answer: the last lines, for a narration of a
// death. The whole stream is not carried — the child's own stderr is the child's own record.
const STDERR_TAIL_LINES = 20;

const REQUIRED = Object.freeze(["ref", "phase", "runId", "lane"]);

// The child's stdout, read as ONE document: the whole trimmed stream parses to a non-null,
// non-array object, or there is no document. `[]`, `"x"`, `null`, `42`, a truncated or
// malformed body, trailing bytes after the document, or nothing at all are all "no document"
// — the face pretty-prints, so a document spans lines, and nothing is ever extracted from a
// longer stream. The PARSE decides, never the exit code alone.
function parseDocument(stdout) {
  const text = typeof stdout === "string" ? stdout.trim() : "";
  if (text.length === 0) return null;
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  return parsed != null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
}

// The last N lines of stderr as an ARRAY, `[]` when empty; a trailing newline yields no
// empty trailing line.
function stderrTail(stderr) {
  const text = typeof stderr === "string" ? stderr : "";
  if (text.length === 0) return [];
  const lines = text.split(/\r?\n/u);
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.slice(-STDERR_TAIL_LINES);
}

// spawnLaneDrive({ ref, phase, runId, lane, fixFile, env, deadlineMs, signal, graceMs, spawnChild })
// → { outcome, document, exitCode, stderrTail, spawn }
//
//   outcome   "document" | "refused" | "died" | "timeout" | "aborted"
//   document  the parsed document, or null when none parsed
//   exitCode  the child's exit code, or null when none
//   stderrTail the last lines of stderr, an array
//   spawn     `runBounded`'s own result, verbatim
//
// `cwd` is the lane; `env` is the parent's plus the caller's additions (`AOF_GLOBAL_HOME`
// included); `stdin: "pipe"` is the cancel channel (task 01) — `signal`/`graceMs` end it,
// wait, then kill through the seam. `spawnChild` is injectable for the suites, mirroring
// `runBounded`'s own seam. A missing `ref`/`phase`/`runId`/`lane` is a caller error and
// throws before any spawn — never a `died`.
export async function spawnLaneDrive({
  ref,
  phase,
  runId,
  lane,
  fixFile,
  env,
  deadlineMs,
  signal,
  graceMs,
  spawnChild,
} = {}) {
  const given = { ref, phase, runId, lane };
  for (const key of REQUIRED) {
    if (typeof given[key] !== "string" || given[key].length === 0) {
      throw new TypeError(`spawnLaneDrive: "${key}" is required and must be a non-empty string.`);
    }
  }

  const verb = [
    "work", "drive", phase, ref,
    "--run", runId,
    ...(typeof fixFile === "string" && fixFile.length > 0 ? ["--fix", fixFile] : []),
    "--json",
  ];
  const args = isPackaged() ? verb : [cliEntry(), ...verb];

  const spawn = await runBounded({
    command: process.execPath,
    args,
    cwd: lane,
    env: { ...process.env, ...(env ?? {}) },
    stdin: "pipe",
    // 129/06 F-63 — the lane child holds its OWN console: the session it drives is killed with a
    // console-scoped kill (node-pty's ConPTY console-list agent) and that kill must never reach
    // the loop's console (loop death #5, 2026-09-15). A no-op off win32.
    ownConsole: true,
    ...(deadlineMs == null ? {} : { deadlineMs }),
    ...(signal == null ? {} : { signal }),
    ...(graceMs == null ? {} : { graceMs }),
    ...(spawnChild == null ? {} : { spawnChild }),
  });

  const document = parseDocument(spawn.stdout);
  const answer = (outcome) => ({
    outcome,
    document,
    exitCode: spawn.exitCode ?? null,
    stderrTail: stderrTail(spawn.stderr),
    spawn,
  });

  // A deadline and an abort are their own outcomes, each carrying whatever document DID
  // parse from the stdout captured before the kill — a child that printed its document and
  // then hung on a lingering handle still hands the parent its session id.
  if (spawn.outcome === "deadline-expired") return answer("timeout");
  if (spawn.outcome === "aborted") return answer("aborted");
  if (spawn.outcome !== "exited" || document == null) return answer("died");
  return answer(document.ok === false ? "refused" : "document");
}
