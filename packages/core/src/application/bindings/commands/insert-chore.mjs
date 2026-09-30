// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createInsertChoreCommand } from "@aof/work/commands/insert-chore";

export function assembleCommandsInsertChore({ commandsInsertSharedServices, commandsPromoteServices }) {
  // Core composition for work-owned insertion and promotion.

  const { INSERT_FLAGS } = commandsInsertSharedServices;
  const { runInsertTopLevel } = commandsPromoteServices;

  const { insertChoreCommand } = createInsertChoreCommand({ INSERT_FLAGS, runInsertTopLevel });

  return { insertChoreCommand };
}
