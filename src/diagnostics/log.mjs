// Application path policy: preserve the existing per-user mesh/logs layout.
// Generic JSONL storage knows only the supplied path, not mesh or workspace configuration.
import path from 'node:path';
import { globalMeshPaths } from '../workspace.mjs';
import { createJsonlLogSink, readJsonlLog } from '@aof/foundation/log';
export { DEFAULT_LOG_MAX_BYTES } from '@aof/foundation/log';

export function applicationLogPath(proc, options = {}) {
  const paths = options.paths ?? globalMeshPaths(options);
  return path.join(paths.meshRoot, 'logs', `${proc}.log`);
}

export function createApplicationLogSink(proc, options = {}) {
  return createJsonlLogSink(applicationLogPath(proc, options), { ...options, proc });
}

export function readApplicationLog(proc, options = {}) {
  return readJsonlLog(applicationLogPath(proc, options), options);
}
