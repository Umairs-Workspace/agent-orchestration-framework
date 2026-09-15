// work:drive-<phase> — the executor half of the phase door/driver split.
//
// The existing work:<phase> commands decide WHERE an act belongs. These commands
// deliberately make no such decision: they run one local interactive agent
// session, type one phase directive, and surface the driver's terminal outcome.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   milestone 53 / story 02 — the code-owned loop shell and its three local
//   phase executors. The existing work:<phase> doors above still decide WHERE;
//   these additive commands execute only when the loop explicitly selects them.
import { driveInteractiveClaudeSession, INTERACTIVE_COMMAND_READY_DELAY_MS } from "../agent-session-driver.mjs";
import { ensureWorktreeTrusted } from "../claude-trust.mjs";
import { compileBriefForItem } from "../phase-brief-read.mjs";
import { resolveSessionLaunch } from "../session-model.mjs";
import { commandError } from "../command-error.mjs";
import { reportDegrade } from "../degrade.mjs";
// F-09 (`VERIFICATION.md`, blocker — 2026-08-21) — the run fact is reached through the
// TRANSITION SEAM, never the bare store. 68/01 first wired this command straight to
// `startRun`/`completeRun`, which made it a second, unledgered path to the same fact and
// turned milestone 42's `arch/m42-d2` + `arch/m42-d4-port1` red: those controls say the
// fact never lands without its event, so a mint or a settle that skips the seam raises no
// `run.started`/`run.completed` and inherits none of the declared cascade. Ported to the
// same doors the sibling caller (`src/mesh/worker-execution.mjs`) has always used.
import { recordSessionId } from "../run-store.mjs";
import { readConsumedHeartbeatAt } from "../run-heartbeat-consumption.mjs";
import { loopBoundsFromConfig, loopAgentModeFromConfig } from "../loop-bounds.mjs";
import { transitionRunStart, transitionRunComplete } from "../effects/run-transitions.mjs";
import { buildRunAttribution } from "../otel-attribution.mjs";
import { captureSessionIdOnRecord } from "../run-session-capture.mjs";
import { resolveItemExact, requireLocalCheckout } from "./resolve.mjs";
import { access, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { claudeProjectsDir } from "../work/observe.mjs";
import { settleSpendFromTranscript, snapshotTranscriptTree } from "../run-spend-ingest.mjs";

const PHASES = Object.freeze(["refine", "continue", "verify"]);

function recordedSessionForFix({ phase, buildRun }) {
  if (phase !== "fix") return null;
  const sessionId = typeof buildRun?.sessionId === "string" ? buildRun.sessionId.trim() : "";
  if (sessionId.length === 0 || path.basename(sessionId) !== sessionId) return null;
  return sessionId;
}

async function transcriptExists({ sessionId, cwd, env }) {
  try {
    await access(path.join(claudeProjectsDir({ cwd, env }), `${sessionId}.jsonl`));
    return true;
  } catch {
    return false;
  }
}

// ADR-008's structural distinction. Only a fix may derive a target, and it is
// derived from the PARTICULAR completed build run rather than a caller option or
// the latest item run. Missing, pruned, and other-node sessions resolve cold.
export async function resolvePhaseResumeTarget({
  phase,
  buildRun,
  cwd = process.cwd(),
  env = process.env,
  isResumable = transcriptExists,
} = {}) {
  const sessionId = recordedSessionForFix({ phase, buildRun });
  if (sessionId == null) return null;
  try {
    return await isResumable({ sessionId, cwd, env, buildRun }) ? sessionId : null;
  } catch {
    return null;
  }
}

function printable(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

// A warm fix receives the delta only. The run method adds the compiled phase
// brief separately when (and only when) the launch has degraded cold.
export function composeFixInput(command, { findings = [], changeUnderReview = "" } = {}) {
  const findingText = Array.isArray(findings) && findings.length > 0
    ? findings.map((finding) => printable(finding)).join("\n\n")
    : "No structured findings were supplied.";
  const changeText = typeof changeUnderReview === "string" ? changeUnderReview.trim() : "";
  return `${command}\n\n## REVIEW FINDINGS\n${findingText}${changeText.length > 0 ? `\n\n## CHANGE UNDER REVIEW\n${changeText}` : ""}`;
}

// 129/07 (ADR-001 §5, amended) — the phase's role mode, composed from the loop's OWN key
// `work.loop.agents.<phase>.mode` through the bounds home: `solo` → `--solo`, `orchestrated` →
// `--orchestrated` (the twin the prompts gained in the same story), and `null` (unset, or a
// phase that resolves no mode — `verify`) → no flag, byte-identical to HEAD, so the prompt's own
// read of `work.agents.mode` is the fallback. The drive never reads the workspace twin.
export const PHASE_MODE_FLAGS = Object.freeze({ solo: "--solo", orchestrated: "--orchestrated" });

export function phaseCommand(phase, ref, mode = null) {
  const flag = Object.prototype.hasOwnProperty.call(PHASE_MODE_FLAGS, mode) ? ` ${PHASE_MODE_FLAGS[mode]}` : "";
  return `/aof:${phase} ${ref}${flag}`;
}

// 129/02 (ADR-005 §2-§3; ruling 2026-09-13) — `--fix <file>` is the fix transport ACROSS THE
// PROCESS BOUNDARY: a JSON file in `fixTransport`'s shape (`LOOP_FIX_TRANSPORT_KEYS`), written
// by the loop under the aof home, read here where `ctx.loopDrive.fix` is read. EVERY way it
// fails to yield a JSON object — missing, a directory, malformed, a non-object, empty — is the
// ONE code `drive-fix-unreadable`, and it is refused before any run is minted and before any
// spawn, so a bad file never leaks a `running` record and never starts a session.
async function readFixFile(file) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw commandError(
      `The fix file "${file}" could not be read as a JSON object: ${error?.message ?? String(error)}`,
      "drive-fix-unreadable",
      400,
    );
  }
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    const kind = Array.isArray(parsed) ? "an array" : parsed === null ? "null" : `a ${typeof parsed}`;
    throw commandError(
      `The fix file "${file}" must hold a JSON object (the fix transport), not ${kind}.`,
      "drive-fix-unreadable",
      400,
    );
  }
  return parsed;
}

