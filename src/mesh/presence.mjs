// Compatibility entry; construction belongs to core application assembly.
import { meshPresence } from "../application/default.mjs";
export const {
  DEFAULT_PRESENCE_STALENESS_SECONDS,
  readActiveRuns,
  readActiveLoops,
  readLiveSessions,
  resolveNodeWorkspaces,
  resolveWorkspaceProjectRoot,
  resolveWorkspaceCloneUrl,
  assemblePresenceRecord,
  publishPresenceRecord,
  readPresenceRecord,
  readPresenceRecords,
  mergePresence,
  resolvePeerReachability,
  isNodeStale,
  resolveStalenessSeconds,
} = meshPresence;
