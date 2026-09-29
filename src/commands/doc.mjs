// Transitional core composition for work-owned reads.
import { createDocCommand } from "@aof/work/commands/doc";
import { resolveItem } from "./resolve.mjs";
import { readWorkerDoc, readStreamedItemRow } from "../cache-read.mjs";
import { meshNodeIdOf } from "./mesh/gate.mjs";
import { reportedElsewhere } from "../work/read.mjs";

export const { docCommand } = createDocCommand({ resolveItem, readWorkerDoc, readStreamedItemRow, meshNodeIdOf, reportedElsewhere });
