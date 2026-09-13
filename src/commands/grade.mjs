// work:grade — milestone 54 / story 01. THE DECLARED RUBRIC.
//
// THE ONE IMPURE EDGE of the milestone (ADR-003 §2). `src/work/grade.mjs` is the pure
// leaf that COMPILES a record from observations; this module is the only thing in `src/**`
// that GATHERS them — provenance, the config read, the one spawn, the one report read — exactly as
// `commands/drive.mjs` holds the one PTY call.
//
// WHAT AOF DOES NOT KNOW, AND MUST NOT GUESS (ADR-004 §2). aof does not know that this
// repo's suite must run under `AOF_GLOBAL_HOME`, that `global-work-propagation` cannot bind
// a port a live daemon already holds, or that the full suite is unsafe on the control node.
// The hazards are the project's to declare; aof's job is to run precisely what was declared
// and to say so plainly when the declaration will not carry a run.
//
// THE BARE FACE IS A READ; `--run` IS THE ONLY DOOR TO A SPAWN (ADR-003 §3). This is not
// stylistic. `acd-work-command-cli-bijection` spawns `aof work grade 03 --json` as a REAL
// subprocess from inside this repo's own suite, so an executing bare face would make the
// suite spawn itself; `acd-work-command-route-coverage` stands the board up and hits every
// served route, so a served grade route would make a page load spawn a test run. `work:resume`'s
// bare-sweep-is-the-read is the shipped precedent.
//
// 54 ENFORCES A BOUND AND CHOOSES NONE (`53/ADR-009` §1). The deadline is DERIVED — 81/00's
// `min(startToClose, heartbeat)` — in `69/ADR-001`'s single home `src/loop-bounds.mjs`. This
// module declares no default, no key and no resolver of its own; `acd-grade-bounded-single-spawn`
// holds it to that, and `acd-loop-cap-single-home` remains the authority on the home.
//
// THE SPAWN DOES NOT BLOCK THE EVENT LOOP (81/00). It was `spawnSync`, and `work:grade` is
// rung 3 of `GATE_ORDER` — so for the whole time a rubric ran, the process running the loop
// was STOPPED: `SIGINT` could not reach `onSigint`, queued timers could not fire, and no
// other run's heartbeat could be drained. The child is now spawned asynchronously and
// AWAITED, which is liveness of the PROCESS and deliberately NOT a heartbeat of its own —
// `69/ADR-003` fixes that the beat is stamped by CONSUMPTION and that *"the producer is a
// hook, not a pinger"*, so a grade that beat while it waited would defeat the liveness
// signal rather than satisfy it.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   milestone 54 / story 01 — work:grade, THE DECLARED RUBRIC (54/ADR-003 §2). The sole
//   impure edge of the verification loop: the one spawn of the project's declared runner,
//   compiled into a record by the pure leaf src/work/grade.mjs. Its BARE face is a READ
//   (plan + last recorded grade, spawning nothing) and `--run` is the only door to execution —
//   not stylistic: acd-work-command-cli-bijection spawns `aof work grade <ref> --json` as a
//   real subprocess from inside this repo's own suite. BOARD-DEFERRED (54/ADR-003 §4): a
//   served route would let a page load spawn a test run; the grade reaches the board on the
//   run record through work:run-status, with zero board change.
import { spawn as spawnChild } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { resolveItem, requireLocalCheckout } from "./resolve.mjs";
import { commandError } from "../command-error.mjs";
import { readRuns } from "../run-store.mjs";
import { boundGradeFailures, compileGrade, evidenceFloor } from "../work/grade.mjs";
import { gradeDeadlineFromConfig } from "../loop-bounds.mjs";
import { compileProvenance } from "../claim-provenance.mjs";
import { deriveNodeId } from "../node-identity.mjs";
import { headCommit } from "../mesh/worktree.mjs";

// The rubric's own subtree. A SIBLING SUBTREE, NOT A SIBLING MEANING (ADR-004):
// `work.controls.runners` (`src/work/doctor-controls.mjs`) answers a different question —
// *which files register controls* — and its leg B opens each entry AS A FILE. Overloading
// it with commands would break that leg. `m48/ADR-003`: two facts, two homes, no join.
export const RUBRIC_CONFIG_KEY = "work.rubric";

