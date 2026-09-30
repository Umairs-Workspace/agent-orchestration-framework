// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGlobalWorkPublisher } from "@aof/mesh/publisher";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleGlobalWorkPublisher({ workspaceServices, globalWorkStoreServices, workContentReadServices, globalNodeRegistryServices, degradeServices }) {
  // Core composition for mesh-owned projections.

  const { globalMeshPaths } = workspaceServices;
  const { openGlobalWorkProjectionStore } = globalWorkStoreServices;
  const { publishWorkspaceSnapshot } = globalWorkStoreServices;
  const { recordWorkspaceProjectionError } = globalWorkStoreServices;
  const { workspaceIdFor } = globalWorkStoreServices;
  const { readWorkspaceProjectionItems } = globalWorkStoreServices;
  const { readWorkspaceContentRecords } = workContentReadServices;
  const { publishGlobalRegistryDescriptorsToStore } = globalNodeRegistryServices;

  const { reportDegrade } = degradeServices;

  const { MESH_GLOBAL_DISABLED_CODE, MESH_WORKSPACE_UNCONFIGURED_CODE, meshGlobalPropagationDecision, publishGlobalWorkSnapshot, threadPropagationWarnings, appendPropagationWarning, renderPropagationWarnings, renderWithPropagationWarnings, restoreRefusedResumeReservation } = createGlobalWorkPublisher({ globalMeshPaths, openGlobalWorkProjectionStore, publishWorkspaceSnapshot, recordWorkspaceProjectionError, workspaceIdFor, readWorkspaceProjectionItems, readWorkspaceContentRecords, publishGlobalRegistryDescriptorsToStore, resolveWorkspaceId, reportDegrade });

  return { MESH_GLOBAL_DISABLED_CODE, MESH_WORKSPACE_UNCONFIGURED_CODE, meshGlobalPropagationDecision, publishGlobalWorkSnapshot, threadPropagationWarnings, appendPropagationWarning, renderPropagationWarnings, renderWithPropagationWarnings, restoreRefusedResumeReservation, workspaceIdFor, readWorkspaceProjectionItems, readWorkspaceContentRecords };
}
