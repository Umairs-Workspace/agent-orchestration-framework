// Transitional core composition for knowledge-owned services.
import { createGraphify } from "@aof/knowledge/graphify";
import { resolveManagedBinary } from "./tool-store.mjs";

export const { GRAPHIFY_SPEC, GRAPHIFY_BINARY, PINNED_GRAPHIFY_VERSION, resolveGraphifyBinary, graphifyBuildArgs, isCodeOnlyWholeRootBuild, GRAPHIFY_TIMEOUT_ENV, DEFAULT_GRAPHIFY_TIMEOUT_MS, graphifySpawnTimeoutMs, graphifySpawnOptions, runGraphifyBuild, runGraphifyQuery, runGraphifyTriage, graphJsonPath, readGraph, normalizeGraph, graphArtifactBuiltAt } = createGraphify({ resolveManagedBinary });
