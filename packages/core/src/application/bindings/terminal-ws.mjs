// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createTerminalWebSocket } from "@aof/server/terminal-ws";
import { resolveHeadroomLaunch } from "../../headroom.mjs";
import { isPackaged } from "../../asset-base.mjs";
import * as api0 from "@aof/execution/pty";

export function assembleTerminalWs({ workServices, claudeTrustServices, terminalProvidersServices, terminalSessionsServices, degradeServices }) {
  // Core composition for server-owned transports.

  const { loadWorkspace } = workServices;
  const { ensureWorktreeTrusted } = claudeTrustServices;
  const { resolveProvider } = terminalProvidersServices;
  const { PROVIDER_IDS } = terminalProvidersServices;
  const { registerSession } = terminalSessionsServices;
  const { unregisterSession } = terminalSessionsServices;

  const { reportDegrade } = degradeServices;

  const { MAX_PRESESSION_FRAMES, MAX_PRESESSION_BYTES, PRESESSION_OVERFLOW_CODE, SOCKET_ERROR_CODE, loadNodePty, attachTerminalWebSocket, createConnectionGate } = createTerminalWebSocket({ loadWorkspace, ensureWorktreeTrusted, resolveProvider, PROVIDER_IDS, registerSession, unregisterSession, resolveHeadroomLaunch, isPackaged, reportDegrade });

  return { "createTerminalSpawn": api0.createTerminalSpawn, MAX_PRESESSION_FRAMES, MAX_PRESESSION_BYTES, PRESESSION_OVERFLOW_CODE, SOCKET_ERROR_CODE, loadNodePty, attachTerminalWebSocket, createConnectionGate };
}
