// Transitional core composition for mesh-owned commands.
import { createMeshUiCommands } from "@aof/mesh/commands/ui";
import { serveMeshUi, meshUiProbe, DEFAULT_MESH_UI_PORT } from "../../mesh/ui-serve.mjs";
import { createTerminalMirrorSubscriberTransport, startTerminalMirrorSubscriber } from "../../mesh/terminal-mirror.mjs";
import { createTerminalRelayPushTransport } from "../../mesh/terminal-relay-bridge.mjs";
import { readBuildInfo, buildInfoString } from "../../build-info.mjs";
import { createMeshLogSink } from "../../mesh/log.mjs";
import { loadWorkspace } from "../../work.mjs";

export const { meshUiCommand } = createMeshUiCommands({ serveMeshUi, meshUiProbe, DEFAULT_MESH_UI_PORT, createTerminalMirrorSubscriberTransport, startTerminalMirrorSubscriber, createTerminalRelayPushTransport, readBuildInfo, buildInfoString, createMeshLogSink, loadWorkspace });
