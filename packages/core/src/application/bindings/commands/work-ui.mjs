// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createWorkUiCommand } from "@aof/server/commands/work-ui";
import { commandError } from "@aof/contracts/error";

export function assembleCommandsWorkUi({ boardServeServices, meshUiServeServices }) {
  // Core constructs this application service from its owning package.

  const { serveBoard } = boardServeServices;
  const { boardUiProbe } = boardServeServices;
  const { DEFAULT_MESH_UI_PORT } = meshUiServeServices;

  // The fleet service is already constructed. Keep the command's existing getter
  // contract so launch policy remains in the command adapter.
  const getDefaultMeshUiPort = () => DEFAULT_MESH_UI_PORT;
  const { resolveStandaloneFleetOrigin, workUiCommand } = createWorkUiCommand({ serveBoard, boardUiProbe, getDefaultMeshUiPort, commandError });

  return { resolveStandaloneFleetOrigin, workUiCommand };
}
