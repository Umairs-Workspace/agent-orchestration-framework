// Transitional core composition for mesh-owned projections.
import { createGlobalMeshQuery } from "@aof/mesh/global-query";
import { globalMeshPaths } from "./workspace.mjs";
import { openGlobalWorkProjectionStore, queryGlobalWorkProjection, globalStoreError, workspaceIdFor } from "./global-work-store.mjs";
import { queryGlobalRegistry } from "./global-node-registry.mjs";
import { MESH_GLOBAL_DISABLED_CODE } from "./global-work-publisher.mjs";
import { resolveCacheStalenessSeconds } from "@aof/mesh/cache-policy";

export const { queryGlobalMeshStatus, buildSessionIndex, shapeGlobalStatus } = createGlobalMeshQuery({ globalMeshPaths, openGlobalWorkProjectionStore, queryGlobalWorkProjection, globalStoreError, workspaceIdFor, queryGlobalRegistry, MESH_GLOBAL_DISABLED_CODE, resolveCacheStalenessSeconds });
export { workspaceIdFor as workspaceIdForProjectRoot };
