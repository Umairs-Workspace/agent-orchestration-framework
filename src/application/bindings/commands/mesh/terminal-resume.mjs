// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshTerminalResumeCommands } from "@aof/mesh/commands/terminal-resume";
import { latestAppliedAssignmentParkEventId } from "@aof/mesh/journal-queries";

export function assembleCommandsMeshTerminalResume({ globalWorkStoreServices, meshAssignmentReclaimServices, workDispatchServices, workspaceServices, meshTerminalRelayBridgeServices, effectsJournalServices, degradeServices }) {
  // Core composition for mesh-owned commands.

  const { openGlobalWorkProjectionStore } = globalWorkStoreServices;
  const { readWorkItemRuns } = globalWorkStoreServices;
  const { countDispatchSlotsByTarget } = meshAssignmentReclaimServices;
  const { dispatchConcurrencyFromConfig } = workDispatchServices;
  const { globalMeshPaths } = workspaceServices;
  const { buildTerminalResumeEnvelope } = meshTerminalRelayBridgeServices;
  const { createTerminalRelayPushTransport } = meshTerminalRelayBridgeServices;

  const { openEffectsJournal } = effectsJournalServices;
  const { reportDegrade } = degradeServices;

  const { meshTerminalResumeCommand } = createMeshTerminalResumeCommands({ openGlobalWorkProjectionStore, readWorkItemRuns, countDispatchSlotsByTarget, dispatchConcurrencyFromConfig, globalMeshPaths, buildTerminalResumeEnvelope, createTerminalRelayPushTransport, latestAppliedAssignmentParkEventId, openEffectsJournal, reportDegrade });

  return { meshTerminalResumeCommand };
}
