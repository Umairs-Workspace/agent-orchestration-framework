// Core assembly: construct once per application; collaborators are supplied explicitly.
import path from "node:path";
import { createJsonlLogSink, readJsonlLog } from "@aof/foundation/log";
import * as api0 from "@aof/foundation/log";

export function assembleDiagnosticsLog({ workspaceServices }) {
  // Application path policy: preserve the existing per-user mesh/logs layout.
  // Generic JSONL storage knows only the supplied path, not mesh or workspace configuration.

  const { globalMeshPaths } = workspaceServices;

  function applicationLogPath(proc, options = {}) {
    const paths = options.paths ?? globalMeshPaths(options);
    return path.join(paths.meshRoot, 'logs', `${proc}.log`);
  }

  function createApplicationLogSink(proc, options = {}) {
    return createJsonlLogSink(applicationLogPath(proc, options), { ...options, proc });
  }

  function readApplicationLog(proc, options = {}) {
    return readJsonlLog(applicationLogPath(proc, options), options);
  }

  return { "DEFAULT_LOG_MAX_BYTES": api0.DEFAULT_LOG_MAX_BYTES, applicationLogPath, createApplicationLogSink, readApplicationLog };
}
