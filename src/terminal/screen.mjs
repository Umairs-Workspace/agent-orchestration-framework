// Compatibility entry; construction belongs to core application assembly.
import { defaultSessionDriver } from "../application/default-session-driver.mjs";
export const createScreen = defaultSessionDriver.terminalScreen.createScreen;
