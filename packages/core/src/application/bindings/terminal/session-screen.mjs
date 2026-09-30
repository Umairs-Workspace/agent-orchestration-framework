// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createSessionScreens } from "@aof/execution/terminal/session-screen";

export function assembleTerminalSessionScreen({ degradeServices, terminalScreenServices }) {
  // Core composition; execution owns terminal/session-screen.

  const { reportDegrade } = degradeServices;
  const { createScreen } = terminalScreenServices;

  const implementation = createSessionScreens({ createScreen, reportDegrade });
  const openSessionScreen = implementation.openSessionScreen;
  const readConsentMenu = implementation.readConsentMenu;

  return { openSessionScreen, readConsentMenu };
}
