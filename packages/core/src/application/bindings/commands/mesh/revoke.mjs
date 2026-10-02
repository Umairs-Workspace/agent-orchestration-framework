// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshRevokeCommands } from "@aof/mesh/commands/revoke";

export function assembleCommandsMeshRevoke({ meshRegistryServices }) {
  // Core composition for mesh-owned commands.

  const { isControlNode } = meshRegistryServices;
  const { readRegistry } = meshRegistryServices;
  const { writeRegistry } = meshRegistryServices;
  const { appendRevocation } = meshRegistryServices;

  const { meshRevokeCommand } = createMeshRevokeCommands({ isControlNode, readRegistry, writeRegistry, appendRevocation });

  return { meshRevokeCommand };
}
