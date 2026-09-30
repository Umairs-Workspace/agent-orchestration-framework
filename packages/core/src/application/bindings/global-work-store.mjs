// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createGlobalWorkProjectionStore } from "@aof/mesh/projection-store";
import { importSqliteRuntime } from "@aof/foundation/sqlite-runtime";
import { workspaceIdFromPath, resolveWorkspaceId } from "@aof/mesh/workspace-identity";
import { tableClass, refRemapTables } from "../../effects/stores.mjs";
import { deriveNodeId } from "@aof/mesh/node-identity";
import { toWireProvenance } from "@aof/contracts/cache-provenance";
import * as api0 from "@aof/work/artifacts";
import * as api1 from "@aof/work/item-row";

export function assembleGlobalWorkStore({ workspaceServices, workServices, degradeServices }) {
  // Core composition for mesh-owned projections.

  const { globalMeshPaths } = workspaceServices;
  const { listItems } = workServices;
  const { parseFrontmatter } = workServices;
  const { recordDoc } = workServices;

  const { reportDegrade } = degradeServices;

  const { GLOBAL_WORK_SCHEMA_VERSION, globalStoreError, workspaceIdFor, wholesaleDelete, openGlobalWorkProjectionStore, remapWorkspaceProjectionRefs, remapWorkspaceFactRefs, UPSERT_AUTHORITIES, upsertWorkItems, removeWorkspaceFromCache, publishWorkspaceSnapshot, recordWorkspaceProjectionError, readWorkspaceProjectionItems, readWorkspaceItems, readWorkspaceItemProvenance, upsertWorkItemContent, readWorkItemDoc, readWorkItemDocMembers, readWorkItemRuns, NODE_LOG_KEEP, appendNodeLogEntries, readNodeLogEntries, queryGlobalWorkProjection } = createGlobalWorkProjectionStore({ importSqliteRuntime, globalMeshPaths, listItems, parseFrontmatter, recordDoc, workspaceIdFromPath, resolveWorkspaceId, reportDegrade, tableClass, refRemapTables, deriveNodeId, toWireProvenance });

  return { GLOBAL_WORK_SCHEMA_VERSION, globalStoreError, workspaceIdFor, wholesaleDelete, openGlobalWorkProjectionStore, remapWorkspaceProjectionRefs, remapWorkspaceFactRefs, UPSERT_AUTHORITIES, upsertWorkItems, removeWorkspaceFromCache, publishWorkspaceSnapshot, recordWorkspaceProjectionError, readWorkspaceProjectionItems, readWorkspaceItems, readWorkspaceItemProvenance, upsertWorkItemContent, readWorkItemDoc, readWorkItemDocMembers, readWorkItemRuns, NODE_LOG_KEEP, appendNodeLogEntries, readNodeLogEntries, queryGlobalWorkProjection, "WORK_ITEM_DOC_FILES": api0.WORK_ITEM_DOC_FILES, "REQUIRED_ITEM_FIELDS": api1.REQUIRED_ITEM_FIELDS, "OPTIONAL_ITEM_FIELDS": api1.OPTIONAL_ITEM_FIELDS, "itemRowFault": api1.itemRowFault, "isCompleteItemRow": api1.isCompleteItemRow };
}
