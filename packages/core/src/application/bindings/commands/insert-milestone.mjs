// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createInsertMilestoneCommand } from "@aof/work/commands/insert-milestone";

export function assembleCommandsInsertMilestone({ commandsInsertSharedServices, commandsPromoteServices }) {
  // Core composition for work-owned insertion and promotion.

  const { INSERT_FLAGS } = commandsInsertSharedServices;
  const { runInsertTopLevel } = commandsPromoteServices;

  const { insertMilestoneCommand } = createInsertMilestoneCommand({ INSERT_FLAGS, runInsertTopLevel });

  return { insertMilestoneCommand };
}
