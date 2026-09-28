// Compatibility composition; execution owns claude-trust.
import { createClaudeTrust } from "@aof/execution/claude-trust";
import { reportDegrade } from "./degrade.mjs";

const implementation = createClaudeTrust({ reportDegrade });
export const claudeProjectKey = implementation.claudeProjectKey;
export const ensureWorktreeTrusted = implementation.ensureWorktreeTrusted;
