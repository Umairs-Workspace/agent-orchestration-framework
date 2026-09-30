// Compatibility entry; construction belongs to core application assembly.
import { globalWorkPublisher } from "./application/default.mjs";
export const {
  MESH_GLOBAL_DISABLED_CODE,
  MESH_WORKSPACE_UNCONFIGURED_CODE,
  meshGlobalPropagationDecision,
  publishGlobalWorkSnapshot,
  threadPropagationWarnings,
  appendPropagationWarning,
  renderPropagationWarnings,
  renderWithPropagationWarnings,
  restoreRefusedResumeReservation,
  workspaceIdFor,
  readWorkspaceProjectionItems,
  readWorkspaceContentRecords,
} = globalWorkPublisher;
