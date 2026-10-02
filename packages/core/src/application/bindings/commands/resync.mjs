// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createResyncCommand } from "@aof/mesh/commands/resync";

export function assembleCommandsResync({ globalWorkStoreServices, workspaceServices, meshResyncServices }) {
  // Core constructs this application service from its owning package.

  const { openGlobalWorkProjectionStore } = globalWorkStoreServices;
  const { readWorkspaceItemProvenance } = globalWorkStoreServices;
  const { globalMeshPaths } = workspaceServices;
  const { requestResync } = meshResyncServices;
  const { readResync } = meshResyncServices;
  const { resyncCommand } = createResyncCommand({ openGlobalWorkProjectionStore, readWorkspaceItemProvenance, globalMeshPaths, requestResync, readResync });

  return { resyncCommand };
}
