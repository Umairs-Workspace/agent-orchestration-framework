// Transitional core composition for work-owned reads.
import { createTasksCommand } from "@aof/work/commands/tasks";
import { resolveItem } from "./resolve.mjs";
import { readStreamedItemRow, readWorkerDocMembers } from "../cache-read.mjs";
import { meshNodeIdOf } from "./mesh/gate.mjs";
import { reportedElsewhere } from "../work/read.mjs";

export const { tasksCommand } = createTasksCommand({ resolveItem, readStreamedItemRow, readWorkerDocMembers, meshNodeIdOf, reportedElsewhere });
