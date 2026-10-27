// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGraphPublishCommand } from "@aof/knowledge/commands/graph-publish";
import { defaultGitExec } from "@aof/execution/worktrees";

export function assembleCommandsGraphPublish({ graphifyServices }) {
  // Core composition for knowledge-owned services: git (which reaches the remote) and the one
  // derivation of a graph's build time, which the published bundle's stamp carries (174).

  const { graphArtifactBuiltAt } = graphifyServices;

  const { graphPublishCommand } = createGraphPublishCommand({ git: defaultGitExec, graphArtifactBuiltAt });

  return { graphPublishCommand };
}
