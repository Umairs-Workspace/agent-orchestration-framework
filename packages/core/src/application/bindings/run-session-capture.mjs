// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createRunSessionCapture } from "@aof/execution/session-capture";

export function assembleRunSessionCapture({ runStoreServices, degradeServices }) {
  // Core composition; @aof/execution owns run services.

  const { recordSessionId } = runStoreServices;
  const { reportDegrade } = degradeServices;

  const implementation = createRunSessionCapture({
    recordSessionId, reportDegrade,
  });

  const captureSessionIdOnRecord = implementation.captureSessionIdOnRecord;

  return { captureSessionIdOnRecord };
}
