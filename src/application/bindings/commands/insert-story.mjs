// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createInsertStoryCommand } from "@aof/work/commands/insert-story";

export function assembleCommandsInsertStory({ commandsInsertSharedServices }) {
  // Core composition for work-owned insertion and promotion.

  const { INSERT_FLAGS } = commandsInsertSharedServices;
  const { runInsertStory } = commandsInsertSharedServices;

  const { insertStoryCommand } = createInsertStoryCommand({ INSERT_FLAGS, runInsertStory });

  return { insertStoryCommand };
}
