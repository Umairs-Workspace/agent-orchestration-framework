// Compatibility composition; @aof/work-loop owns the implementation.
import { createLoopStops } from "@aof/work-loop/stop";
import { listItems } from "../work.mjs";
import { isRunning, isStale, readRuns } from "../run-store.mjs";
import { meshNodeIdOf } from "../commands/mesh/gate.mjs";
import {
  STOP_LEVELS,
  loopResumesDir,
  loopStopsDir,
  markStopHonoured,
  requestLoopResume,
  requestLoopStop,
  resumeRequestPath,
  stopRequestPath,
} from "./stop-request.mjs";

const implementation = createLoopStops({
  work: { listItems },
  runs: { isRunning, isStale, readRuns },
  placement: { meshNodeIdOf },
  stopRequests: { STOP_LEVELS, loopResumesDir, loopStopsDir, markStopHonoured, requestLoopResume, requestLoopStop, resumeRequestPath, stopRequestPath },
});

export const HAND_OFF_REFUSALS = implementation.HAND_OFF_REFUSALS;
export const STOP_REFUSALS = implementation.STOP_REFUSALS;
export const handOffLoop = implementation.handOffLoop;
export const hasLoopOn = implementation.hasLoopOn;
export const stopLoop = implementation.stopLoop;
