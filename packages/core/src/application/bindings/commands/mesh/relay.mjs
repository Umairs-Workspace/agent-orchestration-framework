// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshRelayCommands } from "@aof/mesh/commands/relay";

export function assembleCommandsMeshRelay({ meshRelayServices }) {
  // Core composition for mesh-owned commands.

  const { relayStatus } = meshRelayServices;

  const { meshRelayCommand } = createMeshRelayCommands({ relayStatus });

  return { meshRelayCommand };
}
