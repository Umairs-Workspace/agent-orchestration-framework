// Compatibility composition; @aof/execution owns run services.
import { createRunSessionCapture } from "@aof/execution/session-capture";
import { recordSessionId } from "./run-store.mjs";
import { reportDegrade } from "./degrade.mjs";

const implementation = createRunSessionCapture({
  recordSessionId, reportDegrade,
});

export const captureSessionIdOnRecord = implementation.captureSessionIdOnRecord;
