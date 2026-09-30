// Compatibility entry; construction belongs to core application assembly.
import { loopProgress } from "./application/default.mjs";
export const {
  appendProgressSample,
  decideBuildProgress,
  evaluateProgressPolicy,
  madeProgress,
  progressLedgerPath,
  progressPolicyFromConfig,
  progressSample,
  readProgressSamples,
  sampleWorktreeProgress,
} = loopProgress;
