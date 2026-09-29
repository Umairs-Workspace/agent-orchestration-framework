// Transitional core composition for mesh-owned commands.
import { createMeshTerminalResumeCommands } from "@aof/mesh/commands/terminal-resume";
import { openGlobalWorkProjectionStore, readWorkItemRuns } from "../../global-work-store.mjs";
import { countDispatchSlotsByTarget } from "../../mesh/assignment-reclaim.mjs";
import { dispatchConcurrencyFromConfig } from "../../work/dispatch.mjs";
import { globalMeshPaths } from "../../workspace.mjs";
import { buildTerminalResumeEnvelope, createTerminalRelayPushTransport } from "../../mesh/terminal-relay-bridge.mjs";
import { latestAppliedAssignmentParkEventId } from "@aof/mesh/journal-queries";
import { openEffectsJournal } from "../../effects/journal.mjs";
import { reportDegrade } from "../../degrade.mjs";

export const { meshTerminalResumeCommand } = createMeshTerminalResumeCommands({ openGlobalWorkProjectionStore, readWorkItemRuns, countDispatchSlotsByTarget, dispatchConcurrencyFromConfig, globalMeshPaths, buildTerminalResumeEnvelope, createTerminalRelayPushTransport, latestAppliedAssignmentParkEventId, openEffectsJournal, reportDegrade });
