// Transitional core composition for mesh-owned runtime services.
import { createControlStreamServices } from "@aof/mesh/control-stream-server";
import {
  openGlobalWorkProjectionStore,
  upsertWorkItems,
  upsertWorkItemContent,
  appendNodeLogEntries,
} from "./global-work-store.mjs";
import { redactDescriptor } from "./global-node-registry.mjs";
import { publishPresenceRecord } from "./mesh/presence.mjs";
import { transitionAssignmentState } from "./effects/assignment-transitions.mjs";
import { effectsFor } from "./effects/table.mjs";
import { openEffectsJournal, appendEvent, markStep, readEventSteps } from "./effects/journal.mjs";
import { drainEffects, CONTROL_LOCI } from "./effects/dispatch.mjs";
import { EFFECT_STEP_FRAME_KIND, EFFECT_ACK_FRAME_KIND } from "@aof/mesh/effect-frames";
import { TERMINAL_FRAME_KIND } from "./mesh/terminal-relay-bridge.mjs";
import { PRESENCE_SIGNAL_KIND } from "./mesh/relay-client.mjs";
import { RECOVERY_PUSH_RESULT_KIND, applyRecoveryPushResultFrame } from "./mesh/recovery-push.mjs";
import { RESYNC_RESULT_KIND, applyResyncResultFrame } from "./mesh/resync.mjs";
import { reportDegrade } from "./degrade.mjs";


export const { isTailnetPeer, applySnapshotFrame, applyDeltaFrame, applyWorktreeContentFrame, applyLogEntriesFrame, applyPresenceFrame, applyAssignmentStatusFrame, applyTerminalResumeRefusedFrame, applyEffectStepFrame, defaultMintCloneCredential, CLONE_CREDENTIAL_NOT_HOLDER, CLONE_CREDENTIAL_UNKNOWN_ASSIGNMENT, CLONE_CREDENTIAL_REQUEST_INVALID, CLONE_CREDENTIAL_MINT_FAILED, CLONE_CREDENTIAL_WORKSPACE_MISMATCH, CLONE_CREDENTIAL_ASSIGNMENT_INACTIVE, applyCloneCredentialRequestFrame, CLONE_URL_NOT_HOLDER, CLONE_URL_UNKNOWN_ASSIGNMENT, CLONE_URL_REQUEST_INVALID, CLONE_URL_WORKSPACE_MISMATCH, applyCloneUrlRequestFrame, defaultMintWriteCredential, WRITE_CREDENTIAL_NOT_HOLDER, WRITE_CREDENTIAL_UNKNOWN_ASSIGNMENT, WRITE_CREDENTIAL_REQUEST_INVALID, WRITE_CREDENTIAL_MINT_FAILED, WRITE_CREDENTIAL_WORKSPACE_MISMATCH, WRITE_CREDENTIAL_ASSIGNMENT_INACTIVE, applyWriteCredentialRequestFrame, applyStreamFrame, DEFAULT_HEARTBEAT_WINDOW_SECONDS, streamLivenessLabel, freshnessLabel, buildDirectiveFrame, ASSIGNMENT_TARGET_NOT_CONNECTED, sendDirective, dispatchDirectiveOverTargets, createStreamRegistry, startControlStreamServer } = createControlStreamServices({ openGlobalWorkProjectionStore, upsertWorkItems, upsertWorkItemContent, appendNodeLogEntries, redactDescriptor, publishPresenceRecord, transitionAssignmentState, effectsFor, openEffectsJournal, appendEvent, markStep, readEventSteps, drainEffects, CONTROL_LOCI, EFFECT_STEP_FRAME_KIND, EFFECT_ACK_FRAME_KIND, TERMINAL_FRAME_KIND, PRESENCE_SIGNAL_KIND, RECOVERY_PUSH_RESULT_KIND, applyRecoveryPushResultFrame, RESYNC_RESULT_KIND, applyResyncResultFrame, reportDegrade });
