// Compatibility entry; construction belongs to core application assembly.
import { importStore } from "../application/default.mjs";
export const {
  IMPORTS_SUBDIR,
  importStoreRoot,
  slugifySource,
  importMilestoneFolderName,
  importMilestoneDir,
  IMPORT_STORE_GITIGNORE,
  ensureImportStoreGitignore,
} = importStore;
