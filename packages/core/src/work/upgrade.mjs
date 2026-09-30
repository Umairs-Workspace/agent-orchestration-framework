// Compatibility entry; construction belongs to core application assembly.
import { workUpgrade } from "../application/default.mjs";
export const {
  WORK_ITEM_MIGRATIONS,
  changelogDrift,
  planTransforms,
  planUpgrade,
  renderChangelog,
  runUpgrade,
} = workUpgrade;
