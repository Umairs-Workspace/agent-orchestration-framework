// Compatibility entry; construction belongs to core application assembly.
import { terminalSessions } from "./application/default.mjs";
export const {
  listSessions,
  registerSession,
  unregisterSession,
} = terminalSessions;
