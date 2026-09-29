// Configured application adapter; assembly moves in Plan 02, removal in Plan 06.
import { createCacheReader } from "@aof/mesh/cache-read";
import * as projectionStore from "./global-work-store.mjs";
import { globalMeshPaths } from "./workspace.mjs";
import { reportDegrade } from "./degrade.mjs";
export const { sharedProjectionStore, readStreamedItemRow, readWorkerDoc, readWorkerDocMembers, readWorkerRuns, readWorkerItems, readCachedProvenance, readCachedWorkFacts, readCachedActiveRunIds, readCachedItemRows, applyCachedProvenance, mergeWorkerItems } = createCacheReader({ projectionStore, globalMeshPaths, reportDegrade });
