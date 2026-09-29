// Transitional core composition for work-loop-owned local dispatch.
import { createDispatchCommand } from "@aof/work-loop/commands/dispatch";
import { listItemsCacheFirst, nextWorkCacheFirst } from "../work/read.mjs";
import { effectsJournalPath, openEffectsJournal, readUnsettledSteps } from "../effects/journal.mjs";
import { drainEffects, LOCAL_LOCI } from "../effects/dispatch.mjs";
import {
  resolveDispatchLane,
  inspectDispatchLanes,
  sweepDispatchLanes,
  cleanupDispatchLane,
  overlappingFiles,
  dispatchReadySet,
  dispatchConcurrencyFromConfig,
  narrowDispatchBound,
  inspectDispatchLaneAdmission,
  planDispatchLaneAdmissions,
  withDispatchLaneAdmissionLock,
} from "../work/dispatch.mjs";

export const { dispatchCommand, settleLaneProjectionEffects } = createDispatchCommand({ listItemsCacheFirst, nextWorkCacheFirst, effectsJournalPath, openEffectsJournal, readUnsettledSteps, drainEffects, LOCAL_LOCI, resolveDispatchLane, inspectDispatchLanes, sweepDispatchLanes, cleanupDispatchLane, overlappingFiles, dispatchReadySet, dispatchConcurrencyFromConfig, narrowDispatchBound, inspectDispatchLaneAdmission, planDispatchLaneAdmissions, withDispatchLaneAdmissionLock });
