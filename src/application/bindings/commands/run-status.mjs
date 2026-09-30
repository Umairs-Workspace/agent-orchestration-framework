// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createRunStatusCommand } from "@aof/work/commands/run-status";
import { attemptElapsedMs } from "@aof/work-loop/engine";

export function assembleCommandsRunStatus({ commandsResolveServices, runStoreServices, cacheReadServices, boardMeshExecutionServices }) {
  // Core composition for work-owned run-status commands.

  const { resolveItem } = commandsResolveServices;
  const { readRuns } = runStoreServices;
  const { readWorkerRuns } = cacheReadServices;
  const { readStreamedItemRow } = cacheReadServices;
  const { executionScopeRef } = boardMeshExecutionServices;

  const { runStatusCommand } = createRunStatusCommand({ resolveItem, readRuns, readWorkerRuns, readStreamedItemRow, executionScopeRef, attemptElapsedMs });

  return { runStatusCommand };
}
