// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createLoopStops } from "@aof/work-loop/stop";
import { meshNodeIdOf } from "@aof/mesh/commands/gate";

export function assembleLoopStop({ workServices, runStoreServices, loopStopRequestServices }) {
  // Core composition; @aof/work-loop owns the implementation.

  const { listItems } = workServices;
  const { isRunning } = runStoreServices;
  const { isStale } = runStoreServices;
  const { readRuns } = runStoreServices;

  const { STOP_LEVELS } = loopStopRequestServices;
  const { loopResumesDir } = loopStopRequestServices;
  const { loopStopsDir } = loopStopRequestServices;
  const { markStopHonoured } = loopStopRequestServices;
  const { requestLoopResume } = loopStopRequestServices;
  const { requestLoopStop } = loopStopRequestServices;
  const { resumeRequestPath } = loopStopRequestServices;
  const { stopRequestPath } = loopStopRequestServices;

  const implementation = createLoopStops({
    work: { listItems },
    runs: { isRunning, isStale, readRuns },
    placement: { meshNodeIdOf },
    stopRequests: { STOP_LEVELS, loopResumesDir, loopStopsDir, markStopHonoured, requestLoopResume, requestLoopStop, resumeRequestPath, stopRequestPath },
  });

  const HAND_OFF_REFUSALS = implementation.HAND_OFF_REFUSALS;
  const STOP_REFUSALS = implementation.STOP_REFUSALS;
  const handOffLoop = implementation.handOffLoop;
  const hasLoopOn = implementation.hasLoopOn;
  const stopLoop = implementation.stopLoop;

  return { HAND_OFF_REFUSALS, STOP_REFUSALS, handOffLoop, hasLoopOn, stopLoop };
}
