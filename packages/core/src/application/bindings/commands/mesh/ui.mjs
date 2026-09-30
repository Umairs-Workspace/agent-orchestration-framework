// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshUiCommands } from "@aof/mesh/commands/ui";
import { readBuildInfo, buildInfoString } from "../../../../build-info.mjs";

export function assembleCommandsMeshUi({ meshUiServeServices, meshTerminalMirrorServices, meshTerminalRelayBridgeServices, diagnosticsLogServices, workServices }) {
  // Core composition for mesh-owned commands.

  const { serveMeshUi } = meshUiServeServices;
  const { meshUiProbe } = meshUiServeServices;
  const { DEFAULT_MESH_UI_PORT } = meshUiServeServices;
  const { createTerminalMirrorSubscriberTransport } = meshTerminalMirrorServices;
  const { startTerminalMirrorSubscriber } = meshTerminalMirrorServices;
  const { createTerminalRelayPushTransport } = meshTerminalRelayBridgeServices;

  const { createApplicationLogSink: createMeshLogSink } = diagnosticsLogServices;
  const { loadWorkspace } = workServices;

  const { meshUiCommand } = createMeshUiCommands({ serveMeshUi, meshUiProbe, DEFAULT_MESH_UI_PORT, createTerminalMirrorSubscriberTransport, startTerminalMirrorSubscriber, createTerminalRelayPushTransport, readBuildInfo, buildInfoString, createMeshLogSink, loadWorkspace });

  return { meshUiCommand };
}
