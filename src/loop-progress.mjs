// Compatibility composition; @aof/work-loop owns the implementation.
import { createLoopProgress } from "@aof/work-loop/progress";
import { reportDegrade } from "./degrade.mjs";
import { laneChanges } from "./work/dispatch.mjs";

const implementation = createLoopProgress({
  diagnostics: { reportDegrade },
  dispatch: { laneChanges },
});

export const appendProgressSample = implementation.appendProgressSample;
export const decideBuildProgress = implementation.decideBuildProgress;
export const evaluateProgressPolicy = implementation.evaluateProgressPolicy;
export const madeProgress = implementation.madeProgress;
export const progressLedgerPath = implementation.progressLedgerPath;
export const progressPolicyFromConfig = implementation.progressPolicyFromConfig;
export const progressSample = implementation.progressSample;
export const readProgressSamples = implementation.readProgressSamples;
export const sampleWorktreeProgress = implementation.sampleWorktreeProgress;