// 129/02 (ADR-005 §2 and §4; rulings 2026-09-13) — under `--run` the child's STDIN is the
// parent's cancel channel: Windows delivers no POSIX signal to a child, so the loop spawns the
// drive with a piped stdin and ENDS it to say stop. The `end` listener is attached before the
// session is started and the stream is resumed (a `Readable` only emits `end` once it is read,
// so an already-ended `/dev/null` stdin's `end` is OBSERVED rather than missed), and the cancel is
// GATED on liveness: an `end` seen before the driver's `onPtyLive` fired is recorded and
// ignored, one seen after it aborts the signal handed to the driver — the SAME graceful bracket
// every other stop takes (stop-requested → tree terminate → pty-released → exit confirmed).
// Once the session settles the stream is paused so the child process can exit. The seam is
// `ctx.stdin ?? process.stdin`; without `--run` stdin is never touched.
//
// "OBSERVED" IS MADE TRUE, NOT HOPED FOR: a stream ended before this point emits its `end` on
// a later turn of the loop (`nextTick` for a `Readable`, the poll phase for a NUL handle),
// while a resolved-promise chain into the spawn is microtasks only — so without a yield, an
// injected spawn goes live BEFORE the pending `end` lands and reads it as a cancel (measured
// with the driver's PTY double, 2026-09-13). One `setImmediate` after the resume lets an
// ALREADY-ENDED stream's `end` arrive on the pre-liveness side, where the ruling ignores it.
// That is a latency guarantee for the already-ended case, not a structural one: a PIPE the
// parent ends during the startup window (fix read → brief → trust → ConPTY spawn, 150 ms–1.2 s
// measured) still lands pre-liveness and is dropped — the case story 04's contract takes
// (129 VERIFICATION `F-15`: arm only on a pipe, and on a pipe every `end` is the cancel).
async function armStdinCancel(stream, onPtyLive) {
  const controller = new AbortController();
  let live = false;
  stream.on("end", () => {
    if (live) controller.abort();
  });
  stream.resume();
  await new Promise((resolve) => setImmediate(resolve));
  return {
    signal: controller.signal,
    // Composed with any caller-supplied `onPtyLive` (the loop's kill registry): both are called.
    onPtyLive: (...args) => {
      live = true;
      onPtyLive?.(...args);
    },
    release: () => stream.pause(),
  };
}

