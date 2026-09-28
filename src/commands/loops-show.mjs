// Compatibility composition; the work-graph package owns the command.
import { createLoopsShowCommand } from "@aof/work-graph/commands/loops-show";
export * from "@aof/work-graph/commands/loops-show";
import { loadLoops } from "../work/loops.mjs";
export const loopsShowCommand = createLoopsShowCommand({ loadLoops });
