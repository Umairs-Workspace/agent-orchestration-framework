// Core assembly: construct once per application; collaborators are supplied explicitly.
import { resolveExecution, validateExecutionEnvelope } from "@aof/execution/runtime-selection";
import { loopRuntimeSettingFromConfig } from "@aof/contracts/loop-bounds";
import { createAssignmentReclaim } from "@aof/mesh/assignment-reclaim";
import { existsSync } from "node:fs";

export function assembleMeshAssignmentReclaim({ runtimeSessionServices, workServices, meshPresenceServices, runStoreServices, runHeartbeatConsumptionServices, workReadServices, effectsAssignmentTransitionsServices, effectsRunTransitionsServices, globalWorkStoreServices, meshWorktreeServices, degradeServices, workDispatchServices }) {
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

  const resolveAssignmentExecution = async root => {
    if (typeof root !== "string" || !existsSync(root)) return null;
    const ws = await workServices.loadWorkspace(root);
    const setting = loopRuntimeSettingFromConfig(ws);
    if (!setting.present) return null;
    const capabilities = setting.value === "codex" ? { codex: await runtimeSessionServices.inspectCapabilities("codex", { cwd: root }) } : {};
    return resolveExecution(ws.config, { capabilities });
  };

  const { DEFAULT_ASSIGNMENT_HEARTBEAT_STALE_MS, assignmentOccupiesDispatchSlot, countDispatchSlotsByTarget, dualStalenessDecision, reclaimStaleAssignments, runControlDispatchReclaimTick } = createAssignmentReclaim({ resolveAssignmentExecution, validateExecutionEnvelope, isNodeStale, readPresenceRecord, DEFAULT_PRESENCE_STALENESS_SECONDS, isStale, readRuns, consumeHeartbeatQueue, findWorkCacheFirst, transitionAssignmentState, transitionRunReclaimed, openGlobalWorkProjectionStore, readWorkItemRuns, headCommit, reportDegrade, dispatchConcurrencyFromConfig });

  return { DEFAULT_ASSIGNMENT_HEARTBEAT_STALE_MS, assignmentOccupiesDispatchSlot, countDispatchSlotsByTarget, dualStalenessDecision, reclaimStaleAssignments, runControlDispatchReclaimTick };
}
