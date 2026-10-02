// Core assembly: construct once per application; collaborators are supplied explicitly.
import path from "node:path";
import { importSqliteRuntime } from "@aof/foundation/sqlite-runtime";
import { createEffectsJournal } from "@aof/effects/journal";
import { createJournalOpener, mintEventId } from "@aof/effects/journal-open";
import * as api0 from "@aof/effects/journal";
import * as api1 from "@aof/execution/journal-queries";
import * as api2 from "@aof/mesh/journal-queries";

export function assembleEffectsJournal({ workspaceServices, degradeServices }) {
  // Core supplies the per-node path, runtime loader and diagnostics.

  const { globalMeshPaths } = workspaceServices;
  const { reportDegrade } = degradeServices;

  function effectsJournalPath(options = {}) {
    if (options.databasePath) return options.databasePath;
    const paths = options.paths ?? globalMeshPaths(options);
    return path.join(paths.workRoot, "journal.sqlite");
  }

  const storage = createEffectsJournal({ mintEventId, reportDegrade });
  const { appendEvent, pendingSteps, markStep, hasEventId, oldestEventAt, readEventSteps, readUnsettledSteps, readEvents, readStep } = storage;
  const { openEffectsJournal } = createJournalOpener({ effectsJournalPath, importSqliteRuntime, storage });

  return { "EFFECTS_JOURNAL_SCHEMA_VERSION": api0.EFFECTS_JOURNAL_SCHEMA_VERSION, "STEP_STATUSES": api0.STEP_STATUSES, "hasEventForRun": api1.hasEventForRun, "latestAppliedAssignmentParkEventId": api2.latestAppliedAssignmentParkEventId, effectsJournalPath, appendEvent, pendingSteps, markStep, hasEventId, oldestEventAt, readEventSteps, readUnsettledSteps, readEvents, readStep, openEffectsJournal };
}
