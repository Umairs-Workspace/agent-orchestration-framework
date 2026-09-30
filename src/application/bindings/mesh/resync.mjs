// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshResync } from "@aof/mesh/resync";

export function assembleMeshResync({ provideGlobalWorkStore }) {
  // Core composition for mesh-owned coordination.

  const { RESYNC_KIND, RESYNC_RESULT_KIND, RESYNC_REQUESTED, RESYNC_DISPATCHED, RESYNC_PUSHED, RESYNC_FAILED, RESYNC_OK, RESYNC_NO_OWNER, RESYNC_OWNER_NOT_CONNECTED, RESYNC_OWNER_UNREACHABLE, RESYNC_PENDING, RESYNC_OWNER_IS_SELF, resyncRequestId, ensureResyncTable, requestResync, readResync, listResyncRequests, markResyncState, buildResyncFrame, buildResyncResultFrame, applyResyncResultFrame, runResyncDispatchTick } = createMeshResync({ loadProjectionStore: () => provideGlobalWorkStore() });

  return { RESYNC_KIND, RESYNC_RESULT_KIND, RESYNC_REQUESTED, RESYNC_DISPATCHED, RESYNC_PUSHED, RESYNC_FAILED, RESYNC_OK, RESYNC_NO_OWNER, RESYNC_OWNER_NOT_CONNECTED, RESYNC_OWNER_UNREACHABLE, RESYNC_PENDING, RESYNC_OWNER_IS_SELF, resyncRequestId, ensureResyncTable, requestResync, readResync, listResyncRequests, markResyncState, buildResyncFrame, buildResyncResultFrame, applyResyncResultFrame, runResyncDispatchTick };
}
