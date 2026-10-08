// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createWorkerExecutionServices } from "@aof/mesh/worker-execution";
import { buildRunAttribution } from "@aof/execution/otel-attribution";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";
import { compileBriefForItem } from "@aof/work/phase-brief-read";
import { validateExecutionEnvelope, validateExecutionCapabilities } from "@aof/execution/runtime-selection";
import { prepareCodexWorktree } from "../../../codex-settings.mjs";

export function assembleMeshWorkerExecution({ workServices, runStoreServices, runSessionCaptureServices, effectsRunTransitionsServices, effectsItemTransitionsServices, effectsAssignmentTransitionsServices, meshParkResumeServices, meshWorktreeServices, workDispatchServices, meshPresenceServices, agentSessionDriverServices, degradeServices, runHeartbeatConsumptionServices, meshWorkerLaunchServices, meshWorkerRepoAdmissionServices, runtimeSessionServices, commandsDriveServices, loopAskServices, loopAskRequestServices }) {
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
  const { settleStrandedRuns } = meshParkResumeServices;
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

  const nativeExecution = {
    async preflight(value, ws, options = {}) {
      const execution = validateExecutionEnvelope(value);
      if (execution.runtime === "codex") validateExecutionCapabilities(execution, await runtimeSessionServices.inspectCapabilities("codex", { ...options, cwd: ws.projectRoot }));
      return execution;
    },
    prepare: prepareCodexWorktree,
    launchOptions(execution, phase, { options, globalWorkStoreOptions, launchDeclared }) {
      return {
        env: { ...process.env, ...globalWorkStoreOptions?.env, ...options.env, ...(launchDeclared ? { AOF_MESH_EXECUTION: JSON.stringify(execution) } : {}) },
        ...(execution.runtime === "codex" ? { codexBin: options.codexBin } : { session: execution.phases[phase ?? "continue"] }),
      };
    },
    async preparePhase({ item, worktreeItem, worktreePath, ws, execution, command, launchDeclared }, options) {
      const phase = directivePhase(command) === "build" ? "continue" : directivePhase(command);
      if (execution.runtime === "codex") {
        await prepareCodexWorktree(ws.projectRoot, worktreePath);
        if (!launchDeclared && phase == null) throw Object.assign(new Error("Codex assignment names no supported phase"), { code: "native-phase-unavailable" });
        for (const selected of launchDeclared ? ["refine", "continue", "verify"] : [phase]) await nativeExecution.inspectPhase({ item, worktreeItem, worktreePath, ws, execution, phase: selected }, options);
      }
      return phase;
    },
    canResume: (sessionId, cwd, options) => runtimeSessionServices.canResume("codex", sessionId, { ...options, cwd }),
    inspectPhase: ({ item, worktreeItem, worktreePath, ws, execution, phase }, options) => commandsDriveServices.driveNativePhase(phase, item, { dryRun: true }, { workspace: { ...ws, projectRoot: worktreePath }, agentSessionDriverOptions: options, loopDrive: { execution, briefItem: worktreeItem } }),
    async drive({ item, worktreeItem, worktreePath, ws, runRecord, phase, answer }, options = {}) {
      // The worker mints its one run in the primary AFTER materializing the lane.
      // That run starts the primary item; the lane still has its pre-mint status.
      // Advance the lane through the existing guarded status transition, without
      // minting a second run or rolling an already-reviewed item backwards.
      if (phase !== "repair" && worktreeItem.dir !== item.dir && workServices.typeHasRecordDoc(worktreeItem.type)) {
        try {
          await effectsItemTransitionsServices.transitionItemStatus(worktreeItem,
            { toStatus: "in-progress", expectFrom: ["not-started", "blocked"] },
            { journalOptions: { env: options.env } });
        } catch (error) {
          if (error?.code !== "status-edge-not-applicable") throw error;
        }
      }
      const controller = new AbortController();
      let started = false;
      const ctx = { workspace: { ...ws, projectRoot: worktreePath }, globalWorkStoreOptions: { env: options.env ?? process.env }, loopDrive: { runId: runRecord.runId, execution: runRecord.execution, briefItem: worktreeItem }, agentSessionDriverOptions: {
        ...options, signal: options.signal == null ? controller.signal : AbortSignal.any([options.signal, controller.signal]),
        onSessionIdCaptured: undefined,
        onProcessLive: () => options.onPtyLive?.(() => controller.abort()),
        onIdentity: options.onSessionIdCaptured,
        onTurnStarted: async turn => { started = true; await options.onTurnStarted?.(turn); },
      } };
      const dir = loopAskRequestServices.loopAsksDir(loopAskServices.askEnvFor(ctx));
      if (answer != null) {
        const file = await loopAskRequestServices.readAsk(dir, runRecord.runId);
        if (file?.runtime !== "codex" || file.sessionId !== runRecord.sessionId) throw Object.assign(new Error("Native answer has no matching pending question"), { code: "native-question-unavailable" });
        if (file.state === "answered" && file.answer !== answer.text) throw Object.assign(new Error("Native question already has a different answer"), { code: "ask-already-answered" });
        const result = file.state === "answered" ? file : await loopAskRequestServices.answerAsk(dir, { workspaceId: file.workspaceId, ref: item.ref, runId: runRecord.runId, text: answer.text, by: answer.by });
        const answered = result.record ?? result;
        ctx.loopDrive.answer = { runId: runRecord.runId, sessionId: file.sessionId, questionToken: file.questionToken, question: file.question, choices: file.choices, text: answered.answer };
      }
      let outcome;
      try { outcome = await commandsDriveServices.driveNativePhase(phase, item, {}, ctx, runRecord); }
      finally { await options.onSessionEnd?.((await readRuns(item)).find(run => run.runId === runRecord.runId)?.sessionId ?? null); }
      const file = await loopAskRequestServices.readAsk(dir, runRecord.runId);
      if (outcome.outcome === "needs-input") {
        await loopAskRequestServices.parkAsk(dir, runRecord.runId);
        await runStoreServices.parkRunAsk(item, runRecord.runId);
      }
      return { ...outcome, native: true, processStarted: started, ...(file == null ? {} : { nativeAsk: { question: file.question, phase: file.phase, askedAt: file.askedAt } }) };
    },
  };

  const { registerActiveWorktree, clearActiveWorktree, listActiveWorktrees, checkoutRootForWorktree, listStrandedWorktreeAssignments, pushWorktreeBranch, createMeshWorkerExecutionHandler, settleStrandedRunRecords, createMeshWorkerWithdrawHandler, createMeshWorkerTerminalInputHandler, createMeshWorkerTerminalResumeHandler, createMeshRecoveryPushHandler } = createWorkerExecutionServices({ settleStrandedRuns, nativeExecution, findWork, listItems, loadWorkspace, readRuns, buildRunAttribution, captureSessionIdOnRecord, transitionRunComplete, transitionRunStart, reportAssignmentSettled, reportTerminalResumeRefused, createMeshParkResume, directivePhase, readWorkerAsk, addWorktree, reuseWorktreeOnBranch, removeWorktree, meshWorktreesRoot, meshWorktreePath, meshItemBranchName, localBranchExists, remoteBranchExists, adoptRemoteBranch, ensureCommitAvailable, advanceBranchToBase, commitWorktreeChanges, resolveRefInWorktree, worktreeWorkDir, resolveWorkspaceId, defaultResolveWorkspaceCloneUrl, defaultSpawnRuntime, driveInteractiveClaudeSession, compileBriefForItem, reportDegrade, consumeHeartbeatQueue, readConsumedHeartbeatAt, composeDirectiveLaunchOptions, readDirectiveCommand, readDirectiveLaunch, admitWorkspaceRepo, resolveScopedCheckout, meshCheckoutPath, meshCheckoutsRoot, buildAskpassShim, redactCredentialFromText });

  return { "ASSIGNMENT_LOOP_LAUNCH_UNDECLARED": meshWorkerLaunchServices.ASSIGNMENT_LOOP_LAUNCH_UNDECLARED, "ASSIGNMENT_LOOP_LAUNCH_SCOPELESS": meshWorkerLaunchServices.ASSIGNMENT_LOOP_LAUNCH_SCOPELESS, "resolveRefInWorktree": workDispatchServices.resolveRefInWorktree, "workerHasRepo": meshWorkerRepoAdmissionServices.workerHasRepo, "resolveCloneUrl": meshWorkerRepoAdmissionServices.resolveCloneUrl, "parseRepoFromCloneUrl": meshWorkerRepoAdmissionServices.parseRepoFromCloneUrl, "meshCheckoutsRoot": meshWorkerRepoAdmissionServices.meshCheckoutsRoot, "meshCheckoutPath": meshWorkerRepoAdmissionServices.meshCheckoutPath, "isUnderMeshCheckoutsRoot": meshWorkerRepoAdmissionServices.isUnderMeshCheckoutsRoot, "buildAskpassShim": meshWorkerRepoAdmissionServices.buildAskpassShim, "cloneRepoForWorkspace": meshWorkerRepoAdmissionServices.cloneRepoForWorkspace, "pinWorkspaceIdInCheckout": meshWorkerRepoAdmissionServices.pinWorkspaceIdInCheckout, "commitWorktreeChanges": meshWorktreeServices.commitWorktreeChanges, "NEEDS_INPUT_SENTINEL": agentSessionDriverServices.NEEDS_INPUT_SENTINEL, "NEEDS_INPUT_INSTRUCTION": agentSessionDriverServices.NEEDS_INPUT_INSTRUCTION, "DIRECTIVE_COMPLETE_SENTINEL": agentSessionDriverServices.DIRECTIVE_COMPLETE_SENTINEL, "DIRECTIVE_COMPLETE_INSTRUCTION": agentSessionDriverServices.DIRECTIVE_COMPLETE_INSTRUCTION, "WORKER_SESSION_INSTRUCTION": agentSessionDriverServices.WORKER_SESSION_INSTRUCTION, "COMPLETION_IDLE_MS": agentSessionDriverServices.COMPLETION_IDLE_MS, "DECLARED_COMPLETION_IDLE_MS": agentSessionDriverServices.DECLARED_COMPLETION_IDLE_MS, "HUMAN_INPUT_TOOL_NAMES": agentSessionDriverServices.HUMAN_INPUT_TOOL_NAMES, "INTERACTIVE_COMMAND_READY_DELAY_MS": agentSessionDriverServices.INTERACTIVE_COMMAND_READY_DELAY_MS, "defaultWatchTranscriptSessionId": agentSessionDriverServices.defaultWatchTranscriptSessionId, "defaultWatchTranscriptCompletion": agentSessionDriverServices.defaultWatchTranscriptCompletion, "defaultPtySpawn": agentSessionDriverServices.defaultPtySpawn, "resolveInteractiveDriverLaunch": agentSessionDriverServices.resolveInteractiveDriverLaunch, "driveInteractiveClaudeSession": agentSessionDriverServices.driveInteractiveClaudeSession, "buildDriverCommand": agentSessionDriverServices.buildDriverCommand, "defaultSpawnRuntime": agentSessionDriverServices.defaultSpawnRuntime, "ensureWorktreeTrusted": agentSessionDriverServices.ensureWorktreeTrusted, registerActiveWorktree, clearActiveWorktree, listActiveWorktrees, checkoutRootForWorktree, listStrandedWorktreeAssignments, pushWorktreeBranch, createMeshWorkerExecutionHandler, settleStrandedRunRecords, createMeshWorkerWithdrawHandler, createMeshWorkerTerminalInputHandler, createMeshWorkerTerminalResumeHandler, createMeshRecoveryPushHandler };
}
