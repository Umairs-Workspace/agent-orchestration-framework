// Compatibility composition; implementation is owned by @aof/work-loop.
import { createStopRequests } from "@aof/work-loop/stop-request";
import { globalMeshPaths } from "../workspace.mjs";
import { reportDegrade } from "../degrade.mjs";
export { STOP_LEVELS, STOP_STATES } from "@aof/work-loop/stop-request";

export const {
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
