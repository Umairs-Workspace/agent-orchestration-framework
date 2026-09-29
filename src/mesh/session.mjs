// Transitional core composition for mesh-owned persistence.
import { createMeshSessions } from "@aof/mesh/session";
import { meshDir } from "./store.mjs";
import { isStale } from "../run-store.mjs";
import { reportDegrade } from "../degrade.mjs";

export const { DEFAULT_SESSION_TTL_SECONDS, resolveSessionTtlSeconds, sessionRecordPath, assembleSessionRecord, readSessionRecord, readSessionRecordsForNode, reapExpiredSessions, startSession, pingSession, endSession, isSessionLive, resolveSessionIdFromLiveStore } = createMeshSessions({ meshDir, isStale, reportDegrade });
