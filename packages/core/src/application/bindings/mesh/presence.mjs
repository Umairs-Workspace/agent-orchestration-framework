// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshPresence } from "@aof/mesh/presence";

export function assembleMeshPresence({ meshStoreServices, runStoreServices, loopStopRequestServices, meshSessionServices, globalWorkStoreServices, workspaceServices }) {
  // Core composition for mesh-owned projections.

  const { meshDir } = meshStoreServices;
  const { presenceRecordPath } = meshStoreServices;
  const { readRuns } = runStoreServices;
  // 167/ADR-008 — the one-record read a loop entry's last activity comes off, and the store read
  // of this node's running rows the presence tick replaces its runs/ walk with.
  const { readRun } = runStoreServices;
  const { isStale } = runStoreServices;
  const { STOP_LEVELS } = loopStopRequestServices;
  const { loopStopsDir } = loopStopRequestServices;
  const { readStopRequest } = loopStopRequestServices;
  const { readSessionRecordsForNode } = meshSessionServices;
  const { isSessionLive } = meshSessionServices;
  const { resolveSessionTtlSeconds } = meshSessionServices;
  const { openGlobalWorkProjectionStore } = globalWorkStoreServices;
  const { readNodeRunningRuns } = globalWorkStoreServices;
  const { globalMeshPaths } = workspaceServices;

  const { DEFAULT_PRESENCE_STALENESS_SECONDS, readActiveRuns, readActiveLoops, readStoreActivity, readLiveSessions, resolveNodeWorkspaces, resolveWorkspaceProjectRoot, resolveWorkspaceCloneUrl, assemblePresenceRecord, publishPresenceRecord, publishCostSnapshot, readCostSnapshots, readPresenceRecord, readPresenceRecords, mergePresence, resolvePeerReachability, isNodeStale, resolveStalenessSeconds } = createMeshPresence({ meshDir, presenceRecordPath, readRuns, readRun, isStale, STOP_LEVELS, loopStopsDir, readStopRequest, readSessionRecordsForNode, isSessionLive, resolveSessionTtlSeconds, openGlobalWorkProjectionStore, readNodeRunningRuns, globalMeshPaths });

  return { DEFAULT_PRESENCE_STALENESS_SECONDS, readActiveRuns, readActiveLoops, readStoreActivity, readLiveSessions, resolveNodeWorkspaces, resolveWorkspaceProjectRoot, resolveWorkspaceCloneUrl, assemblePresenceRecord, publishPresenceRecord, publishCostSnapshot, readCostSnapshots, readPresenceRecord, readPresenceRecords, mergePresence, resolvePeerReachability, isNodeStale, resolveStalenessSeconds };
}
