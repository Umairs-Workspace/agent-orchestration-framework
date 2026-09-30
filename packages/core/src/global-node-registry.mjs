// Compatibility entry; construction belongs to core application assembly.
import { globalNodeRegistry } from "./application/default.mjs";
export const {
  publishGlobalRegistryDescriptorsToStore,
  assembleGlobalRegistrySnapshot,
  queryGlobalRegistry,
  upsertGlobalRegistryRows,
  redactDescriptor,
} = globalNodeRegistry;
