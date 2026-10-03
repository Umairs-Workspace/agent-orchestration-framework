// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createLoopShell } from "@aof/work-loop/commands/loop";
import { CONTROL_FINDING_CODES } from "@aof/work/audit/controls";
import {
  normalizeEffort,
  parseSessionChoices,
  resolveSessionTable,
  sessionTableLine,
} from "@aof/execution/session-model";
import { meshNodeIdOf } from "@aof/mesh/commands/gate";

export function assembleCommandsLoop({ workServices, loopProgressServices, loopCycleServices, commandsResolveServices, commandsGradeServices, runStoreServices, effectsRunTransitionsServices, degradeServices, meshWorktreeServices, loopWaveServices, loopChildDriveServices, loopAskServices, loopDiagServices, notifyNotifyServices, loopStopServices, loopStopRequestServices, provideCommandCore }) {
  // Core composition; @aof/work-loop owns the implementation.

  const { loadWorkspace } = workServices;
  const { decideBuildProgress } = loopProgressServices;
  const { evaluateProgressPolicy } = loopProgressServices;
  const { readProgressSamples } = loopProgressServices;

  const { LOOP_FIX_TRANSPORT_KEYS } = loopCycleServices;
  const { accumulatedRecord } = loopCycleServices;
  const { admitResumeBuildRun } = loopCycleServices;
  const { applyGradeBaseline } = loopCycleServices;
  const { budgetElapsedMs } = loopCycleServices;
  const { drivePhase } = loopCycleServices;
  const { drivenRow } = loopCycleServices;
  const { failingCountFromGrade } = loopCycleServices;
  const { fixTransport } = loopCycleServices;
  const { gradeFindings } = loopCycleServices;
  const { gradeRoute } = loopCycleServices;
  const { gradeStopCode } = loopCycleServices;
  const { gradeStopProducer } = loopCycleServices;
  const { gradeSummary } = loopCycleServices;
  const { measureGradeBaseline } = loopCycleServices;
  const { mergeGateFindings } = loopCycleServices;
  const { progressReportFacts } = loopCycleServices;
  const { readGradeBaseline } = loopCycleServices;
  const { recordBuildProgress } = loopCycleServices;
  const { retryUntilTerminal } = loopCycleServices;
  const { runBrief } = loopCycleServices;
  const { settleDriven } = loopCycleServices;
  const { settleStoryCycle } = loopCycleServices;
  const { transitionOptionsFor } = loopCycleServices;
  const { reenterPrimaryAsks } = loopCycleServices;

  const { resolveItemExact } = commandsResolveServices;
  const { declaredRubric } = commandsGradeServices;

  const { readRuns } = runStoreServices;
  const { staleRunningRuns } = runStoreServices;
  const { transitionRunStart } = effectsRunTransitionsServices;
  const { transitionStaleRunsReclaimed } = effectsRunTransitionsServices;
  const { reportDegrade } = degradeServices;
  const { commitWorktreeChanges } = meshWorktreeServices;
  const { resolveExec } = meshWorktreeServices;
  const { reconcileLanes } = loopWaveServices;
  const { runWaveBuild } = loopWaveServices;
  const { spawnLaneDrive } = loopChildDriveServices;
  const { askBlockLines } = loopAskServices;
  const { askContext } = loopAskServices;
  const { askEnvFor } = loopAskServices;
  const { awaitAnswer } = loopAskServices;
  const { isParkedHalt } = loopAskServices;
  const { parkedHalt } = loopAskServices;
  const { installLoopDiagnostics } = loopDiagServices;
  const { loopDiagLogDir } = loopDiagServices;
  const { loopDiagScopeTag } = loopDiagServices;
  const { readLastLoopDiagEvent } = loopDiagServices;
  const { buildNotifyEnvelope } = notifyNotifyServices;
  const { notify } = notifyNotifyServices;
  const { handOffLoop } = loopStopServices;
  const { stopLoop } = loopStopServices;
  const { clearResumeRequest } = loopStopRequestServices;
  const { clearStopRequest } = loopStopRequestServices;
  const { createStopSource } = loopStopRequestServices;
  const { loopResumesDir } = loopStopRequestServices;
  const { loopStopsDir } = loopStopRequestServices;
  const { markStopHonoured } = loopStopRequestServices;
  const { readStopRequest } = loopStopRequestServices;
  const { stopRequestPath } = loopStopRequestServices;

  const implementation = createLoopShell({
    work: { loadWorkspace },
    progress: { decideBuildProgress, evaluateProgressPolicy, readProgressSamples },
    doctor: { CONTROL_FINDING_CODES },
    cycle: { LOOP_FIX_TRANSPORT_KEYS, accumulatedRecord, admitResumeBuildRun, applyGradeBaseline, budgetElapsedMs, drivePhase, drivenRow, failingCountFromGrade, fixTransport, gradeFindings, gradeRoute, gradeStopCode, gradeStopProducer, gradeSummary, measureGradeBaseline, mergeGateFindings, progressReportFacts, readGradeBaseline, recordBuildProgress, retryUntilTerminal, runBrief, settleDriven, settleStoryCycle, transitionOptionsFor, reenterPrimaryAsks },
    sessions: { normalizeEffort, parseSessionChoices, resolveSessionTable, sessionTableLine },
    items: { resolveItemExact },
    gradeCommand: { declaredRubric },
    placement: { meshNodeIdOf },
    runs: { readRuns, staleRunningRuns },
    transitions: { transitionRunStart, transitionStaleRunsReclaimed },
    diagnostics: { reportDegrade },
    worktrees: { commitWorktreeChanges, resolveExec },
    wave: { reconcileLanes, runWaveBuild },
    childDrive: { spawnLaneDrive },
    asks: { askBlockLines, askContext, askEnvFor, awaitAnswer, isParkedHalt, parkedHalt },
    loopDiagnostics: { installLoopDiagnostics, loopDiagLogDir, loopDiagScopeTag, readLastLoopDiagEvent },
    notifications: { buildNotifyEnvelope, notify },
    stops: { handOffLoop, stopLoop },
    stopRequests: { clearResumeRequest, clearStopRequest, createStopSource, loopResumesDir, loopStopsDir, markStopHonoured, readStopRequest, stopRequestPath },
    // Core composition: the package never imports the assembled registry.
    invoke: async (id, input, ctx) => {
      const { invoke } = await provideCommandCore();
      return await invoke(id, input, ctx);
    },
  });

  const DOCTOR_GATE_CODES = implementation.DOCTOR_GATE_CODES;

  const SHELL_LOOP_ID = implementation.SHELL_LOOP_ID;

  const admittedDoctorFindings = implementation.admittedDoctorFindings;

  const loopCommand = implementation.loopCommand;

  const renderLoopState = implementation.renderLoopState;
  const runLoopBody = implementation.runLoopBody;
  const runLoopLaunch = implementation.runLoopLaunch;

  return { DOCTOR_GATE_CODES, LOOP_FIX_TRANSPORT_KEYS, SHELL_LOOP_ID, admitResumeBuildRun, admittedDoctorFindings, applyGradeBaseline, failingCountFromGrade, fixTransport, gradeFindings, gradeRoute, gradeStopCode, gradeStopProducer, gradeSummary, loopCommand, mergeGateFindings, readGradeBaseline, recordBuildProgress, renderLoopState, runLoopBody, runLoopLaunch };
}
