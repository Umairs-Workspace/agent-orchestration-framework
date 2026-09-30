// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createImportStore } from "@aof/knowledge/import/store";

export function assembleImportStore({ workspaceServices }) {
  // Core composition for knowledge-owned import services.

  const { workspacePaths } = workspaceServices;

  const { IMPORTS_SUBDIR, importStoreRoot, slugifySource, importMilestoneFolderName, importMilestoneDir, IMPORT_STORE_GITIGNORE, ensureImportStoreGitignore } = createImportStore({ workspacePaths });

  return { IMPORTS_SUBDIR, importStoreRoot, slugifySource, importMilestoneFolderName, importMilestoneDir, IMPORT_STORE_GITIGNORE, ensureImportStoreGitignore };
}
