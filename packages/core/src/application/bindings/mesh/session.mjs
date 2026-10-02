// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshSessions } from "@aof/mesh/session";
import { isStale } from "@aof/contracts/freshness";

export function assembleMeshSession({ meshStoreServices, degradeServices }) {
  // Core composition for mesh-owned persistence.

  const { meshDir } = meshStoreServices;

  const { reportDegrade } = degradeServices;

  const { DEFAULT_SESSION_TTL_SECONDS, resolveSessionTtlSeconds, sessionRecordPath, assembleSessionRecord, readSessionRecord, readSessionRecordsForNode, reapExpiredSessions, startSession, pingSession, endSession, isSessionLive, resolveSessionIdFromLiveStore } = createMeshSessions({ meshDir, isStale, reportDegrade });

  return { DEFAULT_SESSION_TTL_SECONDS, resolveSessionTtlSeconds, sessionRecordPath, assembleSessionRecord, readSessionRecord, readSessionRecordsForNode, reapExpiredSessions, startSession, pingSession, endSession, isSessionLive, resolveSessionIdFromLiveStore };
}
