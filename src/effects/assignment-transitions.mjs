// src/effects/assignment-transitions.mjs — the assignment store's TRANSITION seam
// (m42 wave (d) leg d3; PRD-command-spine-effects-ledger: "the apply-seam guards
// (holder, terminal-never-regresses) move inside the shared transition so ALL
// writers inherit them").
//
// THE DEFECT THIS CLOSES. `updateAssignmentState` (assignment-record.mjs) is
// guard-free by design — "its callers own the transition rules". There are three
// callers, and exactly ONE of them owned any rules: the control stream's
// `applyAssignmentStatusFrame`, which grew the T6 holder check and the
// terminal-never-regresses invariant because worker frames come through it. The
// withdraw verb re-derived a WEAKER version of the same rule inline; the reclaim
// tick has none at all. That is m42's own disease at the cascade layer: the rule
// lives at whichever call site needed it first, and the next writer inherits
// nothing. Here the rules live ONCE, in front of the write, and no writer can
// reach the fact without them.
//
// The guards, in order (each a CODED refusal returned, never thrown — the apply
// seam's established vocabulary, kept verbatim so its pinned refusals are
// byte-unchanged):
//   1. unknown row            -> assignment-status-unknown-assignment
//   2. holder (frames only)   -> assignment-status-not-holder
//      A frame writer passes `byNode` (the CONNECTION's authenticated nodeId,
//      never a self-reported frame.nodeId); the row's target_node_id must equal
//      it. Control-side writers (withdraw, reclaim) pass none — control is the
//      ISSUER, not the holder, and refusing it would be a category error.
//   3. terminal never regresses -> assignment-status-already-terminal
//      With ONE sanctioned exception, deliberately narrow:
//        (a) the m42 terminal-resume revival: exactly failed->running, exactly
//            `code: "resumed"`, still holder-only. A stale startup-reclaim
//            broadcast carries no resume code and stays refused; done/withdrawn/
//            reclaimed stay terminal (done means done; a withdrawal was the
//            operator's own decision).
//      There is deliberately NO "same state is idempotent" exception: a
//      duplicate `failed` frame against an already-failed row is refused exactly
//      as it was before (pinned by the status-uplink Scenario Outline), because
//      at the frame door a repeat is indistinguishable from a stale broadcast.
//      The withdraw verb's "re-withdrawing is a no-op-shaped success" contract is
//      answered where it belongs — in the verb, which reads the settled row and
//      returns it without asking for a write at all.
//
// Then the FACT is written and the EVENT appended (write-then-append, the
// run-transitions.mjs discipline), with the event's local-locus steps drained
// synchronously so the cascade keeps its before-return behaviour. The control
// tick's sweep pays anything a crash left pending.
import { updateAssignmentState, isActiveAssignmentState } from "../assignment-record.mjs";
import { applicableReactors } from "./table.mjs";
import { openEffectsJournal, appendEvent, hasEventId, latestAppliedAssignmentParkEventId } from "./journal.mjs";
import { drainEffects, runEffectsEphemeral, CONTROL_LOCI, LOCAL_LOCI } from "./dispatch.mjs";
import { drainOutbox } from "./outbox.mjs";
import { reportDegrade } from "../degrade.mjs";

export const ASSIGNMENT_UNKNOWN = "assignment-status-unknown-assignment";
export const ASSIGNMENT_NOT_HOLDER = "assignment-status-not-holder";
export const ASSIGNMENT_ALREADY_TERMINAL = "assignment-status-already-terminal";

// The one place the two invariants are decided. Exported for the fitness function
// (which asserts the apply seam no longer decides them itself) and for readers:
// this function is the whole rule, and it is pure.
export function guardAssignmentTransition(existing, state, { byNode = null, code = null } = {}) {
  if (!existing) return { ok: false, code: ASSIGNMENT_UNKNOWN };
  if (byNode != null && existing.target_node_id !== byNode) {
    return { ok: false, code: ASSIGNMENT_NOT_HOLDER };
  }
  if (!isActiveAssignmentState(existing.state)) {
    const resumedRevival = existing.state === "failed" && state === "running" && code === "resumed";
    if (!resumedRevival) {
      return { ok: false, code: ASSIGNMENT_ALREADY_TERMINAL, workspaceId: existing.workspace_id };
    }
  }
  return { ok: true };
}

