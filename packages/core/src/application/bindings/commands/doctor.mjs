// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDoctorCommand } from "@aof/work/commands/doctor";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { meshNodeIdOf } from "@aof/mesh/commands/gate";
import { probeFabric, remediationForReason } from "@aof/mesh/fabric";

export function assembleCommandsDoctor({ workDoctorServices, globalWorkPublisherServices, cacheReadServices, workReadServices, effectsTableServices, effectsJournalServices, effectsDispatchServices, effectsReconcileServices, workObserveServices, meshPresenceServices, provideCommandCore }) {
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
  // 164/03 — the sync lane reads the owed publishes, and asks the one propagation predicate.
  const { readUnsettledSteps } = effectsJournalServices;
  const { meshGlobalPropagationDecision } = globalWorkPublisherServices;
  const { pendingSteps } = effectsJournalServices;
  const { drainEffects } = effectsDispatchServices;
  const { reachableLoci } = effectsDispatchServices;
  const { reconcileRunRecords } = effectsReconcileServices;
  // 167/00 — the daemon-cost lane reads the snapshots through the presence module's reader.
  const readCostSnapshots = meshPresenceServices?.readCostSnapshots;
  const execFileAsync = promisify(execFile);

  const loadNodeIdentity = () => import("@aof/mesh/node-identity");
  // Deferred operation: the supplied callback requires a ready application.
  // Registration does not invoke it; shutdown revokes it with the other ports.
  const loadCommandCore = () => provideCommandCore();

  const { doctorCommand, readRenameMap } = createDoctorCommand({ buildSnapshot, doctorWork, staleWindowFromConfig, CONVENTION_DOCS, claudeProjectsDir, readCachedWorkFacts, isMeshWorktree, meshNodeIdOf, probeFabric, remediationForReason, effectsFor, knownEvents, openEffectsJournal, effectsJournalPath, readEvents, readEventSteps, readUnsettledSteps, meshGlobalPropagationDecision, pendingSteps, drainEffects, reachableLoci, reconcileRunRecords, execFileAsync, loadNodeIdentity, loadCommandCore, readCostSnapshots });

  return { doctorCommand, readRenameMap };
}
