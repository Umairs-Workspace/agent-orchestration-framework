// Compatibility composition; @aof/work-loop owns the implementation.
import { createStoryCycle } from "@aof/work-loop/cycle";
import { resolveItemExact, requireLocalCheckout } from "../commands/resolve.mjs";
import { LANE_CANCEL_GRACE_MS, childDriveOutcome, loopFixFilePath } from "./child-drive.mjs";
import { askEnvFor, askFileFor, awaitAnswer, liveOwnerHolds, parkedHalt, reenterStandingAsks, standingAsk, sweepStaleAsks } from "./ask.mjs";
import { readAsk } from "./ask-request.mjs";
import { resolveRefInWorktree } from "../work/dispatch.mjs";
import { meshDispatchWorktreePath } from "../mesh/worktree.mjs";
import {
  appendProgressSample,
  decideBuildProgress,
  evaluateProgressPolicy,
  readProgressSamples,
  sampleWorktreeProgress,
} from "../loop-progress.mjs";
import { ADVISORY_CODES, GRADE_CODES, GRADE_VERDICTS, boundGradeFailures } from "../work/grade.mjs";
import { PHASE_BRIEF_MAX_CHARS } from "@aof/work/phase-brief";
import { declaredRubric } from "../commands/grade.mjs";
import { lockContextFor } from "../item-lock.mjs";
import { meshNodeIdOf } from "../commands/mesh/gate.mjs";
import { isStale, parseResumeAfter, readRuns } from "../run-store.mjs";
import { transitionRunComplete, transitionRunStart } from "../effects/run-transitions.mjs";
import { reportDegrade } from "../degrade.mjs";
import { settleSpendFromTranscript } from "../run-spend-ingest.mjs";

const implementation = createStoryCycle({
  items: { resolveItemExact, requireLocalCheckout },
  childDrive: { LANE_CANCEL_GRACE_MS, childDriveOutcome, loopFixFilePath },
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
  // Transitional core composition: the package never imports the assembled registry.
  invoke: async (id, input, ctx) => {
    const { invoke } = await import("../command-core.mjs");
    return await invoke(id, input, ctx);
  },
});

export const LOOP_FIX_TRANSPORT_KEYS = implementation.LOOP_FIX_TRANSPORT_KEYS;
export const accumulatedRecord = implementation.accumulatedRecord;
export const admitResumeBuildRun = implementation.admitResumeBuildRun;
export const applyGradeBaseline = implementation.applyGradeBaseline;
export const budgetElapsedMs = implementation.budgetElapsedMs;
export const drivePhase = implementation.drivePhase;
export const drivenRow = implementation.drivenRow;
export const failingCountFromGrade = implementation.failingCountFromGrade;
export const fixTransport = implementation.fixTransport;
export const gradeFindings = implementation.gradeFindings;
export const gradeRoute = implementation.gradeRoute;
export const gradeStopCode = implementation.gradeStopCode;
export const gradeStopProducer = implementation.gradeStopProducer;
export const gradeSummary = implementation.gradeSummary;
export const measureGradeBaseline = implementation.measureGradeBaseline;
export const mergeGateFindings = implementation.mergeGateFindings;
export const progressReportFacts = implementation.progressReportFacts;
export const readGradeBaseline = implementation.readGradeBaseline;
export const recordBuildProgress = implementation.recordBuildProgress;
export const reenterPrimaryAsks = implementation.reenterPrimaryAsks;
export const retryUntilTerminal = implementation.retryUntilTerminal;
export const runBrief = implementation.runBrief;
export const settleDriven = implementation.settleDriven;
export const settleStoryCycle = implementation.settleStoryCycle;
export const transitionOptionsFor = implementation.transitionOptionsFor;
