// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createDocCommand } from "@aof/work/commands/doc";
import { meshNodeIdOf } from "@aof/mesh/commands/gate";

export function assembleCommandsDoc({ commandsResolveServices, cacheReadServices, workReadServices }) {
  // Core composition for work-owned reads.

  const { resolveItem } = commandsResolveServices;
  const { readWorkerDoc } = cacheReadServices;
  const { readStreamedItemRow } = cacheReadServices;

  const { reportedElsewhere } = workReadServices;

  const { docCommand } = createDocCommand({ resolveItem, readWorkerDoc, readStreamedItemRow, meshNodeIdOf, reportedElsewhere });

  return { docCommand };
}
