// Transitional core composition for work-owned insertion and promotion.
import { createInsertChoreCommand } from "@aof/work/commands/insert-chore";
import { INSERT_FLAGS } from "./insert-shared.mjs";
import { runInsertTopLevel } from "./promote.mjs";

export const { insertChoreCommand } = createInsertChoreCommand({ INSERT_FLAGS, runInsertTopLevel });
