// Transitional core composition for work-owned reads.
import { createWorkReader } from "@aof/work/read";
import { readCachedItemRows } from "../cache-read.mjs";
import { reportDegrade } from "../degrade.mjs";
import {
  isUnderMeshWorktreesRoot,
  isUnderMeshSessionWorktreesRoot,
  isUnderMeshDispatchWorktreesRoot,
} from "../mesh/worktree.mjs";

export const { ANSWERING_SIDE_KEYS, DEGRADE_CACHE_MISS, DEGRADE_CACHE_UNAVAILABLE, DEGRADE_NO_LOCAL_CHECKOUT, findWorkCacheFirst, isMeshWorktree, listItemsCacheFirst, listStreamCacheFirst, localItemsOnly, nextWorkCacheFirst, reportReachThroughSkips, reportedElsewhere, withoutAnsweringSide } = createWorkReader({ readCachedItemRows, reportDegrade, isUnderMeshWorktreesRoot, isUnderMeshSessionWorktreesRoot, isUnderMeshDispatchWorktreesRoot });
