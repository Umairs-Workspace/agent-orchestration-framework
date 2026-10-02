// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createNotionSync } from "@aof/integration-notion/sync-work";
import { commandError } from "@aof/contracts/error";
import { RoutingError } from "@aof/integration-notion/routing";
import { resolveMilestoneFolderByRef } from "@aof/work/legacy-milestone-discovery";
import * as api0 from "@aof/integration-notion/sync-work";

export function assembleNotionSyncWork({ workServices, workReadServices, notionMappingServices, notionSyncServices, notionCliServices, integrationsRoutingServices }) {
  // Core supplies work/routing services; synchronization belongs to the Notion package.

  const { parseFrontmatter } = workServices;
  const { recordDoc } = workServices;
  const { listItemsCacheFirst } = workReadServices;
  const { localItemsOnly } = workReadServices;
  const { reportReachThroughSkips } = workReadServices;
  const { readMapping } = notionMappingServices;
  const { applyPlan } = notionSyncServices;
  const { makeNotionSpawn } = notionCliServices;
  const { resolveNotionRouting } = integrationsRoutingServices;

  const { defaultNotionSpawnFor, syncMilestoneWork } = createNotionSync({
    commandError, parseFrontmatter, recordDoc, listItemsCacheFirst, localItemsOnly, reportReachThroughSkips, readMapping, applyPlan, makeNotionSpawn, resolveNotionRouting, RoutingError, resolveMilestoneFolderByRef,
  });

  return { "NOTION_SETUP_HINT": api0.NOTION_SETUP_HINT, defaultNotionSpawnFor, syncMilestoneWork };
}
