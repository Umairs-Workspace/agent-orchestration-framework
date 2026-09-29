// Transitional core composition for mesh-owned projections.
import { createMeshPresence } from "@aof/mesh/presence";
import { meshDir, presenceRecordPath } from "./store.mjs";
import { readRuns, isStale } from "../run-store.mjs";
import { STOP_LEVELS, loopStopsDir, readStopRequest } from "../loop/stop-request.mjs";
import { readSessionRecordsForNode, isSessionLive, resolveSessionTtlSeconds } from "./session.mjs";
import { openGlobalWorkProjectionStore } from "../global-work-store.mjs";
import { globalMeshPaths } from "../workspace.mjs";

export const { DEFAULT_PRESENCE_STALENESS_SECONDS, readActiveRuns, readActiveLoops, readLiveSessions, resolveNodeWorkspaces, resolveWorkspaceProjectRoot, resolveWorkspaceCloneUrl, assemblePresenceRecord, publishPresenceRecord, readPresenceRecord, readPresenceRecords, mergePresence, resolvePeerReachability, isNodeStale, resolveStalenessSeconds } = createMeshPresence({ meshDir, presenceRecordPath, readRuns, isStale, STOP_LEVELS, loopStopsDir, readStopRequest, readSessionRecordsForNode, isSessionLive, resolveSessionTtlSeconds, openGlobalWorkProjectionStore, globalMeshPaths });
