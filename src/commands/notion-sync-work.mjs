// Compatibility adapter: the Notion package owns this command's schema, argv, behavior, and rendering.
import { createNotionSyncWorkCommand } from '@aof/integration-notion/notion-sync-work';
import { commandError } from "@aof/contracts/error";
import { syncMilestoneWork, NOTION_SETUP_HINT } from "../notion/sync-work.mjs";
import { effectsJournalPath, openEffectsJournal, pendingSteps } from "../effects/journal.mjs";
import { drainEffects, LOCAL_LOCI } from "../effects/dispatch.mjs";
import { reportDegrade } from "../degrade.mjs";
export { NOTION_SETUP_HINT, defaultNotionSpawnFor } from '../notion/sync-work.mjs';
export const notionSyncWorkCommand = createNotionSyncWorkCommand({ commandError, syncMilestoneWork, effectsJournalPath, openEffectsJournal, pendingSteps, drainEffects, LOCAL_LOCI, reportDegrade });
