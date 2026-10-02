// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshHeartbeatCommands } from "@aof/mesh/commands/heartbeat";
import { packageVersionString } from "../../../../asset-base.mjs";
import { deriveNodeId, sidecarPathFor } from "@aof/mesh/node-identity";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleCommandsMeshHeartbeat({ workReadServices, cacheReadServices, commandsMeshIdentityServices, meshPresenceServices }) {
  // Core composition for mesh-owned commands.

  const { listItemsCacheFirst } = workReadServices;
  const { localItemsOnly } = workReadServices;
  const { reportReachThroughSkips } = workReadServices;
  const { readCachedActiveRunIds } = cacheReadServices;
  const { resolveInstallSalt } = commandsMeshIdentityServices;

  const { assemblePresenceRecord } = meshPresenceServices;
  const { readActiveLoops } = meshPresenceServices;
  const { readActiveRuns } = meshPresenceServices;
  const { publishPresenceRecord } = meshPresenceServices;

  const { meshHeartbeatCommand } = createMeshHeartbeatCommands({ listItemsCacheFirst, localItemsOnly, reportReachThroughSkips, readCachedActiveRunIds, resolveInstallSalt, packageVersionString, deriveNodeId, sidecarPathFor, resolveWorkspaceId, assemblePresenceRecord, readActiveLoops, readActiveRuns, publishPresenceRecord });

  return { meshHeartbeatCommand };
}
