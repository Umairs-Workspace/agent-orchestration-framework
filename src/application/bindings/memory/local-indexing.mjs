// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createLocalIndexing } from "@aof/knowledge/memory/local-indexing";
import { ensureAofGitignore } from "../../../aof-gitignore.mjs";

export function assembleMemoryLocalIndexing({ workReadServices, importStoreServices, importMaterializeServices }) {
  // Core composition for knowledge-owned services.

  const { listItemsCacheFirst } = workReadServices;
  const { localItemsOnly } = workReadServices;
  const { reportReachThroughSkips } = workReadServices;

  const { importStoreRoot } = importStoreServices;
  const { ARCHITECTURE_FILE } = importMaterializeServices;
  const { RETROSPECTIVE_FILE } = importMaterializeServices;
  const { AOF_FILE } = importMaterializeServices;

  const { INDEX_VERSION, memoryIndexPath, parseRetrospective, parseArchitecture, parseAof, parseOutcome, IMPORT_ITEM_PREFIX, importItem, isImportRecord, resolveRecordSourcePath, buildRecords, buildIndex, reindex, status } = createLocalIndexing({ listItemsCacheFirst, localItemsOnly, reportReachThroughSkips, ensureAofGitignore, importStoreRoot, ARCHITECTURE_FILE, RETROSPECTIVE_FILE, AOF_FILE });

  return { INDEX_VERSION, memoryIndexPath, parseRetrospective, parseArchitecture, parseAof, parseOutcome, IMPORT_ITEM_PREFIX, importItem, isImportRecord, resolveRecordSourcePath, buildRecords, buildIndex, reindex, status };
}
