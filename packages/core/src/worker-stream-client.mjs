// Compatibility entry; construction belongs to core application assembly.
import { workerStreamClient } from "./application/default.mjs";
export const {
  backoffDelaySeconds,
  buildSnapshotFrame,
  buildDeltaFrame,
  WORKTREE_CONTENT_FRAME_KIND,
  LOG_ENTRIES_FRAME_KIND,
  WITHDRAW_KIND,
  buildLogEntriesFrame,
  buildWorktreeContentFrame,
  buildPresenceFrame,
  buildAssignmentStatusFrame,
  buildCloneCredentialRequestFrame,
  buildCloneUrlRequestFrame,
  buildWriteCredentialRequestFrame,
  DEFAULT_CLONE_CREDENTIAL_TIMEOUT_MS,
  DEFAULT_CLONE_URL_TIMEOUT_MS,
  DEFAULT_WRITE_CREDENTIAL_TIMEOUT_MS,
  createWorkerStreamClient,
  createWorkerWsTransport,
} = workerStreamClient;
