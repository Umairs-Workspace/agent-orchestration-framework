// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createScreenModel } from "@aof/execution/terminal/screen";

export function assembleTerminalScreen({ degradeServices }) {
  // Core composition; execution owns terminal/screen.

  const { reportDegrade } = degradeServices;

  const implementation = createScreenModel({ reportDegrade });
  const createScreen = implementation.createScreen;

  return { createScreen };
}