export function createPhaseDriverCommand(phase) {
  if (!PHASES.includes(phase)) {
    throw new TypeError(`Unsupported phase driver "${phase}".`);
  }

  return {
    id: `work:drive-${phase}`,
    input: {
      type: "object",
      properties: {
        ref: { type: "string" },
        dryRun: { type: "boolean" },
        // 129/02 (ADR-005 §2) — the lent run id and the fix file, across the process boundary.
        run: { type: "string" },
        fix: { type: "string" },
      },
      required: ["ref"],
      additionalProperties: false,
    },

    async run(input, ctx) {
      const ref = typeof input.ref === "string" ? input.ref.trim() : "";
      if (ref === "") {
        throw commandError(
          "A ref is required. Usage: aof work drive <phase> <ref>.",
          "ref-required",
          400,
        );
      }

      const item = await resolveItemExact(ctx, ref);
      if (!item) {
        throw commandError(`No item resolves to ref "${ref}".`, "ref-not-found", 404);
      }
      requireLocalCheckout(item, ref);

      const command = phaseCommand(phase, item.ref, loopAgentModeFromConfig(ctx.workspace, phase));
      if (input.dryRun === true) {
        return { ref: item.ref, phase, command };
      }

      // 129/02 (ADR-005 §2) — the two flags that carry a loop drive across the process
      // boundary. `--run` LENDS the run id exactly as `ctx.loopDrive.runId` does (and wins
      // over it — the explicit door); `run: ""` is absent, the same `length > 0` guard.
      // `--fix` is read here, BEFORE the mint below, so its refusal precedes every effect.
      const lentRunId = typeof input.run === "string" && input.run.length > 0 ? input.run : null;
      const fixFromFile = typeof input.fix === "string" && input.fix.length > 0
        ? await readFixFile(input.fix)
        : null;

      // 70/00 (story phase-brief, ADR-001/002) — the local drive command is one of the
      // driver's two production callers, so it compiles the phase brief (from the item's
      // already-authored documents) and hands it to the driver BY VALUE on the `brief`
      // bag's additive `context` key. Best-effort: a compile fault degrades and the session
      // still runs without a brief (absence stays benign, ADR-001) — never a failed spawn.
      // A story lives under `<milestone>/stories/<story>`, so its milestone docs (SPEC.md,
      // ARCHITECTURE.md) sit TWO directories above the story dir.
      let phaseContext = undefined;
      try {
        phaseContext = await compileBriefForItem({
          itemRef: item.ref,
          phase,
          itemType: item.type,
          itemDir: item.dir,
          milestoneDir: item.type === "story" ? path.dirname(path.dirname(item.dir)) : item.dir,
        });
      } catch (error) {
        reportDegrade("drive", error);
      }

      // 68/01 (story attribution-at-spawn, ADR-005 §1) — the local drive command is one
      // of the driver's two production callers, so it mints a run record and PERSISTS
      // the captured session id onto it (the attribution join key), plus the OTel spawn
      // attribution (ADR-005 §2). A mint fault (e.g. a non-terminal run already in
      // flight) degrades and the session still runs — the id simply goes unrecorded.
      // A loop drive has already minted the run carrying its loop declaration. It
      // lends that run id to this command so session attribution and spend settle on
      // the SAME record; a bare CLI drive still owns and settles the run it mints.
      // A child drive receives the lend as `--run` (129/ADR-005 §2), read first.
      const managedRunId = lentRunId
        ?? (typeof ctx.loopDrive?.runId === "string" && ctx.loopDrive.runId.length > 0
          ? ctx.loopDrive.runId
          : null);
      const ownsRun = managedRunId == null;
      const runRecord = managedRunId == null
        ? await transitionRunStart(item, { now: new Date().toISOString() })
          .then(({ record }) => record)
          .catch((error) => {
            reportDegrade("drive", error);
            return null;
          })
        : { runId: managedRunId };

      // A caller cannot opt a phase into resuming by smuggling the driver's old
      // terminal-reattach option through this command. ADR-008 derives the target
      // from the lane and the specific build run being fixed.
      const { resumeSessionId: _suppliedResumeTarget, ...baseOptions } = ctx.agentSessionDriverOptions ?? {};
      // `fix` is a semantic sub-path of CONTINUE, never an ambient option. A caller
      // can supply arbitrarily rich fix/resume data to refine or verify and it is
      // ignored exactly like a raw resumeSessionId. The `--fix` file wins over
      // `ctx.loopDrive.fix` when both are present (129/02 ruling), and is honoured
      // with an owned run too — the fix is read independently of who owns the run.
      const fixSource = fixFromFile ?? ctx.loopDrive?.fix ?? null;
      const fix = phase === "continue" && fixSource?.buildRun ? fixSource : null;
      const launchPhase = fix == null ? phase : "fix";
      const resumeSessionId = fix?.resumeBuildRun == null
        ? null
        : await resolvePhaseResumeTarget({
          phase: launchPhase,
          buildRun: fix.resumeBuildRun,
          cwd: ctx.workspace.projectRoot,
          env: baseOptions.env ?? process.env,
          ...(typeof baseOptions.resumeSessionAvailable === "function"
            ? { isResumable: baseOptions.resumeSessionAvailable }
            : {}),
        });
      const launchCommand = fix == null
        ? command
        : composeFixInput(command, {
          findings: fix.findings,
          changeUnderReview: fix.changeUnderReview,
        });
      const driverOptions = {
        ...baseOptions,
        // F27 (local drive path) — the directive command must not be typed into
        // claude's PTY at t=0: it races claude's startup, the keystrokes are lost, and
        // claude sits idle at an empty prompt — no transcript, no sessionId, no spend.
        // The mesh-launcher wires this same delay for the worker path; the local drive
        // command was the one caller that never did, so a local `aof work drive`/`loop`
        // could never actually start a session. Allow an injected override, else the
        // production constant — matching mesh-launcher.mjs:1272/1443.
        commandDelayMs: baseOptions.commandDelayMs ?? INTERACTIVE_COMMAND_READY_DELAY_MS,
        // F24 (local drive path) — claude shows a one-time "Do you trust the files in
        // this folder?" dialog the FIRST time it runs in a directory, and that dialog
        // fires BEFORE it reads the system prompt — so a fresh worktree HANGS the run
        // forever with no session, no transcript. claude-trust.mjs exists precisely so
        // BOTH spawn paths (the mesh worker AND the local terminal) pre-write the trust
        // fact. The local drive was the caller that never wired it. Best-effort by
        // design (a fault degrades to claude's own blocking dialog, never a throw).
        trustWorktree: baseOptions.trustWorktree ?? ensureWorktreeTrusted,
        // milestone 70 / story 01 (ADR-005) — the SESSION model and effort, resolved
        // per phase from `work.agents.session` (distinct from the m30 render-time role
        // map `work.agents.models`; see src/session-model.mjs). Absent config → {} → no
        // --model/--effort, byte-identical to today's launch.
        session: resolveSessionLaunch(ctx.workspace?.config, phase),
        // The spawn env's OTel resource attributes (68/ADR-005 §2). `phase` is read
        // from the loop's declaration (ADR-002) — a bare local drive declares none, so
        // no phase attribute is fabricated here.
        attribution: buildRunAttribution(item, {
          runId: runRecord ? runRecord.runId : undefined,
          machineId: os.hostname(),
          worktreeId: path.basename(ctx.workspace.projectRoot),
        }),
        ...(runRecord == null ? {} : { heartbeat: { itemDir: item.dir, runId: runRecord.runId } }),
        deadlinePolicy: baseOptions.deadlinePolicy ?? loopBoundsFromConfig(ctx.workspace),
        ...(runRecord == null ? {} : {
          readHeartbeatAt: baseOptions.readHeartbeatAt ?? (() => readConsumedHeartbeatAt(item, runRecord.runId)),
        }),
        // F-04 (blocker) — the attribution write must never be left racing the settle.
        // The shape that guarantees it now has ONE home (run-session-capture.mjs, F-09);
        // it was a hand-copy of the sibling caller's until then, which is how the drive
        // command came to be written without it in the first place.
        onSessionIdCaptured: captureSessionIdOnRecord({
          item,
          runId: runRecord?.runId,
          source: "drive",
          onCaptured: baseOptions.onSessionIdCaptured,
        }),
        ...(resumeSessionId == null ? {} : { resumeSessionId }),
      };

      // The settle seam consumes Claude's transcript DIRECTORY, not the worktree
      // itself. For a warm run, snapshot the existing conversation before launch so
      // only bytes appended by this attempt are charged to the new run record.
      const projectsDir = claudeProjectsDir({
        cwd: ctx.workspace.projectRoot,
        env: baseOptions.env ?? process.env,
      });
      const transcriptBaseline = resumeSessionId == null
        ? null
        : await snapshotTranscriptTree(projectsDir, resumeSessionId);
      const spendBaselineAvailable = resumeSessionId == null
        || Object.hasOwn(transcriptBaseline ?? {}, `${resumeSessionId}.jsonl`);
      if (!spendBaselineAvailable) {
        reportDegrade("resume-spend-baseline-unavailable", new Error(`no reliable transcript baseline for ${resumeSessionId}`));
      }
      const settlementContext = { projectsDir, transcriptBaseline, spendBaselineAvailable };
      ctx.loopDrive?.recordSettlementContext?.(settlementContext);

      const brief = {
        itemRef: item.ref,
        worktreeCwd: ctx.workspace.projectRoot,
        task: launchPhase,
        command: launchCommand,
        // A resumed session already holds the tree context. A cold fix — including
        // every unavailable/pruned/other-node target — receives the compiled brief.
        ...(resumeSessionId == null && phaseContext != null ? { context: phaseContext } : {}),
      };
      // 129/02 — under `--run` (and only then) stdin is the cancel channel. ARM AND RELEASE
      // ARE ONE BRACKET: the stream is resumed inside the same `try` whose `finally` pauses
      // it, so nothing that throws between the two can leave the child's stdin resumed. A
      // resumed-and-never-paused stdin holds the process open after the face has printed its
      // document — the child hangs until the parent's deadline kill (review round 1,
      // 2026-09-13, measured). Liveness is observed through the driver's own `onPtyLive`
      // (composed with the caller's) and the stop requested through its `signal`.
      let result;
      let cancel = null;
      try {
        cancel = lentRunId == null ? null : await armStdinCancel(ctx.stdin ?? process.stdin, baseOptions.onPtyLive);
        result = await driveInteractiveClaudeSession(brief, {
          ...driverOptions,
          ...(cancel == null ? {} : { onPtyLive: cancel.onPtyLive, signal: cancel.signal }),
        });
      } finally {
        // The stop channel has nothing left to carry once there is nothing to stop.
        cancel?.release();
      }

      // Settle the run record so it never leaks a `running` row (the dedup guard would
      // otherwise block every later run on this item). done → done; failed → failed;
      // needs-input → a one-shot local drive cannot service a parked session, so it
      // settles failed (failureReason `needs-input`) rather than leaking a running row.
      if (runRecord) {
        // Ensure the captured session id is ON the record before settling — belt and
        // braces beside the awaited mid-run write above, and idempotent (a byte-identical
        // id is a no-op), so it costs nothing when that write already landed.
        //
        // F-06 (`VERIFICATION.md`, 2026-08-21) — this block's stated reason USED to be
        // "the driver invokes onSessionIdCaptured fire-and-forget, so a racing completeRun
        // could clobber the id back to null". That was false as of the F-04 fix and is
        // corrected here: the driver AWAITS that handler (`agent-session-driver.mjs:833`,
        // inside the watch chain `finish` awaits at `:887`), which is precisely why
        // awaiting the persist inside the handler closes the race. The write below is
        // kept for the path where the id surfaces only on the driver's terminal result.
        if (typeof result.sessionId === "string" && result.sessionId.length > 0) {
          await recordSessionId(item, { runId: runRecord.runId, sessionId: result.sessionId }).catch((error) =>
            reportDegrade("drive", error),
          );
        }
        const settled =
          result.outcome === "done" || result.outcome === "failed"
            ? {
                outcome: result.outcome,
                failureReason: result.outcome === "failed" ? (result.failureReason ?? "agent_error") : null,
              }
            : { outcome: "failed", failureReason: "needs-input" };
        if (ownsRun) try {
          const spend = spendBaselineAvailable ? await settleSpendFromTranscript(item, {
            runId: runRecord.runId,
            projectsDir,
            baseline: transcriptBaseline,
            exitReason: result.outcome === "done" ? "final_output" : "error",
            now: new Date().toISOString(),
          }) : { stamped: false, reason: "resume-baseline-unavailable" };
          if (!spend.stamped && !["already-settled", "resume-baseline-unavailable"].includes(spend.reason)) {
            reportDegrade("drive-spend-unavailable", new Error(spend.reason ?? "unknown"));
          }
          await transitionRunComplete(
            item,
            { runId: runRecord.runId, ...settled, now: new Date().toISOString() },
            {},
          );
        } catch (error) {
          reportDegrade("drive", error);
        }
      }

      // 129/02 (ADR-005 §2) — `settlementContext` rides the result of every real drive, lent
      // or owned, so a PARENT process can settle spend against the baseline this launch took.
      return { ref: item.ref, phase, command, ...result, settlementContext };
    },

    cli: {
      route: ["work", "drive", phase],
      spec: {
        usage: `aof work drive ${phase} <ref> [--run <id>] [--fix <file>] [--dry-run] [--json]`,
        flags: {
          dryRun: { type: "boolean", description: "report the phase directive without starting an agent session" },
          run: { type: "string", description: "the lent run id: mint and settle nothing, heartbeat this record, and take stdin's end as the stop (a loop's child drive)" },
          fix: { type: "string", description: "a JSON file holding the fix transport; honoured by continue only" },
        },
      },
      argv: (positionals, options) => ({
        ref: positionals[0],
        ...(options.dryRun === true ? { dryRun: true } : {}),
        ...(typeof options.run === "string" ? { run: options.run } : {}),
        ...(typeof options.fix === "string" ? { fix: options.fix } : {}),
      }),
      render(result) {
        if (result.outcome == null) {
          return `${result.ref} — drive ${result.phase}: ${result.command} (dry run; no session started).`;
        }
        const session = result.sessionId == null ? "no session id" : `session ${result.sessionId}`;
        const failure = result.failureReason == null ? "" : ` (${result.failureReason})`;
        return `${result.ref} — drive ${result.phase}: ${result.outcome}${failure}, ${session}.`;
      },
      json: (result) => result,
    },
  };
}

export const refineDriverCommand = createPhaseDriverCommand("refine");
export const continueDriverCommand = createPhaseDriverCommand("continue");
export const verifyDriverCommand = createPhaseDriverCommand("verify");
