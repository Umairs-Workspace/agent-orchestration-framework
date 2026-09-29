// Transitional composition for execution-owned domain transitions.
import { createRunReconciliation } from "@aof/execution/reconcile";
import { listItems } from "../work.mjs";
import { readRuns } from "../run-store.mjs";
import { applicableReactors } from "./table.mjs";
import {
  openEffectsJournal,
  appendEvent,
  hasEventForRun,
  oldestEventAt,
  effectsJournalPath,
} from "./journal.mjs";
import { reportDegrade } from "../degrade.mjs";

export const { reconcileRunRecords } = createRunReconciliation({ listItems, readRuns, applicableReactors, openEffectsJournal, appendEvent, hasEventForRun, oldestEventAt, effectsJournalPath, reportDegrade });
