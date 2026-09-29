// Configured application adapter; assembly moves in Plan 02, removal in Plan 06.
import { createMigrateFolderCommand } from "@aof/work/commands/migrate-folder";
import { resolveImportSource } from "@aof/knowledge/import/source";
import { recoverMilestone, listRecoverableMilestones } from "../import/recovery.mjs";
import { slugifySource } from "../import/store.mjs";
import { packageVersionString } from "../asset-base.mjs";
export const { migrateFolderCommand } = createMigrateFolderCommand({ resolveImportSource, recoverMilestone, listRecoverableMilestones, slugifySource, packageVersionString });
