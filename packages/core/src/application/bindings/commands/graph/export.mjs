// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGraphExportCommand } from "@aof/knowledge/commands/graph-export";
import { defaultGitExec } from "@aof/execution/worktrees";

export function assembleCommandsGraphExport() {
  // Core composition for knowledge-owned services: git is the one effect export needs (166).

  const { graphExportCommand } = createGraphExportCommand({ git: defaultGitExec });

  return { graphExportCommand };
}
