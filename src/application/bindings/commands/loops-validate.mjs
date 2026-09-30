// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createLoopsValidateCommand } from "@aof/work-graph/commands/loops-validate";
import * as api0 from "@aof/work-graph/commands/loops-validate";

export function assembleCommandsLoopsValidate({ workLoopsServices }) {
  // Core composition; the work-graph package owns the command.

  const { loadLoops } = workLoopsServices;
  const loopsValidateCommand = createLoopsValidateCommand({ loadLoops });

  return { ...api0, loopsValidateCommand };
}
