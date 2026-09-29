// Transitional core composition for mesh-owned runtime services.
import { createWorkerStreamServices } from "@aof/mesh/worker-stream-client";
import { buildTerminalFrameEnvelope, buildTerminalEndEnvelope, TERMINAL_INPUT_KIND, TERMINAL_RESUME_KIND } from "./mesh/terminal-relay-bridge.mjs";
import { RECOVERY_PUSH_KIND, buildRecoveryPushResultFrame } from "./mesh/recovery-push.mjs";
import { RESYNC_KIND, buildResyncResultFrame } from "./mesh/resync.mjs";
import { reportDegrade } from "./degrade.mjs";
import { EFFECT_STEP_FRAME_KIND, EFFECT_ACK_FRAME_KIND } from "./effects/outbox.mjs";


export const { backoffDelaySeconds, buildSnapshotFrame, buildDeltaFrame, WORKTREE_CONTENT_FRAME_KIND, LOG_ENTRIES_FRAME_KIND, WITHDRAW_KIND, buildLogEntriesFrame, buildWorktreeContentFrame, buildPresenceFrame, buildAssignmentStatusFrame, buildCloneCredentialRequestFrame, buildCloneUrlRequestFrame, buildWriteCredentialRequestFrame, DEFAULT_CLONE_CREDENTIAL_TIMEOUT_MS, DEFAULT_CLONE_URL_TIMEOUT_MS, DEFAULT_WRITE_CREDENTIAL_TIMEOUT_MS, createWorkerStreamClient, createWorkerWsTransport } = createWorkerStreamServices({ buildTerminalFrameEnvelope, buildTerminalEndEnvelope, TERMINAL_INPUT_KIND, TERMINAL_RESUME_KIND, RECOVERY_PUSH_KIND, buildRecoveryPushResultFrame, RESYNC_KIND, buildResyncResultFrame, reportDegrade, EFFECT_STEP_FRAME_KIND, EFFECT_ACK_FRAME_KIND });
