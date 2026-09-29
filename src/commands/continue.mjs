// Transitional core composition for work-owned continue commands.
import { createPhaseDoorCommands } from "@aof/work/commands/continue";
import { assignWork } from "../mesh/assignment.mjs";
import { resolveItem, resolveItemExact } from "./resolve.mjs";
import { transitionItemStatus } from "../effects/item-transitions.mjs";
import { readExecutionOverlay, resolveScopedExecution, executionScopeRef } from "../board-mesh-execution.mjs";
import { readStreamedItemRow } from "../cache-read.mjs";

export const { continueCommand, createPhaseDoorCommand, refineDoorCommand, resolveContinueDecision, resolveDirectivePhase, verifyDoorCommand } = createPhaseDoorCommands({ assignWork, resolveItem, resolveItemExact, transitionItemStatus, readExecutionOverlay, resolveScopedExecution, executionScopeRef, readStreamedItemRow });
