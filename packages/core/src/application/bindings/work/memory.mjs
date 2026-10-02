// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMemory } from "@aof/knowledge/memory";

export function assembleWorkMemory({ provideMemoryLocalBackend, provideMemoryGraphifyBackend }) {
  // Core composition for knowledge-owned services.

  const loadLocalBackend = () => provideMemoryLocalBackend().then(m => m.default);
  const loadGraphifyBackend = () => provideMemoryGraphifyBackend().then(m => m.default);
  const { MEMORY_VERBS, SCOPE_FLAGS, BACKEND_REGISTRY, selectBackendName, declaredBackendName, MEMORY_BACKEND_CONFIG_PATH, applyDefaultBackendSelection, resolveConfiguredBackend, parseMemoryArgv, HOOK_LIMIT, renderRecallBlock, renderMemory, memoryJson, briefDigest, MEMORY_USAGE, memoryUsage, memoryHelpRequested, memoryVerbRefusal, gateMemoryVerb, executeMemoryVerb, runMemoryVerb, runMemory } = createMemory({ loadLocalBackend, loadGraphifyBackend });

  return { MEMORY_VERBS, SCOPE_FLAGS, BACKEND_REGISTRY, selectBackendName, declaredBackendName, MEMORY_BACKEND_CONFIG_PATH, applyDefaultBackendSelection, resolveConfiguredBackend, parseMemoryArgv, HOOK_LIMIT, renderRecallBlock, renderMemory, memoryJson, briefDigest, MEMORY_USAGE, memoryUsage, memoryHelpRequested, memoryVerbRefusal, gateMemoryVerb, executeMemoryVerb, runMemoryVerb, runMemory };
}
