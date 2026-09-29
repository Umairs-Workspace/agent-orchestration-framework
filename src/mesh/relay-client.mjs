// Transitional core composition for mesh-owned relay services.
import { createMeshRelayClient } from "@aof/mesh/relay-client";
import { reportDegrade } from "../degrade.mjs";

export const { PRESENCE_SIGNAL_KIND, relayEnvelope, pushPresenceSignal, createRelayClient } = createMeshRelayClient({ reportDegrade });
