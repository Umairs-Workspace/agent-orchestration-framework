// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshRepoCommands } from "@aof/mesh/commands/repo";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleCommandsMeshRepo({ globalWorkPublisherServices }) {
  // Core composition for mesh-owned commands.

  const { publishGlobalWorkSnapshot } = globalWorkPublisherServices;

  const { publishRepoToMesh, meshRepoPublishCommand } = createMeshRepoCommands({ publishGlobalWorkSnapshot, resolveWorkspaceId });

  return { publishRepoToMesh, meshRepoPublishCommand };
}
