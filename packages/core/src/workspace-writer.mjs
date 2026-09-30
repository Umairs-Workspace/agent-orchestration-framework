// Compatibility entry; construction belongs to core application assembly.
import { workspaceWriter } from "./application/default.mjs";
export const {
  writeWorkspaceConfig,
} = workspaceWriter;
