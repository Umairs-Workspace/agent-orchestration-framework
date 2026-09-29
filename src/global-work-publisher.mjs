// Transitional core composition for mesh-owned projections.
import { createGlobalWorkPublisher } from "@aof/mesh/publisher";
import { globalMeshPaths } from "./workspace.mjs";
import {
  openGlobalWorkProjectionStore,
  publishWorkspaceSnapshot,
  recordWorkspaceProjectionError,
  workspaceIdFor,
  readWorkspaceProjectionItems,
} from "./global-work-store.mjs";
import { readWorkspaceContentRecords } from "./work/content-read.mjs";
import { publishGlobalRegistryDescriptorsToStore } from "./global-node-registry.mjs";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";
import { reportDegrade } from "./degrade.mjs";

export const { MESH_GLOBAL_DISABLED_CODE, MESH_WORKSPACE_UNCONFIGURED_CODE, meshGlobalPropagationDecision, publishGlobalWorkSnapshot, threadPropagationWarnings, appendPropagationWarning, renderPropagationWarnings, renderWithPropagationWarnings, restoreRefusedResumeReservation } = createGlobalWorkPublisher({ globalMeshPaths, openGlobalWorkProjectionStore, publishWorkspaceSnapshot, recordWorkspaceProjectionError, workspaceIdFor, readWorkspaceProjectionItems, readWorkspaceContentRecords, publishGlobalRegistryDescriptorsToStore, resolveWorkspaceId, reportDegrade });
export { workspaceIdFor, readWorkspaceProjectionItems, readWorkspaceContentRecords };
