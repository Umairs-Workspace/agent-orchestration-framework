// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGraphBuildCommand } from "@aof/knowledge/commands/graph-build";
import { defaultGitExec } from "@aof/execution/worktrees";
import { ensureGraphifyOutGitignore } from "../../../../aof-gitignore.mjs";

export function assembleCommandsGraphBuild({ graphifyServices, knowledgeEngineServices }) {
  // Core composition for knowledge-owned services: the build is `ingest("code")` through the port
  // composed over the graphify code backend (179/ADR-002). git reaches the remote a shared graph
  // travels through, and a fetched graph is laid out with its ignore file, as an imported one is (174).

  const { resolveGraphifyBinary } = graphifyServices;
  const { isCodeOnlyWholeRootBuild } = graphifyServices;
  const { codeEngine } = knowledgeEngineServices;

  const { graphBuildCommand } = createGraphBuildCommand({ engine: codeEngine, isCodeOnlyWholeRootBuild, resolveGraphifyBinary, git: defaultGitExec, ensureGraphifyOutGitignore });

  return { graphBuildCommand };
}
