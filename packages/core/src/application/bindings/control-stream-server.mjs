// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createControlStreamServices } from "@aof/mesh/control-stream-server";
import { EFFECT_STEP_FRAME_KIND, EFFECT_ACK_FRAME_KIND } from "@aof/mesh/effect-frames";

export function assembleControlStreamServer({ globalWorkStoreServices, globalNodeRegistryServices, meshPresenceServices, effectsAssignmentTransitionsServices, effectsTableServices, effectsJournalServices, effectsDispatchServices, meshTerminalRelayBridgeServices, meshRelayClientServices, meshRecoveryPushServices, meshResyncServices, degradeServices }) {
  // Core composition for mesh-owned runtime services.

  const { openGlobalWorkProjectionStore } = globalWorkStoreServices;
  const { upsertWorkItems } = globalWorkStoreServices;
  const { upsertWorkItemContent } = globalWorkStoreServices;
  const { appendNodeLogEntries } = globalWorkStoreServices;
  const { redactDescriptor } = globalNodeRegistryServices;
  const { publishPresenceRecord } = meshPresenceServices;
  const { transitionAssignmentState } = effectsAssignmentTransitionsServices;
  const { effectsFor } = effectsTableServices;
  const { openEffectsJournal } = effectsJournalServices;
  const { appendEvent } = effectsJournalServices;
  const { markStep } = effectsJournalServices;
  const { readEventSteps } = effectsJournalServices;
  const { drainEffects } = effectsDispatchServices;
  const { CONTROL_LOCI } = effectsDispatchServices;

  const { TERMINAL_FRAME_KIND } = meshTerminalRelayBridgeServices;
  const { PRESENCE_SIGNAL_KIND } = meshRelayClientServices;
  const { RECOVERY_PUSH_RESULT_KIND } = meshRecoveryPushServices;
  const { applyRecoveryPushResultFrame } = meshRecoveryPushServices;
  const { RESYNC_RESULT_KIND } = meshResyncServices;
  const { applyResyncResultFrame } = meshResyncServices;
  const { reportDegrade } = degradeServices;

  const { isTailnetPeer, applySnapshotFrame, applyDeltaFrame, applyWorktreeContentFrame, applyLogEntriesFrame, applyPresenceFrame, applyAssignmentStatusFrame, applyTerminalResumeRefusedFrame, applyEffectStepFrame, defaultMintCloneCredential, CLONE_CREDENTIAL_NOT_HOLDER, CLONE_CREDENTIAL_UNKNOWN_ASSIGNMENT, CLONE_CREDENTIAL_REQUEST_INVALID, CLONE_CREDENTIAL_MINT_FAILED, CLONE_CREDENTIAL_WORKSPACE_MISMATCH, CLONE_CREDENTIAL_ASSIGNMENT_INACTIVE, applyCloneCredentialRequestFrame, CLONE_URL_NOT_HOLDER, CLONE_URL_UNKNOWN_ASSIGNMENT, CLONE_URL_REQUEST_INVALID, CLONE_URL_WORKSPACE_MISMATCH, applyCloneUrlRequestFrame, defaultMintWriteCredential, WRITE_CREDENTIAL_NOT_HOLDER, WRITE_CREDENTIAL_UNKNOWN_ASSIGNMENT, WRITE_CREDENTIAL_REQUEST_INVALID, WRITE_CREDENTIAL_MINT_FAILED, WRITE_CREDENTIAL_WORKSPACE_MISMATCH, WRITE_CREDENTIAL_ASSIGNMENT_INACTIVE, applyWriteCredentialRequestFrame, applyStreamFrame, DEFAULT_HEARTBEAT_WINDOW_SECONDS, streamLivenessLabel, freshnessLabel, buildDirectiveFrame, ASSIGNMENT_TARGET_NOT_CONNECTED, sendDirective, dispatchDirectiveOverTargets, createStreamRegistry, startControlStreamServer } = createControlStreamServices({ openGlobalWorkProjectionStore, upsertWorkItems, upsertWorkItemContent, appendNodeLogEntries, redactDescriptor, publishPresenceRecord, transitionAssignmentState, effectsFor, openEffectsJournal, appendEvent, markStep, readEventSteps, drainEffects, CONTROL_LOCI, EFFECT_STEP_FRAME_KIND, EFFECT_ACK_FRAME_KIND, TERMINAL_FRAME_KIND, PRESENCE_SIGNAL_KIND, RECOVERY_PUSH_RESULT_KIND, applyRecoveryPushResultFrame, RESYNC_RESULT_KIND, applyResyncResultFrame, reportDegrade });

  return { isTailnetPeer, applySnapshotFrame, applyDeltaFrame, applyWorktreeContentFrame, applyLogEntriesFrame, applyPresenceFrame, applyAssignmentStatusFrame, applyTerminalResumeRefusedFrame, applyEffectStepFrame, defaultMintCloneCredential, CLONE_CREDENTIAL_NOT_HOLDER, CLONE_CREDENTIAL_UNKNOWN_ASSIGNMENT, CLONE_CREDENTIAL_REQUEST_INVALID, CLONE_CREDENTIAL_MINT_FAILED, CLONE_CREDENTIAL_WORKSPACE_MISMATCH, CLONE_CREDENTIAL_ASSIGNMENT_INACTIVE, applyCloneCredentialRequestFrame, CLONE_URL_NOT_HOLDER, CLONE_URL_UNKNOWN_ASSIGNMENT, CLONE_URL_REQUEST_INVALID, CLONE_URL_WORKSPACE_MISMATCH, applyCloneUrlRequestFrame, defaultMintWriteCredential, WRITE_CREDENTIAL_NOT_HOLDER, WRITE_CREDENTIAL_UNKNOWN_ASSIGNMENT, WRITE_CREDENTIAL_REQUEST_INVALID, WRITE_CREDENTIAL_MINT_FAILED, WRITE_CREDENTIAL_WORKSPACE_MISMATCH, WRITE_CREDENTIAL_ASSIGNMENT_INACTIVE, applyWriteCredentialRequestFrame, applyStreamFrame, DEFAULT_HEARTBEAT_WINDOW_SECONDS, streamLivenessLabel, freshnessLabel, buildDirectiveFrame, ASSIGNMENT_TARGET_NOT_CONNECTED, sendDirective, dispatchDirectiveOverTargets, createStreamRegistry, startControlStreamServer };
}
