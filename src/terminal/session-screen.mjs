// Compatibility composition; execution owns terminal/session-screen.
import { createSessionScreens } from "@aof/execution/terminal/session-screen";
import { reportDegrade } from "../degrade.mjs";
import { createScreen } from "./screen.mjs";

const implementation = createSessionScreens({ createScreen, reportDegrade });
export const openSessionScreen = implementation.openSessionScreen;
export const readConsentMenu = implementation.readConsentMenu;