// ADR-003 §5 — RE-ENTRANCY IS REFUSED STRUCTURALLY, NOT BY CONVENTION. The stamp is set in
// the child's environment on every spawn; a `--run` that finds it already set refuses rather
// than recursing. A rubric that invokes aof — directly, or transitively through a script it
// calls — must not be able to fork a grader tree, and THIS repo is exactly such a project:
// bare `aof` on PATH symlinks into the working tree.
export const GRADE_REENTRANCY_ENV = "AOF_GRADE_RUNNING";

// The captured-output ceiling. A runner that emits more than this has emitted more than any
// report reader needs; truncating is honest (the normaliser reports what the text carried)
// and an unbounded buffer is a second unbounded resource beside the one we just bounded.
const MAX_CAPTURE_BYTES = 32 * 1024 * 1024;

// ------------------------------------------------------------------ the declaration ----

// A `work.rubric` that is PRESENT but cannot carry a run is `runner-spawn-failed`, NOT
// `rubric-unconfigured` (the contract ruling at `00_the-rubric-is-declared`). The two are
// OPPOSITES in the loop: ADR-007 §3 makes `rubric-unconfigured` the one `indeterminate` that
// proceeds exactly as today, so routing a mis-typed declaration there would silently swallow
// it — a project that TRIED to declare a rubric and got the shape wrong would meet the same
// behaviour as one that never tried. No tenth code is invented for it.
//
// `command` is an ARGV ARRAY, never a shell string (ADR-004 §1) — so there is no shell, no
// interpolation and no cwd-dependent word splitting, and an argument carrying shell
// metacharacters is one argument with its characters verbatim.
export function usableCommand(command) {
  if (!Array.isArray(command) || command.length === 0) return false;
  if (!command.every((element) => typeof element === "string")) return false;
  return command[0].length > 0;
}

// The declared rubric, or null when the project declared none. An unconfigured project is
// the ORDINARY case — almost every repo that installs aof has no rubric on the day it
// installs it — and it is an honest no-op, never a failure and never a pass (ADR-004 §4).
export function declaredRubric(config) {
  const rubric = config?.work?.rubric;
  return rubric != null && typeof rubric === "object" && !Array.isArray(rubric) ? rubric : null;
}

// ------------------------------------------------------------------ the plan ----

// planRubric(...) — PURE, and it touches the declared report path in no way at all: it
// neither creates, reads nor deletes anything there. That is asserted rather than assumed
// (`00_the-rubric-is-declared`), because a planner that stat'd the path would make the read
// face's promise ("executes nothing") a half-truth.
//
// SCOPE IS THE PROJECT'S TOO (ADR-004 §3, `verify.md:85-92`): a story runs its own scenarios
// plus the fitness functions; the full suite runs ONCE at the milestone gate; *"never
// silently widen to everything."* `args.ref` makes that machine-readable. ABSENT, the runner
// runs WHOLE — and `whole: true` records that this was the DECLARATION's choice rather than
// aof's, so a reader is never left to guess which.
export function planRubric(rubric, { ref, projectRoot, deadlineMs }) {
  const declaredArgv = Array.isArray(rubric?.command) ? [...rubric.command] : rubric?.command;
  const scopeFlag = typeof rubric?.args?.ref === "string" && rubric.args.ref.length > 0 ? rubric.args.ref : null;
  const command = usableCommand(declaredArgv)
    ? (scopeFlag ? [...declaredArgv, scopeFlag, String(ref)] : [...declaredArgv])
    : declaredArgv ?? null;
  const declaredReport = rubric?.report ?? null;
  const reportPath = typeof declaredReport?.path === "string" && declaredReport.path.length > 0
    ? path.resolve(projectRoot, declaredReport.path)
    : null;
  return {
    command,
    cwd: projectRoot,
    env: rubric?.env != null && typeof rubric.env === "object" && !Array.isArray(rubric.env) ? { ...rubric.env } : {},
    scope: scopeFlag ? { flag: scopeFlag, ref: String(ref) } : null,
    // WHOLE IS A DECLARED CHOICE, NOT A DEFAULT AOF TOOK. The distinction is the whole of
    // ADR-004 §3 and it is reported, not inferred.
    whole: scopeFlag == null,
    report: declaredReport == null ? null : {
      format: declaredReport.format ?? null,
      path: reportPath,
      floor: Number.isFinite(declaredReport.floor) ? declaredReport.floor : null,
    },
    deadlineMs,
    usable: usableCommand(declaredArgv),
  };
}

