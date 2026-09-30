// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createNotionMapping } from "@aof/integration-notion/mapping";
import * as api0 from "@aof/integration-notion/mapping";

export function assembleNotionMapping({ workspaceServices }) {
  // Core composition: core supplies workspace path policy; the package owns sidecar storage.

  const { workspacePaths } = workspaceServices;

  const { readMapping, recordPageId, remapMappingRefs } = createNotionMapping({ workspacePaths });

  return { "hashContent": api0.hashContent, "resolvePageId": api0.resolvePageId, "NOTION_WORK_MAP_FILE": api0.NOTION_WORK_MAP_FILE, readMapping, recordPageId, remapMappingRefs };
}
