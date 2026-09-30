// Compatibility entry; construction belongs to core application assembly.
import { globalMeshQuery } from "./application/default.mjs";
export const {
  queryGlobalMeshStatus,
  buildSessionIndex,
  shapeGlobalStatus,
  workspaceIdForProjectRoot,
} = globalMeshQuery;
