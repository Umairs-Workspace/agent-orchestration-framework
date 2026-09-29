// Configured application adapter; assembly moves in Plan 02, removal in Plan 06.
import { createResyncCommand } from "@aof/mesh/commands/resync";
import { openGlobalWorkProjectionStore, readWorkspaceItemProvenance } from "../global-work-store.mjs";
import { globalMeshPaths } from "../workspace.mjs";
import { requestResync, readResync } from "../mesh/resync.mjs";
export const { resyncCommand } = createResyncCommand({ openGlobalWorkProjectionStore, readWorkspaceItemProvenance, globalMeshPaths, requestResync, readResync });
