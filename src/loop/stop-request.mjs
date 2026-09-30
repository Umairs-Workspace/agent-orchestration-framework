// Compatibility entry; construction belongs to core application assembly.
import { loopStopRequest } from "../application/default.mjs";
export const {
  STOP_LEVELS,
  STOP_STATES,
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
  createStopSource,
} = loopStopRequest;
