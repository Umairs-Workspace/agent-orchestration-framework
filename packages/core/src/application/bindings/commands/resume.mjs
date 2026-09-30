// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createReentryCommands } from "@aof/work/commands/resume";
import { meshNodeIdOf } from "@aof/mesh/commands/gate";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleCommandsResume({ commandsResolveServices, runStoreServices, effectsRunTransitionsServices, workReadServices, itemLockServices, loopAskRequestServices, loopAskServices, boardMeshExecutionServices, notifyNotifyServices, provideCommandCore }) {
  // Core composition for work-owned resume commands.

  const { resolveItem } = commandsResolveServices;
  const { resolveItemExact } = commandsResolveServices;
  const { requireLocalCheckout } = commandsResolveServices;
  const { readRuns } = runStoreServices;
  const { retryReadiness } = runStoreServices;
  const { isStale } = runStoreServices;
  const { transitionRunStart } = effectsRunTransitionsServices;
  const { transitionStaleRunsReclaimed } = effectsRunTransitionsServices;
  const { listStreamCacheFirst } = workReadServices;

  const { lockContextFor } = itemLockServices;
  const { answerAsk } = loopAskRequestServices;
  const { loopAsksDir } = loopAskRequestServices;
  const { askEnvFor } = loopAskServices;
  const { readExecutionOverlay } = boardMeshExecutionServices;
  const { resolveScopedExecution } = boardMeshExecutionServices;
  const { executionScopeRef } = boardMeshExecutionServices;
  const { awaitsAnswer } = boardMeshExecutionServices;

  const { buildNotifyEnvelope } = notifyNotifyServices;
  const { notify } = notifyNotifyServices;

  // Deferred: command-core registers this command; a static reverse import would close that registry cycle.
  const loadCommandCore = () => provideCommandCore();

  const { answerCommand, resumeCommand } = createReentryCommands({ resolveItem, resolveItemExact, requireLocalCheckout, readRuns, retryReadiness, isStale, transitionRunStart, transitionStaleRunsReclaimed, listStreamCacheFirst, meshNodeIdOf, lockContextFor, answerAsk, loopAsksDir, askEnvFor, readExecutionOverlay, resolveScopedExecution, executionScopeRef, awaitsAnswer, resolveWorkspaceId, buildNotifyEnvelope, notify, loadCommandCore });

  return { answerCommand, resumeCommand };
}
