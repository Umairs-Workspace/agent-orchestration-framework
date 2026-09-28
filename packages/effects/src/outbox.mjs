// At-least-once delivery and durable acknowledgement over supplied journal operations.
export function createEffectsOutbox({ pendingSteps, markStep, readStep, reportDegrade, loci: defaultLoci, isRemoteStep } = {}) {
  for (const [name, port] of Object.entries({ pendingSteps, markStep, readStep, reportDegrade, isRemoteStep })) {
    if (typeof port !== 'function') throw new TypeError(`Effects outbox requires ${name}.`);
  }
  if (!Array.isArray(defaultLoci)) throw new TypeError('Effects outbox requires default loci.');
  // The owner decides which pending steps this transport may deliver. That policy
  // can exclude steps requiring configuration or credentials held elsewhere.
  function remoteSteps(journal, { loci = defaultLoci, limit = 100, maxAttempts = 5, eventId = null } = {}) {
    return pendingSteps(journal, { limit, maxAttempts, eventId }).filter(
      (step) => isRemoteStep(step, loci),
    );
  }

  // drainOutbox({ journal, send, loci, now }) — deliver what is owed elsewhere.
  // `send(envelope)` returns the sendFrame shape ({ sent, code? }); anything falsy
  // leaves the step pending for the next drain. Returns one outcome per step:
  // { eventId, key, locus, status } with status sent|unsent.
  async function drainOutbox({ journal, send, loci = defaultLoci, limit = 100, now, eventId = null } = {}) {
    const steps = remoteSteps(journal, { loci, limit, eventId });
    const outcomes = [];
    for (const step of steps) {
      const envelope = {
        eventId: step.eventId,
        reactorKey: step.key,
        locus: step.locus,
        name: step.name,
        payload: step.payload,
        at: now ?? new Date().toISOString(),
      };
      let result;
      try {
        result = await send(envelope);
      } catch (error) {
        // A transport fault is a degrade, never a throw into the tick — and never
        // an attempt: the step is still owed, and the next drain will try again.
        reportDegrade("effect-outbox-send", error, { path: `${step.name}/${step.key}` });
        result = { sent: false, code: "send-threw" };
      }
      outcomes.push({
        eventId: step.eventId,
        key: step.key,
        locus: step.locus,
        status: result?.sent ? "sent" : "unsent",
        ...(result?.code ? { code: result.code } : {}),
      });
    }
    return outcomes;
  }

  // applyEffectAck(journal, { eventId, reactorKey, ok, code, error }, { now }) — the
  // DURABLE RECEIPT. Called by the worker's ack handler with the control node's
  // verdict for one (eventId, reactorKey):
  //   ok            -> done. The fact landed; the step is paid.
  //   coded refusal -> skipped, code recorded. The control node has DECIDED; a
  //                    redelivery would loop forever against the same verdict.
  //   retryable fault -> remains pending without consuming an attempt. Control
  //                      infrastructure can be unavailable indefinitely; a retry
  //                      budget would turn an outage into permanent fact loss.
  //   other fault   -> failed. Retryable while under the attempts ceiling.
  // Unknown ids are ignored (an ack for a step this journal never owed — a stale
  // reconnect echo, or another node's) rather than fabricating a row.
  function applyEffectAck(journal, { eventId, reactorKey, ok = false, code = null, error = null, retryable = false } = {}, { now } = {}) {
    if (!eventId || !reactorKey) return { applied: false, code: "effect-ack-invalid" };
    const owed = readStep(journal, eventId, reactorKey);
    if (!owed) return { applied: false, code: "effect-ack-unknown-step" };
    if (owed.status === "done" || owed.status === "skipped") {
      // A duplicate ack for a settled step: the at-least-once tax, paid silently.
      return { applied: false, code: "effect-ack-already-settled" };
    }
    if (ok) {
      markStep(journal, eventId, reactorKey, { status: "done", now });
      return { applied: true, status: "done" };
    }
    if (code) {
      markStep(journal, eventId, reactorKey, { status: "skipped", error: code, now });
      return { applied: true, status: "skipped", code };
    }
    if (retryable === true) {
      // A transport delivery occurred, but control could not durably receive/apply
      // it. The step was already pending and remains so; importantly, no call to
      // markStep means no attempts-budget increment.
      return { applied: true, status: "pending", retryable: true };
    }
    markStep(journal, eventId, reactorKey, { status: "failed", error: error ?? "effect-step-refused", now });
    return { applied: true, status: "failed" };
  }

  return Object.freeze({ remoteSteps, drainOutbox, applyEffectAck });
}
