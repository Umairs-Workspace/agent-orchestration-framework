// Compatibility composition; the work-graph package owns the command.
import { createLoopsValidateCommand } from "@aof/work-graph/commands/loops-validate";
export * from "@aof/work-graph/commands/loops-validate";
import { loadLoops } from "../work/loops.mjs";
export const loopsValidateCommand = createLoopsValidateCommand({ loadLoops });
