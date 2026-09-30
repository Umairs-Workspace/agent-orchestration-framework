// Compatibility names for daemon/CLI consumers. Core owns the destination policy.
export {
  DEFAULT_LOG_MAX_BYTES,
  applicationLogPath as meshLogPath,
  createApplicationLogSink as createMeshLogSink,
  readApplicationLog as readMeshLog,
} from '../diagnostics/log.mjs';
