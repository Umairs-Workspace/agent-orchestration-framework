// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDispatchLanes } from "@aof/work-loop/dispatch";
import { prepareCodexWorktree } from "../../../codex-settings.mjs";
import { validateExecutionEnvelope } from "@aof/execution/runtime-selection";

export function assembleWorkDispatch({ meshWorktreeServices, workServices, degradeServices, meshLauncherLockServices }) {
  // Core composition for work-loop-owned local dispatch.

  const { meshDispatchWorktreePath } = meshWorktreeServices;
  const { isUnderMeshDispatchWorktreesRoot } = meshWorktreeServices;
  const { addDispatchWorktree } = meshWorktreeServices;
  const { removeDispatchWorktree } = meshWorktreeServices;
  const { meshItemBranchName } = meshWorktreeServices;
  const { findItemWorktree } = meshWorktreeServices;
  const { listWorktrees } = meshWorktreeServices;
  const { advanceBranchToBase } = meshWorktreeServices;
  const { commitWorktreeChanges } = meshWorktreeServices;
  const { parsePorcelainStatus } = meshWorktreeServices;
  const { resolveExec } = meshWorktreeServices;
  const { findWork } = workServices;
  const { reportDegrade } = degradeServices;
  const { acquireMeshLauncherLock } = meshLauncherLockServices;

  const { DEFAULT_DISPATCH_CONCURRENCY, DEFAULT_LANE_QUIET_MS, cleanupDispatchLane, commitDispatchLane, dispatchConcurrencyFromConfig, dispatchLaneBase, dispatchLaneOccupiesSlot, dispatchReadySet, inspectDispatchLaneAdmission, inspectDispatchLanes, laneChanges, mergeDispatchLaneHome, narrowDispatchBound, overlappingFiles, planDispatchLaneAdmissions, resolveDispatchConcurrency, resolveDispatchLane, resolveRefInWorktree, sweepDispatchLanes, withDispatchLaneAdmissionLock, worktreeWorkDir } = createDispatchLanes({ validateExecutionEnvelope, prepareRuntimeAssets: prepareCodexWorktree, meshDispatchWorktreePath, isUnderMeshDispatchWorktreesRoot, addDispatchWorktree, removeDispatchWorktree, meshItemBranchName, findItemWorktree, listWorktrees, advanceBranchToBase, commitWorktreeChanges, parsePorcelainStatus, resolveExec, findWork, reportDegrade, acquireMeshLauncherLock });

  return { DEFAULT_DISPATCH_CONCURRENCY, DEFAULT_LANE_QUIET_MS, cleanupDispatchLane, commitDispatchLane, dispatchConcurrencyFromConfig, dispatchLaneBase, dispatchLaneOccupiesSlot, dispatchReadySet, inspectDispatchLaneAdmission, inspectDispatchLanes, laneChanges, mergeDispatchLaneHome, narrowDispatchBound, overlappingFiles, planDispatchLaneAdmissions, resolveDispatchConcurrency, resolveDispatchLane, resolveRefInWorktree, sweepDispatchLanes, withDispatchLaneAdmissionLock, worktreeWorkDir };
}
