import { readWorkItemView } from "@aof/work/store/work-item-store";
// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createRunReconciliation } from "@aof/execution/reconcile";
import { hasEventForRun } from "@aof/execution/journal-queries";

export function assembleEffectsReconcile({ workServices, runStoreServices, effectsTableServices, effectsJournalServices, degradeServices }) {
  // Core composition for execution-owned domain transitions.

  const { listItems } = workServices;
  const { readRuns } = runStoreServices;
  const { applicableReactors } = effectsTableServices;
  const { openEffectsJournal } = effectsJournalServices;
  const { appendEvent } = effectsJournalServices;
  const { oldestEventAt } = effectsJournalServices;
  const { effectsJournalPath } = effectsJournalServices;

  const { reportDegrade } = degradeServices;

  const { reconcileRunRecords } = createRunReconciliation({ listItems, readWorkItemView, readRuns, applicableReactors, openEffectsJournal, appendEvent, hasEventForRun, oldestEventAt, effectsJournalPath, reportDegrade });

  return { reconcileRunRecords };
}
