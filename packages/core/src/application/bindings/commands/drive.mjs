// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createPhaseDrivers } from "@aof/work-loop/commands/drive";
import { compileBriefForItem } from "@aof/work/phase-brief-read";
import {
  normalizeEffort,
  resolveSessionLaunch,
  THINKING_UNKNOWN_LEVEL,
  thinkingUnknownLevelMessage,
} from "@aof/execution/session-model";
import { buildRunAttribution } from "@aof/execution/otel-attribution";

import { resolveExecution, resolveExecutionResume, validateExecutionEnvelope, resolvePhaseRuntimes } from "@aof/execution/runtime-selection";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleCommandsDrive({ runtimeSessionServices, loopAskServices, agentSessionDriverServices, claudeTrustServices, degradeServices, runStoreServices, loopAskRequestServices, runHeartbeatConsumptionServices, effectsRunTransitionsServices, runSessionCaptureServices, commandsResolveServices, workObserveServices, runSpendIngestServices, meshStoreServices, meshTerminalRelayBridgeServices, meshSessionServices, commandsMeshSessionServices }) {
  // Core composition; @aof/work-loop owns the implementation.

  const { driveInteractiveClaudeSession } = agentSessionDriverServices;
  const { INTERACTIVE_COMMAND_READY_DELAY_MS } = agentSessionDriverServices;
  const { ensureWorktreeTrusted } = claudeTrustServices;

  const { reportDegrade } = degradeServices;
  const { readRuns } = runStoreServices;
  const { recordSessionId } = runStoreServices;
  const { ASK_STATES } = loopAskRequestServices;
  const { readAsk } = loopAskRequestServices;
  const { readConsumedHeartbeatAt } = runHeartbeatConsumptionServices;
  const { transitionRunStart } = effectsRunTransitionsServices;
  const { transitionRunComplete } = effectsRunTransitionsServices;

  const { captureSessionIdOnRecord } = runSessionCaptureServices;
  const { resolveItemExact } = commandsResolveServices;
  const { requireLocalCheckout } = commandsResolveServices;
  const { claudeProjectsDir } = workObserveServices;
  const { settleSpendFromTranscript } = runSpendIngestServices;
  const { snapshotTranscriptTree } = runSpendIngestServices;

  const implementation = createPhaseDrivers({
    runtimeSession: runtimeSessionServices,
    nativeAsks: loopAskServices,
    execution: { resolveExecution, resolveExecutionResume, validateExecutionEnvelope, resolvePhaseRuntimes },
    sessionDriver: { driveInteractiveClaudeSession, INTERACTIVE_COMMAND_READY_DELAY_MS },
    trust: { ensureWorktreeTrusted },
    briefCompiler: { compileBriefForItem },
    sessions: { normalizeEffort, resolveSessionLaunch, THINKING_UNKNOWN_LEVEL, thinkingUnknownLevelMessage },
    diagnostics: { reportDegrade },
    runs: { readRuns, recordSessionId, recordRuntimeEvent: runStoreServices.recordRuntimeEvent, parkRunAsk: runStoreServices.parkRunAsk },
    askRequests: { ...loopAskRequestServices, ASK_STATES, readAsk },
    heartbeats: { readConsumedHeartbeatAt, enqueueHeartbeat: runHeartbeatConsumptionServices.enqueueHeartbeat },
    transitions: { transitionRunStart, transitionRunComplete },
    attribution: { buildRunAttribution },
    sessionCapture: { captureSessionIdOnRecord },
    items: { resolveItemExact, requireLocalCheckout },
    transcripts: { claudeProjectsDir },
    spend: { settleSpendFromTranscript, snapshotTranscriptTree },
    // 162/ADR-001 §3 + ADR-002 §2 — a loop drive's stream: this node's own terminal ingress,
    // and the hook's own session key, so the child upserts the record the hook writes. A
    // composition that supplies no ingress (a fixture) composes no stream at all.
    loopSession: meshTerminalRelayBridgeServices == null ? null : {
      openTerminalIngressClient: ({ workspace, ...options }) => meshTerminalRelayBridgeServices.openTerminalIngressClient({
        readAddress: () => meshStoreServices.readTerminalIngress(workspace),
        ...options,
      }),
      pingSession: meshSessionServices.pingSession,
      resolveNodeId: commandsMeshSessionServices.resolveNodeId,
      resolveWorkspaceId,
    },
  });

  const PHASE_MODE_FLAGS = implementation.PHASE_MODE_FLAGS;
  const composeFixInput = implementation.composeFixInput;
  const continueDriverCommand = implementation.continueDriverCommand;
  const createPhaseDriverCommand = implementation.createPhaseDriverCommand;
  const phaseCommand = implementation.phaseCommand;
  const refineDriverCommand = implementation.refineDriverCommand;
  const repairDriverCommand = implementation.repairDriverCommand;
  const resolvePhaseResumeTarget = implementation.resolvePhaseResumeTarget;
  const verifyDriverCommand = implementation.verifyDriverCommand;

  return { PHASE_MODE_FLAGS, composeFixInput, continueDriverCommand, createPhaseDriverCommand, phaseCommand, refineDriverCommand, repairDriverCommand, resolvePhaseResumeTarget, verifyDriverCommand, reviewDriverCommand: implementation.reviewDriverCommand, driveNativePhase: implementation.driveNativePhase };
}
