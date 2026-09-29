// Transitional core composition for knowledge-owned services.
import { createMemoryCommand } from "@aof/knowledge/commands/memory";
import {
  MEMORY_USAGE,
  SCOPE_FLAGS,
  memoryJson,
  parseMemoryArgv,
  renderMemory,
  resolveConfiguredBackend,
  runMemoryVerb,
} from "../../work/memory.mjs";

export const { memoryCommand } = createMemoryCommand({ MEMORY_USAGE, SCOPE_FLAGS, memoryJson, parseMemoryArgv, renderMemory, resolveConfiguredBackend, runMemoryVerb });
