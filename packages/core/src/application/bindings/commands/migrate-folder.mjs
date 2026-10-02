// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMigrateFolderCommand } from "@aof/work/commands/migrate-folder";
import { resolveImportSource } from "@aof/knowledge/import/source";
import { packageVersionString } from "../../../asset-base.mjs";

export function assembleCommandsMigrateFolder({ importRecoveryServices, importStoreServices }) {
  // Core constructs this application service from its owning package.

  const { recoverMilestone } = importRecoveryServices;
  const { listRecoverableMilestones } = importRecoveryServices;
  const { slugifySource } = importStoreServices;

  const { migrateFolderCommand } = createMigrateFolderCommand({ resolveImportSource, recoverMilestone, listRecoverableMilestones, slugifySource, packageVersionString });

  return { migrateFolderCommand };
}
