// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDoctorCommand } from "@aof/work/commands/doctor";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { meshNodeIdOf } from "@aof/mesh/commands/gate";
import { probeFabric, remediationForReason } from "@aof/mesh/fabric";

export function assembleCommandsDoctor({ workDoctorServices, cacheReadServices, workReadServices, effectsTableServices, effectsJournalServices, effectsDispatchServices, effectsReconcileServices, workObserveServices, provideCommandCore }) {
  // Core composition for work-owned doctor commands.

  const { buildSnapshot } = workDoctorServices;
  const { doctorWork } = workDoctorServices;
  const { staleWindowFromConfig } = workDoctorServices;
  const { CONVENTION_DOCS } = workDoctorServices;
  const { claudeProjectsDir } = workObserveServices;
  const { readCachedWorkFacts } = cacheReadServices;
  const { isMeshWorktree } = workReadServices;

  const { effectsFor } = effectsTableServices;
  const { knownEvents } = effectsTableServices;
  const { openEffectsJournal } = effectsJournalServices;
  const { effectsJournalPath } = effectsJournalServices;
  const { readEvents } = effectsJournalServices;
  const { readEventSteps } = effectsJournalServices;
  const { pendingSteps } = effectsJournalServices;
  const { drainEffects } = effectsDispatchServices;
  const { reachableLoci } = effectsDispatchServices;
  const { reconcileRunRecords } = effectsReconcileServices;
  const execFileAsync = promisify(execFile);

  const loadNodeIdentity = () => import("@aof/mesh/node-identity");
  // Deferred operation: the supplied callback requires a ready application.
  // Registration does not invoke it; shutdown revokes it with the other ports.
  const loadCommandCore = () => provideCommandCore();

  const { doctorCommand, readRenameMap } = createDoctorCommand({ buildSnapshot, doctorWork, staleWindowFromConfig, CONVENTION_DOCS, claudeProjectsDir, readCachedWorkFacts, isMeshWorktree, meshNodeIdOf, probeFabric, remediationForReason, effectsFor, knownEvents, openEffectsJournal, effectsJournalPath, readEvents, readEventSteps, pendingSteps, drainEffects, reachableLoci, reconcileRunRecords, execFileAsync, loadNodeIdentity, loadCommandCore });

  return { doctorCommand, readRenameMap };
}
