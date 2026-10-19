// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createReentryCommands } from "@aof/work/commands/resume";
import { createQuestionsCommand } from "@aof/work/commands/questions";
import { meshNodeIdOf } from "@aof/mesh/commands/gate";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleCommandsResume({ commandsResolveServices, runStoreServices, effectsRunTransitionsServices, workReadServices, itemLockServices, loopAskRequestServices, loopAskServices, boardMeshExecutionServices, notifyNotifyServices, workServices, workspaceServices, degradeServices, provideCommandCore }) {
  // Core composition for work-owned resume commands, and the read side of `work:answer` (163).

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
  const { ASK_STATES } = loopAskRequestServices;
  const { answerAsk } = loopAskRequestServices;
  const { loopAsksDir } = loopAskRequestServices;
  const { readAsks } = loopAskRequestServices;
  const { askEnvFor } = loopAskServices;
  const { askRunStopped } = loopAskServices;
  const { formatElapsed } = loopAskServices;
  const { runsBehindAsk } = loopAskServices;
  const { standingAsk } = loopAskServices;
  const { readExecutionOverlay } = boardMeshExecutionServices;
  const { resolveScopedExecution } = boardMeshExecutionServices;
  const { executionScopeRef } = boardMeshExecutionServices;
  const { awaitsAnswer } = boardMeshExecutionServices;

  const { buildNotifyEnvelope } = notifyNotifyServices;
  const { notify } = notifyNotifyServices;
  const { loadWorkspace } = workServices;
  const { globalMeshPaths } = workspaceServices;
  const { reportDegrade } = degradeServices;

  // Deferred: command-core registers this command; a static reverse import would close that registry cycle.
  const loadCommandCore = () => provideCommandCore();

  const { answerCommand, resumeCommand } = createReentryCommands({ resolveItem, resolveItemExact, requireLocalCheckout, readRuns, retryReadiness, isStale, standingAsk, transitionRunStart, transitionStaleRunsReclaimed, listStreamCacheFirst, meshNodeIdOf, lockContextFor, answerAsk, loopAsksDir, askEnvFor, readExecutionOverlay, resolveScopedExecution, executionScopeRef, awaitsAnswer, resolveWorkspaceId, buildNotifyEnvelope, notify, loadCommandCore });
  const { questionsCommand } = createQuestionsCommand({ ASK_STATES, loopAsksDir, readAsks, askEnvFor, askRunStopped, runsBehindAsk, readExecutionOverlay, awaitsAnswer, executionScopeRef, resolveWorkspaceId, formatElapsed, loadWorkspace, globalMeshPaths, reportDegrade });

  return { answerCommand, questionsCommand, resumeCommand };
}