// ------------------------------------------------------------------ the spawn ----

// `graphifySpawnOptions` (`src/graphify.mjs:210-218`) already ships this envelope and
// ADR-005 §5 names it as the shape — IN SHAPE, NOT IN CODE. Stdin is IGNORED so a runner
// that reads it gets EOF rather than blocking forever on a pipe nothing writes to; both
// streams are PIPED because `scripts/test.mjs` writes `ok - <name>` to stdout and
// `not ok - <name>` to STDERR, so a stdout-only capture of a failing run of this repo's own
// suite reads as an all-green report beside a non-zero exit — this milestone's own worst
// failure mode, reachable from its own runner. The deadline FORCE-kills.
//
// Pure + injectable precisely so a unit test asserts the guards without a live binary.
export function rubricSpawnOptions({ cwd, env, deadlineMs }) {
  return {
    cwd,
    env,
    encoding: "utf8",
    timeout: deadlineMs,
    killSignal: "SIGKILL",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: MAX_CAPTURE_BYTES,
    // NO SHELL, EVER. The argv array is passed element for element; nothing in it is split,
    // joined or re-quoted on the way to the child.
    shell: false,
  };
}

// The child's environment: the ambient one INHERITED, the declared one OVERLAID on it, and
// exactly ONE variable of aof's own — ADR-003 §5's stamp (the contract ruling at
// `00_the-rubric-is-declared`). *"The environment is DECLARED, never inferred"* governs what
// AOF supplies, not whether `PATH` exists: a child with an emptied environment cannot
// resolve `node`, and `graphifySpawnOptions` overrides `env` nowhere. What the rule forbids
// is aof inventing a variable the project did not ask for.
export function rubricChildEnv(ambient, declared) {
  return { ...ambient, ...declared, [GRADE_REENTRANCY_ENV]: "1" };
}

