// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createSetupServer } from "@aof/server/setup-ui";
import { supportedResourceKinds, supportedRuntimes } from "../../model.mjs";
import { assetPath } from "../../asset-base.mjs";

export function assembleSetupUi({ configEditorServices, boardUiServices, terminalWsServices }) {
  // Core composition for server-owned transports.

  const { addProjectGlobalRef } = configEditorServices;
  const { capabilitiesPayload } = configEditorServices;
  const { loadEditableConfig } = configEditorServices;
  const { removeProjectGlobalRef } = configEditorServices;
  const { saveEditableResource } = configEditorServices;
  const { saveEditableSections } = configEditorServices;

  const { handleDiagramApi } = boardUiServices;
  const { handleWorkApi } = boardUiServices;
  const { attachTerminalWebSocket } = terminalWsServices;

  const { serveSetupUi } = createSetupServer({ addProjectGlobalRef, capabilitiesPayload, loadEditableConfig, removeProjectGlobalRef, saveEditableResource, saveEditableSections, supportedResourceKinds, supportedRuntimes, handleDiagramApi, handleWorkApi, attachTerminalWebSocket, assetPath });

  return { serveSetupUi };
}
