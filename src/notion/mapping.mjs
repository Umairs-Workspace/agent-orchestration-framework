// Compatibility entry; construction belongs to core application assembly.
import { notionMapping } from "../application/default.mjs";
export const {
  hashContent,
  resolvePageId,
  NOTION_WORK_MAP_FILE,
  readMapping,
  recordPageId,
  remapMappingRefs,
} = notionMapping;
