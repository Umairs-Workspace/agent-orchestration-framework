// Transitional core composition for mesh-owned projections.
import { createGlobalWorkProjectionStore } from "@aof/mesh/projection-store";
import { importSqliteRuntime } from "./sqlite-runtime.mjs";
import { globalMeshPaths } from "./workspace.mjs";
import { listItems, parseFrontmatter, recordDoc } from "./work.mjs";
import { workspaceIdFromPath, resolveWorkspaceId } from "@aof/mesh/workspace-identity";
import { reportDegrade } from "./degrade.mjs";
import { tableClass, refRemapTables } from "./effects/stores.mjs";
import { deriveNodeId } from "@aof/mesh/node-identity";
import { toWireProvenance } from "@aof/contracts/cache-provenance";

export const { GLOBAL_WORK_SCHEMA_VERSION, globalStoreError, workspaceIdFor, wholesaleDelete, openGlobalWorkProjectionStore, remapWorkspaceProjectionRefs, remapWorkspaceFactRefs, UPSERT_AUTHORITIES, upsertWorkItems, removeWorkspaceFromCache, publishWorkspaceSnapshot, recordWorkspaceProjectionError, readWorkspaceProjectionItems, readWorkspaceItems, readWorkspaceItemProvenance, upsertWorkItemContent, readWorkItemDoc, readWorkItemDocMembers, readWorkItemRuns, NODE_LOG_KEEP, appendNodeLogEntries, readNodeLogEntries, queryGlobalWorkProjection } = createGlobalWorkProjectionStore({ importSqliteRuntime, globalMeshPaths, listItems, parseFrontmatter, recordDoc, workspaceIdFromPath, resolveWorkspaceId, reportDegrade, tableClass, refRemapTables, deriveNodeId, toWireProvenance });
export { WORK_ITEM_DOC_FILES } from "./work/artifacts.mjs";
export { REQUIRED_ITEM_FIELDS, OPTIONAL_ITEM_FIELDS, itemRowFault, isCompleteItemRow } from "./work/item-row.mjs";
