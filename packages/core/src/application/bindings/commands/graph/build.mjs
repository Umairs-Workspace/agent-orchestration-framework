// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGraphBuildCommand } from "@aof/knowledge/commands/graph-build";

export function assembleCommandsGraphBuild({ graphifyServices }) {
  // Core composition for knowledge-owned services.

  const { resolveGraphifyBinary } = graphifyServices;
  const { runGraphifyBuild } = graphifyServices;
  const { readGraph } = graphifyServices;
  const { normalizeGraph } = graphifyServices;
  const { graphJsonPath } = graphifyServices;

  const { isNetworkBackend, isKnownNetworkBackend, classifyEgress, readBuiltGraph, graphBuildCommand } = createGraphBuildCommand({ resolveGraphifyBinary, runGraphifyBuild, readGraph, normalizeGraph, graphJsonPath });

  return { isNetworkBackend, isKnownNetworkBackend, classifyEgress, readBuiltGraph, graphBuildCommand };
}
