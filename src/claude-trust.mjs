// Compatibility entry; construction belongs to core application assembly.
import { defaultSessionDriver } from "./application/default-session-driver.mjs";
export const claudeProjectKey = defaultSessionDriver.claudeTrust.claudeProjectKey;
export const ensureWorktreeTrusted = defaultSessionDriver.claudeTrust.ensureWorktreeTrusted;
