// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGraphImportCommand } from "@aof/knowledge/commands/graph-import";
import { defaultGitExec } from "@aof/execution/worktrees";
import { ensureGraphifyOutGitignore } from "../../../../aof-gitignore.mjs";

export function assembleCommandsGraphImport({ graphifyServices }) {
  // Core composition for knowledge-owned services: git, the graphify version probe (through the
  // driver's resolver, never a spawn of its own) and the graph folder's ignore file (166).

  const { resolveGraphifyBinary } = graphifyServices;

  const { graphImportCommand } = createGraphImportCommand({ git: defaultGitExec, resolveGraphifyBinary, ensureGraphifyOutGitignore });

  return { graphImportCommand };
}
