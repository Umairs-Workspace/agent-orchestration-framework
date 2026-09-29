// Transitional core composition for work-owned insertion and promotion.
import { createInsertUatCommand } from "@aof/work/commands/insert-uat";
import { INSERT_FLAGS } from "./insert-shared.mjs";
import { runInsertTopLevel } from "./promote.mjs";

export const { insertUatCommand } = createInsertUatCommand({ INSERT_FLAGS, runInsertTopLevel });
