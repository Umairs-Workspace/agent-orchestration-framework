// The Notion package's own composition (chore 175): everything core's Notion bindings once wired —
// the sidecar mapping, the apply layer, the `ntn` CLI seam and the sync body — built here from the
// collaborators core injects through the contribution (169/ADR-002). Core supplies policy (workspace
// paths, tool identity, diagnostics, the work reads, the routing reader); the package owns the rest.
import { createNotionMapping, hashContent, resolvePageId, NOTION_WORK_MAP_FILE } from "./mapping.mjs";
import { createNotionApply } from "./sync.mjs";
import { createNotionCli, DEFAULT_TOKEN_ENV, NOTION_KEYRING_OFF, resolveNotionAuth, buildSpawnEnv } from "./cli.mjs";
import { createNotionSync, NOTION_SETUP_HINT } from "./sync-work.mjs";
import { RoutingError } from "./routing.mjs";
import { CLEAR_SENTINEL } from "./notion-associate.mjs";

export function createNotionServices({
  workspacePaths,
  descriptorFor,
  reportDegrade,
  nodeExecutable,
  commandError,
  parseFrontmatter,
  recordDoc,
  listItemsCacheFirst,
  localItemsOnly,
  reportReachThroughSkips,
  resolveMilestoneFolderByRef,
  routing,
}) {
  const { readMapping, recordPageId, remapMappingRefs } = createNotionMapping({ workspacePaths });
  const mapping = Object.freeze({ hashContent, resolvePageId, NOTION_WORK_MAP_FILE, readMapping, recordPageId, remapMappingRefs });

  const { applyPlan } = createNotionApply({ recordPageId });
  const sync = Object.freeze({ applyPlan });

  const { resolveNtnLauncher, makeNotionSpawn } = createNotionCli({ descriptorFor, reportDegrade, nodeExecutable });
  const cli = Object.freeze({ DEFAULT_TOKEN_ENV, NOTION_KEYRING_OFF, resolveNotionAuth, buildSpawnEnv, resolveNtnLauncher, makeNotionSpawn });

  // The board resolver is read from core's routing services, so the one descriptor reader serves both.
  const { defaultNotionSpawnFor, syncMilestoneWork } = createNotionSync({
    commandError, parseFrontmatter, recordDoc, listItemsCacheFirst, localItemsOnly, reportReachThroughSkips, readMapping, applyPlan, makeNotionSpawn,
    resolveNotionRouting: routing?.resolveNotionRouting, RoutingError, resolveMilestoneFolderByRef,
  });
  const syncWork = Object.freeze({ NOTION_SETUP_HINT, defaultNotionSpawnFor, syncMilestoneWork });

  return Object.freeze({ mapping, sync, cli, syncWork, associate: Object.freeze({ CLEAR_SENTINEL }) });
}
