// Compatibility composition; @aof/work-loop owns the implementation.
import { createPhaseDrivers } from "@aof/work-loop/commands/drive";
import { driveInteractiveClaudeSession, INTERACTIVE_COMMAND_READY_DELAY_MS } from "../agent-session-driver.mjs";
import { ensureWorktreeTrusted } from "../claude-trust.mjs";
import { compileBriefForItem } from "@aof/work/phase-brief-read";
import {
  normalizeEffort,
  resolveSessionLaunch,
  THINKING_UNKNOWN_LEVEL,
  thinkingUnknownLevelMessage,
} from "../session-model.mjs";
import { reportDegrade } from "../degrade.mjs";
import { readRuns, recordSessionId } from "../run-store.mjs";
import { ASK_STATES, readAsk } from "../loop/ask-request.mjs";
import { readConsumedHeartbeatAt } from "../run-heartbeat-consumption.mjs";
import { transitionRunStart, transitionRunComplete } from "../effects/run-transitions.mjs";
import { buildRunAttribution } from "../otel-attribution.mjs";
import { captureSessionIdOnRecord } from "../run-session-capture.mjs";
import { resolveItemExact, requireLocalCheckout } from "./resolve.mjs";
import { claudeProjectsDir } from "../work/observe.mjs";
import { settleSpendFromTranscript, snapshotTranscriptTree } from "../run-spend-ingest.mjs";

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

export const PHASE_MODE_FLAGS = implementation.PHASE_MODE_FLAGS;
export const composeFixInput = implementation.composeFixInput;
export const continueDriverCommand = implementation.continueDriverCommand;
export const createPhaseDriverCommand = implementation.createPhaseDriverCommand;
export const phaseCommand = implementation.phaseCommand;
export const refineDriverCommand = implementation.refineDriverCommand;
export const resolvePhaseResumeTarget = implementation.resolvePhaseResumeTarget;
export const verifyDriverCommand = implementation.verifyDriverCommand;
