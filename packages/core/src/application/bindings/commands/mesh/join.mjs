// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshJoinCommands } from "@aof/mesh/commands/join";
import { assembleDescriptor } from "@aof/mesh/node-identity";
import { packageVersionString } from "../../../../asset-base.mjs";

export function assembleCommandsMeshJoin({ workspaceServices, meshStoreServices, degradeServices }) {
  // Core composition for mesh-owned commands.

  const { globalWorkspacePaths } = workspaceServices;

  const { publishNodeRecord } = meshStoreServices;

  const { reportDegrade } = degradeServices;

  const { meshJoinCommand } = createMeshJoinCommands({ globalWorkspacePaths, assembleDescriptor, publishNodeRecord, packageVersionString, reportDegrade });

  return { meshJoinCommand };
}
