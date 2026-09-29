// Transitional core composition for mesh-owned commands.
import { createMeshHeartbeatCommands } from "@aof/mesh/commands/heartbeat";
import { listItemsCacheFirst, localItemsOnly, reportReachThroughSkips } from "../../work/read.mjs";
import { readCachedActiveRunIds } from "../../cache-read.mjs";
import { resolveInstallSalt } from "./identity.mjs";
import { packageVersionString } from "../../asset-base.mjs";
import { deriveNodeId, sidecarPathFor } from "../../node-identity.mjs";
import { resolveWorkspaceId } from "../../workspace-identity.mjs";
import {
  assemblePresenceRecord,
  readActiveLoops,
  readActiveRuns,
  publishPresenceRecord,
} from "../../mesh/presence.mjs";

export const { meshHeartbeatCommand } = createMeshHeartbeatCommands({ listItemsCacheFirst, localItemsOnly, reportReachThroughSkips, readCachedActiveRunIds, resolveInstallSalt, packageVersionString, deriveNodeId, sidecarPathFor, resolveWorkspaceId, assemblePresenceRecord, readActiveLoops, readActiveRuns, publishPresenceRecord });
