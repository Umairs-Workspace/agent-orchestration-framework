// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createPhaseDoorCommands } from "@aof/work/commands/continue";
import { createExamplesBuildDoor } from "@aof/specification-by-example/build-door";
import { teachMode } from "@aof/learning/mode";

export function assembleCommandsContinue({ meshAssignmentServices, commandsResolveServices, effectsItemTransitionsServices, boardMeshExecutionServices, cacheReadServices, configInspectServices, workDoctorExamplesServices, provideWorkExamplesAnswers }) {
  // Core composition for work-owned continue commands.

  const { assignWork } = meshAssignmentServices;
  const { resolveItem } = commandsResolveServices;
  const { resolveItemExact } = commandsResolveServices;
  const { transitionItemStatus } = effectsItemTransitionsServices;
  const { readExecutionOverlay } = boardMeshExecutionServices;
  const { resolveScopedExecution } = boardMeshExecutionServices;
  const { executionScopeRef } = boardMeshExecutionServices;
  const { readStreamedItemRow } = cacheReadServices;
  const { examplesEnabledFromConfig } = configInspectServices;
  const { examplesFindings } = workDoctorExamplesServices;
  // Deferred: the answers collector is assembled after this door; the door calls it only at run time.
  const collectAnswers = async (...args) => (await provideWorkExamplesAnswers()).collectAnswers(...args);
  // 135/ADR-001 §3 — specification by example's check, handed to the build door as one before-build entry.
  const { refuseOpenExamples } = createExamplesBuildDoor({ examplesEnabledFromConfig, examplesFindings, collectAnswers });

  // 179/ADR-004 §3 — teaching's operator-led mode, handed to the build door as one descriptor.
  const { continueCommand, createPhaseDoorCommand, refineDoorCommand, resolveContinueDecision, resolveDirectivePhase, verifyDoorCommand } = createPhaseDoorCommands({ assignWork, resolveItem, resolveItemExact, transitionItemStatus, readExecutionOverlay, resolveScopedExecution, executionScopeRef, readStreamedItemRow, beforeBuild: [refuseOpenExamples], operatorModes: [teachMode] });

  return { continueCommand, createPhaseDoorCommand, refineDoorCommand, resolveContinueDecision, resolveDirectivePhase, verifyDoorCommand };
}
