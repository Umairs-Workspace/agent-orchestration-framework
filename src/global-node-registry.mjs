// Transitional core composition for mesh-owned projections.
import { createGlobalNodeRegistry } from "@aof/mesh/global-node-registry";
import { globalMeshPaths } from "./workspace.mjs";
import { resolveWorkspaceId } from "./workspace-identity.mjs";
import { readNodeRecords } from "./mesh/store.mjs";
import { readPresenceRecords, readPresenceRecord, assemblePresenceRecord } from "./mesh/presence.mjs";
import { resolveCloneUrl } from "@aof/mesh/worker-repo-admission";
import { reportDegrade } from "./degrade.mjs";

export const { publishGlobalRegistryDescriptorsToStore, assembleGlobalRegistrySnapshot, queryGlobalRegistry, upsertGlobalRegistryRows, redactDescriptor } = createGlobalNodeRegistry({ globalMeshPaths, resolveWorkspaceId, readNodeRecords, readPresenceRecords, readPresenceRecord, assemblePresenceRecord, resolveCloneUrl, reportDegrade });
