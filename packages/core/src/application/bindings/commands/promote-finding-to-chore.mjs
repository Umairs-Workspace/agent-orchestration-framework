// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createPromoteFindingCommand } from "@aof/work/commands/promote-finding-to-chore";

export function assembleCommandsPromoteFindingToChore({ commandsPromoteServices, workReadServices }) {
  // Core composition for work-owned promotion commands.

  const { runInsertTopLevel } = commandsPromoteServices;
  const { listItemsCacheFirst } = workReadServices;

  const { promoteFindingToChoreCommand, runPromoteFindingToChore } = createPromoteFindingCommand({ runInsertTopLevel, listItemsCacheFirst });

  return { promoteFindingToChoreCommand, runPromoteFindingToChore };
}
