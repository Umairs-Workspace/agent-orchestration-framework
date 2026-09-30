// Compatibility entry; construction belongs to core application assembly.
import { defaultSessionHooks } from "../application/default-session-hooks.mjs";
export const DEFAULT_SESSION_TTL_SECONDS = defaultSessionHooks.meshSession.DEFAULT_SESSION_TTL_SECONDS;
export const resolveSessionTtlSeconds = defaultSessionHooks.meshSession.resolveSessionTtlSeconds;
export const sessionRecordPath = defaultSessionHooks.meshSession.sessionRecordPath;
export const assembleSessionRecord = defaultSessionHooks.meshSession.assembleSessionRecord;
export const readSessionRecord = defaultSessionHooks.meshSession.readSessionRecord;
export const readSessionRecordsForNode = defaultSessionHooks.meshSession.readSessionRecordsForNode;
export const reapExpiredSessions = defaultSessionHooks.meshSession.reapExpiredSessions;
export const startSession = defaultSessionHooks.meshSession.startSession;
export const pingSession = defaultSessionHooks.meshSession.pingSession;
export const endSession = defaultSessionHooks.meshSession.endSession;
export const isSessionLive = defaultSessionHooks.meshSession.isSessionLive;
export const resolveSessionIdFromLiveStore = defaultSessionHooks.meshSession.resolveSessionIdFromLiveStore;
