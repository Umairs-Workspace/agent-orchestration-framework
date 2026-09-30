// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createWorkReader } from "@aof/work/read";

export function assembleWorkRead({ cacheReadServices, degradeServices, meshWorktreeServices }) {
  // Core composition for work-owned reads.

  const { readCachedItemRows } = cacheReadServices;
  const { reportDegrade } = degradeServices;
  const { isUnderMeshWorktreesRoot } = meshWorktreeServices;
  const { isUnderMeshSessionWorktreesRoot } = meshWorktreeServices;
  const { isUnderMeshDispatchWorktreesRoot } = meshWorktreeServices;

  const { ANSWERING_SIDE_KEYS, DEGRADE_CACHE_MISS, DEGRADE_CACHE_UNAVAILABLE, DEGRADE_NO_LOCAL_CHECKOUT, findWorkCacheFirst, isMeshWorktree, listItemsCacheFirst, listStreamCacheFirst, localItemsOnly, nextWorkCacheFirst, reportReachThroughSkips, reportedElsewhere, withoutAnsweringSide } = createWorkReader({ readCachedItemRows, reportDegrade, isUnderMeshWorktreesRoot, isUnderMeshSessionWorktreesRoot, isUnderMeshDispatchWorktreesRoot });

  return { ANSWERING_SIDE_KEYS, DEGRADE_CACHE_MISS, DEGRADE_CACHE_UNAVAILABLE, DEGRADE_NO_LOCAL_CHECKOUT, findWorkCacheFirst, isMeshWorktree, listItemsCacheFirst, listStreamCacheFirst, localItemsOnly, nextWorkCacheFirst, reportReachThroughSkips, reportedElsewhere, withoutAnsweringSide };
}
