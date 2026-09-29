// Transitional core composition for knowledge-owned services.
import { createGraphBuildCommand } from "@aof/knowledge/commands/graph-build";
import {
  resolveGraphifyBinary,
  runGraphifyBuild,
  readGraph,
  normalizeGraph,
  graphJsonPath,
} from "../../graphify.mjs";

export const { isNetworkBackend, isKnownNetworkBackend, classifyEgress, readBuiltGraph, graphBuildCommand } = createGraphBuildCommand({ resolveGraphifyBinary, runGraphifyBuild, readGraph, normalizeGraph, graphJsonPath });
