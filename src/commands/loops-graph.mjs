// Compatibility entry; construction belongs to core application assembly.
import { commandsLoopsGraph } from "../application/default.mjs";
export * from "@aof/work-graph/commands/loops-graph";
export const {
  loopsGraphCommand,
} = commandsLoopsGraph;
