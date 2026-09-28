// Compatibility composition; @aof/execution owns run services.
import { createRunHeartbeats } from "@aof/execution/heartbeats";
import { reportDegrade } from "./degrade.mjs";
import { heartbeat, readRuns, runsDir } from "./run-store.mjs";

const implementation = createRunHeartbeats({
  reportDegrade, heartbeat, readRuns, runsDir,
});

export const consumeHeartbeatQueue = implementation.consumeHeartbeatQueue;
export const enqueueHeartbeat = implementation.enqueueHeartbeat;
export const readConsumedHeartbeatAt = implementation.readConsumedHeartbeatAt;
