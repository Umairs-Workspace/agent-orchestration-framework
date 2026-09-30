// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createWorkerExecutionServices } from "@aof/mesh/worker-execution";
import { buildRunAttribution } from "@aof/execution/otel-attribution";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";
import { compileBriefForItem } from "@aof/work/phase-brief-read";

export function assembleMeshWorkerExecution({ workServices, runStoreServices, runSessionCaptureServices, effectsRunTransitionsServices, effectsAssignmentTransitionsServices, meshParkResumeServices, meshWorktreeServices, workDispatchServices, meshPresenceServices, agentSessionDriverServices, degradeServices, runHeartbeatConsumptionServices, meshWorkerLaunchServices, meshWorkerRepoAdmissionServices }) {
  // Core composition for mesh-owned runtime services.

  const { findWork } = workServices;
  const { listItems } = workServices;
  const { loadWorkspace } = workServices;
  const { readRuns } = runStoreServices;

  const { captureSessionIdOnRecord } = runSessionCaptureServices;
  const { transitionRunComplete } = effectsRunTransitionsServices;
  const { transitionRunStart } = effectsRunTransitionsServices;
  const { reportAssignmentSettled } = effectsAssignmentTransitionsServices;
  const { reportTerminalResumeRefused } = effectsAssignmentTransitionsServices;
  const { createMeshParkResume } = meshParkResumeServices;
  const { directivePhase } = meshParkResumeServices;
  const { readWorkerAsk } = meshParkResumeServices;
  const { addWorktree } = meshWorktreeServices;
  const { reuseWorktreeOnBranch } = meshWorktreeServices;
  const { removeWorktree } = meshWorktreeServices;
  const { meshWorktreesRoot } = meshWorktreeServices;
  const { meshWorktreePath } = meshWorktreeServices;
  const { meshItemBranchName } = meshWorktreeServices;
  const { localBranchExists } = meshWorktreeServices;
  const { remoteBranchExists } = meshWorktreeServices;
  const { adoptRemoteBranch } = meshWorktreeServices;
  const { ensureCommitAvailable } = meshWorktreeServices;
  const { advanceBranchToBase } = meshWorktreeServices;
  const { commitWorktreeChanges } = meshWorktreeServices;
  const { resolveRefInWorktree } = workDispatchServices;
  const { worktreeWorkDir } = workDispatchServices;

  const { resolveWorkspaceCloneUrl: defaultResolveWorkspaceCloneUrl } = meshPresenceServices;
  const { defaultSpawnRuntime } = agentSessionDriverServices;
  const { driveInteractiveClaudeSession } = agentSessionDriverServices;

  const { reportDegrade } = degradeServices;
  const { consumeHeartbeatQueue } = runHeartbeatConsumptionServices;
  const { readConsumedHeartbeatAt } = runHeartbeatConsumptionServices;
  const { composeDirectiveLaunchOptions } = meshWorkerLaunchServices;
  const { readDirectiveCommand } = meshWorkerLaunchServices;
  const { readDirectiveLaunch } = meshWorkerLaunchServices;
  const { admitWorkspaceRepo } = meshWorkerRepoAdmissionServices;
  const { resolveScopedCheckout } = meshWorkerRepoAdmissionServices;
  const { meshCheckoutPath } = meshWorkerRepoAdmissionServices;
  const { meshCheckoutsRoot } = meshWorkerRepoAdmissionServices;
  const { buildAskpassShim } = meshWorkerRepoAdmissionServices;
  const { redactCredentialFromText } = meshWorkerRepoAdmissionServices;

  const { registerActiveWorktree, clearActiveWorktree, listActiveWorktrees, checkoutRootForWorktree, listStrandedWorktreeAssignments, pushWorktreeBranch, createMeshWorkerExecutionHandler, settleStrandedRunRecords, createMeshWorkerWithdrawHandler, createMeshWorkerTerminalInputHandler, createMeshWorkerTerminalResumeHandler, createMeshRecoveryPushHandler } = createWorkerExecutionServices({ findWork, listItems, loadWorkspace, readRuns, buildRunAttribution, captureSessionIdOnRecord, transitionRunComplete, transitionRunStart, reportAssignmentSettled, reportTerminalResumeRefused, createMeshParkResume, directivePhase, readWorkerAsk, addWorktree, reuseWorktreeOnBranch, removeWorktree, meshWorktreesRoot, meshWorktreePath, meshItemBranchName, localBranchExists, remoteBranchExists, adoptRemoteBranch, ensureCommitAvailable, advanceBranchToBase, commitWorktreeChanges, resolveRefInWorktree, worktreeWorkDir, resolveWorkspaceId, defaultResolveWorkspaceCloneUrl, defaultSpawnRuntime, driveInteractiveClaudeSession, compileBriefForItem, reportDegrade, consumeHeartbeatQueue, readConsumedHeartbeatAt, composeDirectiveLaunchOptions, readDirectiveCommand, readDirectiveLaunch, admitWorkspaceRepo, resolveScopedCheckout, meshCheckoutPath, meshCheckoutsRoot, buildAskpassShim, redactCredentialFromText });

  return { "ASSIGNMENT_LOOP_LAUNCH_UNDECLARED": meshWorkerLaunchServices.ASSIGNMENT_LOOP_LAUNCH_UNDECLARED, "ASSIGNMENT_LOOP_LAUNCH_SCOPELESS": meshWorkerLaunchServices.ASSIGNMENT_LOOP_LAUNCH_SCOPELESS, "resolveRefInWorktree": workDispatchServices.resolveRefInWorktree, "workerHasRepo": meshWorkerRepoAdmissionServices.workerHasRepo, "resolveCloneUrl": meshWorkerRepoAdmissionServices.resolveCloneUrl, "parseRepoFromCloneUrl": meshWorkerRepoAdmissionServices.parseRepoFromCloneUrl, "meshCheckoutsRoot": meshWorkerRepoAdmissionServices.meshCheckoutsRoot, "meshCheckoutPath": meshWorkerRepoAdmissionServices.meshCheckoutPath, "isUnderMeshCheckoutsRoot": meshWorkerRepoAdmissionServices.isUnderMeshCheckoutsRoot, "buildAskpassShim": meshWorkerRepoAdmissionServices.buildAskpassShim, "cloneRepoForWorkspace": meshWorkerRepoAdmissionServices.cloneRepoForWorkspace, "pinWorkspaceIdInCheckout": meshWorkerRepoAdmissionServices.pinWorkspaceIdInCheckout, "commitWorktreeChanges": meshWorktreeServices.commitWorktreeChanges, "NEEDS_INPUT_SENTINEL": agentSessionDriverServices.NEEDS_INPUT_SENTINEL, "NEEDS_INPUT_INSTRUCTION": agentSessionDriverServices.NEEDS_INPUT_INSTRUCTION, "DIRECTIVE_COMPLETE_SENTINEL": agentSessionDriverServices.DIRECTIVE_COMPLETE_SENTINEL, "DIRECTIVE_COMPLETE_INSTRUCTION": agentSessionDriverServices.DIRECTIVE_COMPLETE_INSTRUCTION, "WORKER_SESSION_INSTRUCTION": agentSessionDriverServices.WORKER_SESSION_INSTRUCTION, "COMPLETION_IDLE_MS": agentSessionDriverServices.COMPLETION_IDLE_MS, "DECLARED_COMPLETION_IDLE_MS": agentSessionDriverServices.DECLARED_COMPLETION_IDLE_MS, "HUMAN_INPUT_TOOL_NAMES": agentSessionDriverServices.HUMAN_INPUT_TOOL_NAMES, "INTERACTIVE_COMMAND_READY_DELAY_MS": agentSessionDriverServices.INTERACTIVE_COMMAND_READY_DELAY_MS, "defaultWatchTranscriptSessionId": agentSessionDriverServices.defaultWatchTranscriptSessionId, "defaultWatchTranscriptCompletion": agentSessionDriverServices.defaultWatchTranscriptCompletion, "defaultPtySpawn": agentSessionDriverServices.defaultPtySpawn, "resolveInteractiveDriverLaunch": agentSessionDriverServices.resolveInteractiveDriverLaunch, "driveInteractiveClaudeSession": agentSessionDriverServices.driveInteractiveClaudeSession, "buildDriverCommand": agentSessionDriverServices.buildDriverCommand, "defaultSpawnRuntime": agentSessionDriverServices.defaultSpawnRuntime, "ensureWorktreeTrusted": agentSessionDriverServices.ensureWorktreeTrusted, registerActiveWorktree, clearActiveWorktree, listActiveWorktrees, checkoutRootForWorktree, listStrandedWorktreeAssignments, pushWorktreeBranch, createMeshWorkerExecutionHandler, settleStrandedRunRecords, createMeshWorkerWithdrawHandler, createMeshWorkerTerminalInputHandler, createMeshWorkerTerminalResumeHandler, createMeshRecoveryPushHandler };
}
