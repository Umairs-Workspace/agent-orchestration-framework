// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGraphBuildCommand } from "@aof/knowledge/commands/graph-build";
import { defaultGitExec } from "@aof/execution/worktrees";

export function assembleCommandsGraphBuild({ graphifyServices }) {
  // Core composition for knowledge-owned services: git lists the tree the inputs stamp covers (166).

  const { resolveGraphifyBinary } = graphifyServices;
  const { runGraphifyBuild } = graphifyServices;
  const { readGraph } = graphifyServices;
  const { normalizeGraph } = graphifyServices;
  const { graphJsonPath } = graphifyServices;
  const { graphArtifactBuiltAt } = graphifyServices;
  const { isCodeOnlyWholeRootBuild } = graphifyServices;

  const { isNetworkBackend, isKnownNetworkBackend, classifyEgress, readBuiltGraph, graphBuildCommand } = createGraphBuildCommand({ resolveGraphifyBinary, runGraphifyBuild, readGraph, normalizeGraph, graphJsonPath, graphArtifactBuiltAt, isCodeOnlyWholeRootBuild, git: defaultGitExec });

  return { isNetworkBackend, isKnownNetworkBackend, classifyEgress, readBuiltGraph, graphBuildCommand };
}