// reportAssignmentSettled({ assignmentId, state, … }, opts) — the WORKER's half of
// the bridge (m42 wave (d) leg d3). A worker cannot write the control node's
// store, so it raises the FACT into its own journal and lets the outbox carry it:
//
//   append `assignment.reported` -> its one step is control-store locus, which a
//   worker cannot reach -> the step stays PENDING -> drainOutbox ships it on the
//   already-open stream -> control applies it through the same transition seam
//   and ACKs -> the step is paid.
//
// Latency is unchanged in the normal case (the drain runs right here, so a
// connected worker delivers within the same call). What changes is the ABNORMAL
// case, which is the whole point: a disconnected worker keeps the fact and
// redelivers it, where before the frame simply died on the socket and the control
// row read a stale `running` until a staleness reclaim eventually noticed.
//
//   opts.sendEffectStep — the transport (worker-stream-client's sendEffectStep).
//                         Absent ⇒ the fact is enqueued and the next drain ships
//                         it; nothing is lost either way.
//   opts.fallbackSend    — the pre-ledger emitter (sendAssignmentStatus), used
//                         ONLY when the journal itself cannot be opened, so
//                         behaviour never gates on the ledger's health (the d2
//                         rule).
export async function reportAssignmentSettled(report = {}, opts = {}) {
  const { assignmentId, state, runId = null, sessionId = null, branch = null, code = null, now } = report;
  const { journalOptions = {}, sendEffectStep = null, fallbackSend = null } = opts;
  const payload = { assignmentId, state, runId, sessionId, branch, code };
  // Append-time applicability (m42 wave (d) leg d4, port 4): the uniform seam
  // rule, a pass-through while this event's reactors declare no predicate.
  const reactors = await applicableReactors("assignment.reported", payload);

  let journal = null;
  try {
    journal = await openEffectsJournal(journalOptions);
  } catch (error) {
    reportDegrade("effects-journal-open", error);
  }

  if (!journal) {
    // No durable floor available — report the old way rather than not at all.
    if (fallbackSend) await fallbackSend(assignmentId, state, { runId, sessionId, branch, code });
    return { eventId: null, durable: false, delivered: [] };
  }

  try {
    const { eventId } = appendEvent(journal, { name: "assignment.reported", payload, source: "assignment-report", now }, reactors);
    // Scoped to THIS event: the report's own drain is the immediate delivery, so
    // a connected worker's latency is unchanged. REDELIVERY of anything still
    // owed is the periodic tick's job (mesh-launcher's stream tick), which is the
    // right place for it — a report should not re-ship an unrelated backlog as a
    // side effect of being raised.
    const delivered = sendEffectStep
      ? await drainOutbox({ journal, send: sendEffectStep, loci: LOCAL_LOCI, now, eventId })
      : [];
    return { eventId, durable: true, delivered };
  } finally {
    journal.close();
  }
}

// A pre-spawn resume refusal is a capacity-moving CONTROL fact, not a successful
// socket write. Keep the correlated CAS restoration in the same durable
// worker->control outbox used by assignment.reported: delivery leaves the step
// pending, and only the control reactor's effect-ack pays it. The legacy refusal
// frame is retained solely as the journal-unavailable degrade path; its transport
// result is never mistaken for a durable receipt.
function terminalResumeRefusalEventId({ parkId, reservedAt, targetNodeId, previousNodeId } = {}) {
  if (!parkId || !reservedAt || !targetNodeId || !previousNodeId) return null;
  return `terminal-resume-refused:${parkId}:${reservedAt}:${targetNodeId}:${previousNodeId}`;
}

