// Transitional core composition for work-loop-owned local dispatch.
import { createDispatchLanes } from "@aof/work-loop/dispatch";
import {
  meshDispatchWorktreePath,
  isUnderMeshDispatchWorktreesRoot,
  addDispatchWorktree,
  removeDispatchWorktree,
  meshItemBranchName,
  findItemWorktree,
  listWorktrees,
  advanceBranchToBase,
  commitWorktreeChanges,
  parsePorcelainStatus,
  resolveExec,
} from "../mesh/worktree.mjs";
import { findWork } from "../work.mjs";
import { reportDegrade } from "../degrade.mjs";
import { acquireMeshLauncherLock } from "../mesh/launcher-lock.mjs";

export const { DEFAULT_DISPATCH_CONCURRENCY, DEFAULT_LANE_QUIET_MS, cleanupDispatchLane, commitDispatchLane, dispatchConcurrencyFromConfig, dispatchLaneBase, dispatchLaneOccupiesSlot, dispatchReadySet, inspectDispatchLaneAdmission, inspectDispatchLanes, laneChanges, mergeDispatchLaneHome, narrowDispatchBound, overlappingFiles, planDispatchLaneAdmissions, resolveDispatchConcurrency, resolveDispatchLane, resolveRefInWorktree, sweepDispatchLanes, withDispatchLaneAdmissionLock, worktreeWorkDir } = createDispatchLanes({ meshDispatchWorktreePath, isUnderMeshDispatchWorktreesRoot, addDispatchWorktree, removeDispatchWorktree, meshItemBranchName, findItemWorktree, listWorktrees, advanceBranchToBase, commitWorktreeChanges, parsePorcelainStatus, resolveExec, findWork, reportDegrade, acquireMeshLauncherLock });
