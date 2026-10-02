// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createListCommand } from "@aof/work/commands/list";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleCommandsList({ workReadServices, boardMeshExecutionServices, cacheReadServices, loopAskRequestServices, degradeServices }) {
  // Core composition for work-owned reads.

  const { listStreamCacheFirst } = workReadServices;
  const { withoutAnsweringSide } = workReadServices;
  const { readExecutionOverlay } = boardMeshExecutionServices;
  const { applyExecutionOverlay } = boardMeshExecutionServices;
  const { awaitsAnswer } = boardMeshExecutionServices;
  const { readWorkerItems } = cacheReadServices;
  const { mergeWorkerItems } = cacheReadServices;
  const { readCachedProvenance } = cacheReadServices;
  const { applyCachedProvenance } = cacheReadServices;
  const { ASK_STATES } = loopAskRequestServices;
  const { loopAsksDir } = loopAskRequestServices;
  const { readAsks } = loopAskRequestServices;

  const { reportDegrade } = degradeServices;

  const { applyAskOverlay, listCommand } = createListCommand({ listStreamCacheFirst, withoutAnsweringSide, readExecutionOverlay, applyExecutionOverlay, awaitsAnswer, readWorkerItems, mergeWorkerItems, readCachedProvenance, applyCachedProvenance, ASK_STATES, loopAsksDir, readAsks, resolveWorkspaceId, reportDegrade });

  return { applyAskOverlay, listCommand };
}
