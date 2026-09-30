// Compatibility entry; construction belongs to core application assembly.
import { defaultSessionDriver } from "./application/default-session-driver.mjs";
export const CliProvider = defaultSessionDriver.terminalProviders.CliProvider;
export const PROVIDER_IDS = defaultSessionDriver.terminalProviders.PROVIDER_IDS;
export const resolveProvider = defaultSessionDriver.terminalProviders.resolveProvider;
