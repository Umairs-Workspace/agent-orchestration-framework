// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMemoryCommand } from "@aof/knowledge/commands/memory";

export function assembleCommandsWorkMemory({ workMemoryServices }) {
  // Core composition for knowledge-owned services.

  const { MEMORY_USAGE } = workMemoryServices;
  const { SCOPE_FLAGS } = workMemoryServices;
  const { memoryJson } = workMemoryServices;
  const { parseMemoryArgv } = workMemoryServices;
  const { renderMemory } = workMemoryServices;
  const { resolveConfiguredBackend } = workMemoryServices;
  const { runMemoryVerb } = workMemoryServices;

  const { memoryCommand } = createMemoryCommand({ MEMORY_USAGE, SCOPE_FLAGS, memoryJson, parseMemoryArgv, renderMemory, resolveConfiguredBackend, runMemoryVerb });

  return { memoryCommand };
}
