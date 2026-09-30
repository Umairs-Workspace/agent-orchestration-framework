// Compatibility entry; construction belongs to core application assembly.
import { commandsCounters } from "../application/default.mjs";
export const {
  countersCommand,
  observeCounters,
} = commandsCounters;
