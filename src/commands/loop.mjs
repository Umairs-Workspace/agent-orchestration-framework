// Compatibility composition; @aof/work-loop owns the implementation.
import { createLoopShell } from "@aof/work-loop/commands/loop";
import { loadWorkspace } from "../work.mjs";
import {
  decideBuildProgress,
  evaluateProgressPolicy,
  readProgressSamples,
} from "../loop-progress.mjs";
import { CONTROL_FINDING_CODES } from "../work/doctor-controls.mjs";
import {
  LOOP_FIX_TRANSPORT_KEYS,
  accumulatedRecord,
  admitResumeBuildRun,
  applyGradeBaseline,
  budgetElapsedMs,
  drivePhase,
  drivenRow,
  failingCountFromGrade,
  fixTransport,
  gradeFindings,
  gradeRoute,
  gradeStopCode,
  gradeStopProducer,
  gradeSummary,
  measureGradeBaseline,
  mergeGateFindings,
  progressReportFacts,
  readGradeBaseline,
  recordBuildProgress,
  retryUntilTerminal,
  runBrief,
  settleDriven,
  settleStoryCycle,
  transitionOptionsFor,
  reenterPrimaryAsks,
} from "../loop/cycle.mjs";
import {
  normalizeEffort,
  resolveSessionLaunch,
  THINKING_UNKNOWN_LEVEL,
  thinkingUnknownLevelMessage,
} from "../session-model.mjs";
import { resolveItemExact } from "./resolve.mjs";
import { declaredRubric } from "./grade.mjs";
import { meshNodeIdOf } from "./mesh/gate.mjs";
import { readRuns, staleRunningRuns } from "../run-store.mjs";
import {
  transitionRunStart,
  transitionStaleRunsReclaimed,
} from "../effects/run-transitions.mjs";
import { reportDegrade } from "../degrade.mjs";
import { commitWorktreeChanges, resolveExec } from "../mesh/worktree.mjs";
import { reconcileLanes, runWaveBuild } from "../loop/wave.mjs";
import { spawnLaneDrive } from "../loop/child-drive.mjs";
import {
  askBlockLines,
  askContext,
  askEnvFor,
  awaitAnswer,
  isParkedHalt,
  parkedHalt,
} from "../loop/ask.mjs";
import { installLoopDiagnostics, loopDiagLogDir, loopDiagScopeTag, readLastLoopDiagEvent } from "../loop-diag.mjs";
import { buildNotifyEnvelope, notify } from "../notify/notify.mjs";
import { handOffLoop, stopLoop } from "../loop/stop.mjs";
import {
  clearResumeRequest,
  clearStopRequest,
  createStopSource,
  loopResumesDir,
  loopStopsDir,
  markStopHonoured,
  readStopRequest,
  stopRequestPath,
} from "../loop/stop-request.mjs";

const implementation = createLoopShell({
  work: { loadWorkspace },
  progress: { decideBuildProgress, evaluateProgressPolicy, readProgressSamples },
  doctor: { CONTROL_FINDING_CODES },
  cycle: { LOOP_FIX_TRANSPORT_KEYS, accumulatedRecord, admitResumeBuildRun, applyGradeBaseline, budgetElapsedMs, drivePhase, drivenRow, failingCountFromGrade, fixTransport, gradeFindings, gradeRoute, gradeStopCode, gradeStopProducer, gradeSummary, measureGradeBaseline, mergeGateFindings, progressReportFacts, readGradeBaseline, recordBuildProgress, retryUntilTerminal, runBrief, settleDriven, settleStoryCycle, transitionOptionsFor, reenterPrimaryAsks },
  sessions: { normalizeEffort, resolveSessionLaunch, THINKING_UNKNOWN_LEVEL, thinkingUnknownLevelMessage },
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
  // Transitional core composition: the package never imports the assembled registry.
  invoke: async (id, input, ctx) => {
    const { invoke } = await import("../command-core.mjs");
    return await invoke(id, input, ctx);
  },
});

export const DOCTOR_GATE_CODES = implementation.DOCTOR_GATE_CODES;
export { LOOP_FIX_TRANSPORT_KEYS };
export const SHELL_LOOP_ID = implementation.SHELL_LOOP_ID;
export { admitResumeBuildRun };
export const admittedDoctorFindings = implementation.admittedDoctorFindings;
export { applyGradeBaseline };
export { failingCountFromGrade };
export { fixTransport };
export { gradeFindings };
export { gradeRoute };
export { gradeStopCode };
export { gradeStopProducer };
export { gradeSummary };
export const loopCommand = implementation.loopCommand;
export { mergeGateFindings };
export { readGradeBaseline };
export { recordBuildProgress };
export const renderLoopState = implementation.renderLoopState;
export const runLoopBody = implementation.runLoopBody;
export const runLoopLaunch = implementation.runLoopLaunch;
export const thinkingNarration = implementation.thinkingNarration;
