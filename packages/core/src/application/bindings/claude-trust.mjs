// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createClaudeTrust } from "@aof/execution/claude-trust";

export function assembleClaudeTrust({ degradeServices }) {
  // Core composition; execution owns claude-trust.

  const { reportDegrade } = degradeServices;

  const implementation = createClaudeTrust({ reportDegrade });
  const claudeProjectKey = implementation.claudeProjectKey;
  const ensureWorktreeTrusted = implementation.ensureWorktreeTrusted;

  return { claudeProjectKey, ensureWorktreeTrusted };
}
