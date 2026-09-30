// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshPresence } from "@aof/mesh/presence";

export function assembleMeshPresence({ meshStoreServices, runStoreServices, loopStopRequestServices, meshSessionServices, globalWorkStoreServices, workspaceServices }) {
  // Core composition for mesh-owned projections.

  const { meshDir } = meshStoreServices;
  const { presenceRecordPath } = meshStoreServices;
  const { readRuns } = runStoreServices;
  const { isStale } = runStoreServices;
  const { STOP_LEVELS } = loopStopRequestServices;
  const { loopStopsDir } = loopStopRequestServices;
  const { readStopRequest } = loopStopRequestServices;
  const { readSessionRecordsForNode } = meshSessionServices;
  const { isSessionLive } = meshSessionServices;
  const { resolveSessionTtlSeconds } = meshSessionServices;
  const { openGlobalWorkProjectionStore } = globalWorkStoreServices;
  const { globalMeshPaths } = workspaceServices;

  const { DEFAULT_PRESENCE_STALENESS_SECONDS, readActiveRuns, readActiveLoops, readLiveSessions, resolveNodeWorkspaces, resolveWorkspaceProjectRoot, resolveWorkspaceCloneUrl, assemblePresenceRecord, publishPresenceRecord, readPresenceRecord, readPresenceRecords, mergePresence, resolvePeerReachability, isNodeStale, resolveStalenessSeconds } = createMeshPresence({ meshDir, presenceRecordPath, readRuns, isStale, STOP_LEVELS, loopStopsDir, readStopRequest, readSessionRecordsForNode, isSessionLive, resolveSessionTtlSeconds, openGlobalWorkProjectionStore, globalMeshPaths });

  return { DEFAULT_PRESENCE_STALENESS_SECONDS, readActiveRuns, readActiveLoops, readLiveSessions, resolveNodeWorkspaces, resolveWorkspaceProjectRoot, resolveWorkspaceCloneUrl, assemblePresenceRecord, publishPresenceRecord, readPresenceRecord, readPresenceRecords, mergePresence, resolvePeerReachability, isNodeStale, resolveStalenessSeconds };
}
