// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createTasksCommand } from "@aof/work/commands/tasks";
import { meshNodeIdOf } from "@aof/mesh/commands/gate";

export function assembleCommandsTasks({ commandsResolveServices, cacheReadServices, workReadServices }) {
  // Core composition for work-owned reads.

  const { resolveItem } = commandsResolveServices;
  const { readStreamedItemRow } = cacheReadServices;
  const { readWorkerDocMembers } = cacheReadServices;

  const { reportedElsewhere } = workReadServices;

  const { tasksCommand } = createTasksCommand({ resolveItem, readStreamedItemRow, readWorkerDocMembers, meshNodeIdOf, reportedElsewhere });

  return { tasksCommand };
}
