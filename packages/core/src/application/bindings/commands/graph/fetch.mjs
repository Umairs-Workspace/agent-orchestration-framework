// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGraphFetchCommand } from "@aof/knowledge/commands/graph-fetch";
import { defaultGitExec } from "@aof/execution/worktrees";
import { ensureGraphifyOutGitignore } from "../../../../aof-gitignore.mjs";

export function assembleCommandsGraphFetch({ graphifyServices }) {
  // Core composition for knowledge-owned services: git (which reaches the remote), the graphify
  // version probe and the graph folder's ignore file — import's three, since fetch lays out a
  // graph exactly as import does (174).

  const { resolveGraphifyBinary } = graphifyServices;

  const { graphFetchCommand } = createGraphFetchCommand({ git: defaultGitExec, resolveGraphifyBinary, ensureGraphifyOutGitignore });

  return { graphFetchCommand };
}