// THE ASYNC RUNNER (81/00). The default `spawn` seam: it answers the SAME shape `spawnSync`
// answered — a status, the two captured streams, and the `error`/`signal` channel carrying
// the three ways a spawn can end — so `runRubric` below reads one shape, and the injected
// stubs the shipped suites drive the grade with are unchanged.
//
// WHAT `spawnSync` GAVE FOR FREE AND IS RE-ESTABLISHED HERE BY HAND, because losing any of
// them silently would be a regression the async spawn paid for:
//
//   • the DEADLINE — a timer that force-kills with the declared signal, reported as
//     `ETIMEDOUT` so `compileGrade` still reaches `runner-timeout` and no tenth code is
//     coined for the async path;
//   • the CAPTURE CEILING — `spawn` has no `maxBuffer`, so the captured length is counted
//     and a child that out-talks it is killed and reported as `ENOBUFS`, which is the
//     outcome the shipped code already discards rather than grades;
//   • the ENCODING — `spawn` decodes nothing, so both streams are set to utf8 rather than
//     concatenating Buffers into a string by accident.
//
// It resolves rather than rejects. A spawn that could not happen is an OBSERVATION about the
// runner (`runner-spawn-failed`), never an exception thrown at the loop — the shipped
// contract, kept.
export function spawnRubricAsync(program, args, options = {}) {
  return new Promise((resolve) => {
    const outChunks = [];
    const errChunks = [];
    const decode = (chunks) => Buffer.concat(chunks).toString("utf8");
    let captured = 0;
    let timer = null;
    let expired = false;
    let overflowed = false;
    let settled = false;

    const settle = (value) => {
      if (settled) return;
      settled = true;
      if (timer != null) clearTimeout(timer);
      resolve(value);
    };

    let child;
    try {
      child = spawnChild(program, args, {
        cwd: options.cwd,
        env: options.env,
        stdio: options.stdio,
        shell: options.shell,
      });
    } catch (error) {
      // A synchronous throw is the same fact as an asynchronous `error` event.
      settle({ status: null, stdout: "", stderr: "", error, signal: null });
      return;
    }

    child.once("error", (error) => settle({ status: null, stdout: decode(outChunks), stderr: decode(errChunks), error, signal: null }));

    // THE CEILING IS COUNTED IN BYTES, AS ITS NAME SAYS AND AS `spawnSync`'s `maxBuffer` did.
    // The chunks are therefore kept as BUFFERS and decoded once at the end, rather than
    // decoded per chunk and counted by string length: `setEncoding` would make the count
    // UTF-16 code units, so a report of multi-byte text would be allowed several times the
    // declared budget — the ceiling silently becoming a different, larger ceiling. Decoding
    // the concatenation also settles a multi-byte character split across a chunk boundary,
    // which per-chunk decoding only gets right by accident of where the kernel split it.
    const capture = (stream, chunks) => {
      if (stream == null) return;
      stream.on("data", (chunk) => {
        captured += chunk.length;
        // THE CHILD RAN AND OUT-TALKED THE CEILING. Past it nothing further is kept — a
        // report cut off mid-stream is the vacuous green this milestone exists to refuse —
        // and the child is stopped rather than left to fill a buffer nobody will read.
        if (captured > options.maxBuffer) {
          if (!overflowed) {
            overflowed = true;
            child.kill("SIGKILL");
          }
          return;
        }
        chunks.push(chunk);
      });
    };
    capture(child.stdout, outChunks);
    capture(child.stderr, errChunks);

    if (Number.isFinite(options.timeout) && options.timeout > 0) {
      timer = setTimeout(() => {
        expired = true;
        child.kill(options.killSignal ?? "SIGKILL");
      }, options.timeout);
    }

    // `close` rather than `exit`: the streams are drained by then, so a runner whose last
    // write lands as it exits is still captured.
    child.once("close", (status, signal) => {
      settle({
        // A killed child's status is not a result. `spawnSync` reports null for both, and
        // `runRubric` reads the outcome off the error/signal channel either way.
        status: expired || overflowed ? null : status,
        stdout: decode(outChunks),
        stderr: decode(errChunks),
        error: expired
          ? Object.assign(new Error("the runner did not finish within its deadline"), { code: "ETIMEDOUT" })
          : overflowed
            ? Object.assign(new Error("the runner emitted more than the capture ceiling"), { code: "ENOBUFS" })
            : null,
        signal: expired ? options.killSignal ?? "SIGKILL" : signal,
      });
    });
  });
}

