// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createNotionSyncWorkCommand } from "@aof/integration-notion/notion-sync-work";
import { commandError } from "@aof/contracts/error";

export function assembleCommandsNotionSyncWork({ notionSyncWorkServices, effectsJournalServices, effectsDispatchServices, degradeServices }) {
  // Core composition: the Notion package owns this command's schema, argv, behavior, and rendering.

  const { syncMilestoneWork } = notionSyncWorkServices;
  const { NOTION_SETUP_HINT } = notionSyncWorkServices;
  const { effectsJournalPath } = effectsJournalServices;
  const { openEffectsJournal } = effectsJournalServices;
  const { pendingSteps } = effectsJournalServices;
  const { drainEffects } = effectsDispatchServices;
  const { LOCAL_LOCI } = effectsDispatchServices;
  const { reportDegrade } = degradeServices;

  const notionSyncWorkCommand = createNotionSyncWorkCommand({ commandError, syncMilestoneWork, effectsJournalPath, openEffectsJournal, pendingSteps, drainEffects, LOCAL_LOCI, reportDegrade });

  return { "NOTION_SETUP_HINT": notionSyncWorkServices.NOTION_SETUP_HINT, "defaultNotionSpawnFor": notionSyncWorkServices.defaultNotionSpawnFor, notionSyncWorkCommand };
}
