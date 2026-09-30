// Compatibility entry; construction belongs to core application assembly.
import { graphify } from "./application/default.mjs";
export const {
  GRAPHIFY_SPEC,
  GRAPHIFY_BINARY,
  PINNED_GRAPHIFY_VERSION,
  resolveGraphifyBinary,
  graphifyBuildArgs,
  isCodeOnlyWholeRootBuild,
  GRAPHIFY_TIMEOUT_ENV,
  DEFAULT_GRAPHIFY_TIMEOUT_MS,
  graphifySpawnTimeoutMs,
  graphifySpawnOptions,
  runGraphifyBuild,
  runGraphifyQuery,
  runGraphifyTriage,
  graphJsonPath,
  readGraph,
  normalizeGraph,
  graphArtifactBuiltAt,
} = graphify;
