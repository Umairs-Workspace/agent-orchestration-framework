// Transitional core composition for work-owned insertion and promotion.
import { createInsertMilestoneCommand } from "@aof/work/commands/insert-milestone";
import { INSERT_FLAGS } from "./insert-shared.mjs";
import { runInsertTopLevel } from "./promote.mjs";

export const { insertMilestoneCommand } = createInsertMilestoneCommand({ INSERT_FLAGS, runInsertTopLevel });
