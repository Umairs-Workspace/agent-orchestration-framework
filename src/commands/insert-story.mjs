// Transitional core composition for work-owned insertion and promotion.
import { createInsertStoryCommand } from "@aof/work/commands/insert-story";
import { INSERT_FLAGS, runInsertStory } from "./insert-shared.mjs";

export const { insertStoryCommand } = createInsertStoryCommand({ INSERT_FLAGS, runInsertStory });
