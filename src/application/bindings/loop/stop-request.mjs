// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createStopRequests } from "@aof/work-loop/stop-request";
import * as api0 from "@aof/work-loop/stop-request";

export function assembleLoopStopRequest({ workspaceServices, degradeServices }) {
  // Core composition; implementation is owned by @aof/work-loop.

  const { globalMeshPaths } = workspaceServices;
  const { reportDegrade } = degradeServices;

  const {
    loopStopsDir,
    loopResumesDir,
    stopRequestPath,
    readStopRequest,
    requestLoopStop,
    markStopHonoured,
    clearStopRequest,
    resumeRequestPath,
    readResumeRequest,
    requestLoopResume,
    clearResumeRequest,
    createStopSource
  } = createStopRequests({
    getRuntimeRoot: (env) => globalMeshPaths({ env }).meshRoot,
    reportDegrade,
  });

  return { "STOP_LEVELS": api0.STOP_LEVELS, "STOP_STATES": api0.STOP_STATES, loopStopsDir, loopResumesDir, stopRequestPath, readStopRequest, requestLoopStop, markStopHonoured, clearStopRequest, resumeRequestPath, readResumeRequest, requestLoopResume, clearResumeRequest, createStopSource };
}
