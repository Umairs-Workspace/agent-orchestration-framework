// Compatibility entry; construction belongs to core application assembly.
import { defaultSessionDriver } from "../application/default-session-driver.mjs";
export const openSessionScreen = defaultSessionDriver.terminalSessionScreen.openSessionScreen;
export const readConsentMenu = defaultSessionDriver.terminalSessionScreen.readConsentMenu;
