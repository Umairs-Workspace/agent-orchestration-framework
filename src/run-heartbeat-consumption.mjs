// Compatibility entry; construction belongs to core application assembly.
import { runHeartbeatConsumption } from "./application/default.mjs";
export const {
  consumeHeartbeatQueue,
  enqueueHeartbeat,
  readConsumedHeartbeatAt,
} = runHeartbeatConsumption;
