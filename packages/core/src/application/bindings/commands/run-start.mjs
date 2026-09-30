// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createRunStartCommand } from "@aof/work/commands/run-start";
import { meshNodeIdOf } from "@aof/mesh/commands/gate";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleCommandsRunStart({ commandsResolveServices, workReadServices, runStoreServices, meshPresenceServices, effectsRunTransitionsServices, globalWorkPublisherServices, itemLockServices, meshSessionServices }) {
  // Core composition for work-owned run-start commands.

  const { resolveItemExact } = commandsResolveServices;
  const { requireLocalCheckout } = commandsResolveServices;
  const { resolveDrivenRun } = commandsResolveServices;
  const { listItemsCacheFirst } = workReadServices;
  const { localItemsOnly } = workReadServices;
  const { reportReachThroughSkips } = workReadServices;
  const { readRuns } = runStoreServices;
  const { runsDir } = runStoreServices;
  const { shouldRetry } = runStoreServices;
  const { isNodeStale } = meshPresenceServices;
  const { resolveStalenessSeconds } = meshPresenceServices;
  const { readPresenceRecord } = meshPresenceServices;

  const { transitionRunStart } = effectsRunTransitionsServices;
  const { transitionStaleRunsReclaimed } = effectsRunTransitionsServices;
  const { renderWithPropagationWarnings } = globalWorkPublisherServices;
  const { threadPropagationWarnings } = globalWorkPublisherServices;
  const { lockContextFor } = itemLockServices;
  const { resolveSessionIdFromLiveStore } = meshSessionServices;

  const { runStartCommand } = createRunStartCommand({ resolveItemExact, requireLocalCheckout, resolveDrivenRun, listItemsCacheFirst, localItemsOnly, reportReachThroughSkips, readRuns, runsDir, shouldRetry, isNodeStale, resolveStalenessSeconds, readPresenceRecord, meshNodeIdOf, transitionRunStart, transitionStaleRunsReclaimed, renderWithPropagationWarnings, threadPropagationWarnings, lockContextFor, resolveSessionIdFromLiveStore, resolveWorkspaceId });

  return { runStartCommand };
}
