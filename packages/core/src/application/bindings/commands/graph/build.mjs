// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGraphBuildCommand } from "@aof/knowledge/commands/graph-build";
import { defaultGitExec } from "@aof/execution/worktrees";
import { ensureGraphifyOutGitignore } from "../../../../aof-gitignore.mjs";

export function assembleCommandsGraphBuild({ graphifyServices }) {
  // Core composition for knowledge-owned services: git lists the tree the inputs stamp covers (166)
  // and reaches the remote a shared graph travels through, and a fetched graph is laid out with
  // its ignore file, as an imported one is (174).

  const { resolveGraphifyBinary } = graphifyServices;
  const { runGraphifyBuild } = graphifyServices;
  const { readGraph } = graphifyServices;
  const { normalizeGraph } = graphifyServices;
  const { graphJsonPath } = graphifyServices;
  const { graphArtifactBuiltAt } = graphifyServices;
  const { isCodeOnlyWholeRootBuild } = graphifyServices;

  const { isNetworkBackend, isKnownNetworkBackend, classifyEgress, readBuiltGraph, graphBuildCommand } = createGraphBuildCommand({ resolveGraphifyBinary, runGraphifyBuild, readGraph, normalizeGraph, graphJsonPath, graphArtifactBuiltAt, isCodeOnlyWholeRootBuild, git: defaultGitExec, ensureGraphifyOutGitignore });

  return { isNetworkBackend, isKnownNetworkBackend, classifyEgress, readBuiltGraph, graphBuildCommand };
}
