// Transitional core composition for work-owned insertion and promotion.
import { createWorkInsertion } from "@aof/work/insertion/scaffold";
import { transitionStreamReindexed } from "../effects/stream-transitions.mjs";
import { packageVersionString } from "../asset-base.mjs";

export const { INSERT_FLAGS, guardSlotOpenCount, normalizeSlug, parseDependsInput, parsePosition, renderBlankTemplate, runInsertStory, scaffoldBacklogDriver, stripBundleMarker } = createWorkInsertion({ transitionStreamReindexed, packageVersionString });
