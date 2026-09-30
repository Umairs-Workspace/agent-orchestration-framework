// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createTerminalInput } from "@aof/mesh/terminal-input";

export function assembleMeshTerminalInput({ meshTerminalRelayBridgeServices, degradeServices }) {
  // Core composition for mesh-owned relay services.

  const { TERMINAL_INPUT_KIND } = meshTerminalRelayBridgeServices;
  const { TERMINAL_RESUME_KIND } = meshTerminalRelayBridgeServices;
  const { reportDegrade } = degradeServices;

  const { createTerminalInputRouter } = createTerminalInput({ TERMINAL_INPUT_KIND, TERMINAL_RESUME_KIND, reportDegrade });

  return { createTerminalInputRouter };
}
