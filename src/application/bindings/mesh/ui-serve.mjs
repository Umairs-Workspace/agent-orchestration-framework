// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshUiServer } from "@aof/mesh/ui-serve";
import { assetPath } from "../../../asset-base.mjs";
import { resolveCacheStalenessSeconds } from "@aof/mesh/cache-policy";

export function assembleMeshUiServe({ boardServeServices, globalMeshQueryServices, workServices, meshAssignmentServices, loopStopServices, meshTerminalMirrorServices, meshTerminalRelayBridgeServices, terminalProvidersServices, degradeServices }) {
  // Core composition for mesh-owned runtime services.

  const { serveBoard } = boardServeServices;
  const { queryGlobalMeshStatus } = globalMeshQueryServices;
  const { workspaceIdForProjectRoot } = globalMeshQueryServices;

  const { loadWorkspace } = workServices;
  const { assignWork } = meshAssignmentServices;
  const { STOP_REFUSALS } = loopStopServices;
  const { stopLoop } = loopStopServices;
  const { createTerminalMirror } = meshTerminalMirrorServices;
  const { buildTerminalInputEnvelope } = meshTerminalRelayBridgeServices;
  const { PROVIDER_IDS } = terminalProvidersServices;
  const { reportDegrade } = degradeServices;

  const { DEFAULT_MESH_UI_PORT, meshUiDist, meshUiProbe, MAX_TERMINAL_INPUT_BYTES, serveMeshUi } = createMeshUiServer({ assetPath, serveBoard, queryGlobalMeshStatus, workspaceIdForProjectRoot, resolveCacheStalenessSeconds, loadWorkspace, assignWork, STOP_REFUSALS, stopLoop, createTerminalMirror, buildTerminalInputEnvelope, PROVIDER_IDS, reportDegrade });

  return { DEFAULT_MESH_UI_PORT, meshUiDist, meshUiProbe, MAX_TERMINAL_INPUT_BYTES, serveMeshUi };
}
