// Compatibility entry; construction belongs to core application assembly.
import { runSpendIngest } from "./application/default.mjs";
export const {
  readTranscriptTree,
  settleSpendFromTranscript,
  snapshotTranscriptTree,
} = runSpendIngest;
