// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createRunTransitions } from "@aof/execution/run-transitions";

export function assembleEffectsRunTransitions({ runStoreServices, runHeartbeatConsumptionServices, effectsTableServices, effectsJournalServices, effectsDispatchServices, degradeServices, itemLockServices, workObserveServices }) {
  // Core composition for execution-owned domain transitions.

  const { completeRun } = runStoreServices;
  const { startRun } = runStoreServices;
  const { retryRun } = runStoreServices;
  const { reclaimRun } = runStoreServices;
  const { staleRunningRuns } = runStoreServices;
  const { consumeHeartbeatQueue } = runHeartbeatConsumptionServices;
  const { applicableReactors } = effectsTableServices;
  const { openEffectsJournal } = effectsJournalServices;
  const { appendEvent } = effectsJournalServices;
  const { drainEffects } = effectsDispatchServices;
  const { runEffectsEphemeral } = effectsDispatchServices;
  const { reachableLoci } = effectsDispatchServices;
  const { reportDegrade } = degradeServices;
  const { guardItemLock } = itemLockServices;
  const { claudeProjectsDir } = workObserveServices;

  const { transitionRunStart, transitionRunComplete, transitionRunReclaimed, transitionStaleRunsReclaimed } = createRunTransitions({ completeRun, startRun, retryRun, reclaimRun, staleRunningRuns, consumeHeartbeatQueue, applicableReactors, openEffectsJournal, appendEvent, drainEffects, runEffectsEphemeral, reachableLoci, reportDegrade, guardItemLock, claudeProjectsDir });

  return { transitionRunStart, transitionRunComplete, transitionRunReclaimed, transitionStaleRunsReclaimed };
}
