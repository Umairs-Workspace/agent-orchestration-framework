// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createRunHeartbeats } from "@aof/execution/heartbeats";

export function assembleRunHeartbeatConsumption({ degradeServices, runStoreServices }) {
  // Core composition; @aof/execution owns run services.

  const { reportDegrade } = degradeServices;
  const { heartbeat } = runStoreServices;
  const { readRuns } = runStoreServices;
  const { runsDir } = runStoreServices;

  const implementation = createRunHeartbeats({
    reportDegrade, heartbeat, readRuns, runsDir,
  });

  const consumeHeartbeatQueue = implementation.consumeHeartbeatQueue;
  const enqueueHeartbeat = implementation.enqueueHeartbeat;
  const readConsumedHeartbeatAt = implementation.readConsumedHeartbeatAt;

  return { consumeHeartbeatQueue, enqueueHeartbeat, readConsumedHeartbeatAt };
}
