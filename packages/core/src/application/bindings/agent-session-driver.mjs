// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createSessionDriver } from "@aof/execution/session-driver";
import { createNodePtyLoader } from "@aof/execution/pty";
import { isPackaged } from "../../asset-base.mjs";
import { buildOtelResourceAttributes, OTEL_RESOURCE_ATTRIBUTES_ENV_KEY, OTEL_TELEMETRY_ENV_KEY } from "@aof/execution/otel-attribution";
import { composePhaseBriefInput } from "@aof/work/phase-brief";

export function assembleAgentSessionDriver({ claudeTrustServices, workObserveServices, terminalProvidersServices, degradeServices, terminalSessionScreenServices }) {
  // Core composition; execution owns the local session driver.

  const { ensureWorktreeTrusted: trustWorktree } = claudeTrustServices;
  const { claudeProjectsDir } = workObserveServices;
  const { readLastAssistantTurn, readPendingAsk } = workObserveServices;
  const { NEEDS_INPUT_SENTINEL: inputSentinel } = workObserveServices;
  const { HUMAN_INPUT_TOOL_NAMES: inputToolNames } = workObserveServices;
  const { resolveProvider } = terminalProvidersServices;
  const { reportDegrade } = degradeServices;
  const { openSessionScreen } = terminalSessionScreenServices;

  const implementation = createSessionDriver({
    transcripts: { claudeProjectsDir, readLastAssistantTurn, readPendingAsk, NEEDS_INPUT_SENTINEL: inputSentinel, HUMAN_INPUT_TOOL_NAMES: inputToolNames },
    launch: { resolveProvider, loadNodePty: createNodePtyLoader({ isPackaged }), openSessionScreen, ensureWorktreeTrusted: trustWorktree, buildOtelResourceAttributes, OTEL_RESOURCE_ATTRIBUTES_ENV_KEY, OTEL_TELEMETRY_ENV_KEY, composePhaseBriefInput },
    reportDegrade,
  });

  const COMPLETION_IDLE_MS = implementation.COMPLETION_IDLE_MS;
  const DECLARED_COMPLETION_IDLE_MS = implementation.DECLARED_COMPLETION_IDLE_MS;
  const DIRECTIVE_COMPLETE_INSTRUCTION = implementation.DIRECTIVE_COMPLETE_INSTRUCTION;
  const DIRECTIVE_COMPLETE_SENTINEL = implementation.DIRECTIVE_COMPLETE_SENTINEL;
  const HUMAN_INPUT_TOOL_NAMES = implementation.HUMAN_INPUT_TOOL_NAMES;
  const INTERACTIVE_COMMAND_READY_DELAY_MS = implementation.INTERACTIVE_COMMAND_READY_DELAY_MS;
  const NEEDS_INPUT_INSTRUCTION = implementation.NEEDS_INPUT_INSTRUCTION;
  const NEEDS_INPUT_SENTINEL = implementation.NEEDS_INPUT_SENTINEL;
  const WORKER_SESSION_INSTRUCTION = implementation.WORKER_SESSION_INSTRUCTION;
  const buildDriverCommand = implementation.buildDriverCommand;
  const defaultPtySpawn = implementation.defaultPtySpawn;
  const defaultSpawnRuntime = implementation.defaultSpawnRuntime;
  const defaultWatchTranscriptCompletion = implementation.defaultWatchTranscriptCompletion;
  const defaultWatchTranscriptSessionId = implementation.defaultWatchTranscriptSessionId;
  const driveInteractiveClaudeSession = implementation.driveInteractiveClaudeSession;
  const ensureWorktreeTrusted = implementation.ensureWorktreeTrusted;
  const resolveInteractiveDriverLaunch = implementation.resolveInteractiveDriverLaunch;

  return { COMPLETION_IDLE_MS, DECLARED_COMPLETION_IDLE_MS, DIRECTIVE_COMPLETE_INSTRUCTION, DIRECTIVE_COMPLETE_SENTINEL, HUMAN_INPUT_TOOL_NAMES, INTERACTIVE_COMMAND_READY_DELAY_MS, NEEDS_INPUT_INSTRUCTION, NEEDS_INPUT_SENTINEL, WORKER_SESSION_INSTRUCTION, buildDriverCommand, defaultPtySpawn, defaultSpawnRuntime, defaultWatchTranscriptCompletion, defaultWatchTranscriptSessionId, driveInteractiveClaudeSession, ensureWorktreeTrusted, resolveInteractiveDriverLaunch };
}
