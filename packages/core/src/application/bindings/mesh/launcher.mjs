// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshLauncher } from "@aof/mesh/launcher";
import { deriveNodeId, sidecarPathFor, readSidecar } from "@aof/mesh/node-identity";
import { packageVersionString } from "../../../asset-base.mjs";
import {
  confirmArtifactSyncBatch,
  createArtifactSyncState,
  forgetArtifactSyncAssignment,
  prepareArtifactSyncBatch,
} from "@aof/mesh/artifact-sync";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";
import { readBuildInfo, buildInfoString } from "../../../build-info.mjs";

export function assembleMeshLauncher({ workspaceServices, meshStoreServices, meshPresenceServices, workServices, workReadServices, cacheReadServices, globalWorkPublisherServices, workerStreamClientServices, controlStreamServerServices, meshWorkerExecutionServices, meshSessionSpawnHandlerServices, meshRecoveryPushServices, meshResyncServices, meshRelayServices, meshRegistryServices, meshLauncherLockServices, meshTerminalRelayBridgeServices, meshTerminalMirrorServices, meshTerminalInputServices, meshAssignmentReclaimServices, meshCloneCredentialProviderServices, degradeServices, effectsJournalServices, effectsOutboxServices, effectsAssignmentTransitionsServices, provideNotifyNotify, provideDiscordBot }) {
  // Core composition for mesh-owned runtime services.

  const { globalMeshPaths } = workspaceServices;
  const { readNodeRecords } = meshStoreServices;

  const { assemblePresenceRecord } = meshPresenceServices;
  const { readActiveLoops } = meshPresenceServices;
  const { readActiveRuns } = meshPresenceServices;
  const { readLiveSessions } = meshPresenceServices;
  const { publishPresenceRecord } = meshPresenceServices;
  const { resolveNodeWorkspaces } = meshPresenceServices;
  const { resolveWorkspaceProjectRoot } = meshPresenceServices;
  const { listItems } = workServices;
  const { loadWorkspace } = workServices;
  const { listItemsCacheFirst } = workReadServices;
  const { localItemsOnly } = workReadServices;
  const { reportReachThroughSkips } = workReadServices;
  const { readCachedActiveRunIds } = cacheReadServices;
  const { sharedProjectionStore } = cacheReadServices;
  const { publishGlobalWorkSnapshot } = globalWorkPublisherServices;
  const { readWorkspaceProjectionItems } = globalWorkPublisherServices;
  const { readWorkspaceContentRecords } = globalWorkPublisherServices;
  const { restoreRefusedResumeReservation } = globalWorkPublisherServices;

  const { createWorkerStreamClient } = workerStreamClientServices;
  const { createWorkerWsTransport } = workerStreamClientServices;
  const { startControlStreamServer } = controlStreamServerServices;
  const { buildDirectiveFrame } = controlStreamServerServices;
  const { DEFAULT_HEARTBEAT_WINDOW_SECONDS } = controlStreamServerServices;
  const { createMeshWorkerExecutionHandler } = meshWorkerExecutionServices;
  const { createMeshRecoveryPushHandler } = meshWorkerExecutionServices;
  const { createMeshWorkerWithdrawHandler } = meshWorkerExecutionServices;
  const { createMeshWorkerTerminalInputHandler } = meshWorkerExecutionServices;
  const { createMeshWorkerTerminalResumeHandler } = meshWorkerExecutionServices;
  const { settleStrandedRunRecords } = meshWorkerExecutionServices;
  const { listActiveWorktrees } = meshWorkerExecutionServices;
  const { listStrandedWorktreeAssignments } = meshWorkerExecutionServices;
  const { checkoutRootForWorktree } = meshWorkerExecutionServices;
  const { meshCheckoutPath } = meshWorkerExecutionServices;
  const { workerHasRepo } = meshWorkerExecutionServices;
  const { resolveCloneUrl } = meshWorkerExecutionServices;
  const { ensureWorktreeTrusted } = meshWorkerExecutionServices;
  const { INTERACTIVE_COMMAND_READY_DELAY_MS } = meshWorkerExecutionServices;
  const { createMeshWorkerSessionSpawnHandler } = meshSessionSpawnHandlerServices;
  const { runRecoveryPushDispatchTick } = meshRecoveryPushServices;
  const { runResyncDispatchTick } = meshResyncServices;
  const { createEnrollmentHttpHandler } = meshRelayServices;
  const { relayMode } = meshRelayServices;
  const { readRegistry } = meshRegistryServices;
  const { verifyCredential } = meshRegistryServices;
  const { readMeshLauncherLockStatus } = meshLauncherLockServices;
  const { createTerminalRelayPushTransport } = meshTerminalRelayBridgeServices;
  const { createTerminalMirrorSubscriberTransport } = meshTerminalMirrorServices;
  const { startTerminalMirrorSubscriber } = meshTerminalMirrorServices;
  const { createTerminalInputRouter } = meshTerminalInputServices;
  const { runControlDispatchReclaimTick } = meshAssignmentReclaimServices;
  const { resolveCloneCredentialProvider } = meshCloneCredentialProviderServices;
  const { resolveWriteCredentialProvider } = meshCloneCredentialProviderServices;
  const { reportDegrade } = degradeServices;
  const { openEffectsJournal } = effectsJournalServices;
  const { drainOutbox } = effectsOutboxServices;
  const { applyEffectAck } = effectsOutboxServices;
  const { reportAssignmentSettled } = effectsAssignmentTransitionsServices;

  const { createResolveWorkspaceCloneUrl, resolveGithubAppPrivateKey, createResolveWorkspaceAppIdentity, assembleActiveRunsAndSubsumedWorkspaces, launcherProbe, startLauncher } = createMeshLauncher({ globalMeshPaths, readNodeRecords, deriveNodeId, sidecarPathFor, readSidecar, packageVersionString, assemblePresenceRecord, readActiveLoops, readActiveRuns, readLiveSessions, publishPresenceRecord, resolveNodeWorkspaces, resolveWorkspaceProjectRoot, listItems, loadWorkspace, listItemsCacheFirst, localItemsOnly, reportReachThroughSkips, readCachedActiveRunIds, sharedProjectionStore, publishGlobalWorkSnapshot, readWorkspaceProjectionItems, readWorkspaceContentRecords, restoreRefusedResumeReservation, confirmArtifactSyncBatch, createArtifactSyncState, forgetArtifactSyncAssignment, prepareArtifactSyncBatch, resolveWorkspaceId, readBuildInfo, buildInfoString, createWorkerStreamClient, createWorkerWsTransport, startControlStreamServer, buildDirectiveFrame, DEFAULT_HEARTBEAT_WINDOW_SECONDS, createMeshWorkerExecutionHandler, createMeshRecoveryPushHandler, createMeshWorkerWithdrawHandler, createMeshWorkerTerminalInputHandler, createMeshWorkerTerminalResumeHandler, settleStrandedRunRecords, listActiveWorktrees, listStrandedWorktreeAssignments, checkoutRootForWorktree, meshCheckoutPath, workerHasRepo, resolveCloneUrl, ensureWorktreeTrusted, INTERACTIVE_COMMAND_READY_DELAY_MS, createMeshWorkerSessionSpawnHandler, runRecoveryPushDispatchTick, runResyncDispatchTick, createEnrollmentHttpHandler, relayMode, readRegistry, verifyCredential, readMeshLauncherLockStatus, createTerminalRelayPushTransport, createTerminalMirrorSubscriberTransport, startTerminalMirrorSubscriber, createTerminalInputRouter, runControlDispatchReclaimTick, resolveCloneCredentialProvider, resolveWriteCredentialProvider, reportDegrade, openEffectsJournal, drainOutbox, applyEffectAck, reportAssignmentSettled, loadNotifications: () => provideNotifyNotify(), loadMessagingBot: () => provideDiscordBot() });

  return { createResolveWorkspaceCloneUrl, resolveGithubAppPrivateKey, createResolveWorkspaceAppIdentity, assembleActiveRunsAndSubsumedWorkspaces, launcherProbe, startLauncher };
}
