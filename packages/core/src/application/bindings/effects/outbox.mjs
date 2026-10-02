// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createEffectsOutbox } from "@aof/effects/outbox";
import * as api0 from "@aof/mesh/effect-frames";

export function assembleEffectsOutbox({ effectsJournalServices, effectsDispatchServices, degradeServices }) {
  // src/effects/outbox.mjs — the DURABLE OUTBOX for remote-locus effect steps
  // (m42 wave (d) leg d3; PRD-command-spine-effects-ledger: "facts over the bridge").
  //
  // THE MEASURED DEFECT. Worker->control facts were fire-once frames. STATE
  // 2026-07-27, verbatim: "Worker startup-reclaim frames are fire-once — the Mac
  // worker restarted in the ~3-min window while the control was ALSO down; its
  // `failed/daemon-restarted` report for run 0017's stranded worktree died on the
  // dead connection, and the control row read a stale `running` for 35+ min". A
  // fact that only exists while a socket happens to be open is not a fact, it is a
  // hope. This module makes worker->control facts survive the connection.
  //
  // HOW IT WORKS — no second queue. A step whose locus this process cannot reach is
  // ALREADY a durable row in the journal (`effect_steps`, status `pending`); the
  // dispatcher leaves it alone (`deferred`). The outbox is the delivery half of
  // that same row:
  //
  //   1. drainOutbox() reads the pending steps whose locus is remote and hands each
  //      to the injected `send` — in production, one `effect-step` up-frame on the
  //      worker's already-open stream.
  //   2. Delivery is NOT completion. The step stays `pending` until the control
  //      node ACKs it by (eventId, reactorKey) — the durable receipt. So a frame
  //      lost in flight, or a control that died mid-apply, simply redelivers on the
  //      next drain. AT-LEAST-ONCE by construction, which is exactly the contract
  //      every reactor already promises (idempotent or event-id-deduped).
  //   3. A failed SEND is not an attempt. Being offline is the normal case, not a
  //      fault, so it never burns the attempts budget — otherwise a worker that
  //      restarts while control is down would exhaust its retries against nobody
  //      and silently drop the fact, recreating the very defect.
  //   4. An ACK carrying a coded refusal ends the step: `skipped`, with the code
  //      recorded. Redelivering a fact the control node has REFUSED (an unknown
  //      assignment, a row another writer already settled) would loop forever.

  const { pendingSteps } = effectsJournalServices;
  const { markStep } = effectsJournalServices;
  const { readStep } = effectsJournalServices;
  const { LOCAL_LOCI } = effectsDispatchServices;
  const { reportDegrade } = degradeServices;

  // The frame kind the outbox speaks. One home for the literal (the
  // WORKTREE_CONTENT_FRAME_KIND discipline): the worker's client builds it, the
  // control server branches on it, and neither re-spells it.

  // Integration writes stay on the checkout holding their configuration and credentials.
  // The package only knows the eligibility rule supplied here.
  const outbox = createEffectsOutbox({
    pendingSteps, markStep, reportDegrade, loci: LOCAL_LOCI,
    isRemoteStep: (step, loci) => !loci.includes(step.locus) && !String(step.locus).startsWith("integration:"),
    readStep,
  });

  function remoteSteps(journal, options) {
    return outbox.remoteSteps(journal, options);
  }

  async function drainOutbox(options) {
    return await outbox.drainOutbox(options);
  }

  function applyEffectAck(journal, ack, options) {
    return outbox.applyEffectAck(journal, ack, options);
  }

  return { "EFFECT_STEP_FRAME_KIND": api0.EFFECT_STEP_FRAME_KIND, "EFFECT_ACK_FRAME_KIND": api0.EFFECT_ACK_FRAME_KIND, remoteSteps, drainOutbox, applyEffectAck };
}
