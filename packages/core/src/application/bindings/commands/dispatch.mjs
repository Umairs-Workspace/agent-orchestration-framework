// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDispatchCommand } from "@aof/work-loop/commands/dispatch";

export function assembleCommandsDispatch({ workReadServices, effectsJournalServices, effectsDispatchServices, workDispatchServices }) {
  // Core composition for work-loop-owned local dispatch.

  const { listItemsCacheFirst } = workReadServices;
  const { nextWorkCacheFirst } = workReadServices;
  const { effectsJournalPath } = effectsJournalServices;
  const { openEffectsJournal } = effectsJournalServices;
  const { readUnsettledSteps } = effectsJournalServices;
  const { drainEffects } = effectsDispatchServices;
  const { LOCAL_LOCI } = effectsDispatchServices;
  const { resolveDispatchLane } = workDispatchServices;
  const { inspectDispatchLanes } = workDispatchServices;
  const { sweepDispatchLanes } = workDispatchServices;
  const { cleanupDispatchLane } = workDispatchServices;
  const { overlappingFiles } = workDispatchServices;
  const { dispatchReadySet } = workDispatchServices;
  const { dispatchConcurrencyFromConfig } = workDispatchServices;
  const { narrowDispatchBound } = workDispatchServices;
  const { inspectDispatchLaneAdmission } = workDispatchServices;
  const { planDispatchLaneAdmissions } = workDispatchServices;
  const { withDispatchLaneAdmissionLock } = workDispatchServices;

  const { dispatchCommand, settleLaneProjectionEffects } = createDispatchCommand({ listItemsCacheFirst, nextWorkCacheFirst, effectsJournalPath, openEffectsJournal, readUnsettledSteps, drainEffects, LOCAL_LOCI, resolveDispatchLane, inspectDispatchLanes, sweepDispatchLanes, cleanupDispatchLane, overlappingFiles, dispatchReadySet, dispatchConcurrencyFromConfig, narrowDispatchBound, inspectDispatchLaneAdmission, planDispatchLaneAdmissions, withDispatchLaneAdmissionLock });

  return { dispatchCommand, settleLaneProjectionEffects };
}