export async function reportTerminalResumeRefused(refusal = {}, opts = {}) {
  const { parkId = null, assignmentId, reservedAt, targetNodeId, previousNodeId, code, now } = refusal;
  const { journalOptions = {}, sendEffectStep = null, fallbackSend = null } = opts;
  const payload = { parkId, assignmentId, reservedAt, targetNodeId, previousNodeId, code };
  const reactors = await applicableReactors("terminal.resume-refused", payload);

  let journal = null;
  try {
    journal = await openEffectsJournal(journalOptions);
  } catch (error) {
    reportDegrade("effects-journal-open", error);
  }

  if (!journal) {
    const delivery = fallbackSend ? await fallbackSend(payload) : null;
    return { eventId: null, durable: false, delivered: [], delivery };
  }

  try {
    let eventId;
    try {
      const refusalEventId = terminalResumeRefusalEventId(payload);
      ({ eventId } = appendEvent(
        journal,
        {
          ...(refusalEventId ? { eventId: refusalEventId } : {}),
          name: "terminal.resume-refused",
          payload,
          source: "terminal-resume",
          now,
        },
        reactors,
      ));
    } catch (error) {
      // Opening the ledger is not enough: a transaction/conflict/disk fault at
      // append means no durable obligation exists. Preserve the old correlated
      // lane as the degrade path rather than losing both transports.
      reportDegrade("effects-journal-append", error);
      const delivery = fallbackSend ? await fallbackSend(payload) : null;
      return { eventId: null, durable: false, delivered: [], delivery };
    }
    const delivered = sendEffectStep
      ? await drainOutbox({ journal, send: sendEffectStep, loci: LOCAL_LOCI, now, eventId })
      : [];
    return { eventId, durable: true, delivered };
  } finally {
    journal.close();
  }
}

// A resume is keyed by the park event it clears. The in-flight fact is deliberately
// recoverable: its presence does not reject a redelivery after a daemon crash. Only
// the completion fact suppresses a duplicate after the handler settled. The older
// one-fact implementation wrote `terminal-resume:<park>` at claim time. That legacy
// marker suppresses an old delivery once a newer park exists, but the current park
// remains recoverable — which repairs rows stranded by the old claim-before-spawn gap.
export async function claimAssignmentParkResume({
  parkId,
  assignmentId,
  sessionId,
  runId,
  reservedAt = null,
  targetNodeId = null,
  previousNodeId = null,
  now,
} = {}, { journalOptions = {} } = {}) {
  if (!parkId || !assignmentId || !runId) return { claimed: true, durable: false };
  const journal = await openEffectsJournal(journalOptions);
  try {
    const completedEventId = `terminal-resume-completed:${parkId}`;
    if (hasEventId(journal, completedEventId)) {
      return { claimed: false, durable: true, eventId: completedEventId };
    }
    // A refusal is terminal for the answer/reservation identity even while its
    // restoration is awaiting transport or ACK. Otherwise a daemon restart can
    // forget its live Set, recover the old in-flight claim, and spawn from a
    // delayed copy after control has already released capacity.
    const refusedEventId = terminalResumeRefusalEventId({ parkId, reservedAt, targetNodeId, previousNodeId });
    if (refusedEventId != null && hasEventId(journal, refusedEventId)) {
      return { claimed: false, durable: true, eventId: refusedEventId, refused: true };
    }
    const legacyEventId = `terminal-resume:${parkId}`;
    if (hasEventId(journal, legacyEventId)) {
      const latestParkId = latestAppliedAssignmentParkEventId(journal, assignmentId, { runId, sessionId });
      if (latestParkId != null && latestParkId !== parkId) {
        return { claimed: false, durable: true, eventId: legacyEventId, legacy: true };
      }
    }
    const event = appendEvent(journal, {
      eventId: `terminal-resume-inflight:${parkId}`,
      name: "terminal.resume-inflight",
      payload: { parkId, assignmentId, sessionId, runId },
      source: "terminal-resume",
      now,
    }, []);
    return { claimed: true, recovered: event.appended === false, durable: true, eventId: event.eventId };
  } finally {
    journal.close();
  }
}

