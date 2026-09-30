// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createWorkerStreamServices } from "@aof/mesh/worker-stream-client";
import { EFFECT_STEP_FRAME_KIND, EFFECT_ACK_FRAME_KIND } from "@aof/mesh/effect-frames";

export function assembleWorkerStreamClient({ meshTerminalRelayBridgeServices, meshRecoveryPushServices, meshResyncServices, degradeServices }) {
  // Core composition for mesh-owned runtime services.

  const { buildTerminalFrameEnvelope } = meshTerminalRelayBridgeServices;
  const { buildTerminalEndEnvelope } = meshTerminalRelayBridgeServices;
  const { TERMINAL_INPUT_KIND } = meshTerminalRelayBridgeServices;
  const { TERMINAL_RESUME_KIND } = meshTerminalRelayBridgeServices;
  const { RECOVERY_PUSH_KIND } = meshRecoveryPushServices;
  const { buildRecoveryPushResultFrame } = meshRecoveryPushServices;
  const { RESYNC_KIND } = meshResyncServices;
  const { buildResyncResultFrame } = meshResyncServices;
  const { reportDegrade } = degradeServices;

  const { backoffDelaySeconds, buildSnapshotFrame, buildDeltaFrame, WORKTREE_CONTENT_FRAME_KIND, LOG_ENTRIES_FRAME_KIND, WITHDRAW_KIND, buildLogEntriesFrame, buildWorktreeContentFrame, buildPresenceFrame, buildAssignmentStatusFrame, buildCloneCredentialRequestFrame, buildCloneUrlRequestFrame, buildWriteCredentialRequestFrame, DEFAULT_CLONE_CREDENTIAL_TIMEOUT_MS, DEFAULT_CLONE_URL_TIMEOUT_MS, DEFAULT_WRITE_CREDENTIAL_TIMEOUT_MS, createWorkerStreamClient, createWorkerWsTransport } = createWorkerStreamServices({ buildTerminalFrameEnvelope, buildTerminalEndEnvelope, TERMINAL_INPUT_KIND, TERMINAL_RESUME_KIND, RECOVERY_PUSH_KIND, buildRecoveryPushResultFrame, RESYNC_KIND, buildResyncResultFrame, reportDegrade, EFFECT_STEP_FRAME_KIND, EFFECT_ACK_FRAME_KIND });

  return { backoffDelaySeconds, buildSnapshotFrame, buildDeltaFrame, WORKTREE_CONTENT_FRAME_KIND, LOG_ENTRIES_FRAME_KIND, WITHDRAW_KIND, buildLogEntriesFrame, buildWorktreeContentFrame, buildPresenceFrame, buildAssignmentStatusFrame, buildCloneCredentialRequestFrame, buildCloneUrlRequestFrame, buildWriteCredentialRequestFrame, DEFAULT_CLONE_CREDENTIAL_TIMEOUT_MS, DEFAULT_CLONE_URL_TIMEOUT_MS, DEFAULT_WRITE_CREDENTIAL_TIMEOUT_MS, createWorkerStreamClient, createWorkerWsTransport };
}
