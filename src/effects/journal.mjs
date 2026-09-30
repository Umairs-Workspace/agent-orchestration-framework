// Compatibility entry; construction belongs to core application assembly.
import { effectsJournal } from "../application/default.mjs";
export const {
  EFFECTS_JOURNAL_SCHEMA_VERSION,
  STEP_STATUSES,
  hasEventForRun,
  latestAppliedAssignmentParkEventId,
  effectsJournalPath,
  appendEvent,
  pendingSteps,
  markStep,
  hasEventId,
  oldestEventAt,
  readEventSteps,
  readUnsettledSteps,
  readEvents,
  readStep,
  openEffectsJournal,
} = effectsJournal;
