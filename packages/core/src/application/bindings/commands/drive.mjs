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

export function assembleCommandsDrive({ agentSessionDriverServices, claudeTrustServices, degradeServices, runStoreServices, loopAskRequestServices, runHeartbeatConsumptionServices, effectsRunTransitionsServices, runSessionCaptureServices, commandsResolveServices, workObserveServices, runSpendIngestServices }) {
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
    sessionDriver: { driveInteractiveClaudeSession, INTERACTIVE_COMMAND_READY_DELAY_MS },
    trust: { ensureWorktreeTrusted },
    briefCompiler: { compileBriefForItem },
    sessions: { normalizeEffort, resolveSessionLaunch, THINKING_UNKNOWN_LEVEL, thinkingUnknownLevelMessage },
    diagnostics: { reportDegrade },
    runs: { readRuns, recordSessionId },
    askRequests: { ASK_STATES, readAsk },
    heartbeats: { readConsumedHeartbeatAt },
    transitions: { transitionRunStart, transitionRunComplete },
    attribution: { buildRunAttribution },
    sessionCapture: { captureSessionIdOnRecord },
    items: { resolveItemExact, requireLocalCheckout },
    transcripts: { claudeProjectsDir },
    spend: { settleSpendFromTranscript, snapshotTranscriptTree },
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

  return { PHASE_MODE_FLAGS, composeFixInput, continueDriverCommand, createPhaseDriverCommand, phaseCommand, refineDriverCommand, repairDriverCommand, resolvePhaseResumeTarget, verifyDriverCommand };
}
