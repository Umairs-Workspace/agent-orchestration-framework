// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createTerminalSessions } from "@aof/execution/terminal-sessions";

export function assembleTerminalSessions({ degradeServices }) {
  // Core composition; @aof/execution owns terminal services.

  const { reportDegrade } = degradeServices;

  const implementation = createTerminalSessions({ reportDegrade });
  const listSessions = implementation.listSessions;
  const registerSession = implementation.registerSession;
  const unregisterSession = implementation.unregisterSession;

  return { listSessions, registerSession, unregisterSession };
}
