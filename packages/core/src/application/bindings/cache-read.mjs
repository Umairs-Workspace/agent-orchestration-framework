// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createCacheReader } from "@aof/mesh/cache-read";

export function assembleCacheRead({ globalWorkStoreServices, workspaceServices, degradeServices }) {
  // Core constructs this application service from its owning package.

  const projectionStore = globalWorkStoreServices;
  const { globalMeshPaths } = workspaceServices;
  const { reportDegrade } = degradeServices;
  const { sharedProjectionStore, readStreamedItemRow, readWorkerDoc, readWorkerDocMembers, readWorkerRuns, readWorkerItems, readCachedProvenance, readCachedWorkFacts, readCachedActiveRunIds, readCachedItemRows, applyCachedProvenance, mergeWorkerItems } = createCacheReader({ projectionStore, globalMeshPaths, reportDegrade });

  return { sharedProjectionStore, readStreamedItemRow, readWorkerDoc, readWorkerDocMembers, readWorkerRuns, readWorkerItems, readCachedProvenance, readCachedWorkFacts, readCachedActiveRunIds, readCachedItemRows, applyCachedProvenance, mergeWorkerItems };
}
