// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createAssignmentReclaim } from "@aof/mesh/assignment-reclaim";

export function assembleMeshAssignmentReclaim({ meshPresenceServices, runStoreServices, runHeartbeatConsumptionServices, workReadServices, effectsAssignmentTransitionsServices, effectsRunTransitionsServices, globalWorkStoreServices, meshWorktreeServices, degradeServices, workDispatchServices }) {
  // Core composition for mesh-owned coordination.

  const { isNodeStale } = meshPresenceServices;
  const { readPresenceRecord } = meshPresenceServices;
  const { DEFAULT_PRESENCE_STALENESS_SECONDS } = meshPresenceServices;
  const { isStale } = runStoreServices;
  const { readRuns } = runStoreServices;
  const { consumeHeartbeatQueue } = runHeartbeatConsumptionServices;
  const { findWorkCacheFirst } = workReadServices;
  const { transitionAssignmentState } = effectsAssignmentTransitionsServices;
  const { transitionRunReclaimed } = effectsRunTransitionsServices;
  const { openGlobalWorkProjectionStore } = globalWorkStoreServices;
  const { readWorkItemRuns } = globalWorkStoreServices;
  const { headCommit } = meshWorktreeServices;
  const { reportDegrade } = degradeServices;
  const { dispatchConcurrencyFromConfig } = workDispatchServices;

  const { DEFAULT_ASSIGNMENT_HEARTBEAT_STALE_MS, assignmentOccupiesDispatchSlot, countDispatchSlotsByTarget, dualStalenessDecision, reclaimStaleAssignments, runControlDispatchReclaimTick } = createAssignmentReclaim({ isNodeStale, readPresenceRecord, DEFAULT_PRESENCE_STALENESS_SECONDS, isStale, readRuns, consumeHeartbeatQueue, findWorkCacheFirst, transitionAssignmentState, transitionRunReclaimed, openGlobalWorkProjectionStore, readWorkItemRuns, headCommit, reportDegrade, dispatchConcurrencyFromConfig });

  return { DEFAULT_ASSIGNMENT_HEARTBEAT_STALE_MS, assignmentOccupiesDispatchSlot, countDispatchSlotsByTarget, dualStalenessDecision, reclaimStaleAssignments, runControlDispatchReclaimTick };
}
