// Core supplies work/routing services; synchronization belongs to the Notion package.
import { createNotionSync } from '@aof/integration-notion/sync-work';
import { commandError } from "../command-error.mjs";
import { parseFrontmatter, recordDoc } from "../work.mjs";
import { listItemsCacheFirst, localItemsOnly, reportReachThroughSkips } from "../work/read.mjs";
import { readMapping } from "./mapping.mjs";
import { applyPlan } from "./sync.mjs";
import { makeNotionSpawn } from "./cli.mjs";
import { resolveNotionRouting, RoutingError, resolveMilestoneFolderByRef } from "../integrations/routing.mjs";
export { NOTION_SETUP_HINT } from '@aof/integration-notion/sync-work';
export const { defaultNotionSpawnFor, syncMilestoneWork } = createNotionSync({
  commandError, parseFrontmatter, recordDoc, listItemsCacheFirst, localItemsOnly, reportReachThroughSkips, readMapping, applyPlan, makeNotionSpawn, resolveNotionRouting, RoutingError, resolveMilestoneFolderByRef,
});
