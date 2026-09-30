// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createWorkUpgrade } from "@aof/work/upgrade";
import { packageVersionString } from "../../../asset-base.mjs";

export function assembleWorkUpgrade({  } = {}) {
  // Core composition for work-owned schema upgrades.

  const { WORK_ITEM_MIGRATIONS, changelogDrift, planTransforms, planUpgrade, renderChangelog, runUpgrade } = createWorkUpgrade({ packageVersionString });

  return { WORK_ITEM_MIGRATIONS, changelogDrift, planTransforms, planUpgrade, renderChangelog, runUpgrade };
}
