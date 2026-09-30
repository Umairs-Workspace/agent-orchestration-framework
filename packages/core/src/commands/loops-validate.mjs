// Compatibility entry; construction belongs to core application assembly.
import { commandsLoopsValidate } from "../application/default.mjs";
export * from "@aof/work-graph/commands/loops-validate";
export const {
  loopsValidateCommand,
} = commandsLoopsValidate;
