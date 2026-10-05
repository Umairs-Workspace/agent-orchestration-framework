// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createStoryCycle } from "@aof/work-loop/cycle";
import { ADVISORY_CODES, GRADE_CODES, GRADE_VERDICTS, boundGradeFailures } from "@aof/work/grade";
import { PHASE_BRIEF_MAX_CHARS } from "@aof/work/phase-brief";
import { meshNodeIdOf } from "@aof/mesh/commands/gate";

export function assembleLoopCycle({ commandsResolveServices, loopChildDriveServices, loopAskServices, loopAskRequestServices, workDispatchServices, meshWorktreeServices, loopProgressServices, commandsGradeServices, itemLockServices, runStoreServices, effectsRunTransitionsServices, degradeServices, runSpendIngestServices, provideCommandCore }) {
  // Core composition; @aof/work-loop owns the implementation.

  const { resolveItemExact } = commandsResolveServices;
  const { requireLocalCheckout } = commandsResolveServices;
  const { LANE_CANCEL_GRACE_MS } = loopChildDriveServices;
  const { childDriveOutcome } = loopChildDriveServices;
  const { loopFixFilePath } = loopChildDriveServices;
  // 147 — the repair hand-over's home under the aof home.
  const { loopRepairFilePath } = loopChildDriveServices;
  const { askEnvFor } = loopAskServices;
  const { askFileFor } = loopAskServices;
  const { awaitAnswer } = loopAskServices;
  const { liveOwnerHolds } = loopAskServices;
  const { parkedHalt } = loopAskServices;
  const { reenterStandingAsks } = loopAskServices;
  const { standingAsk } = loopAskServices;
  const { sweepStaleAsks } = loopAskServices;
  const { readAsk } = loopAskRequestServices;
  const { resolveRefInWorktree } = workDispatchServices;
  const { meshDispatchWorktreePath } = meshWorktreeServices;
  const { appendProgressSample } = loopProgressServices;
  const { decideBuildProgress } = loopProgressServices;
  const { evaluateProgressPolicy } = loopProgressServices;
  const { readProgressSamples } = loopProgressServices;
  const { sampleWorktreeProgress } = loopProgressServices;

  const { declaredRubric } = commandsGradeServices;
  const { lockContextFor } = itemLockServices;

  const { isStale } = runStoreServices;
  const { parseResumeAfter } = runStoreServices;
  const { readRuns } = runStoreServices;
  const { transitionRunComplete } = effectsRunTransitionsServices;
  const { transitionRunStart } = effectsRunTransitionsServices;
  const { reportDegrade } = degradeServices;
  const { settleSpendFromTranscript } = runSpendIngestServices;

  const implementation = createStoryCycle({
    items: { resolveItemExact, requireLocalCheckout },
    childDrive: { LANE_CANCEL_GRACE_MS, childDriveOutcome, loopFixFilePath, loopRepairFilePath },
    asks: { askEnvFor, askFileFor, awaitAnswer, liveOwnerHolds, parkedHalt, reenterStandingAsks, standingAsk, sweepStaleAsks },
    askRequests: { readAsk },
    dispatch: { resolveRefInWorktree },
    worktrees: { meshDispatchWorktreePath },
    progress: { appendProgressSample, decideBuildProgress, evaluateProgressPolicy, readProgressSamples, sampleWorktreeProgress },
    grading: { ADVISORY_CODES, GRADE_CODES, GRADE_VERDICTS, boundGradeFailures },
    briefs: { PHASE_BRIEF_MAX_CHARS },
    gradeCommand: { declaredRubric },
    locks: { lockContextFor },
    placement: { meshNodeIdOf },
    runs: { isStale, parseResumeAfter, readRuns },
    transitions: { transitionRunComplete, transitionRunStart },
    diagnostics: { reportDegrade },
    spend: { settleSpendFromTranscript },
    // Core composition: the package never imports the assembled registry.
    invoke: async (id, input, ctx) => {
      const { invoke } = await provideCommandCore();
      return await invoke(id, input, ctx);
    },
  });

  const LOOP_FIX_TRANSPORT_KEYS = implementation.LOOP_FIX_TRANSPORT_KEYS;
  const accumulatedRecord = implementation.accumulatedRecord;
  const admitResumeBuildRun = implementation.admitResumeBuildRun;
  const applyGradeBaseline = implementation.applyGradeBaseline;
  const budgetElapsedMs = implementation.budgetElapsedMs;
  const drivePhase = implementation.drivePhase;
  const drivenRow = implementation.drivenRow;
  const failingCountFromGrade = implementation.failingCountFromGrade;
  const fixTransport = implementation.fixTransport;
  const gradeFindings = implementation.gradeFindings;
  const gradeRoute = implementation.gradeRoute;
  const gradeStopCode = implementation.gradeStopCode;
  const gradeStopProducer = implementation.gradeStopProducer;
  const gradeSummary = implementation.gradeSummary;
  const measureGradeBaseline = implementation.measureGradeBaseline;
  const mergeGateFindings = implementation.mergeGateFindings;
  const progressReportFacts = implementation.progressReportFacts;
  const readGradeBaseline = implementation.readGradeBaseline;
  const recordBuildProgress = implementation.recordBuildProgress;
  const reenterPrimaryAsks = implementation.reenterPrimaryAsks;
  const repairLaneHalt = implementation.repairLaneHalt;
  const retryUntilTerminal = implementation.retryUntilTerminal;
  const runBrief = implementation.runBrief;
  const settleDriven = implementation.settleDriven;
  const settleStoryCycle = implementation.settleStoryCycle;
  const transitionOptionsFor = implementation.transitionOptionsFor;

  return { LOOP_FIX_TRANSPORT_KEYS, accumulatedRecord, admitResumeBuildRun, applyGradeBaseline, budgetElapsedMs, drivePhase, drivenRow, failingCountFromGrade, fixTransport, gradeFindings, gradeRoute, gradeStopCode, gradeStopProducer, gradeSummary, measureGradeBaseline, mergeGateFindings, progressReportFacts, readGradeBaseline, recordBuildProgress, reenterPrimaryAsks, repairLaneHalt, retryUntilTerminal, runBrief, settleDriven, settleStoryCycle, transitionOptionsFor };
}
