// Compatibility adapter: core supplies workspace path policy; the package owns sidecar storage.
import { createNotionMapping } from '@aof/integration-notion/mapping';
import { workspacePaths } from '../workspace.mjs';
export { hashContent, resolvePageId, NOTION_WORK_MAP_FILE } from '@aof/integration-notion/mapping';
export const { readMapping, recordPageId, remapMappingRefs } = createNotionMapping({ workspacePaths });
