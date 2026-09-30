// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createExecutionOverlay } from "@aof/mesh/execution-overlay";
import * as api0 from "@aof/mesh/assignment-record";

export function assembleBoardMeshExecution({ globalWorkStoreServices, workspaceServices, degradeServices }) {
  // Core constructs this application service from its owning package.

  const { openGlobalWorkProjectionStore } = globalWorkStoreServices;
  const { globalMeshPaths } = workspaceServices;
  const { reportDegrade } = degradeServices;

  const { readExecutionOverlay, resolveScopedExecution, awaitsAnswer, applyExecutionOverlay } = createExecutionOverlay({ openGlobalWorkProjectionStore, globalMeshPaths, reportDegrade });

  return { "executionScopeRef": api0.executionScopeRef, readExecutionOverlay, resolveScopedExecution, awaitsAnswer, applyExecutionOverlay };
}
