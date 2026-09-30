// Compatibility entry; construction belongs to core application assembly.
import { commandsLoopsShow } from "../application/default.mjs";
export * from "@aof/work-graph/commands/loops-show";
export const {
  loopsShowCommand,
} = commandsLoopsShow;
