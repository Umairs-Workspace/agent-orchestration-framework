// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createInsertUatCommand } from "@aof/work/commands/insert-uat";

export function assembleCommandsInsertUat({ commandsInsertSharedServices, commandsPromoteServices }) {
  // Core composition for work-owned insertion and promotion.

  const { INSERT_FLAGS } = commandsInsertSharedServices;
  const { runInsertTopLevel } = commandsPromoteServices;

  const { insertUatCommand } = createInsertUatCommand({ INSERT_FLAGS, runInsertTopLevel });

  return { insertUatCommand };
}
