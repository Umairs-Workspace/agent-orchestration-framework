// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshAssignCommands } from "@aof/mesh/commands/assign";

export function assembleCommandsMeshAssign({ meshAssignmentServices }) {
  // Core composition for mesh-owned commands.

  const { assignWork } = meshAssignmentServices;
  const { withdrawWork } = meshAssignmentServices;

  const { meshAssignCommand } = createMeshAssignCommands({ assignWork, withdrawWork });

  return { meshAssignCommand };
}
