// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createPromoteGapCommand } from "@aof/work/commands/promote-gap-to-chore";

export function assembleCommandsPromoteGapToChore({ commandsInsertSharedServices, commandsPromoteServices }) {
  // Core composition for work-owned promotion commands.

  const { INSERT_FLAGS } = commandsInsertSharedServices;
  const { runInsertTopLevel } = commandsPromoteServices;

  const { promoteGapToChoreCommand, runPromoteGapToChore } = createPromoteGapCommand({ INSERT_FLAGS, runInsertTopLevel });

  return { promoteGapToChoreCommand, runPromoteGapToChore };
}
