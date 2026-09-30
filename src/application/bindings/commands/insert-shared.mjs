// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createWorkInsertion } from "@aof/work/insertion/scaffold";
import { packageVersionString } from "../../../asset-base.mjs";

export function assembleCommandsInsertShared({ effectsStreamTransitionsServices }) {
  // Core composition for work-owned insertion and promotion.

  const { transitionStreamReindexed } = effectsStreamTransitionsServices;

  const { INSERT_FLAGS, guardSlotOpenCount, normalizeSlug, parseDependsInput, parsePosition, renderBlankTemplate, runInsertStory, scaffoldBacklogDriver, stripBundleMarker } = createWorkInsertion({ transitionStreamReindexed, packageVersionString });

  return { INSERT_FLAGS, guardSlotOpenCount, normalizeSlug, parseDependsInput, parsePosition, renderBlankTemplate, runInsertStory, scaffoldBacklogDriver, stripBundleMarker };
}
