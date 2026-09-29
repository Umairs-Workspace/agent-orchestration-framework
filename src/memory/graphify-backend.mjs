// Transitional core composition for knowledge-owned services.
import { createGraphifyBackend } from "@aof/knowledge/memory/graphify-backend";
import { invoke as coreInvoke, loadWorkspace } from "../command-core.mjs";
import { buildRecords } from "./local-indexing.mjs";
import { ensureAofGitignore, ensureGraphifyOutGitignore } from "../aof-gitignore.mjs";

const services = createGraphifyBackend({ coreInvoke, loadWorkspace, buildRecords, ensureAofGitignore, ensureGraphifyOutGitignore });
export const { GRAPHIFY_INDEX_VERSION, workGraphRoot, GRAPHIFY_EXTRACTION_BACKEND, GRAPHIFY_EXTRACTION_EGRESS, graphifyIndexPath, GRAPH_SIGNAL_RANKED, GRAPH_SIGNAL_UNAVAILABLE, GRAPH_STATE_BUILT, GRAPH_STATE_BINARY_ABSENT, GRAPH_STATE_NOT_BUILT, rerank, applyScope } = services;
export default services.default;
