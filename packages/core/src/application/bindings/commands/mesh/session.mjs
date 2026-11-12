// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshSessionCommands, createMeshSessionVerbs } from "@aof/mesh/commands/session";
import { resolveInstallSalt } from "@aof/mesh/node-identity";
import { deriveNodeId, sidecarPathFor } from "@aof/mesh/node-identity";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

export function assembleCommandsMeshSession({ workServices, meshSessionServices, degradeServices }) {
  // Core composition for mesh-owned commands.

  const { loadWorkspace } = workServices;

  const { startSession } = meshSessionServices;
  const { pingSession } = meshSessionServices;
  const { endSession } = meshSessionServices;

  const { reportDegrade } = degradeServices;

  const { resolveSessionIdentity, meshSessionCommand, readStdinText, resolveNodeId } = createMeshSessionCommands({ loadWorkspace, resolveInstallSalt, deriveNodeId, sidecarPathFor, startSession, pingSession, endSession, resolveWorkspaceId, reportDegrade });

  return { resolveSessionIdentity, meshSessionCommand, readStdinText, resolveNodeId };
}

// 191/ADR-003 — the registered `mesh:session-start` / `mesh:session-list` verbs. A separate
// assembly from the hook seam above: those boot with no registry (FF-7205), these are registry
// commands and reach `work:find` through the command port, resolved at call time.
export function assembleCommandsMeshSessionVerbs({ globalMeshQueryServices, workServices, meshTerminalRelayBridgeServices, meshTerminalMirrorServices, meshSessionServices, degradeServices, commandPort }) {
  const { queryGlobalMeshStatus } = globalMeshQueryServices;
  const { loadWorkspace } = workServices;
  const { TERMINAL_FRAME_KIND, createTerminalRelayPushTransport } = meshTerminalRelayBridgeServices;
  const { createTerminalMirrorSubscriberTransport, parseInboundTerminalFrame } = meshTerminalMirrorServices;
  const { isSessionLive, resolveSessionTtlSeconds } = meshSessionServices;
  const { reportDegrade } = degradeServices;
  const invokeRegistered = (id, input, ctx) => commandPort.invoke(id, input, ctx);

  const { meshSessionStartCommand, meshSessionListCommand } = createMeshSessionVerbs({ queryGlobalMeshStatus, loadWorkspace, TERMINAL_FRAME_KIND, createTerminalRelayPushTransport, createTerminalMirrorSubscriberTransport, parseInboundTerminalFrame, isSessionLive, resolveSessionTtlSeconds, invokeRegistered, reportDegrade });

  return { meshSessionStartCommand, meshSessionListCommand };
}
