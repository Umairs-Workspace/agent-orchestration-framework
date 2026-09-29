// Transitional core composition for mesh-owned coordination.
import { createItemLocks } from "@aof/mesh/item-lock";
import { globalMeshPaths } from "./workspace.mjs";
import { openGlobalWorkProjectionStore } from "./global-work-store.mjs";
import { meshGlobalPropagationDecision } from "./global-work-publisher.mjs";
import { resolveWorkspaceId } from "./workspace-identity.mjs";

export const { ITEM_LOCKED_CODE, ITEM_LOCK_UNDETERMINABLE_CODE, ITEM_LOCK_CONTEXT_MISSING_CODE, itemLockPayload, itemLockMessage, itemLockedError, lockContextFor, openLockableStore, inspectItemLock, guardItemLock, readHeldScopes } = createItemLocks({ globalMeshPaths, openGlobalWorkProjectionStore, meshGlobalPropagationDecision: (...args) => meshGlobalPropagationDecision(...args), resolveWorkspaceId });
