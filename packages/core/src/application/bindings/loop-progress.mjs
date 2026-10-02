// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createLoopProgress } from "@aof/work-loop/progress";

export function assembleLoopProgress({ degradeServices, workDispatchServices }) {
  // Core composition; @aof/work-loop owns the implementation.

  const { reportDegrade } = degradeServices;
  const { laneChanges } = workDispatchServices;

  const implementation = createLoopProgress({
    diagnostics: { reportDegrade },
    dispatch: { laneChanges },
  });

  const appendProgressSample = implementation.appendProgressSample;
  const decideBuildProgress = implementation.decideBuildProgress;
  const evaluateProgressPolicy = implementation.evaluateProgressPolicy;
  const madeProgress = implementation.madeProgress;
  const progressLedgerPath = implementation.progressLedgerPath;
  const progressPolicyFromConfig = implementation.progressPolicyFromConfig;
  const progressSample = implementation.progressSample;
  const readProgressSamples = implementation.readProgressSamples;
  const sampleWorktreeProgress = implementation.sampleWorktreeProgress;

  return { appendProgressSample, decideBuildProgress, evaluateProgressPolicy, madeProgress, progressLedgerPath, progressPolicyFromConfig, progressSample, readProgressSamples, sampleWorktreeProgress };
}
