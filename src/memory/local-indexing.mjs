// Transitional core composition for knowledge-owned services.
import { createLocalIndexing } from "@aof/knowledge/memory/local-indexing";
import { listItemsCacheFirst, localItemsOnly, reportReachThroughSkips } from "../work/read.mjs";
import { ensureAofGitignore } from "../aof-gitignore.mjs";
import { importStoreRoot } from "../import/store.mjs";
import { ARCHITECTURE_FILE, RETROSPECTIVE_FILE, AOF_FILE } from "../import/materialize.mjs";

export const { INDEX_VERSION, memoryIndexPath, parseRetrospective, parseArchitecture, parseAof, parseOutcome, IMPORT_ITEM_PREFIX, importItem, isImportRecord, resolveRecordSourcePath, buildRecords, buildIndex, reindex, status } = createLocalIndexing({ listItemsCacheFirst, localItemsOnly, reportReachThroughSkips, ensureAofGitignore, importStoreRoot, ARCHITECTURE_FILE, RETROSPECTIVE_FILE, AOF_FILE });
