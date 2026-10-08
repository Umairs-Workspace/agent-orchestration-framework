// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshParkResumeServices } from "@aof/mesh/park-resume";

export function assembleMeshParkResume({ runStoreServices, workObserveServices, effectsAssignmentTransitionsServices, effectsRunTransitionsServices, degradeServices, provideMeshPresence, provideWork, provideNotifyNotify }) {
  // Core composition for mesh-owned coordination.

  const { readRuns } = runStoreServices;
  const { answerRunAsk } = runStoreServices;
  const { heartbeat } = runStoreServices;
  const { openRunAsk } = runStoreServices;
  const { readAskQuestion, readPendingAsk } = workObserveServices;
  const { claimAssignmentParkResume } = effectsAssignmentTransitionsServices;
  const { completeAssignmentParkResume } = effectsAssignmentTransitionsServices;
  const { reportAssignmentSettled } = effectsAssignmentTransitionsServices;
  const { reportTerminalResumeRefused } = effectsAssignmentTransitionsServices;
  const { transitionRunComplete } = effectsRunTransitionsServices;
  const { reportDegrade } = degradeServices;

  const { settleStrandedRuns, createMeshParkResume, directivePhase, readWorkerAsk, announceWorkerAsk } = createMeshParkResumeServices({ readRuns, answerRunAsk, heartbeat, openRunAsk, readAskQuestion, readPendingAsk, claimAssignmentParkResume, completeAssignmentParkResume, reportAssignmentSettled, reportTerminalResumeRefused, transitionRunComplete, reportDegrade, loadPresence: () => provideMeshPresence(), loadWork: () => provideWork(), loadNotifications: () => provideNotifyNotify() });

  return { settleStrandedRuns, createMeshParkResume, directivePhase, readWorkerAsk, announceWorkerAsk };
}
