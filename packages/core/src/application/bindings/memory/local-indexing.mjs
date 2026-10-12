// Core assembly: construct once per application; collaborators are supplied explicitly.
import path from "node:path";
import { createLocalIndexing } from "@aof/knowledge/memory/local-indexing";
import { feedbackRecordPath, readFeedbackRecords } from "@aof/work/feedback-records";
import { createClaudeAutoMemory } from "@aof/knowledge/memory/claude-auto-memory";
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
  const { readLatestSnapshot, claudeProjectsDir } = workObserveServices;
  const { reportDegrade } = degradeServices;
  const episodicReaders = { readRuns, runRecordPath, runNodeRecordPath, readLatestSnapshot, readFeedbackRecords, feedbackRecordPath, reportDegrade };

  // 159/ADR-001 — the opt-in operator auto-memory source. The project directory is the EXISTING
  // resolver's (slugging and CLAUDE_CONFIG_DIR stay in observe), keyed by the workspace project root
  // and never the shell's incidental cwd; the diagnostics ride the existing degrade channel.
  const autoMemory = createClaudeAutoMemory({
    memoryDirFor: ({ projectRoot, env }) => path.join(claudeProjectsDir({ cwd: projectRoot, env }), "memory"),
    reportDegrade,
  });

  const { INDEX_VERSION, memoryIndexPath, parseRetrospective, parseArchitecture, parseAof, parseOutcome, IMPORT_ITEM_PREFIX, importItem, isImportRecord, SOURCE_REFUSED, resolveRecordSourcePath, readRecordSourceValue, buildRecords, buildIndex, reindex, status } = createLocalIndexing({ listItemsCacheFirst, localItemsOnly, reportReachThroughSkips, ensureAofGitignore, importStoreRoot, ARCHITECTURE_FILE, RETROSPECTIVE_FILE, AOF_FILE, episodicReaders, autoMemory });

  return { INDEX_VERSION, memoryIndexPath, parseRetrospective, parseArchitecture, parseAof, parseOutcome, IMPORT_ITEM_PREFIX, importItem, isImportRecord, SOURCE_REFUSED, resolveRecordSourcePath, readRecordSourceValue, buildRecords, buildIndex, reindex, status };
}
