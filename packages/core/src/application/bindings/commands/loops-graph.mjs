// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createLoopsGraphCommand } from "@aof/work-graph/commands/loops-graph";
import * as api0 from "@aof/work-graph/commands/loops-graph";

export function assembleCommandsLoopsGraph({ workLoopsServices }) {
  // Core composition; the work-graph package owns the command.

  const { loadLoops } = workLoopsServices;
  const loopsGraphCommand = createLoopsGraphCommand({ loadLoops });

  return { ...api0, loopsGraphCommand };
}
