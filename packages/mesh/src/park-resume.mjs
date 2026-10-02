


// Core supplies configured services and deferred application loaders. Construction is inert.
export function createMeshParkResumeServices({ answerRunAsk, heartbeat, openRunAsk, readAskQuestion, claimAssignmentParkResume, completeAssignmentParkResume, reportAssignmentSettled, reportTerminalResumeRefused, transitionRunComplete, reportDegrade, loadPresence, loadWork, loadNotifications }) {
// The parked-run resume protocol's worker-side orchestration. This lives beside
// the assignment effect seam rather than growing mesh-worker-execution's already
// guarded sink: one durable park identity claims one resume, the first real PTY
// advances the existing run's liveness, and a provable pre-spawn failure restores
// the exact control reservation through its correlated negative acknowledgement.
// When the resume carries the operator's answer (131/04), the same first PTY appends it to the
// run's `asks` already answered, so a worker's record says who answered and when as a local one does.
// A needs-input park carries the session's QUESTION to the control as the park fact's `ask` (131/12,
// ADR-010): `readWorkerAsk` reads it here, and `announceWorkerAsk` is the control's one post of it.

function createMeshParkResume({
  assignmentId,
  sessionId,
  parkId,
  answer = null,
  reservation,
  globalWorkStoreOptions,
  sendAssignmentStatus,
  sendTerminalResumeRefusal,
  sendEffectStep,
  now,
  log,
} = {}) {
  const journalOptions = { env: globalWorkStoreOptions?.env };
  let processStarted = false;
  let livenessWrite = null;

  const report = (state, extras = {}) => reportAssignmentSettled(
    { assignmentId, state, ...extras, now: now() },
    { journalOptions, sendEffectStep, fallbackSend: sendAssignmentStatus },
  );

  async function claim(runRecord) {
    if (typeof parkId !== "string" || parkId.length === 0) {
      log("warn", `session ${sessionId}: resume frame has no durable park identity; using only the live in-flight guard`);
      return true;
    }
    const result = await claimAssignmentParkResume(
      {
        parkId,
        assignmentId,
        sessionId,
        runId: runRecord.runId,
        reservedAt: reservation?.reservedAt ?? null,
        targetNodeId: reservation?.targetNodeId ?? null,
        previousNodeId: reservation?.previousNodeId ?? null,
        now: now(),
      },
      { journalOptions },
    );
    return result.claimed;
  }

  async function complete(runRecord) {
    if (typeof parkId !== "string" || parkId.length === 0 || runRecord == null) return false;
    try {
      await completeAssignmentParkResume(
        { parkId, assignmentId, sessionId, runId: runRecord.runId, now: now() },
        { journalOptions },
      );
      return true;
    } catch (error) {
      // An unpaid completion remains recoverable: redelivery may run again, which
      // is safer than permanently suppressing a park whose process is gone.
      reportDegrade("terminal-resume-completion", error);
      return false;
    }
  }

  // The answer's entry: opened at the instant the worker parked, else now, and answered at once.
  // Every entry on a worker's record is appended already answered, so `openRunAsk` meets an open
  // one only when something else wrote it; then nothing is stamped on an entry this worker did not
  // open. A failed write is one degrade and never fails the session. The text is never logged.
  async function recordAnswer(item, runRecord) {
    if (answer == null || typeof answer.text !== "string") return;
    const askedAt = typeof answer.askedAt === "string" && Number.isFinite(Date.parse(answer.askedAt)) ? answer.askedAt : null;
    const by = answer.by != null && typeof answer.by === "object" && !Array.isArray(answer.by)
      ? answer.by
      : { actor: null, via: "mesh", node: null };
    try {
      await openRunAsk(item, runRecord.runId, { question: null, phase: null, now: askedAt ?? now() });
      await answerRunAsk(item, runRecord.runId, { answer: answer.text, by, now: now() });
    } catch (error) {
      reportDegrade("terminal-resume-ask-record", error);
    }
  }

  function markProcessStarted(item, runRecord) {
    if (processStarted) return;
    processStarted = true;
    // One chain: the heartbeat and the answer's entry both read-modify-write this record.
    livenessWrite = heartbeat(item, runRecord.runId, { now: now() }).catch((error) => {
      reportDegrade("terminal-resume-heartbeat", error);
      return null;
    }).then(() => recordAnswer(item, runRecord));
  }

  async function observeOutcome(outcome, item, runRecord) {
    if (outcome?.processStarted !== false) markProcessStarted(item, runRecord);
    await livenessWrite;
  }

  async function repark(runRecord, reason) {
    await report("running", { runId: runRecord.runId, sessionId, code: "needs-input" });
    log("warn", `session ${sessionId}: resume did not start a process (${reason}); assignment ${assignmentId} parked again`);
  }

  async function refuse(runRecord, code, reason) {
    const correlated = typeof reservation?.reservedAt === "string"
      && typeof reservation?.targetNodeId === "string"
      && typeof reservation?.previousNodeId === "string";
    if (correlated) {
      try {
        const result = await reportTerminalResumeRefused(
          {
            parkId,
            assignmentId,
            reservedAt: reservation.reservedAt,
            targetNodeId: reservation.targetNodeId,
            previousNodeId: reservation.previousNodeId,
            code,
            now: now(),
          },
          { journalOptions, sendEffectStep, fallbackSend: sendTerminalResumeRefusal },
        );
        const sent = result.delivered?.some((entry) => entry.status === "sent") === true;
        log(
          "warn",
          `session ${sessionId}: resume refused before process start (${reason}); assignment ${assignmentId}'s correlated reservation restoration ${result.durable ? (sent ? "was delivered and awaits control acknowledgment" : "is durably owed for retry") : "could not be recorded durably"}`,
        );
        return result.durable;
      } catch (error) {
        reportDegrade("terminal-resume-refusal", error);
      }
      // Never publish the generic park for a correlated reservation: it cannot
      // restore an operator-overridden target. Leaving `resumed` counted is safer
      // than releasing capacity with an incomplete restoration.
      return false;
    }
    // Compatibility for direct/legacy callers that predate reservation transport.
    if (runRecord != null) await repark(runRecord, reason);
    return false;
  }

  // `worktreePath` is where the resumed session ran, so a re-ask's question is read from its own
  // transcripts (131/ADR-010 §2). A resume carries no directive, so the phase is unknown.
  async function settleOutcome(item, runRecord, outcome, forkedSessionId, worktreePath = null) {
    if (outcome.outcome === "failed" && outcome.processStarted === false) {
      await refuse(runRecord, "terminal-resume-spawn-refused", outcome.failureReason ?? "launch failed");
      return;
    }
    if (outcome.outcome === "needs-input") {
      const ask = worktreePath == null ? null : await readWorkerAsk({ worktreePath, sessionId: forkedSessionId, now });
      await report("running", { runId: runRecord.runId, sessionId: forkedSessionId, code: "needs-input", ...(ask == null ? {} : { ask }) });
      await complete(runRecord);
      log("info", `session ${sessionId}: resumed session parked needs-input (run ${runRecord.runId} stays running; resume it again to continue)`);
      return;
    }
    const settledOutcome = outcome.outcome === "done" ? "done" : "failed";
    try {
      await transitionRunComplete(item, { runId: runRecord.runId, outcome: settledOutcome, now: now() }, { journalOptions });
    } catch (error) {
      reportDegrade("mesh-worker-execution", error);
      log("warn", `session ${sessionId}: run ${runRecord.runId} could not durably settle ${settledOutcome}; assignment left non-terminal because the run and assignment must agree`);
      return;
    }
    await report(settledOutcome, {
      runId: runRecord.runId,
      sessionId: forkedSessionId,
      ...(settledOutcome === "failed" && outcome.failureReason ? { code: outcome.failureReason } : {}),
    });
    await complete(runRecord);
    log("info", `session ${sessionId}: resumed run ${runRecord.runId} settled ${settledOutcome} — worktree retained (push home via aof mesh recover-push if it produced commits)`);
  }

  async function handleFault(error, item, runRecord) {
    log("warn", `session ${sessionId}: resume failed: ${String(error?.message ?? error)}`);
    if (!processStarted) {
      try {
        await refuse(runRecord, "terminal-resume-pre-spawn-failed", error?.code ?? error?.message ?? "launch threw");
      } catch (statusError) { reportDegrade("mesh-worker-execution", statusError); }
      return;
    }
    if (runRecord == null || item == null) return;
    try {
      await transitionRunComplete(item, { runId: runRecord.runId, outcome: "failed", now: now() }, { journalOptions });
    } catch (settleError) {
      reportDegrade("mesh-worker-execution", settleError);
      log("warn", `session ${sessionId}: run ${runRecord.runId} also failed to settle after the resume fault; no terminal assignment report was emitted`);
      return;
    }
    try {
      await report("failed", { runId: runRecord.runId, code: "terminal-resume-failed" });
      await complete(runRecord);
    }
    catch (statusError) { reportDegrade("mesh-worker-execution", statusError); }
  }

  return {
    claim,
    complete,
    refuse,
    markProcessStarted,
    observeOutcome,
    repark,
    report,
    settleOutcome,
    handleFault,
    get processStarted() { return processStarted; },
  };
}

// ── a worker's ask (131/12, ADR-010) ─────────────────────────────────────────────────────────────

// DEFAULT DECISION (ADR-010 §2): the answer's own cap — and a phone sees 2,000 anyway.
const WORKER_ASK_MAX_CODE_POINTS = 8_000;
const ASK_PHASES = Object.freeze(["refine", "build", "verify"]);

// directivePhase(command) → ADR-004 §6's word for the drive a directive types: `refine`, `verify`,
// or `build` for a continue; `null` for a command that names none of them.
function directivePhase(command) {
  if (typeof command !== "string") return null;
  if (command.includes("/aof:refine")) return "refine";
  if (command.includes("/aof:verify")) return "verify";
  if (command.includes("/aof:continue")) return "build";
  return null;
}

// readWorkerAsk({ worktreePath, sessionId, phase, now, env }) → `{ question, phase, askedAt }`, the
// `ask` a needs-input park carries to the control (ADR-010 §1-§2). The question is read by the ONE
// reader (`readAskQuestion`, ADR-002) over the worker's own transcripts, whose directory is the
// worktree the session ran in, and clipped to 8,000 code points with `…`. An unreadable transcript
// is `question: null` (the reader's own degrade) and never a throw, so a park is never delayed by a
// failed read.
async function readWorkerAsk({ worktreePath, sessionId, phase = null, now = () => new Date(), env } = {}) {
  const read = await readAskQuestion({ cwd: worktreePath, sessionId, ...(env ? { env } : {}) });
  const points = typeof read === "string" ? [...read] : null;
  const question = points == null ? null
    : points.length > WORKER_ASK_MAX_CODE_POINTS ? `${points.slice(0, WORKER_ASK_MAX_CODE_POINTS).join("")}…` : read;
  return { question, phase: ASK_PHASES.includes(phase) ? phase : null, askedAt: new Date(now()).toISOString() };
}

// announceWorkerAsk(row, ask, ctx) — the CONTROL's post of a worker's ask (ADR-010 §4), called by the
// `settle-assignment` reactor only on the edge into `needs-input`. It resolves this node's checkout of
// the row's workspace, builds `session-needs-input` with `node` = the WORKER that asked, and awaits
// `notify` there — so the notifier's index records the checkout's root and a Discord reply answers
// through `work:answer`'s mesh leg. With no checkout nothing is posted and one
// `worker-ask-unannounced` names the workspace. It never throws.
async function announceWorkerAsk(row, ask, ctx = {}) {
  try {
    const [{ resolveWorkspaceProjectRoot }, { loadWorkspace }, { buildNotifyEnvelope, notify }] = await Promise.all([
      loadPresence(),
      loadWork(),
      loadNotifications(),
    ]);
    const projectRoot = await resolveWorkspaceProjectRoot(row.workspaceId, { globalWorkStoreOptions: ctx.globalWorkStoreOptions ?? {} });
    if (projectRoot == null) {
      reportDegrade("worker-ask-unannounced", new Error(`workspace ${row.workspaceId} has no checkout on this node, so ${row.itemRef}'s question from ${row.targetNodeId} was not posted`));
      return false;
    }
    const workspace = await loadWorkspace(projectRoot);
    const nowDate = ctx.now == null ? new Date() : new Date(ctx.now);
    const askedMs = Date.parse(ask?.askedAt ?? "");
    const envelope = buildNotifyEnvelope(
      "session-needs-input",
      {
        ref: row.itemRef,
        node: row.targetNodeId,
        phase: ask?.phase ?? null,
        elapsedMs: Number.isFinite(askedMs) ? Math.max(0, nowDate.getTime() - askedMs) : null,
        question: ask?.question ?? null,
      },
      { config: workspace.config, now: () => nowDate },
    );
    await notify(workspace, envelope, { ...(ctx.notifyOptions ?? {}) });
    return true;
  } catch (error) {
    reportDegrade("worker-ask-unannounced", new Error(`${row?.itemRef ?? "a worker"}'s question could not be posted (${error instanceof Error ? error.name : "error"})`));
    return false;
  }
}

return { createMeshParkResume, directivePhase, readWorkerAsk, announceWorkerAsk };
}
