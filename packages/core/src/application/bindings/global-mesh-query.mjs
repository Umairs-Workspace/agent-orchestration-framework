// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGlobalMeshQuery } from "@aof/mesh/global-query";
import { resolveCacheStalenessSeconds } from "@aof/mesh/cache-policy";

export function assembleGlobalMeshQuery({ workspaceServices, globalWorkStoreServices, globalNodeRegistryServices, globalWorkPublisherServices }) {
  // Core composition for mesh-owned projections.

  const { globalMeshPaths } = workspaceServices;
  const { openGlobalWorkProjectionStore } = globalWorkStoreServices;
  const { queryGlobalWorkProjection } = globalWorkStoreServices;
  const { globalStoreError } = globalWorkStoreServices;
  const { workspaceIdFor } = globalWorkStoreServices;
  const { queryGlobalRegistry } = globalNodeRegistryServices;
  const { MESH_GLOBAL_DISABLED_CODE } = globalWorkPublisherServices;

  const { queryGlobalMeshStatus, buildSessionIndex, shapeGlobalStatus } = createGlobalMeshQuery({ globalMeshPaths, openGlobalWorkProjectionStore, queryGlobalWorkProjection, globalStoreError, workspaceIdFor, queryGlobalRegistry, MESH_GLOBAL_DISABLED_CODE, resolveCacheStalenessSeconds });

  return { queryGlobalMeshStatus, buildSessionIndex, shapeGlobalStatus, "workspaceIdForProjectRoot": workspaceIdFor };
}
