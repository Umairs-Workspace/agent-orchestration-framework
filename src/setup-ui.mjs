// Transitional core composition for server-owned transports.
import { createSetupServer } from "@aof/server/setup-ui";
import { addProjectGlobalRef, capabilitiesPayload, loadEditableConfig, removeProjectGlobalRef, saveEditableResource, saveEditableSections } from "./config-editor.mjs";
import { supportedResourceKinds, supportedRuntimes } from "./model.mjs";
import { handleDiagramApi, handleWorkApi } from "./board-ui.mjs";
import { attachTerminalWebSocket } from "./terminal-ws.mjs";
import { assetPath } from "./asset-base.mjs";

export const { serveSetupUi } = createSetupServer({ addProjectGlobalRef, capabilitiesPayload, loadEditableConfig, removeProjectGlobalRef, saveEditableResource, saveEditableSections, supportedResourceKinds, supportedRuntimes, handleDiagramApi, handleWorkApi, attachTerminalWebSocket, assetPath });
