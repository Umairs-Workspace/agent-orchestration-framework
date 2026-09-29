// Transitional core composition for mesh-owned runtime services.
import { createMeshLauncher } from "@aof/mesh/launcher";
import { globalMeshPaths } from "../workspace.mjs";
import { readNodeRecords } from "./store.mjs";
import { deriveNodeId, sidecarPathFor, readSidecar } from "../node-identity.mjs";
import { packageVersionString } from "../asset-base.mjs";
import { assemblePresenceRecord, readActiveLoops, readActiveRuns, readLiveSessions, publishPresenceRecord, resolveNodeWorkspaces, resolveWorkspaceProjectRoot } from "./presence.mjs";
import { listItems, loadWorkspace } from "../work.mjs";
import { listItemsCacheFirst, localItemsOnly, reportReachThroughSkips } from "../work/read.mjs";
import { readCachedActiveRunIds, sharedProjectionStore } from "../cache-read.mjs";
import { publishGlobalWorkSnapshot, readWorkspaceProjectionItems, readWorkspaceContentRecords, restoreRefusedResumeReservation } from "../global-work-publisher.mjs";
import {
  confirmArtifactSyncBatch,
  createArtifactSyncState,
  forgetArtifactSyncAssignment,
  prepareArtifactSyncBatch,
} from "../artifact-sync.mjs";
import { resolveWorkspaceId } from "../workspace-identity.mjs";
import { readBuildInfo, buildInfoString } from "../build-info.mjs";
import { createWorkerStreamClient, createWorkerWsTransport } from "../worker-stream-client.mjs";
import { startControlStreamServer, buildDirectiveFrame, DEFAULT_HEARTBEAT_WINDOW_SECONDS } from "../control-stream-server.mjs";
import { createMeshWorkerExecutionHandler, createMeshRecoveryPushHandler, createMeshWorkerWithdrawHandler, createMeshWorkerTerminalInputHandler, createMeshWorkerTerminalResumeHandler, settleStrandedRunRecords, listActiveWorktrees, listStrandedWorktreeAssignments, checkoutRootForWorktree, meshCheckoutPath, workerHasRepo, resolveCloneUrl, ensureWorktreeTrusted, INTERACTIVE_COMMAND_READY_DELAY_MS } from "./worker-execution.mjs";
import { createMeshWorkerSessionSpawnHandler } from "./session-spawn-handler.mjs";
import { runRecoveryPushDispatchTick } from "./recovery-push.mjs";
import { runResyncDispatchTick } from "./resync.mjs";
import { createEnrollmentHttpHandler, relayMode } from "./relay.mjs";
import { readRegistry, verifyCredential } from "./registry.mjs";
import { readMeshLauncherLockStatus } from "./launcher-lock.mjs";
import { createTerminalRelayPushTransport } from "./terminal-relay-bridge.mjs";
import { createTerminalMirrorSubscriberTransport, startTerminalMirrorSubscriber } from "./terminal-mirror.mjs";
import { createTerminalInputRouter } from "./terminal-input.mjs";
import { runControlDispatchReclaimTick } from "./assignment-reclaim.mjs";
import { resolveCloneCredentialProvider, resolveWriteCredentialProvider } from "./clone-credential-provider.mjs";
import { reportDegrade } from "../degrade.mjs";
import { openEffectsJournal } from "../effects/journal.mjs";
import { drainOutbox, applyEffectAck } from "../effects/outbox.mjs";
import { reportAssignmentSettled } from "../effects/assignment-transitions.mjs";


export const { createResolveWorkspaceCloneUrl, resolveGithubAppPrivateKey, createResolveWorkspaceAppIdentity, assembleActiveRunsAndSubsumedWorkspaces, launcherProbe, startLauncher } = createMeshLauncher({ globalMeshPaths, readNodeRecords, deriveNodeId, sidecarPathFor, readSidecar, packageVersionString, assemblePresenceRecord, readActiveLoops, readActiveRuns, readLiveSessions, publishPresenceRecord, resolveNodeWorkspaces, resolveWorkspaceProjectRoot, listItems, loadWorkspace, listItemsCacheFirst, localItemsOnly, reportReachThroughSkips, readCachedActiveRunIds, sharedProjectionStore, publishGlobalWorkSnapshot, readWorkspaceProjectionItems, readWorkspaceContentRecords, restoreRefusedResumeReservation, confirmArtifactSyncBatch, createArtifactSyncState, forgetArtifactSyncAssignment, prepareArtifactSyncBatch, resolveWorkspaceId, readBuildInfo, buildInfoString, createWorkerStreamClient, createWorkerWsTransport, startControlStreamServer, buildDirectiveFrame, DEFAULT_HEARTBEAT_WINDOW_SECONDS, createMeshWorkerExecutionHandler, createMeshRecoveryPushHandler, createMeshWorkerWithdrawHandler, createMeshWorkerTerminalInputHandler, createMeshWorkerTerminalResumeHandler, settleStrandedRunRecords, listActiveWorktrees, listStrandedWorktreeAssignments, checkoutRootForWorktree, meshCheckoutPath, workerHasRepo, resolveCloneUrl, ensureWorktreeTrusted, INTERACTIVE_COMMAND_READY_DELAY_MS, createMeshWorkerSessionSpawnHandler, runRecoveryPushDispatchTick, runResyncDispatchTick, createEnrollmentHttpHandler, relayMode, readRegistry, verifyCredential, readMeshLauncherLockStatus, createTerminalRelayPushTransport, createTerminalMirrorSubscriberTransport, startTerminalMirrorSubscriber, createTerminalInputRouter, runControlDispatchReclaimTick, resolveCloneCredentialProvider, resolveWriteCredentialProvider, reportDegrade, openEffectsJournal, drainOutbox, applyEffectAck, reportAssignmentSettled, loadNotifications: () => import("../notify/notify.mjs"), loadMessagingBot: () => import("../discord/bot.mjs") });
