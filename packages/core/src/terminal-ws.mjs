// Compatibility entry; construction belongs to core application assembly.
import { terminalWs } from "./application/default.mjs";
export const {
  createTerminalSpawn,
  MAX_PRESESSION_FRAMES,
  MAX_PRESESSION_BYTES,
  PRESESSION_OVERFLOW_CODE,
  SOCKET_ERROR_CODE,
  loadNodePty,
  attachTerminalWebSocket,
  createConnectionGate,
} = terminalWs;
