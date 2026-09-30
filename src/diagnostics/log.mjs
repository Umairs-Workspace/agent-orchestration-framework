// Compatibility entry; construction belongs to core application assembly.
import { defaultFoundation } from "../application/default-foundation.mjs";
export const DEFAULT_LOG_MAX_BYTES = defaultFoundation.diagnosticsLog.DEFAULT_LOG_MAX_BYTES;
export const applicationLogPath = defaultFoundation.diagnosticsLog.applicationLogPath;
export const createApplicationLogSink = defaultFoundation.diagnosticsLog.createApplicationLogSink;
export const readApplicationLog = defaultFoundation.diagnosticsLog.readApplicationLog;
