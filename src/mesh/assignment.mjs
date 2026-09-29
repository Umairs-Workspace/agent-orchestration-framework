// Transitional core composition for mesh-owned coordination.
import { createMeshAssignments } from "@aof/mesh/assignment";
import { openGlobalWorkProjectionStore } from "../global-work-store.mjs";
import { resolveWorkspaceId } from "../workspace-identity.mjs";
import { findWorkCacheFirst } from "../work/read.mjs";
import { transitionAssignmentState } from "../effects/assignment-transitions.mjs";
import { inspectItemLock, itemLockMessage, openLockableStore, ITEM_LOCKED_CODE } from "../item-lock.mjs";

export const { assignWork, withdrawWork } = createMeshAssignments({ openGlobalWorkProjectionStore, resolveWorkspaceId, findWorkCacheFirst, transitionAssignmentState, inspectItemLock, itemLockMessage, openLockableStore, ITEM_LOCKED_CODE });
