// Transitional core composition for work-owned promotion commands.
import { createPromoteGapCommand } from "@aof/work/commands/promote-gap-to-chore";
import { INSERT_FLAGS } from "./insert-shared.mjs";
import { runInsertTopLevel } from "./promote.mjs";

export const { promoteGapToChoreCommand, runPromoteGapToChore } = createPromoteGapCommand({ INSERT_FLAGS, runInsertTopLevel });
