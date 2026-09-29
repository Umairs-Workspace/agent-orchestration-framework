// Transitional core composition for work-owned reads.
import { createWorkContentReader } from "@aof/work/content-read";
import { readRuns } from "../run-store.mjs";

export const { readWorkspaceContentRecords } = createWorkContentReader({ readRuns });
