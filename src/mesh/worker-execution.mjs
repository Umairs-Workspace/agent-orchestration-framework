// Transitional core composition for mesh-owned runtime services.
import { createWorkerExecutionServices } from "@aof/mesh/worker-execution";
import { findWork, listItems, loadWorkspace } from "../work.mjs";
import { readRuns } from "../run-store.mjs";
import { buildRunAttribution } from "../otel-attribution.mjs";
import { captureSessionIdOnRecord } from "../run-session-capture.mjs";
import { transitionRunComplete, transitionRunStart } from "../effects/run-transitions.mjs";
import { reportAssignmentSettled, reportTerminalResumeRefused } from "../effects/assignment-transitions.mjs";
import { createMeshParkResume, directivePhase, readWorkerAsk } from "./park-resume.mjs";
import { addWorktree, reuseWorktreeOnBranch, removeWorktree, meshWorktreesRoot, meshWorktreePath, meshItemBranchName, localBranchExists, remoteBranchExists, adoptRemoteBranch, ensureCommitAvailable, advanceBranchToBase, commitWorktreeChanges } from "./worktree.mjs";
import { resolveRefInWorktree, worktreeWorkDir } from "../work/dispatch.mjs";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";
import { resolveWorkspaceCloneUrl as defaultResolveWorkspaceCloneUrl } from "./presence.mjs";
import { defaultSpawnRuntime, driveInteractiveClaudeSession } from "../agent-session-driver.mjs";
import { compileBriefForItem } from "../phase-brief-read.mjs";
import { reportDegrade } from "../degrade.mjs";
import { consumeHeartbeatQueue, readConsumedHeartbeatAt } from "../run-heartbeat-consumption.mjs";
import { composeDirectiveLaunchOptions, readDirectiveCommand, readDirectiveLaunch } from "./worker-launch.mjs";
import { admitWorkspaceRepo, resolveScopedCheckout, meshCheckoutPath, meshCheckoutsRoot, buildAskpassShim, redactCredentialFromText } from "./worker-repo-admission.mjs";
export { ASSIGNMENT_LOOP_LAUNCH_UNDECLARED, ASSIGNMENT_LOOP_LAUNCH_SCOPELESS } from "./worker-launch.mjs";
export { resolveRefInWorktree } from "../work/dispatch.mjs";
export {
  workerHasRepo,
  resolveCloneUrl,
  parseRepoFromCloneUrl,
  meshCheckoutsRoot,
  meshCheckoutPath,
  isUnderMeshCheckoutsRoot,
  buildAskpassShim,
  cloneRepoForWorkspace,
  pinWorkspaceIdInCheckout,
} from "./worker-repo-admission.mjs";
export { commitWorktreeChanges } from "./worktree.mjs";
export {
  NEEDS_INPUT_SENTINEL,
  NEEDS_INPUT_INSTRUCTION,
  DIRECTIVE_COMPLETE_SENTINEL,
  DIRECTIVE_COMPLETE_INSTRUCTION,
  WORKER_SESSION_INSTRUCTION,
  COMPLETION_IDLE_MS,
  DECLARED_COMPLETION_IDLE_MS,
  HUMAN_INPUT_TOOL_NAMES,
  INTERACTIVE_COMMAND_READY_DELAY_MS,
  defaultWatchTranscriptSessionId,
  defaultWatchTranscriptCompletion,
  defaultPtySpawn,
  resolveInteractiveDriverLaunch,
  driveInteractiveClaudeSession,
  buildDriverCommand,
  defaultSpawnRuntime,
  ensureWorktreeTrusted,
} from "../agent-session-driver.mjs";

export const { registerActiveWorktree, clearActiveWorktree, listActiveWorktrees, checkoutRootForWorktree, listStrandedWorktreeAssignments, pushWorktreeBranch, createMeshWorkerExecutionHandler, settleStrandedRunRecords, createMeshWorkerWithdrawHandler, createMeshWorkerTerminalInputHandler, createMeshWorkerTerminalResumeHandler, createMeshRecoveryPushHandler } = createWorkerExecutionServices({ findWork, listItems, loadWorkspace, readRuns, buildRunAttribution, captureSessionIdOnRecord, transitionRunComplete, transitionRunStart, reportAssignmentSettled, reportTerminalResumeRefused, createMeshParkResume, directivePhase, readWorkerAsk, addWorktree, reuseWorktreeOnBranch, removeWorktree, meshWorktreesRoot, meshWorktreePath, meshItemBranchName, localBranchExists, remoteBranchExists, adoptRemoteBranch, ensureCommitAvailable, advanceBranchToBase, commitWorktreeChanges, resolveRefInWorktree, worktreeWorkDir, resolveWorkspaceId, defaultResolveWorkspaceCloneUrl, defaultSpawnRuntime, driveInteractiveClaudeSession, compileBriefForItem, reportDegrade, consumeHeartbeatQueue, readConsumedHeartbeatAt, composeDirectiveLaunchOptions, readDirectiveCommand, readDirectiveLaunch, admitWorkspaceRepo, resolveScopedCheckout, meshCheckoutPath, meshCheckoutsRoot, buildAskpassShim, redactCredentialFromText });
