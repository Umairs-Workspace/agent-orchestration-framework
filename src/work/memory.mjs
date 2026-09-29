// Transitional core composition for knowledge-owned services.
import { createMemory } from "@aof/knowledge/memory";


const loadLocalBackend = () => import("../memory/local-backend.mjs").then(m => m.default);
const loadGraphifyBackend = () => import("../memory/graphify-backend.mjs").then(m => m.default);
export const { MEMORY_VERBS, SCOPE_FLAGS, BACKEND_REGISTRY, selectBackendName, declaredBackendName, MEMORY_BACKEND_CONFIG_PATH, applyDefaultBackendSelection, resolveConfiguredBackend, parseMemoryArgv, HOOK_LIMIT, renderRecallBlock, renderMemory, memoryJson, briefDigest, MEMORY_USAGE, memoryUsage, memoryHelpRequested, memoryVerbRefusal, gateMemoryVerb, executeMemoryVerb, runMemoryVerb, runMemory } = createMemory({ loadLocalBackend, loadGraphifyBackend });
