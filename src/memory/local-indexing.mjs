// Compatibility entry; construction belongs to core application assembly.
import { memoryLocalIndexing } from "../application/default.mjs";
export const {
  INDEX_VERSION,
  memoryIndexPath,
  parseRetrospective,
  parseArchitecture,
  parseAof,
  parseOutcome,
  IMPORT_ITEM_PREFIX,
  importItem,
  isImportRecord,
  resolveRecordSourcePath,
  buildRecords,
  buildIndex,
  reindex,
  status,
} = memoryLocalIndexing;
