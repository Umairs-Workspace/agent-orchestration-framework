// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createLocalIndexing } from "@aof/knowledge/memory/local-indexing";
import { feedbackRecordPath, readFeedbackRecords } from "@aof/work/feedback-records";
import { ensureAofGitignore } from "../../../aof-gitignore.mjs";

export function assembleMemoryLocalIndexing({ workReadServices, importStoreServices, importMaterializeServices, runStoreServices, workObserveServices, degradeServices }) {
  // Core composition for knowledge-owned services.

  const { listItemsCacheFirst } = workReadServices;
  const { localItemsOnly } = workReadServices;
  const { reportReachThroughSkips } = workReadServices;

  const { importStoreRoot } = importStoreServices;
  const { ARCHITECTURE_FILE } = importMaterializeServices;
  const { RETROSPECTIVE_FILE } = importMaterializeServices;
  const { AOF_FILE } = importMaterializeServices;

  // 157/ADR-001 — the episodic leaf's readers: knowledge imports neither execution nor core, so
  // the run store, the snapshot reader and the feedback ledger arrive from here.
  const { readRuns, runRecordPath, runNodeRecordPath } = runStoreServices;
  const { readLatestSnapshot } = workObserveServices;
  const { reportDegrade } = degradeServices;
  const episodicReaders = { readRuns, runRecordPath, runNodeRecordPath, readLatestSnapshot, readFeedbackRecords, feedbackRecordPath, reportDegrade };

  const { INDEX_VERSION, memoryIndexPath, parseRetrospective, parseArchitecture, parseAof, parseOutcome, IMPORT_ITEM_PREFIX, importItem, isImportRecord, SOURCE_REFUSED, resolveRecordSourcePath, readRecordSourceValue, buildRecords, buildIndex, reindex, status } = createLocalIndexing({ listItemsCacheFirst, localItemsOnly, reportReachThroughSkips, ensureAofGitignore, importStoreRoot, ARCHITECTURE_FILE, RETROSPECTIVE_FILE, AOF_FILE, episodicReaders });

  return { INDEX_VERSION, memoryIndexPath, parseRetrospective, parseArchitecture, parseAof, parseOutcome, IMPORT_ITEM_PREFIX, importItem, isImportRecord, SOURCE_REFUSED, resolveRecordSourcePath, readRecordSourceValue, buildRecords, buildIndex, reindex, status };
}
