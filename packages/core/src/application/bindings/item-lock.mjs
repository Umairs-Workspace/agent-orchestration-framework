// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createItemLocks } from "@aof/mesh/item-lock";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleItemLock({ workspaceServices, globalWorkStoreServices, globalWorkPublisherServices }) {
  // Core composition for mesh-owned coordination.

  const { globalMeshPaths } = workspaceServices;
  const { openGlobalWorkProjectionStore } = globalWorkStoreServices;
  const { meshGlobalPropagationDecision } = globalWorkPublisherServices;

  const { ITEM_LOCKED_CODE, ITEM_LOCK_UNDETERMINABLE_CODE, ITEM_LOCK_CONTEXT_MISSING_CODE, itemLockPayload, itemLockMessage, itemLockedError, lockContextFor, openLockableStore, inspectItemLock, guardItemLock, readHeldScopes } = createItemLocks({ globalMeshPaths, openGlobalWorkProjectionStore, meshGlobalPropagationDecision, resolveWorkspaceId });

  return { ITEM_LOCKED_CODE, ITEM_LOCK_UNDETERMINABLE_CODE, ITEM_LOCK_CONTEXT_MISSING_CODE, itemLockPayload, itemLockMessage, itemLockedError, lockContextFor, openLockableStore, inspectItemLock, guardItemLock, readHeldScopes };
}
