// Compatibility entry; construction belongs to core application assembly.
import { cacheRead } from "./application/default.mjs";
export const {
  sharedProjectionStore,
  readStreamedItemRow,
  readWorkerDoc,
  readWorkerDocMembers,
  readWorkerRuns,
  readWorkerItems,
  readCachedProvenance,
  readCachedWorkFacts,
  readCachedActiveRunIds,
  readCachedItemRows,
  applyCachedProvenance,
  mergeWorkerItems,
} = cacheRead;
