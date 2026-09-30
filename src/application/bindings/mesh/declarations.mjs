// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createSupervisedDeclarations } from "@aof/mesh/declarations";

export function assembleMeshDeclarations({ meshPresenceServices, runStoreServices, commandsRunRetryServices, workServices, loopStopRequestServices, provideCommandCore }) {
  // Core composition for mesh-owned coordination.

  const { resolveNodeWorkspaces } = meshPresenceServices;
  const { isRunning } = runStoreServices;
  const { isStale } = runStoreServices;
  const { readRuns } = runStoreServices;
  const { retryReadiness } = runStoreServices;
  const { resolveAttemptCeiling } = commandsRunRetryServices;
  const { listItems } = workServices;
  const { loadWorkspace } = workServices;
  const { STOP_STATES } = loopStopRequestServices;
  const { loopResumesDir } = loopStopRequestServices;
  const { loopStopsDir } = loopStopRequestServices;
  const { readResumeRequest } = loopStopRequestServices;
  const { readStopRequest } = loopStopRequestServices;

  const { supervisedDeclarations } = createSupervisedDeclarations({ resolveNodeWorkspaces, isRunning, isStale, readRuns, retryReadiness, resolveAttemptCeiling, listItems, loadWorkspace, STOP_STATES, loopResumesDir, loopStopsDir, readResumeRequest, readStopRequest, loadCommandRegistry: () => provideCommandCore() });

  return { supervisedDeclarations };
}
