// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createLoopRecordCommand } from "@aof/work-graph/commands/loop-record";
import * as api0 from "@aof/work-graph/commands/loop-record";

export function assembleCommandsLoopRecord({ workLoopsServices, runStoreServices, commandsResolveServices }) {
  // Core composition; the work-graph package owns the command.

  const { loadLoops } = workLoopsServices;
  const { readRuns } = runStoreServices;
  const { requireLocalCheckout } = commandsResolveServices;
  const { resolveItemExact } = commandsResolveServices;
  const loopRecordCommand = createLoopRecordCommand({ loadLoops, readRuns, requireLocalCheckout, resolveItemExact });

  return { ...api0, loopRecordCommand };
}
