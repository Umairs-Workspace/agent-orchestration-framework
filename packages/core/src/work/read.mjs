// Compatibility entry; construction belongs to core application assembly.
import { workRead } from "../application/default.mjs";
export const {
  ANSWERING_SIDE_KEYS,
  DEGRADE_CACHE_MISS,
  DEGRADE_CACHE_UNAVAILABLE,
  DEGRADE_NO_LOCAL_CHECKOUT,
  findWorkCacheFirst,
  isMeshWorktree,
  listItemsCacheFirst,
  listStreamCacheFirst,
  localItemsOnly,
  nextWorkCacheFirst,
  reportReachThroughSkips,
  reportedElsewhere,
  withoutAnsweringSide,
} = workRead;
