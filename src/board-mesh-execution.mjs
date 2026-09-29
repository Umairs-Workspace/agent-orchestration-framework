// Configured application adapter; assembly moves in Plan 02, removal in Plan 06.
import { createExecutionOverlay } from "@aof/mesh/execution-overlay";
import { openGlobalWorkProjectionStore } from "./global-work-store.mjs";
import { globalMeshPaths } from "./workspace.mjs";
import { reportDegrade } from "./degrade.mjs";
export { executionScopeRef } from "@aof/mesh/assignment-record";
export const { readExecutionOverlay, resolveScopedExecution, awaitsAnswer, applyExecutionOverlay } = createExecutionOverlay({ openGlobalWorkProjectionStore, globalMeshPaths, reportDegrade });
