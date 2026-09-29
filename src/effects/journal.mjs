// Core supplies the per-node path, runtime loader and diagnostics.
import path from "node:path";
import { importSqliteRuntime } from "@aof/foundation/sqlite-runtime";
import { globalMeshPaths } from "../workspace.mjs";
import { reportDegrade } from "../degrade.mjs";
import { createEffectsJournal } from "@aof/effects/journal";
import { createJournalOpener, mintEventId } from "@aof/effects/journal-open";
export { EFFECTS_JOURNAL_SCHEMA_VERSION, STEP_STATUSES } from "@aof/effects/journal";
export { hasEventForRun } from "@aof/execution/journal-queries";
export { latestAppliedAssignmentParkEventId } from "@aof/mesh/journal-queries";

export function effectsJournalPath(options = {}) {
  if (options.databasePath) return options.databasePath;
  const paths = options.paths ?? globalMeshPaths(options);
  return path.join(paths.workRoot, "journal.sqlite");
}

const storage = createEffectsJournal({ mintEventId, reportDegrade });
export const { appendEvent, pendingSteps, markStep, hasEventId, oldestEventAt, readEventSteps, readUnsettledSteps, readEvents, readStep } = storage;
export const { openEffectsJournal } = createJournalOpener({ effectsJournalPath, importSqliteRuntime, storage });
