// Transitional core composition for mesh-owned runtime services.
import { createMeshUiServer } from "@aof/mesh/ui-serve";
import { assetPath } from "../asset-base.mjs";
import { serveBoard } from "../board-serve.mjs";
import { queryGlobalMeshStatus, workspaceIdForProjectRoot } from "../global-mesh-query.mjs";
import { resolveCacheStalenessSeconds } from "@aof/mesh/cache-policy";
import { loadWorkspace } from "../work.mjs";
import { assignWork } from "./assignment.mjs";
import { STOP_REFUSALS, stopLoop } from "../loop/stop.mjs";
import { createTerminalMirror } from "./terminal-mirror.mjs";
import { buildTerminalInputEnvelope } from "./terminal-relay-bridge.mjs";
import { PROVIDER_IDS } from "../terminal-providers.mjs";
import { reportDegrade } from "../degrade.mjs";


export const { DEFAULT_MESH_UI_PORT, meshUiDist, meshUiProbe, MAX_TERMINAL_INPUT_BYTES, serveMeshUi } = createMeshUiServer({ assetPath, serveBoard, queryGlobalMeshStatus, workspaceIdForProjectRoot, resolveCacheStalenessSeconds, loadWorkspace, assignWork, STOP_REFUSALS, stopLoop, createTerminalMirror, buildTerminalInputEnvelope, PROVIDER_IDS, reportDegrade });
