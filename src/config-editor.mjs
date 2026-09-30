// Compatibility entry; construction belongs to core application assembly.
import { configEditor } from "./application/default.mjs";
export const {
  capabilitiesPayload,
  loadEditableConfig,
  saveEditableResource,
  addProjectGlobalRef,
  removeProjectGlobalRef,
  saveEditableSections,
  validateEditableResource,
  capabilityDiagnostics,
  assetBodyPath,
} = configEditor;
