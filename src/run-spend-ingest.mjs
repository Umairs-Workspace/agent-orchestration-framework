// Compatibility composition; @aof/execution owns run services.
import { createRunSpendIngest } from "@aof/execution/spend";
import { readRuns, settleRunFromVendor } from "./run-store.mjs";

const implementation = createRunSpendIngest({
  readRuns, settleRunFromVendor,
});

export const readTranscriptTree = implementation.readTranscriptTree;
export const settleSpendFromTranscript = implementation.settleSpendFromTranscript;
export const snapshotTranscriptTree = implementation.snapshotTranscriptTree;
