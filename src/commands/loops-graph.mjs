// Compatibility composition; the work-graph package owns the command.
import { createLoopsGraphCommand } from "@aof/work-graph/commands/loops-graph";
export * from "@aof/work-graph/commands/loops-graph";
import { loadLoops } from "../work/loops.mjs";
export const loopsGraphCommand = createLoopsGraphCommand({ loadLoops });
