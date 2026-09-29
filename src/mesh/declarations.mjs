// Transitional core composition for mesh-owned coordination.
import { createSupervisedDeclarations } from "@aof/mesh/declarations";
import { resolveNodeWorkspaces } from "./presence.mjs";
import { isRunning, isStale, readRuns, retryReadiness } from "../run-store.mjs";
import { resolveAttemptCeiling } from "../commands/run-retry.mjs";
import { listItems, loadWorkspace } from "../work.mjs";
import { STOP_STATES, loopResumesDir, loopStopsDir, readResumeRequest, readStopRequest } from "../loop/stop-request.mjs";

export const { supervisedDeclarations } = createSupervisedDeclarations({ resolveNodeWorkspaces, isRunning, isStale, readRuns, retryReadiness, resolveAttemptCeiling, listItems, loadWorkspace, STOP_STATES, loopResumesDir, loopStopsDir, readResumeRequest, readStopRequest, loadCommandRegistry: () => import("../command-core.mjs") });
