// Compatibility entry; construction belongs to core application assembly.
import { meshRelayClient } from "../application/default.mjs";
export const {
  PRESENCE_SIGNAL_KIND,
  relayEnvelope,
  pushPresenceSignal,
  createRelayClient,
} = meshRelayClient;
