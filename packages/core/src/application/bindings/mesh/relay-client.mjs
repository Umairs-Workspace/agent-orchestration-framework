// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshRelayClient } from "@aof/mesh/relay-client";

export function assembleMeshRelayClient({ degradeServices }) {
  // Core composition for mesh-owned relay services.

  const { reportDegrade } = degradeServices;

  const { PRESENCE_SIGNAL_KIND, relayEnvelope, pushPresenceSignal, createRelayClient } = createMeshRelayClient({ reportDegrade });

  return { PRESENCE_SIGNAL_KIND, relayEnvelope, pushPresenceSignal, createRelayClient };
}
