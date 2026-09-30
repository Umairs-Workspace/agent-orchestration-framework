// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createLoopsShowCommand } from "@aof/work-graph/commands/loops-show";
import * as api0 from "@aof/work-graph/commands/loops-show";

export function assembleCommandsLoopsShow({ workLoopsServices }) {
  // Core composition; the work-graph package owns the command.

  const { loadLoops } = workLoopsServices;
  const loopsShowCommand = createLoopsShowCommand({ loadLoops });

  return { ...api0, loopsShowCommand };
}
