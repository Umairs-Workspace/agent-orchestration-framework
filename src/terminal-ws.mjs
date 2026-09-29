// Transitional core composition for server-owned transports.
import { createTerminalWebSocket } from "@aof/server/terminal-ws";
import { loadWorkspace } from "./work.mjs";
import { ensureWorktreeTrusted } from "./claude-trust.mjs";
import { resolveProvider, PROVIDER_IDS } from "./terminal-providers.mjs";
import { registerSession, unregisterSession } from "./terminal-sessions.mjs";
import { resolveHeadroomLaunch } from "./headroom.mjs";
import { isPackaged } from "./asset-base.mjs";
import { reportDegrade } from "./degrade.mjs";
export { createTerminalSpawn } from "@aof/execution/pty";
export const { MAX_PRESESSION_FRAMES, MAX_PRESESSION_BYTES, PRESESSION_OVERFLOW_CODE, SOCKET_ERROR_CODE, loadNodePty, attachTerminalWebSocket, createConnectionGate } = createTerminalWebSocket({ loadWorkspace, ensureWorktreeTrusted, resolveProvider, PROVIDER_IDS, registerSession, unregisterSession, resolveHeadroomLaunch, isPackaged, reportDegrade });