export async function completeAssignmentParkResume({ parkId, assignmentId, sessionId, runId, now } = {}, { journalOptions = {} } = {}) {
  if (!parkId || !assignmentId || !runId) return { completed: true, durable: false };
  const journal = await openEffectsJournal(journalOptions);
  try {
    const event = appendEvent(journal, {
      eventId: `terminal-resume-completed:${parkId}`,
      name: "terminal.resume-completed",
      payload: { parkId, assignmentId, sessionId, runId },
      source: "terminal-resume",
      now,
    }, []);
    return { completed: true, appended: event.appended, durable: true, eventId: event.eventId };
  } finally {
    journal.close();
  }
}

// transitionAssignmentState(store, assignmentId, state, edge, opts)
//
//   edge — { byNode?, now?, runId?, sessionId?, code?, reclaimedAt?, branch? }
//          runId/sessionId/reclaimedAt keep updateAssignmentState's
//          absent-is-not-a-clear discipline; `code` is verbatim-per-frame (null
//          clears) at the frame door, and omitted-preserves for direct callers,
//          exactly as before.
//   opts — { journalOptions, drain = true, loci, raiseEvent = true }
//
// Returns the apply seam's own result shape so its callers are unchanged:
//   { applied, assignment, skipped?, code?, workspaceId?, eventId?, effects? }
export async function transitionAssignmentState(store, assignmentId, state, edge = {}, opts = {}) {
  const { byNode = null, now, runId, sessionId, code, reclaimedAt, branch = null } = edge;
  const { journalOptions = {}, drain = true, loci = CONTROL_LOCI, raiseEvent = true } = opts;

  const existing = store.db.prepare("SELECT * FROM global_assignments WHERE assignment_id = ?").get(assignmentId);
  const verdict = guardAssignmentTransition(existing, state, { byNode, code });
  if (!verdict.ok) {
    return {
      applied: false,
      skipped: true,
      code: verdict.code,
      ...(verdict.workspaceId ? { workspaceId: verdict.workspaceId } : {}),
    };
  }
  // (1) THE FACT — the store's own writer, guards now in front of it rather than
  // scattered behind it.
  const updated = updateAssignmentState(store, assignmentId, state, { now, runId, sessionId, code, reclaimedAt });
  if (updated == null) return { applied: false, skipped: true, code: ASSIGNMENT_UNKNOWN };
  if (!raiseEvent) return { applied: true, assignment: updated };

  // (2) THE EVENT — past tense, carrying its own evidence. `branch` rides the
  // payload because the done-frame reports it and the reactor must not re-read
  // racing state to find it.
  const payload = {
    assignmentId,
    workspaceId: updated.workspaceId,
    itemRef: updated.itemRef,
    state,
    previousState: existing.state,
    targetNodeId: updated.targetNodeId,
    runId: updated.runId ?? null,
    sessionId: updated.sessionId ?? null,
    branch: typeof branch === "string" && branch.length > 0 ? branch : null,
  };
  // The reactor context: this process already holds the open store and the edge's
  // clock, so a control-store reactor need not re-open either. A reactor still
  // works without it (crash-recovery drains supply neither).
  const reactorCtx = { store, now };
  const reactors = await applicableReactors("assignment.settled", payload, reactorCtx);

  let journal = null;
  try {
    journal = await openEffectsJournal(journalOptions);
  } catch (error) {
    // The ledger's own health never gates the cascade (the d2 rule).
    reportDegrade("effects-journal-open", error);
  }

  if (!journal) {
    const effects = drain ? await runEffectsEphemeral("assignment.settled", payload, { reactors, loci, ctx: reactorCtx }) : [];
    return { applied: true, assignment: updated, eventId: null, effects };
  }

  try {
    const { eventId } = appendEvent(journal, { name: "assignment.settled", payload, source: "assignment-transition", now }, reactors);
    const effects = drain ? await drainEffects({ journal, eventId, loci, now, ctx: reactorCtx }) : [];
    return { applied: true, assignment: updated, eventId, effects };
  } finally {
    journal.close();
  }
}
