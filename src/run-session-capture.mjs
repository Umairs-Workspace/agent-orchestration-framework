// src/run-session-capture.mjs — the ONE implementation of "persist the captured session
// id onto its run record, without racing the settle" (68/ADR-005 §1).
//
// WHY THIS IS A MODULE AND NOT A COPY IN EACH CALLER. The driver emits a session id
// mid-run; the CALLER writes it onto the run record, because only the caller knows which
// run it minted. There are two production callers — the local drive command and the mesh
// worker — and both need the identical shape, which is subtler than it looks:
//
//   F-04 (blocker, `68/VERIFICATION.md`): the write must be AWAITED inside the handler.
//   `recordSessionId` is a whole-record read-modify-write, so a fire-and-forget promise
//   that lands after `completeRun` rewrites the record from its pre-settle snapshot —
//   `state` back to `running`, the spend envelope 68/02 stamped back to `null` — and the
//   duplicate-run guard then refuses every later run on that item. The driver awaits this
//   handler (`agent-session-driver.mjs:833`, inside the watch chain `finish` awaits at
//   `:887`), so awaiting here is what makes the id land before the settle.
//
//   …and it must be `allSettled`, not `all`: the caller's own hook (the worker's assignment
//   status up-channel) must not short-circuit the persist. `Promise.all` rejects eagerly on
//   a failing hook and leaves the attribution write racing the settle again. Neither write
//   is conditional on the other; the hook's result — rejected or not — is returned verbatim
//   so the driver's guarded await treats a broken up-channel exactly as it always has.
//
// The worker had this right and the drive command was written without it (F-04), then
// hand-ported to match. F-09's repair made that duplication load-bearing twice over, so it
// lives here once.
import { recordSessionId } from "./run-store.mjs";
import { reportDegrade } from "./degrade.mjs";

// captureSessionIdOnRecord({ item, runId, source, onCaptured }) → an onSessionIdCaptured
// handler. `onCaptured` is the caller's own per-site hook (may be absent); `source` names
// the caller in any degrade report. A store fault degrades and never kills the run.
export function captureSessionIdOnRecord({ item, runId, source, onCaptured } = {}) {
  return async (sessionId) => {
    const persist =
      typeof sessionId === "string" && sessionId.length > 0 && runId
        ? recordSessionId(item, { runId, sessionId }).catch((error) => reportDegrade(source, error))
        : Promise.resolve();
    const hookResult = typeof onCaptured === "function" ? onCaptured(sessionId) : undefined;
    await Promise.allSettled([persist, Promise.resolve(hookResult)]);
    return hookResult;
  };
}