// A file read that answers "was there anything here?" rather than throwing. An unreadable
// path is an ABSENT report, which is `report-missing`'s own meaning.
function readIfPresent(filePath) {
  if (typeof filePath !== "string" || filePath.length === 0) return null;
  try {
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

// THE REPORT SOURCE, RULED HERE because ADR-005 §2(a) fixes that the report must EXIST after
// the run without fixing which of the two things a runner emits is "it" (recorded as a
// contract ruling in STATE.md, 54/01):
//
//   the declared PATH when the runner wrote a file there — the declaration is the
//   declaration — and otherwise the run's CAPTURED OUTPUT, stdout followed by stderr.
//
// Both are the report *the runner emitted*; the path is where a runner is EXPECTED to put
// it, and a runner that emits to its streams instead has still emitted it. This repo is
// exactly that runner. `report-missing` stays reachable and keeps its honest meaning —
// nothing was emitted at all, at the path or on either stream — which is the milestone's own
// thesis: *NOTHING WAS READ must fail here rather than pass vacuously.*
export function reportObservation({ declaredPath, capture }) {
  const fromFile = readIfPresent(declaredPath);
  if (fromFile != null) return { present: true, text: fromFile, source: "path" };
  if (typeof capture === "string" && capture.length > 0) return { present: true, text: capture, source: "capture" };
  return { present: false, text: null, source: null };
}

// runRubric(plan, …) → { runner, report, launched }
//
// ONE `--run` IS ONE SPAWN, whatever the rubric reports — no retry of the runner is attempted
// inside a single grade, and `launched` is the observable count the contract pins.
async function runRubric(plan, { ambientEnv, spawn }) {
  // Re-entrancy FIRST, before any structural check, because the recursion it refuses is the
  // hazard that grows without bound. Refusing launches nothing.
  if (ambientEnv?.[GRADE_REENTRANCY_ENV] != null) {
    return {
      launched: 0,
      runner: {
        command: plan.command, cwd: plan.cwd, exit: null, durationMs: 0, outcome: "spawn-failed",
        detail: `refused: ${GRADE_REENTRANCY_ENV} is already set — a rubric may not re-enter the grade that launched it`,
      },
      report: { present: false, text: null, source: null },
      capture: "",
    };
  }

  // A declaration that is present and cannot carry a run. NOTHING IS LAUNCHED: there is no
  // program here to launch, and reporting a launch that never happened would be the same
  // class of lie the milestone exists to refuse.
  if (!plan.usable) {
    return {
      launched: 0,
      runner: {
        command: plan.command, cwd: plan.cwd, exit: null, durationMs: 0, outcome: "spawn-failed",
        detail: "the declared `work.rubric.command` is not a usable argv array (a non-empty array of strings whose first element names a program)",
      },
      report: { present: false, text: null, source: null },
      capture: "",
    };
  }

  const [program, ...args] = plan.command;
  const options = rubricSpawnOptions({
    cwd: plan.cwd,
    env: rubricChildEnv(ambientEnv, plan.env),
    deadlineMs: plan.deadlineMs,
  });
  const startedAt = Date.now();
  // AWAITED, NOT BLOCKED (81/00). The seam is awaited rather than called for its return
  // value, which is what lets the default runner be asynchronous while an injected
  // synchronous stub — every shipped suite drives the grade with one — is unchanged: a
  // non-promise passes through `await` untouched. One `--run` is still exactly one launch.
  const result = await spawn(program, args, options);
  const durationMs = Date.now() - startedAt;

  // THE EXIT STATUS IS READ BEFORE THE REPORT IS (`m11/R2`). A runner that never started or
  // was killed at its deadline has no report worth reading, and saying WHICH of the two
  // happened is the whole value of these two outcomes.
  //
  // THREE WAYS A SPAWN CAN END, and conflating them is itself a lie a grade can tell.
  const error = result?.error ?? null;
  // THE CHILD RAN AND OUT-TALKED THE CAPTURE CEILING. It is NOT a launch failure — the
  // message for that one says the runner "could not be launched", which would be flatly
  // false — and the truncated text is NOT evidence either: a report cut off mid-stream is
  // exactly the vacuous green this milestone exists to refuse, and `node-truncated.tap` is
  // 54/00's committed capture of that shape. So the capture is DISCARDED, and only a report
  // the runner really wrote at the declared path can still carry the grade.
  //
  // IT IS SETTLED BEFORE THE TIMEOUT (81/00), because the async runner stops an over-talking
  // child with `SIGKILL` too — and reading that signal as a deadline would report
  // `runner-timeout` for a child that ran to its ceiling. Two different answers, kept apart.
  const overflowed = error?.code === "ENOBUFS";
  const timedOut = !overflowed && (error?.code === "ETIMEDOUT" || result?.signal === "SIGKILL");
  const launchFailed = error != null && !timedOut && !overflowed;
  const outcome = timedOut ? "timed-out" : launchFailed ? "spawn-failed" : "completed";

  const capture = overflowed ? "" : `${result?.stdout ?? ""}${result?.stderr ?? ""}`;
  return {
    launched: 1,
    runner: {
      command: plan.command,
      cwd: plan.cwd,
      exit: outcome === "completed" ? (result?.status ?? null) : null,
      durationMs,
      outcome,
      detail: launchFailed
        ? `the declared runner could not be launched: ${error.message}`
        : timedOut
          ? `the runner did not finish within the ${plan.deadlineMs}ms deadline and was killed`
          : overflowed
            ? `the runner RAN, and emitted more than the ${MAX_CAPTURE_BYTES}-byte capture ceiling — the truncated output is discarded rather than graded, so only a report written at the declared path can carry this run`
            : null,
    },
    // A timed-out or unlaunched run has no report to read: `compileGrade` settles those two
    // before it ever looks at one, and reading a stale file here would only invite a reader
    // to believe it had been read for something.
    report: outcome === "completed"
      ? reportObservation({ declaredPath: plan.report?.path ?? null, capture })
      : { present: false, text: null, source: null },
    capture,
  };
}

// ------------------------------------------------------------------ the history ----

// The DURABLE record is `brief.grade` on the run the grade re-drove (ADR-008 §3), written by
// 54/03 through the seam that already writes `brief.loop`. This story owns the READER; until
// 54/03 lands, every repo reads *no grade recorded yet* — the honest answer, not a broken read.
//
// Two things come off the same scan: the RATCHET's history (ADR-005 §2 — a grade observing
// fewer cases than the last recorded `pass` for the same ref is vacuous with no configuration
// at all) and the last recorded grade the read face reports back.
function gradesFromRuns(runs) {
  const grades = [];
  for (const run of runs) {
    const grade = run?.brief?.grade;
    if (grade == null || typeof grade !== "object") continue;
    grades.push({ grade, at: run.updatedAt ?? run.createdAt ?? null, runId: run.runId ?? null });
  }
  grades.sort((a, b) => String(a.at ?? "").localeCompare(String(b.at ?? "")));
  return grades;
}

// Gather every impure fact before compiling a durable claim. The two injected hooks are
// test seams only; production resolves the stable per-install node and asks git for HEAD.
export async function gatherClaimProvenance({ run = null, at }, ctx) {
  let node;
  try {
    if (typeof ctx.resolveProvenanceNode === "function") {
      node = await ctx.resolveProvenanceNode(ctx.workspace);
    } else {
      const config = ctx.workspace.config ?? {};
      const hostname = os.hostname();
      // loadWorkspace has already hydrated a persisted identity when one exists. On a
      // never-published install, use the same pure derivation without turning a claim
      // write into an identity-sidecar write of its own.
      node = await deriveNodeId({ config, hostname, salt: config?.mesh?.salt ?? hostname });
    }
  } catch (cause) {
    const error = commandError("The producing node could not be determined; no claim was recorded.", "provenance-node-unavailable", 500);
    error.cause = cause;
    throw error;
  }
  if (typeof node !== "string" || node.length === 0) {
    throw commandError("The producing node could not be determined; no claim was recorded.", "provenance-node-unavailable", 500);
  }
  const commit = typeof ctx.readHeadCommit === "function"
    ? await ctx.readHeadCommit(ctx.workspace.projectRoot)
    : await headCommit(ctx.workspace.projectRoot);
  return compileProvenance({ node, run, commit, at });
}

// ------------------------------------------------------------------ the command ----

export const gradeCommand = {
  id: "work:grade",
  input: {
    type: "object",
    properties: {
      ref: { type: "string" },
      // THE ONLY DOOR TO EXECUTION (ADR-003 §3). Absent, this command reports the plan and
      // the last recorded grade and spawns nothing.
      run: { type: "boolean" },
      // `now` (ISO-8601 UTC-Z) is an INJECTED clock for deterministic assertions — a test
      // input, never a CLI flag (the 22/R2 white-box idiom, as `work:resume` uses it).
      now: { type: "string" },
      // The ambient environment and the spawn function, injected for the same reason: a
      // re-entrancy refusal and a timeout are both assertable without a live binary.
      env: { type: "object" },
      // Internal loop correlation: the run whose evidence is being graded. The CLI does
      // not expose this; a direct grade outside a run records the meaningful null state.
      claimRun: { type: "string" },
    },
    additionalProperties: false,
  },

  async run(input, ctx) {
    const ref = typeof input.ref === "string" ? input.ref.trim() : "";
    if (!ref) throw commandError("aof work grade needs an item ref — the grade is always OF something.", "ref-required", 400);

    const item = await resolveItem(ctx, ref);
    if (!item) throw commandError(`No item resolves to ref "${ref}".`, "ref-not-found", 404);
    requireLocalCheckout(item, ref);

    const gradedAt = input.now ?? new Date().toISOString();
    const rubric = declaredRubric(ctx.workspace.config);
    // THE BOUND IS RESOLVED, NEVER CHOSEN HERE. One home (`69/ADR-001`), and 81/00's
    // derivation over the two keys 69 already declared — so the deadline can never exceed
    // the heartbeat window that supervises the attempt running it.
    const deadlineMs = gradeDeadlineFromConfig(ctx.workspace);
    const plan = rubric == null ? null : planRubric(rubric, { ref: item.ref, projectRoot: ctx.workspace.projectRoot, deadlineMs });

    const recorded = gradesFromRuns(await readRuns(item));
    const history = recorded.map((entry) => entry.grade);
    const last = recorded.length > 0 ? recorded[recorded.length - 1] : null;

    // ---- THE READ FACE: a plan and a recorded grade, and NOTHING is launched ----------
    if (input.run !== true) {
      // An unconfigured project answers the SAME honest no-op at every door (ADR-004 §4):
      // `indeterminate` / `rubric-unconfigured`, naming the key to set. It is never `pass`.
      const grade = rubric == null ? compileGrade({ ref: item.ref, gradedAt, rubric: null }) : null;
      return {
        ref: item.ref,
        ran: false,
        launched: 0,
        configured: rubric != null,
        rubricKey: RUBRIC_CONFIG_KEY,
        plan,
        // The floor a report WOULD have to clear — recomputable by the reader from `cases`
        // and the history, so the plan states a number somebody declared or the ratchet
        // earned, never one aof made up.
        floor: rubric == null ? null : evidenceFloor({ declared: plan.report?.floor, history, ref: item.ref }),
        grade,
        recorded: last?.grade ?? null,
        recordedAt: last?.at ?? null,
        recordedRunId: last?.runId ?? null,
        message: rubric == null
          ? `No rubric is declared for this project — set \`${RUBRIC_CONFIG_KEY}\` in .aof/aof.config.json to have aof grade a run. This is not a failure of the project's tests.`
          : last == null
            ? `No grade has been recorded for ${item.ref} yet. The plan below is what \`--run\` would execute; it is not a result.`
            : `The last grade recorded for ${item.ref} was taken at ${last.at}.`,
      };
    }

    // ---- `--run`: THE ONE SPAWN ------------------------------------------------------
    if (rubric == null) {
      // Nothing was run and nothing was read, so `runner` and `report` read null and the
      // counts read zero rather than being absent — and the loop proceeds exactly as today.
      return {
        ref: item.ref,
        ran: true,
        launched: 0,
        configured: false,
        rubricKey: RUBRIC_CONFIG_KEY,
        plan: null,
        floor: null,
        grade: compileGrade({ ref: item.ref, gradedAt, rubric: null }),
        recorded: last?.grade ?? null,
        recordedAt: last?.at ?? null,
        recordedRunId: last?.runId ?? null,
        message: `No rubric is declared for this project — set \`${RUBRIC_CONFIG_KEY}\` in .aof/aof.config.json to have aof grade a run. Nothing was launched. This is not a failure of the project's tests.`,
      };
    }

    const ambientEnv = input.env ?? process.env;
    const spawn = ctx.spawnRubric ?? spawnRubricAsync;
    const provenance = await gatherClaimProvenance({ run: input.claimRun ?? null, at: gradedAt }, ctx);
    const observed = await runRubric(plan, { ambientEnv, spawn });

    const grade = compileGrade({
      ref: item.ref,
      gradedAt,
      provenance,
      rubric: { report: plan.report },
      runner: observed.runner,
      report: observed.report,
      history,
    });

    return {
      ref: item.ref,
      ran: true,
      launched: observed.launched,
      configured: true,
      rubricKey: RUBRIC_CONFIG_KEY,
      plan,
      floor: evidenceFloor({ declared: plan.report?.floor, history, ref: item.ref }),
      grade,
      // The runner's own words, kept beside the record so a refusal explains itself without
      // a second look. `detail` never enters `GradeRecord` — its key set is exact (FF-5403).
      detail: observed.runner.detail ?? null,
      reportSource: observed.report.source,
      recorded: last?.grade ?? null,
      recordedAt: last?.at ?? null,
      recordedRunId: last?.runId ?? null,
      message: renderMessage(grade, observed),
    };
  },

  cli: {
    route: ["work", "grade"],
    spec: {
      usage: "aof work grade <ref> [--run] [--json]",
      flags: {
        run: { type: "boolean", description: "execute the declared rubric (the bare verb reports the plan and the last recorded grade, and executes nothing)" },
      },
    },

    argv: (positionals, options) => ({
      ...(positionals[0] ? { ref: positionals[0] } : {}),
      ...(options.run ? { run: true } : {}),
    }),

    render(result) {
      const lines = [result.message];
      if (result.plan) {
        lines.push("");
        lines.push(`Plan for ${result.ref}:`);
        lines.push(`  argv    ${Array.isArray(result.plan.command) ? result.plan.command.join(" ") : String(result.plan.command)}`);
        lines.push(`  cwd     ${result.plan.cwd}`);
        lines.push(`  scope   ${result.plan.whole ? "whole — the declaration sets no `args.ref`, so the runner runs whole by its own choice" : `${result.plan.scope.flag} ${result.plan.scope.ref}`}`);
        if (result.plan.report) {
          lines.push(`  report  ${result.plan.report.path} (${result.plan.report.format}), floor ${result.floor}`);
        }
        lines.push(`  deadline ${result.plan.deadlineMs}ms`);
      }
      const shown = result.grade ?? result.recorded;
      if (shown) {
        lines.push("");
        const when = result.ran ? "" : result.recordedAt ? ` (recorded ${result.recordedAt})` : "";
        lines.push(`Verdict: ${shown.verdict}${when}`);
        if (shown.codes.length) lines.push(`  codes   ${shown.codes.join(", ")}`);
        lines.push(`  cases   ${shown.cases.total} total, ${shown.cases.failed} failed, ${shown.cases.skipped} skipped`);
        // 81/01 — THE OPERATOR RENDER READS THE ONE BOUND RATHER THAN REPEATING IT. This
        // site's `slice(0, 20)` is where the 20 was declared; it is now promoted into
        // `boundGradeFailures`' single home and CALLED from here. A second slice left beside
        // the call is how two numbers become two different numbers.
        for (const failure of boundGradeFailures(shown.failures).failures) {
          lines.push(failure.truncation != null
            ? `  … ${failure.truncation}`
            : `  ✗ ${failure.case}${failure.message ? ` — ${failure.message}` : ""}`);
        }
      }
      if (result.detail) lines.push(`\n${result.detail}`);
      return lines.join("\n");
    },

    json: (result) => result,
  },
};

// A launch failure and a runner that ran and failed are DIFFERENT ANSWERS, and the message
// says which — the distinction the two indeterminate codes exist to carry.
function renderMessage(grade, observed) {
  if (grade.verdict === "pass") return `${grade.ref} graded pass — ${grade.cases.total} case(s) observed, ${grade.cases.failed} failing.`;
  if (grade.codes.includes("runner-spawn-failed")) return observed.runner.detail ?? "The declared runner could not be launched.";
  if (grade.codes.includes("runner-timeout")) return observed.runner.detail ?? "The declared runner did not finish within its deadline.";
  if (grade.verdict === "fail") return `${grade.ref} graded fail — ${grade.cases.failed} of ${grade.cases.total} observed case(s) reported a failing status.`;
  return `${grade.ref} graded indeterminate — ${grade.codes.join(", ")}. The run told us nothing about whether the item is correct.`;
}
