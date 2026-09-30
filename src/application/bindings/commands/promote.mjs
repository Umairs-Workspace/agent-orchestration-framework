// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createPromoteCommand } from "@aof/work/commands/promote";

export function assembleCommandsPromote({ effectsStreamTransitionsServices, commandsInsertSharedServices }) {
  // Core composition for work-owned insertion and promotion.

  const { transitionStreamReindexed } = effectsStreamTransitionsServices;
  const { INSERT_FLAGS } = commandsInsertSharedServices;
  const { guardSlotOpenCount } = commandsInsertSharedServices;
  const { normalizeSlug } = commandsInsertSharedServices;
  const { parseDependsInput } = commandsInsertSharedServices;
  const { parsePosition } = commandsInsertSharedServices;
  const { scaffoldBacklogDriver } = commandsInsertSharedServices;

  const { archivedCollisions, classifyDepends, numbersWritten, prefixFirstHeading, promoteCommand, runInsertTopLevel, runPromote, stampNumber } = createPromoteCommand({ transitionStreamReindexed, INSERT_FLAGS, guardSlotOpenCount, normalizeSlug, parseDependsInput, parsePosition, scaffoldBacklogDriver });

  return { archivedCollisions, classifyDepends, numbersWritten, prefixFirstHeading, promoteCommand, runInsertTopLevel, runPromote, stampNumber };
}
