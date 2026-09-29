// Transitional core composition for work-owned schema upgrades.
import { createWorkUpgrade } from "@aof/work/upgrade";
import { packageVersionString } from "../asset-base.mjs";
export const { WORK_ITEM_MIGRATIONS, changelogDrift, planTransforms, planUpgrade, renderChangelog, runUpgrade } = createWorkUpgrade({ packageVersionString });
