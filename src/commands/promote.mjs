// Transitional core composition for work-owned insertion and promotion.
import { createPromoteCommand } from "@aof/work/commands/promote";
import { transitionStreamReindexed } from "../effects/stream-transitions.mjs";
import {
  INSERT_FLAGS,
  guardSlotOpenCount,
  normalizeSlug,
  parseDependsInput,
  parsePosition,
  scaffoldBacklogDriver,
} from "./insert-shared.mjs";

export const { archivedCollisions, classifyDepends, numbersWritten, prefixFirstHeading, promoteCommand, runInsertTopLevel, runPromote, stampNumber } = createPromoteCommand({ transitionStreamReindexed, INSERT_FLAGS, guardSlotOpenCount, normalizeSlug, parseDependsInput, parsePosition, scaffoldBacklogDriver });
