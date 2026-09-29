// Compatibility composition; execution owns the local session driver.
import { createSessionDriver } from "@aof/execution/session-driver";
import { createNodePtyLoader } from "@aof/execution/pty";
import { isPackaged } from "./asset-base.mjs";
import { ensureWorktreeTrusted as trustWorktree } from "./claude-trust.mjs";
import { claudeProjectsDir, readLastAssistantTurn, NEEDS_INPUT_SENTINEL as inputSentinel, HUMAN_INPUT_TOOL_NAMES as inputToolNames } from "./work/observe.mjs";
import { resolveProvider } from "./terminal-providers.mjs";
import { reportDegrade } from "./degrade.mjs";
import { openSessionScreen } from "./terminal/session-screen.mjs";
import { buildOtelResourceAttributes, OTEL_RESOURCE_ATTRIBUTES_ENV_KEY, OTEL_TELEMETRY_ENV_KEY } from "./otel-attribution.mjs";
import { composePhaseBriefInput } from "@aof/work/phase-brief";

const implementation = createSessionDriver({
  transcripts: { claudeProjectsDir, readLastAssistantTurn, NEEDS_INPUT_SENTINEL: inputSentinel, HUMAN_INPUT_TOOL_NAMES: inputToolNames },
  launch: { resolveProvider, loadNodePty: createNodePtyLoader({ isPackaged }), openSessionScreen, ensureWorktreeTrusted: trustWorktree, buildOtelResourceAttributes, OTEL_RESOURCE_ATTRIBUTES_ENV_KEY, OTEL_TELEMETRY_ENV_KEY, composePhaseBriefInput },
  reportDegrade,
});

export const COMPLETION_IDLE_MS = implementation.COMPLETION_IDLE_MS;
export const DECLARED_COMPLETION_IDLE_MS = implementation.DECLARED_COMPLETION_IDLE_MS;
export const DIRECTIVE_COMPLETE_INSTRUCTION = implementation.DIRECTIVE_COMPLETE_INSTRUCTION;
export const DIRECTIVE_COMPLETE_SENTINEL = implementation.DIRECTIVE_COMPLETE_SENTINEL;
export const HUMAN_INPUT_TOOL_NAMES = implementation.HUMAN_INPUT_TOOL_NAMES;
export const INTERACTIVE_COMMAND_READY_DELAY_MS = implementation.INTERACTIVE_COMMAND_READY_DELAY_MS;
export const NEEDS_INPUT_INSTRUCTION = implementation.NEEDS_INPUT_INSTRUCTION;
export const NEEDS_INPUT_SENTINEL = implementation.NEEDS_INPUT_SENTINEL;
export const WORKER_SESSION_INSTRUCTION = implementation.WORKER_SESSION_INSTRUCTION;
export const buildDriverCommand = implementation.buildDriverCommand;
export const defaultPtySpawn = implementation.defaultPtySpawn;
export const defaultSpawnRuntime = implementation.defaultSpawnRuntime;
export const defaultWatchTranscriptCompletion = implementation.defaultWatchTranscriptCompletion;
export const defaultWatchTranscriptSessionId = implementation.defaultWatchTranscriptSessionId;
export const driveInteractiveClaudeSession = implementation.driveInteractiveClaudeSession;
export const ensureWorktreeTrusted = implementation.ensureWorktreeTrusted;
export const resolveInteractiveDriverLaunch = implementation.resolveInteractiveDriverLaunch;
