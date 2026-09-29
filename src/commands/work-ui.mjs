// Configured application adapter; assembly moves in Plan 02, removal in Plan 06.
import { createWorkUiCommand } from "@aof/server/commands/work-ui";
import { serveBoard, boardUiProbe } from "../board-serve.mjs";
import { DEFAULT_MESH_UI_PORT } from "../mesh/ui-serve.mjs";
import { commandError } from "@aof/contracts/error";
// The board/registry/fleet import ring leaves the default in its TDZ during construction.
// Read it lazily when resolving a launch, never while assembling this adapter.
const getDefaultMeshUiPort = () => DEFAULT_MESH_UI_PORT;
export const { resolveStandaloneFleetOrigin, workUiCommand } = createWorkUiCommand({ serveBoard, boardUiProbe, getDefaultMeshUiPort, commandError });
