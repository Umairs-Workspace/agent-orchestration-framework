// Compatibility composition; @aof/work-loop owns the implementation.
import { createWaveOrchestration } from "@aof/work-loop/wave";
import { loadWorkspace } from "../work.mjs";
import { readRuns, isRunning, isStale } from "../run-store.mjs";
import { consumeHeartbeatQueue, enqueueHeartbeat } from "../run-heartbeat-consumption.mjs";
import { transitionRunComplete, transitionRunStart, transitionStaleRunsReclaimed } from "../effects/run-transitions.mjs";
import { reportDegrade } from "../degrade.mjs";
import {
  commitDispatchLane,
  dispatchLaneBase,
  inspectDispatchLanes,
  mergeDispatchLaneHome,
  resolveDispatchLane,
  resolveRefInWorktree,
} from "../work/dispatch.mjs";
import { headCommit, meshDispatchWorktreePath, resolveExec } from "../mesh/worktree.mjs";
import { LANE_CANCEL_GRACE_MS, childDriveOutcome, loopFixFilePath, spawnLaneDrive as spawnLaneDriveChild } from "./child-drive.mjs";
import { askEnvFor, askFileFor, awaitAnswer, liveOwnerHolds, parkedHalt, standingAsk } from "./ask.mjs";
import {
  budgetElapsedMs,
  drivenRow,
  measureGradeBaseline,
  readGradeBaseline,
  retryUntilTerminal,
  runBrief,
  settleDriven,
  settleStoryCycle,
  transitionOptionsFor,
} from "./cycle.mjs";

const implementation = createWaveOrchestration({
  work: { loadWorkspace },
  runs: { readRuns, isRunning, isStale },
  heartbeats: { consumeHeartbeatQueue, enqueueHeartbeat },
  transitions: { transitionRunComplete, transitionRunStart, transitionStaleRunsReclaimed },
  diagnostics: { reportDegrade },
  dispatch: { commitDispatchLane, dispatchLaneBase, inspectDispatchLanes, mergeDispatchLaneHome, resolveDispatchLane, resolveRefInWorktree },
  worktrees: { headCommit, meshDispatchWorktreePath, resolveExec },
  childDrive: { LANE_CANCEL_GRACE_MS, childDriveOutcome, loopFixFilePath, spawnLaneDrive: spawnLaneDriveChild },
  asks: { askEnvFor, askFileFor, awaitAnswer, liveOwnerHolds, parkedHalt, standingAsk },
  cycle: { budgetElapsedMs, drivenRow, measureGradeBaseline, readGradeBaseline, retryUntilTerminal, runBrief, settleDriven, settleStoryCycle, transitionOptionsFor },
  // Transitional core composition: the package never imports the assembled registry.
  invoke: async (id, input, ctx) => {
    const { invoke } = await import("../command-core.mjs");
    return await invoke(id, input, ctx);
  },
});

export const reconcileLanes = implementation.reconcileLanes;
export const runWaveBuild = implementation.runWaveBuild;
