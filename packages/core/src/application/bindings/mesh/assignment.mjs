// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshAssignments } from "@aof/mesh/assignment";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleMeshAssignment({ globalWorkStoreServices, workReadServices, effectsAssignmentTransitionsServices, itemLockServices }) {
  // Core composition for mesh-owned coordination.

  const { openGlobalWorkProjectionStore } = globalWorkStoreServices;

  const { findWorkCacheFirst } = workReadServices;
  const { transitionAssignmentState } = effectsAssignmentTransitionsServices;
  const { inspectItemLock } = itemLockServices;
  const { itemLockMessage } = itemLockServices;
  const { openLockableStore } = itemLockServices;
  const { ITEM_LOCKED_CODE } = itemLockServices;

  const { assignWork, withdrawWork } = createMeshAssignments({ openGlobalWorkProjectionStore, resolveWorkspaceId, findWorkCacheFirst, transitionAssignmentState, inspectItemLock, itemLockMessage, openLockableStore, ITEM_LOCKED_CODE });

  return { assignWork, withdrawWork };
}
