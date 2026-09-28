// Compatibility composition; @aof/execution owns terminal services.
import { createTerminalSessions } from "@aof/execution/terminal-sessions";
import { reportDegrade } from "./degrade.mjs";

const implementation = createTerminalSessions({ reportDegrade });
export const listSessions = implementation.listSessions;
export const registerSession = implementation.registerSession;
export const unregisterSession = implementation.unregisterSession;
