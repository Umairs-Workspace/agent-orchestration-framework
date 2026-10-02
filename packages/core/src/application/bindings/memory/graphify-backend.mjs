// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGraphifyBackend } from "@aof/knowledge/memory/graphify-backend";
import { ensureAofGitignore, ensureGraphifyOutGitignore } from "../../../aof-gitignore.mjs";

export function assembleMemoryGraphifyBackend({ commandCoreServices, memoryLocalIndexingServices }) {
  // Core composition for knowledge-owned services.

  const { invoke: coreInvoke } = commandCoreServices;
  const { loadWorkspace } = commandCoreServices;
  const { buildRecords } = memoryLocalIndexingServices;

  const services = createGraphifyBackend({ coreInvoke, loadWorkspace, buildRecords, ensureAofGitignore, ensureGraphifyOutGitignore });
  const { GRAPHIFY_INDEX_VERSION, workGraphRoot, GRAPHIFY_EXTRACTION_BACKEND, GRAPHIFY_EXTRACTION_EGRESS, graphifyIndexPath, GRAPH_SIGNAL_RANKED, GRAPH_SIGNAL_UNAVAILABLE, GRAPH_STATE_BUILT, GRAPH_STATE_BINARY_ABSENT, GRAPH_STATE_NOT_BUILT, rerank, applyScope } = services;

  return { GRAPHIFY_INDEX_VERSION, workGraphRoot, GRAPHIFY_EXTRACTION_BACKEND, GRAPHIFY_EXTRACTION_EGRESS, graphifyIndexPath, GRAPH_SIGNAL_RANKED, GRAPH_SIGNAL_UNAVAILABLE, GRAPH_STATE_BUILT, GRAPH_STATE_BINARY_ABSENT, GRAPH_STATE_NOT_BUILT, rerank, applyScope, "default": services.default };
}
