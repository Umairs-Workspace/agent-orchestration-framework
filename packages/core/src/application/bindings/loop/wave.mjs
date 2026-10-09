// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createWaveOrchestration } from "@aof/work-loop/wave";
import { executionForPhase } from "@aof/contracts/loop-bounds";

export function assembleLoopWave({ workServices, runStoreServices, runHeartbeatConsumptionServices, effectsRunTransitionsServices, degradeServices, workDispatchServices, meshWorktreeServices, loopChildDriveServices, loopAskServices, loopCycleServices, provideCommandCore }) {
  // Core composition; @aof/work-loop owns the implementation.

  const { loadWorkspace } = workServices;
  const { readRuns } = runStoreServices;
  const { isRunning } = runStoreServices;
  const { isStale } = runStoreServices;
  const { consumeHeartbeatQueue } = runHeartbeatConsumptionServices;
  const { enqueueHeartbeat } = runHeartbeatConsumptionServices;
  const { transitionRunComplete } = effectsRunTransitionsServices;
  const { transitionRunStart } = effectsRunTransitionsServices;
  const { transitionStaleRunsReclaimed } = effectsRunTransitionsServices;
  const { reportDegrade } = degradeServices;
  const { commitDispatchLane } = workDispatchServices;
  const { dispatchLaneBase } = workDispatchServices;
  const { inspectDispatchLanes } = workDispatchServices;
  const { mergeDispatchLaneHome } = workDispatchServices;
  const { resolveDispatchLane } = workDispatchServices;
  const { resolveRefInWorktree } = workDispatchServices;
  const { headCommit } = meshWorktreeServices;
  const { meshDispatchWorktreePath } = meshWorktreeServices;
  const { resolveExec } = meshWorktreeServices;
  const { LANE_CANCEL_GRACE_MS } = loopChildDriveServices;
  const { childDriveOutcome } = loopChildDriveServices;
  const { loopFixFilePath } = loopChildDriveServices;
  const { spawnLaneDrive: spawnLaneDriveChild } = loopChildDriveServices;
  const { askEnvFor } = loopAskServices;
  const { askFileFor } = loopAskServices;
  const { awaitAnswer } = loopAskServices;
  const { liveOwnerHolds } = loopAskServices;
  const { parkedHalt } = loopAskServices;
  const { standingAsk } = loopAskServices;
  const { budgetElapsedMs } = loopCycleServices;
  const { drivenRow } = loopCycleServices;
  const { measureGradeBaseline } = loopCycleServices;
  const { readGradeBaseline } = loopCycleServices;
  const { retryUntilTerminal } = loopCycleServices;
  const { runBrief } = loopCycleServices;
  const { settleDriven } = loopCycleServices;
  const { settleStoryCycle } = loopCycleServices;
  const { transitionOptionsFor } = loopCycleServices;

  const implementation = createWaveOrchestration({
    executionForPhase,
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
    // Core composition: the package never imports the assembled registry.
    invoke: async (id, input, ctx) => {
      const { invoke } = await provideCommandCore();
      return await invoke(id, input, ctx);
    },
  });

  const reconcileLanes = implementation.reconcileLanes;
  const runWaveBuild = implementation.runWaveBuild;

  return { reconcileLanes, runWaveBuild };
}
