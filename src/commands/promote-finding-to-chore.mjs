// Transitional core composition for work-owned promotion commands.
import { createPromoteFindingCommand } from "@aof/work/commands/promote-finding-to-chore";
import { runInsertTopLevel } from "./promote.mjs";
import { listItemsCacheFirst } from "../work/read.mjs";

export const { promoteFindingToChoreCommand, runPromoteFindingToChore } = createPromoteFindingCommand({ runInsertTopLevel, listItemsCacheFirst });
