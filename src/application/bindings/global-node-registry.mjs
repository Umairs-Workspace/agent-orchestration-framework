// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGlobalNodeRegistry } from "@aof/mesh/global-node-registry";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";
import { resolveCloneUrl } from "@aof/mesh/worker-repo-admission";

export function assembleGlobalNodeRegistry({ workspaceServices, meshStoreServices, meshPresenceServices, degradeServices }) {
  // Core composition for mesh-owned projections.

  const { globalMeshPaths } = workspaceServices;

  const { readNodeRecords } = meshStoreServices;
  const { readPresenceRecords } = meshPresenceServices;
  const { readPresenceRecord } = meshPresenceServices;
  const { assemblePresenceRecord } = meshPresenceServices;

  const { reportDegrade } = degradeServices;

  const { publishGlobalRegistryDescriptorsToStore, assembleGlobalRegistrySnapshot, queryGlobalRegistry, upsertGlobalRegistryRows, redactDescriptor } = createGlobalNodeRegistry({ globalMeshPaths, resolveWorkspaceId, readNodeRecords, readPresenceRecords, readPresenceRecord, assemblePresenceRecord, resolveCloneUrl, reportDegrade });

  return { publishGlobalRegistryDescriptorsToStore, assembleGlobalRegistrySnapshot, queryGlobalRegistry, upsertGlobalRegistryRows, redactDescriptor };
}
