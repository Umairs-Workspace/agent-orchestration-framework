// The parked-run resume protocol's worker-side orchestration. This lives beside
// the assignment effect seam rather than growing mesh-worker-execution's already
// guarded sink: one durable park identity claims one resume, the first real PTY
// advances the existing run's liveness, and a provable pre-spawn failure restores
// the exact control reservation through its correlated negative acknowledgement.
// When the resume carries the operator's answer (131/04), the same first PTY appends it to the
// run's `asks` already answered, so a worker's record says who answered and when as a local one does.
import { answerRunAsk, heartbeat, openRunAsk } from "../run-store.mjs";
import {
  claimAssignmentParkResume,
  completeAssignmentParkResume,
  reportAssignmentSettled,
  reportTerminalResumeRefused,
} from "../effects/assignment-transitions.mjs";
import { transitionRunComplete } from "../effects/run-transitions.mjs";
import { reportDegrade } from "../degrade.mjs";

export function createMeshParkResume({
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

  async function settleOutcome(item, runRecord, outcome, forkedSessionId) {
    if (outcome.outcome === "failed" && outcome.processStarted === false) {
      await refuse(runRecord, "terminal-resume-spawn-refused", outcome.failureReason ?? "launch failed");
      return;
    }
    if (outcome.outcome === "needs-input") {
      await report("running", { runId: runRecord.runId, sessionId: forkedSessionId, code: "needs-input" });
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
