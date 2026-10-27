// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGraphPruneCommand } from "@aof/knowledge/commands/graph-prune";
import { defaultGitExec } from "@aof/execution/worktrees";

export function assembleCommandsGraphPrune() {
  // Core composition for knowledge-owned services: git, which reaches the remote, is the one
  // effect prune needs (174).

  const { graphPruneCommand } = createGraphPruneCommand({ git: defaultGitExec });

  return { graphPruneCommand };
}
