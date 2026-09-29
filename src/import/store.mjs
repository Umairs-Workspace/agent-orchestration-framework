// Transitional core composition for knowledge-owned import services.
import { createImportStore } from "@aof/knowledge/import/store";
import { workspacePaths } from "../workspace.mjs";

export const { IMPORTS_SUBDIR, importStoreRoot, slugifySource, importMilestoneFolderName, importMilestoneDir, IMPORT_STORE_GITIGNORE, ensureImportStoreGitignore } = createImportStore({ workspacePaths });
