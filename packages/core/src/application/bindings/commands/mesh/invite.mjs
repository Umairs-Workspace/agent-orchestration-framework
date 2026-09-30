// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshInviteCommands } from "@aof/mesh/commands/invite";

export function assembleCommandsMeshInvite({ meshRegistryServices, meshRelayServices }) {
  // Core composition for mesh-owned commands.

  const { isControlNode } = meshRegistryServices;
  const { readRegistry } = meshRegistryServices;
  const { writeRegistry } = meshRegistryServices;
  const { appendPendingInvite } = meshRegistryServices;
  const { resolveCodeTtlSeconds } = meshRelayServices;
  const { sha256Hex } = meshRelayServices;

  const { meshInviteCommand } = createMeshInviteCommands({ isControlNode, readRegistry, writeRegistry, appendPendingInvite, resolveCodeTtlSeconds, sha256Hex });

  return { meshInviteCommand };
}
