// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createPhaseDoorCommands } from "@aof/work/commands/continue";

export function assembleCommandsContinue({ meshAssignmentServices, commandsResolveServices, effectsItemTransitionsServices, boardMeshExecutionServices, cacheReadServices }) {
  // Core composition for work-owned continue commands.

  const { assignWork } = meshAssignmentServices;
  const { resolveItem } = commandsResolveServices;
  const { resolveItemExact } = commandsResolveServices;
  const { transitionItemStatus } = effectsItemTransitionsServices;
  const { readExecutionOverlay } = boardMeshExecutionServices;
  const { resolveScopedExecution } = boardMeshExecutionServices;
  const { executionScopeRef } = boardMeshExecutionServices;
  const { readStreamedItemRow } = cacheReadServices;

  const { continueCommand, createPhaseDoorCommand, refineDoorCommand, resolveContinueDecision, resolveDirectivePhase, verifyDoorCommand } = createPhaseDoorCommands({ assignWork, resolveItem, resolveItemExact, transitionItemStatus, readExecutionOverlay, resolveScopedExecution, executionScopeRef, readStreamedItemRow });

  return { continueCommand, createPhaseDoorCommand, refineDoorCommand, resolveContinueDecision, resolveDirectivePhase, verifyDoorCommand };
}
