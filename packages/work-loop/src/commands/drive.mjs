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

import { commandError } from "@aof/contracts/error";

// F-09 (`VERIFICATION.md`, blocker — 2026-08-21) — the run fact is reached through the
// TRANSITION SEAM, never the bare store. 68/01 first wired this command straight to
// `startRun`/`completeRun`, which made it a second, unledgered path to the same fact and
// turned milestone 42's `arch/m42-d2` + `arch/m42-d4-port1` red: those controls say the
// fact never lands without its event, so a mint or a settle that skips the seam raises no
// `run.started`/`run.completed` and inherits none of the declared cascade. Ported to the
// same doors the sibling caller (`src/mesh/worker-execution.mjs`) has always used.

import { loopBoundsFromConfig, loopRuntimeSettingFromConfig } from "@aof/contracts/loop-bounds";
import { sessionAgentMode } from "@aof/contracts/agent-mode";

import { access, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// Core supplies application services; creating this interface starts no work.
export function createPhaseDrivers({
  sessionDriver,
  trust,
  briefCompiler,
  sessions,
  diagnostics,
  runs,
  askRequests,
  heartbeats,
  transitions,
  attribution,
  sessionCapture,
  items,
  transcripts,
  spend, runtimeSession, nativeAsks, execution
}) {
  const { driveInteractiveClaudeSession, INTERACTIVE_COMMAND_READY_DELAY_MS } = sessionDriver;
  const { ensureWorktreeTrusted } = trust;
  const { compileBriefForItem } = briefCompiler;
  const { normalizeEffort, resolveSessionLaunch, THINKING_UNKNOWN_LEVEL, thinkingUnknownLevelMessage } = sessions;
  const { reportDegrade } = diagnostics;
  const { readRuns, recordSessionId } = runs;
  const { ASK_STATES, readAsk } = askRequests;
  const { readConsumedHeartbeatAt } = heartbeats;
  const { transitionRunStart, transitionRunComplete } = transitions;
  const { buildRunAttribution } = attribution;
  const { captureSessionIdOnRecord } = sessionCapture;
  const { resolveItemExact, requireLocalCheckout } = items;
  const { claudeProjectsDir } = transcripts;
  const { settleSpendFromTranscript, snapshotTranscriptTree } = spend;

  // 147/02 — `repair` is the FOURTH phase driver: the session a lane halt is handed to. It is a
  // driver, not a session phase — `SESSION_PHASES` stays three, and a repair resolves its model and
  // effort as `continue` does (ADR-004 §4's lend reads continue's row for it).
  const PHASES = Object.freeze(["refine", "continue", "verify", "repair", "review"]);
  const sessionPhaseOf = (phase) => (["repair", "review"].includes(phase) ? "continue" : phase);

  async function driveNative(phase, item, input, ctx, recorded) {
    const managedRunId = input.run ?? ctx.loopDrive?.runId ?? null;
    const base = ctx.agentSessionDriverOptions ?? {};
    const cwd = ctx.workspace.projectRoot, env = base.env ?? process.env;
    const choicePhase = sessionPhaseOf(phase);
    const role = phase === "review" ? "aof-qa" : null;
    let roleInstructions = "";
    if (role != null) {
      try { roleInstructions = await readFile(path.join(cwd, ".codex", "agents", `${role}.toml`), "utf8"); }
      catch { throw commandError("Missing native review role: aof-qa", "runtime-asset-missing", 409); }
    }
    const supplied = { ...(input.model == null ? {} : { model: input.model }), ...(input.thinking == null ? {} : { effort: input.thinking === "extra-high" ? "xhigh" : input.thinking }) };
    const procedure = path.join(cwd, ".agents", "skills", `aof-${phase}`, "SKILL.md");
    let skill;
    try { skill = await readFile(procedure, "utf8"); } catch { throw commandError(`Missing native procedure: ${procedure}`, "runtime-asset-missing", 409); }
    if (!skill.includes("aof-runtime: codex")) throw commandError("The installed procedure is not a Codex variant", "runtime-asset-incompatible", 409);
    for (const [mention, target] of [["procedure.md", path.join(path.dirname(procedure), "procedure.md")], ["workflow-contract.md", path.join(cwd, ".codex/aof/workflows/workflow-contract.md")]]) {
      if (skill.includes(mention)) try { await access(target); } catch { throw commandError(`Missing native reference: ${target}`, "runtime-asset-missing", 409); }
    }
    let selected = recorded == null ? ctx.loopDrive?.execution ?? null : execution.resolveExecutionResume(recorded, { ...(input.runtime == null ? {} : { runtime: input.runtime }), choices: { [choicePhase]: supplied } });
    if (selected == null) {
      const capabilities = await runtimeSession.inspectCapabilities("codex", { ...base, cwd, env });
      selected = execution.resolveExecution(ctx.workspace.config, { runtime: input.runtime, choices: { [choicePhase]: supplied }, capabilities: { codex: capabilities } });
    }
    selected = execution.validateExecutionEnvelope(selected);
    if (selected.runtime !== "codex") throw commandError("The native drive differs from the recorded runtime", "execution-resume-conflict", 409);
    const halt = input.halt ?? null;
    if (phase === "repair") {
      if (!halt) throw commandError("A repair requires its hand-over file", "drive-repair-halt-required", 400);
      await readHaltFile(halt);
    }
    const fileAnswer = input.answer ? await readAnswerFile(input.answer) : null;
    const answer = fileAnswer ?? (ctx.loopDrive?.answer == null ? null : { ...ctx.loopDrive.answer, state: ASK_ANSWERED });
    if (answer != null) await admitAnswer(answer, { lentRunId: managedRunId, item });
    const fixSource = answer == null ? (input.fix ? await readFixFile(input.fix) : ctx.loopDrive?.fix) : null;
    const fix = phase === "continue" && fixSource?.buildRun ? fixSource : null;
    const autonomous = input.autonomous === true || ctx.loopDrive?.autonomous === true;
    const command = phaseCommand(phase, item.ref, sessionAgentMode(ctx.workspace, phase), { autonomous, halt }).replace(`/aof:${phase}`, `$aof-${phase}`);
    const choice = selected.phases[choicePhase];
    if (input.dryRun === true) return { ref: item.ref, phase, command, execution: selected, effort: { level: choice.effort, source: choice.effortSource }, model: { id: choice.model, source: choice.modelSource } };
    const briefItem = ctx.loopDrive?.briefItem ?? item;
    const context = await compileBriefForItem({ itemRef: briefItem.ref, phase, itemType: briefItem.type, itemDir: briefItem.dir, milestoneDir: briefItem.type === "story" ? path.dirname(path.dirname(briefItem.dir)) : briefItem.dir });
    let resumeSessionId = answer?.sessionId ?? null, coldStartReason;
    const pendingDecision = [recorded, fix?.buildRun].some(run => run?.asks?.some(ask => ask.answeredAt == null));
    if (answer == null && pendingDecision) throw commandError("Answer the pending native question before starting another phase or cold fix", "native-question-pending", 409);
    const target = phase === "review" ? null : fix == null ? recorded?.sessionId ?? null : fix.resumeBuildRun?.sessionId ?? null;
    if (fix != null && target == null) coldStartReason = "native-thread-unavailable";
    if (answer == null && target != null) {
      if (await runtimeSession.canResume("codex", target, { ...base, cwd, env })) resumeSessionId = target;
      else {
        if (fix == null) throw commandError("The recorded native thread is unavailable; a pending decision cannot be discarded", "native-resume-unavailable", 409);
        coldStartReason = "native-thread-unavailable";
      }
    }
    const runRecord = recorded ?? (managedRunId == null ? (await transitionRunStart(item, { execution: selected, now: new Date().toISOString() })).record : { runId: managedRunId });
    const settlementContext = { runtime: "codex", projectsDir: null, transcriptBaseline: null, spendBaselineAvailable: false, reason: "runtime-spend-unavailable" };
    ctx.loopDrive?.recordSettlementContext?.(settlementContext);
    const dir = askRequests.loopAsksDir(nativeAsks.askEnvFor(ctx));
    if (answer != null) {
      const file = await askRequests.readAsk(dir, runRecord.runId);
      if (file?.delivery?.state === "acknowledged") {
        await nativeAsks.acknowledgeNativeAnswer({ item, runId: runRecord.runId, answer, turn: { sessionId: file.sessionId, turnId: file.delivery.turnId }, ctx });
        return { ref: item.ref, phase, command, outcome: "needs-input", failureReason: "ask-delivery-acknowledged", sessionId: file.sessionId, settlementContext };
      }
      await askRequests.beginNativeDelivery(dir, runRecord.runId, { sessionId: answer.sessionId, questionToken: answer.questionToken });
    }
    let cancel, result, beatTimer;
    let beats = Promise.resolve();
    const beat = () => { beats = beats.then(() => heartbeats.enqueueHeartbeat?.(item, runRecord.runId, new Date().toISOString())).catch(error => reportDegrade("native-driver-heartbeat", error)); };
    try {
      cancel = input.run == null ? null : await armStdinCancel(ctx.stdin ?? process.stdin, base.onPtyLive);
      const signal = cancel == null ? base.signal : base.signal == null ? cancel.signal : AbortSignal.any([base.signal, cancel.signal]);
      const launchCommand = (answer == null ? fix == null ? command : composeFixInput(command, fix) : JSON.stringify({ token: answer.questionToken, question: answer.question, choices: answer.choices, answer: answer.text })) + (role == null ? "" : `\nNative review role ${role}; this is an independent thread. Follow these role instructions and report findings:\n${roleInstructions}`);
      result = await runtimeSession.drive({ itemRef: item.ref, worktreeCwd: cwd, phase: choicePhase, task: fix == null ? phase : "fix", procedure, arguments: [item.ref], ...(role == null ? {} : { role }), command: launchCommand, ...(resumeSessionId == null ? { context } : {}) }, {
        ...base, env: { ...env, AOF_RUN_ID: runRecord.runId, AOF_RUN_ITEM_DIR: item.dir },
        execution: selected, signal, ...(resumeSessionId == null ? {} : { resumeSessionId }),
        deadlinePolicy: base.deadlinePolicy ?? loopBoundsFromConfig(ctx.workspace),
        onProcessLive: child => {
          cancel?.onPtyLive(child); base.onProcessLive?.(child); beat();
          beatTimer = setInterval(beat, Math.max(1, Math.floor(loopBoundsFromConfig(ctx.workspace).heartbeatMs / 3)));
          child.once?.("close", () => { clearInterval(beatTimer); });
        },
        onIdentity: async sessionId => { await recordSessionId(item, { runId: runRecord.runId, sessionId, ...(coldStartReason === undefined ? {} : { coldStartReason }) }); await base.onIdentity?.(sessionId); },
        onQuestion: async question => { await nativeAsks.persistNativeQuestion({ item, runId: runRecord.runId, question, phase, ctx }); await base.onQuestion?.(question); },
        onActivity: async value => { await runs.recordRuntimeEvent?.(item, { runId: runRecord.runId, event: value }); await base.onActivity?.(value); },
        onUsage: async value => { await runs.recordRuntimeEvent?.(item, { runId: runRecord.runId, event: { ...value, kind: "usage" } }); await base.onUsage?.(value); },
        onTurnStarted: async turn => { await runs.recordRuntimeEvent?.(item, { runId: runRecord.runId, event: { ...turn, kind: "turn", resumed: resumeSessionId != null } }); if (answer != null) await nativeAsks.acknowledgeNativeAnswer({ item, runId: runRecord.runId, answer, turn, ctx }); await base.onTurnStarted?.(turn); },
      });
      if (signal?.aborted && result.failureReason === "abort") result = { ...result, outcome: "cancelled", failureReason: "cancelled" };
    } finally { clearInterval(beatTimer); await beats; cancel?.release(); }
    let pendingFile = await askRequests.readAsk(dir, runRecord.runId);
    if (result.outcome !== "done" && pendingFile == null) {
      const stored = (await readRuns(item)).find(run => run.runId === runRecord.runId);
      const pending = nativeAsks.standingAsk(stored);
      if (pending?.runtime === "codex") {
        // The run ledger is authoritative when interruption lands between its write
        // and the ask projection. Recover that projection before any terminal write.
        await nativeAsks.persistNativeQuestion({ item, runId: runRecord.runId, phase, ctx, question: { sessionId: pending.sessionId, token: pending.questionToken, text: pending.question, choices: pending.choices } });
        pendingFile = await askRequests.readAsk(dir, runRecord.runId);
      }
    }
    if (result.outcome !== "done" && pendingFile?.runtime === "codex" && pendingFile.state !== ASK_ANSWERED) result = { ...result, outcome: "needs-input", question: { token: pendingFile.questionToken, text: pendingFile.question, choices: pendingFile.choices, sessionId: pendingFile.sessionId } };
    if (managedRunId == null && result.outcome === "needs-input") {
      await askRequests.parkAsk(dir, runRecord.runId);
      await runs.parkRunAsk(item, runRecord.runId);
    }
    if (managedRunId == null && result.outcome !== "needs-input") await transitionRunComplete(item, { runId: runRecord.runId, outcome: result.outcome, failureReason: result.failureReason ?? null, now: new Date().toISOString() }, { projectsDir: null, spendSettled: true });
    return { ref: item.ref, phase, command, ...result, settlementContext };
  }

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
  async function resolvePhaseResumeTarget({
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
  function composeFixInput(command, { findings = [], changeUnderReview = "" } = {}) {
    const findingText = Array.isArray(findings) && findings.length > 0
      ? findings.map((finding) => printable(finding)).join("\n\n")
      : "No structured findings were supplied.";
    const changeText = typeof changeUnderReview === "string" ? changeUnderReview.trim() : "";
    return `${command}\n\n## REVIEW FINDINGS\n${findingText}${changeText.length > 0 ? `\n\n## CHANGE UNDER REVIEW\n${changeText}` : ""}`;
  }

  // 129/07 (ADR-001 §5), 155 — the phase's role mode, composed from the session chain in
  // `@aof/contracts/agent-mode` (the loop's own key, then the workspace key, then the one built-in
  // default): `solo` → `--solo`, `orchestrated` → `--orchestrated`. Every refine and continue the
  // loop drives therefore carries a flag, so its narration shows the mode it ran in; only `null`
  // — a phase that resolves no mode, `verify` — composes none. The drive reads no config key for
  // the mode and spells no default of its own.
  const PHASE_MODE_FLAGS = Object.freeze({ solo: "--solo", orchestrated: "--orchestrated" });

  // 143/01 (ADR-002 §5) — a whole-item refine appends `--autonomous` AFTER the mode flag: the prompt
  // is the cascade `aof:refine --autonomous` already performs. Absent, the command is byte-identical.
  // 147/02 — a REPAIR types `/aof:repair <ref> <hand-over file>`: the file's path is the session's
  // second argument, before any flag. Absent, the command is byte-identical to the other phases'.
  function phaseCommand(phase, ref, mode = null, { autonomous = false, halt = null } = {}) {
    const flag = Object.prototype.hasOwnProperty.call(PHASE_MODE_FLAGS, mode) ? ` ${PHASE_MODE_FLAGS[mode]}` : "";
    const handOver = typeof halt === "string" && halt.length > 0 ? ` ${halt}` : "";
    return `/aof:${phase} ${ref}${handOver}${flag}${autonomous === true ? " --autonomous" : ""}`;
  }

  // 147/02 — `--halt <file>` is the repair session's HAND-OVER across the process boundary: the JSON
  // document the launch wrote under the aof home (`loop-repairs/<runId>.json`). Every way it fails to
  // yield a JSON object — missing, a directory, malformed, a non-object — is the ONE code
  // `drive-repair-halt-unreadable`, refused before any run is minted and before any spawn, exactly as
  // `--fix` is. The driver reads it only to refuse early; the SESSION reads it by the path it is typed.
  async function readHaltFile(file) {
    let parsed;
    try {
      parsed = JSON.parse(await readFile(file, "utf8"));
    } catch (error) {
      throw commandError(
        `The hand-over file "${file}" could not be read as a JSON object: ${error?.message ?? String(error)}`,
        "drive-repair-halt-unreadable",
        400,
      );
    }
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      const kind = Array.isArray(parsed) ? "an array" : parsed === null ? "null" : `a ${typeof parsed}`;
      throw commandError(
        `The hand-over file "${file}" must hold a JSON object (the halt's hand-over), not ${kind}.`,
        "drive-repair-halt-unreadable",
        400,
      );
    }
    return parsed;
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

  // 131/03 (ADR-003 §7; ADR-001 §1, §6) — `--answer <file>` RESUMES A RUN'S OWN SESSION WITH THE
  // OPERATOR'S ANSWER TYPED. The file is an ask record (`src/loop/ask-request.mjs`), read through its
  // own rules: every way it fails to be an `answered` ask with a non-empty answer is the ONE code
  // `drive-answer-unreadable`, and it is refused before any mint, compile or spawn, as `--fix` is.
  const { waiting: _waiting, parked: _parked, answered: ASK_ANSWERED } = ASK_STATES;

  function answerUnreadable(message) {
    return commandError(message, "drive-answer-unreadable", 400);
  }

  async function readAnswerFile(file) {
    let record;
    try {
      record = await readAsk(path.dirname(file), path.basename(file, ".json"));
    } catch (error) {
      throw answerUnreadable(`The answer file "${file}" could not be read: ${error?.message ?? String(error)}`);
    }
    if (record == null) throw answerUnreadable(`The answer file "${file}" is not an ask record.`);
    return { runId: record.runId, sessionId: record.sessionId, text: record.answer, state: record.state, ...(record.runtime === "codex" ? { runtime: record.runtime, questionToken: record.questionToken, question: record.question, choices: record.choices } : {}) };
  }

  // The answer is this run's own, or it is refused `drive-answer-not-own` (409): a run resumes only
  // its own conversation (`70/FF-7007`, extended). A lent run must exist, the answer must name it, and
  // its RECORD must be `running` with the answer's session on it. An ask still `waiting` or `parked`,
  // or a blank answer, is unreadable: there is nothing to type.
  async function admitAnswer(answer, { lentRunId, item }) {
    if (answer.state !== ASK_ANSWERED || typeof answer.text !== "string" || answer.text.length === 0) {
      throw answerUnreadable(`The answer for run ${answer.runId ?? "?"} is not an answered ask with a non-empty answer.`);
    }
    const notOwn = (why) => commandError(`The answer is not this run's own: ${why}.`, "drive-answer-not-own", 409);
    if (lentRunId == null) throw notOwn("no run is lent to this drive");
    if (answer.runId !== lentRunId) throw notOwn(`it answers run ${answer.runId ?? "none"}, and run ${lentRunId} is lent`);
    const record = (await readRuns(item)).find((run) => run.runId === lentRunId);
    if (record == null) throw notOwn(`run ${lentRunId} has no record on ${item.ref}`);
    if (record.state !== "running") throw notOwn(`run ${lentRunId} is ${record.state}, and only a running run waits on an answer`);
    if (typeof record.sessionId !== "string" || record.sessionId.length === 0 || record.sessionId !== answer.sessionId) {
      throw notOwn(`its session ${answer.sessionId ?? "none"} is not run ${lentRunId}'s session ${record.sessionId ?? "none"}`);
    }
    return answer;
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

  function createPhaseDriverCommand(phase) {
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
          // 131/03 (ADR-003 §7) — the answer to a run's standing ask: the path of its ask file.
          answer: { type: "string" },
          // 141 — the effort this one drive's session thinks at, over the phase's configured one.
          thinking: { type: "string" },
          // 143/01 — the whole-item refine: break down and author every contract in this one session.
          autonomous: { type: "boolean" },
          // 143/03 — the model this one drive's session runs on, over the phase's configured one.
          model: { type: "string" },
          runtime: { type: "string" },
          // 147/02 — the repair session's hand-over file; repair only.
          halt: { type: "string" },
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

        // 141 — an unknown level is refused at the door, before the item is read or a run minted.
        // `--thinking` wins over `ctx.loopDrive.thinking` (the in-process loop's lend), as `--fix`
        // wins over `ctx.loopDrive.fix`; `thinking: ""` is absent.
        const thinkingGiven = typeof input.thinking === "string" && input.thinking.length > 0
          ? input.thinking
          : typeof ctx.loopDrive?.thinking === "string" && ctx.loopDrive.thinking.length > 0
            ? ctx.loopDrive.thinking
            : null;
        const nativeHint = input.runtime === "codex" || ctx.loopDrive?.execution?.runtime === "codex" || loopRuntimeSettingFromConfig(ctx.workspace).value === "codex" || input.run != null || ctx.loopDrive?.runId != null;
        const thinking = thinkingGiven == null ? undefined : nativeHint ? thinkingGiven : normalizeEffort(thinkingGiven);
        if (thinking === null) {
          throw commandError(thinkingUnknownLevelMessage(thinkingGiven), THINKING_UNKNOWN_LEVEL, 400);
        }

        // 143/01 (ADR-002 §5) — `--autonomous` wins over the loop's lend, as `--thinking` does. It is
        // a REFINE cascade, so any other phase refuses it at the door, before any read or mint.
        const autonomous = input.autonomous === true || ctx.loopDrive?.autonomous === true;
        if (autonomous && phase !== "refine") {
          throw commandError(`--autonomous is a refine cascade; \`aof work drive ${phase}\` does not take it. Use \`aof work drive refine <ref> --autonomous\`.`, "drive-autonomous-refine-only", 400);
        }

        // 147/02 — `--halt <file>` is the repair session's hand-over, and only a repair takes it: any
        // other phase refuses it at the door, before any read or mint, as `--autonomous` is refused.
        const haltGiven = typeof input.halt === "string" && input.halt.length > 0 ? input.halt : null;
        if (haltGiven != null && phase !== "repair") {
          throw commandError(`--halt is the repair session's hand-over; \`aof work drive ${phase}\` does not take it. Use \`aof work drive repair <ref> --run <id> --halt <file>\`.`, "drive-halt-repair-only", 400);
        }

        const item = await resolveItemExact(ctx, ref);
        if (!item) {
          throw commandError(`No item resolves to ref "${ref}".`, "ref-not-found", 404);
        }
        requireLocalCheckout(item, ref);

        const managed = input.run ?? ctx.loopDrive?.runId ?? null;
        const recorded = managed == null ? null : (await readRuns(item)).find(run => run.runId === managed);
        const runtime = recorded == null ? input.runtime ?? ctx.loopDrive?.execution?.runtime ?? loopRuntimeSettingFromConfig(ctx.workspace).value ?? "claude" : recorded.execution?.runtime ?? "claude";
        if (runtime === "codex" && managed != null && recorded == null) throw commandError("The native lent run has no durable record", "drive-run-not-found", 409);
        if (!["claude", "codex"].includes(input.runtime ?? runtime)) throw commandError("Unsupported runtime", "unsupported-runtime", 400);
        if (recorded != null && input.runtime != null && input.runtime !== runtime) throw commandError("The requested runtime differs from this run", "execution-resume-conflict", 409);
        if (runtime === "codex") return driveNative(phase, item, input, ctx, recorded);
        if (phase === "review") throw commandError("The independent native review driver requires Codex", "unsupported-runtime", 409);
        if (thinkingGiven != null && normalizeEffort(thinkingGiven) == null) throw commandError(thinkingUnknownLevelMessage(thinkingGiven), THINKING_UNKNOWN_LEVEL, 400);

        const command = phaseCommand(phase, item.ref, sessionAgentMode(ctx.workspace, phase), { autonomous, halt: haltGiven });
        // milestone 70 / story 01 (ADR-005), story 141 — the SESSION model and effort, resolved per
        // phase from `work.agents.session` (distinct from the render-time role maps
        // `work.agents.models` / `work.agents.effort`; see src/session-model.mjs), with `--thinking`
        // over the configured effort and `high` under both. The dry run says what it would launch at.
        // 143/03 (ADR-004 §4) — the model resolves in the same order the effort does: this drive's own
        // `--model`, then the loop's lend (`ctx.loopDrive.model`), then config, then none. A drive is one
        // phase, so its `--model` takes no phase prefix. `model: ""` is absent.
        const modelGiven = typeof input.model === "string" && input.model.length > 0
          ? input.model
          : typeof ctx.loopDrive?.model === "string" && ctx.loopDrive.model.length > 0
            ? ctx.loopDrive.model
            : null;
        const choice = modelGiven == null ? undefined : { model: modelGiven, modelFlag: "--model" };
        const explicitChoice = { ...(input.model == null ? {} : { model: input.model }), ...(input.thinking == null ? {} : { effort: normalizeEffort(input.thinking) }) };
        const selectedExecution = recorded?.execution != null
          ? execution.resolveExecutionResume(recorded, { runtime: input.runtime, choices: { [sessionPhaseOf(phase)]: explicitChoice } })
          : input.runtime !== undefined || ctx.workspace?.config?.work?.agents?.runtimes?.claude != null
            ? execution.resolveExecution(ctx.workspace.config, { runtime: input.runtime ?? "claude", choices: { [sessionPhaseOf(phase)]: explicitChoice } })
            : null;
        const pinnedChoice = selectedExecution?.phases[sessionPhaseOf(phase)];
        const session = pinnedChoice == null ? resolveSessionLaunch(ctx.workspace?.config, sessionPhaseOf(phase), { thinking, choice }) : { ...pinnedChoice, model: pinnedChoice.model ?? undefined };
        const effort = { level: session.effort, source: session.effortSource };
        if (input.dryRun === true) {
          const model = session.model === undefined ? null : { id: session.model, source: session.modelSource };
          return { ref: item.ref, phase, command, effort, model };
        }

        // 129/02 (ADR-005 §2) — the two flags that carry a loop drive across the process
        // boundary. `--run` LENDS the run id exactly as `ctx.loopDrive.runId` does (and wins
        // over it — the explicit door); `run: ""` is absent, the same `length > 0` guard.
        // `--fix` is read here, BEFORE the mint below, so its refusal precedes every effect.
        const lentRunId = typeof input.run === "string" && input.run.length > 0 ? input.run : null;
        // 147/02 — A REPAIR CANNOT ACT WITHOUT ITS HAND-OVER: no file is `drive-repair-halt-required`,
        // a file that is not a JSON object is `drive-repair-halt-unreadable`, both before any effect.
        if (phase === "repair") {
          if (haltGiven == null) {
            throw commandError("A repair drive needs the halt's hand-over file. Usage: aof work drive repair <ref> --run <id> --halt <file>.", "drive-repair-halt-required", 400);
          }
          await readHaltFile(haltGiven);
        }
        // 131/03 — THE ANSWER IS JUDGED FIRST: after the dry run, before the fix file, the mint, the
        // compile and the stdin bracket. `--answer` wins over `ctx.loopDrive.answer`, as `--fix` wins
        // over `ctx.loopDrive.fix`; `answer: ""` is absent.
        const answerFromFile = typeof input.answer === "string" && input.answer.length > 0
          ? await readAnswerFile(input.answer)
          : null;
        const loopAnswer = ctx.loopDrive?.answer == null ? null : { ...ctx.loopDrive.answer, state: ASK_ANSWERED };
        const answer = answerFromFile ?? loopAnswer;
        if (answer != null) {
          await admitAnswer(answer, {
            lentRunId: lentRunId ?? (typeof ctx.loopDrive?.runId === "string" && ctx.loopDrive.runId.length > 0 ? ctx.loopDrive.runId : null),
            item,
          });
        }
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
          ? await transitionRunStart(item, { now: new Date().toISOString(), ...(selectedExecution == null ? {} : { execution: selectedExecution }) })
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
        // 131/03 — an ANSWER resumes the ask's own session with the answer typed, and nothing else: no
        // fix is composed beside it (the fix rode the session's first turn), the build run's resume
        // target is not consulted, and the brief carries no context (a resumed session holds its tree).
        const fixSource = answer == null ? fixFromFile ?? ctx.loopDrive?.fix ?? null : null;
        const fix = phase === "continue" && fixSource?.buildRun ? fixSource : null;
        const launchPhase = fix == null ? phase : "fix";
        const resumeSessionId = answer != null
          ? answer.sessionId
          : fix?.resumeBuildRun == null
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
        const launchCommand = answer != null
          ? answer.text
          : fix == null
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
          // The session resolved above: `--model` only when routed, `--effort` always (story 141).
          session: { ...(session.model == null ? {} : { model: session.model }), effort: session.effort },
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
            // 134/03 (ADR-003 §4): the spend was settled (or withheld) just above against the
            // resume baseline; the seam stamps the person's answers from this drive's directory.
            await transitionRunComplete(
              item,
              { runId: runRecord.runId, ...settled, now: new Date().toISOString() },
              { projectsDir, spendSettled: true },
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
          usage: phase === "repair"
            ? "aof work drive repair <ref> --run <id> --halt <file> [--thinking LEVEL] [--model ID] [--dry-run] [--json]"
            : `aof work drive ${phase} <ref> [--run <id>] [--fix <file>] [--answer <file>] [--thinking LEVEL] [--model ID] [--autonomous] [--dry-run] [--json]`,
          flags: {
            runtime: { type: "string", description: "the execution runtime (claude or codex); a lent run keeps its recorded choice" },
            dryRun: { type: "boolean", description: "report the phase directive without starting an agent session" },
            run: { type: "string", description: "the lent run id: mint and settle nothing, heartbeat this record, and take stdin's end as the stop (a loop's child drive)" },
            fix: { type: "string", description: "a JSON file holding the fix transport; honoured by continue only" },
            answer: { type: "string", description: "an answered ask file: resume the lent run's own session with the answer typed as its first input" },
            thinking: { type: "string", description: "the effort this session thinks at (low, medium, high, xhigh, max; extra-high is xhigh), over the phase's configured effort" },
            model: { type: "string", description: "the model this session runs on, over the phase's configured session model" },
            autonomous: { type: "boolean", description: "refine only: break the item down and author every contract in this one session (/aof:refine --autonomous)" },
            halt: { type: "string", description: "repair only: the hand-over file the loop wrote for the halt (loop-repairs/<runId>.json under the aof home), typed to the session as /aof:repair <ref> <file>" },
          },
        },
        argv: (positionals, options) => ({
          ref: positionals[0],
          ...(typeof options.runtime === "string" ? { runtime: options.runtime } : {}),
          ...(options.dryRun === true ? { dryRun: true } : {}),
          ...(typeof options.run === "string" ? { run: options.run } : {}),
          ...(typeof options.fix === "string" ? { fix: options.fix } : {}),
          ...(typeof options.answer === "string" ? { answer: options.answer } : {}),
          ...(typeof options.thinking === "string" ? { thinking: options.thinking } : {}),
          ...(typeof options.model === "string" ? { model: options.model } : {}),
          ...(options.autonomous === true ? { autonomous: true } : {}),
          ...(typeof options.halt === "string" ? { halt: options.halt } : {}),
        }),
        render(result) {
          if (result.outcome == null) {
            const model = result.model == null ? "the default model" : `${result.model.id} (${result.model.source})`;
            return `${result.ref} — drive ${result.phase}: ${result.command} on ${model} at effort ${result.effort.level} (${result.effort.source}; dry run, no session started).`;
          }
          const session = result.sessionId == null ? "no session id" : `session ${result.sessionId}`;
          const failure = result.failureReason == null ? "" : ` (${result.failureReason})`;
          return `${result.ref} — drive ${result.phase}: ${result.outcome}${failure}, ${session}.`;
        },
        json: (result) => result,
      },
    };
  }

  const refineDriverCommand = createPhaseDriverCommand("refine");
  const continueDriverCommand = createPhaseDriverCommand("continue");
  const verifyDriverCommand = createPhaseDriverCommand("verify");
  const repairDriverCommand = createPhaseDriverCommand("repair");
  const reviewDriverCommand = createPhaseDriverCommand("review");

  return Object.freeze({
    driveNativePhase: driveNative,
    PHASE_MODE_FLAGS,
    composeFixInput,
    continueDriverCommand,
    createPhaseDriverCommand,
    phaseCommand,
    refineDriverCommand,
    repairDriverCommand,
    reviewDriverCommand,
    resolvePhaseResumeTarget,
    verifyDriverCommand
  });
}
