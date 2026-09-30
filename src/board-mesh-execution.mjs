// Compatibility entry; construction belongs to core application assembly.
import { boardMeshExecution } from "./application/default.mjs";
export const {
  executionScopeRef,
  readExecutionOverlay,
  resolveScopedExecution,
  awaitsAnswer,
  applyExecutionOverlay,
} = boardMeshExecution;
