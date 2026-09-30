// Compatibility entry; construction belongs to core application assembly.
import { commandsInsertShared } from "../application/default.mjs";
export const {
  INSERT_FLAGS,
  guardSlotOpenCount,
  normalizeSlug,
  parseDependsInput,
  parsePosition,
  renderBlankTemplate,
  runInsertStory,
  scaffoldBacklogDriver,
  stripBundleMarker,
} = commandsInsertShared;
