// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createRunSpendIngest } from "@aof/execution/spend";

export function assembleRunSpendIngest({ runStoreServices }) {
  // Core composition; @aof/execution owns run services.

  const { readRuns } = runStoreServices;
  const { settleRunFromVendor } = runStoreServices;

  const implementation = createRunSpendIngest({
    readRuns, settleRunFromVendor,
  });

  const readTranscriptTree = implementation.readTranscriptTree;
  const settleSpendFromTranscript = implementation.settleSpendFromTranscript;
  const snapshotTranscriptTree = implementation.snapshotTranscriptTree;

  return { readTranscriptTree, settleSpendFromTranscript, snapshotTranscriptTree };
}
